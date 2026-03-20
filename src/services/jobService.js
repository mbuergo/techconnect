// jobService.js — all Firestore logic for creating and managing jobs.
// A "job" is a service request from a customer to a mechanic.
// Jobs live in the Firestore "jobs" collection.

import {
  collection,      // Reference to a Firestore collection (like a table)
  doc,             // Reference to a specific document within a collection
  addDoc,          // Adds a new document with an auto-generated ID
  updateDoc,       // Updates specific fields in an existing document
  getDoc,          // Reads a document once
  getDocs,         // Reads all documents matching a query
  query,           // Builds a database query
  where,           // A filter condition for a query (e.g. where('status', '==', 'pending'))
  onSnapshot,      // Subscribes to real-time updates — fires whenever the data changes
  serverTimestamp, // Uses the Firebase server's clock, not the device's
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { haversineDistance } from './locationService';

// JOB_STATUS is an object of constants so we never mistype a status string.
// Using constants (JOB_STATUS.PENDING) is safer than raw strings ('pending').
export const JOB_STATUS = {
  PENDING: 'pending',         // Request submitted, waiting for a mechanic
  ACCEPTED: 'accepted',       // A mechanic accepted the job
  EN_ROUTE: 'enRoute',        // Mechanic is driving to the customer
  IN_PROGRESS: 'inProgress',  // Mechanic is actively working on the vehicle
  COMPLETE: 'complete',       // Job is done, rating can be submitted
};

// ─── createJob ────────────────────────────────────────────────────────────────
// Creates a new job document in Firestore and returns its auto-generated ID.
// Called when a customer submits a service request.
export async function createJob({ customerId, vehicleInfo, issueDescription, customerLocation }) {
  // addDoc adds a new document to the 'jobs' collection with a unique ID.
  // We don't pick the ID — Firestore generates one like "abc123xyz".
  const ref = await addDoc(collection(db, 'jobs'), {
    customerId,              // The customer's Firebase uid
    mechanicId: null,        // Will be filled in when a mechanic accepts
    vehicleInfo,             // { year, make, model, trim }
    issueDescription,        // Free-text description of the problem
    customerLocation,        // { lat, lng } snapshot of where the customer is
    status: JOB_STATUS.PENDING,
    mechanicCurrentLocation: null, // Updated live while mechanic is en route
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id; // Return the ID so the screen can navigate to TrackJob
}

// ─── getJob ───────────────────────────────────────────────────────────────────
// Fetches a single job document by its ID. Returns null if not found.
export async function getJob(jobId) {
  const snap = await getDoc(doc(db, 'jobs', jobId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── findNearbyMechanics ──────────────────────────────────────────────────────
// Queries Firestore for mechanics who are online, then filters by distance.
// Returns mechanics sorted nearest-first, within the given radius.
//
// Why not filter by distance in Firestore?
// Firestore can't do radius-based geo queries natively. So we fetch all
// online mechanics and calculate the distance ourselves using Haversine math.
export async function findNearbyMechanics(customerLocation, radiusMiles = 25) {
  // Build a query: get all users who are mechanics AND currently available
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'mechanic'),
    where('isAvailable', '==', true)
  );

  const snap = await getDocs(q); // Fetch all matching documents at once
  const mechanics = [];

  snap.forEach((d) => {
    const data = d.data();
    // Only include mechanics who have shared their location
    if (data.location) {
      const dist = haversineDistance(customerLocation, data.location);
      if (dist <= radiusMiles) {
        // Spread the document data and add the uid and calculated distance
        mechanics.push({ uid: d.id, ...data, distance: dist });
      }
    }
  });

  // Sort by distance so the nearest mechanic appears first
  mechanics.sort((a, b) => a.distance - b.distance);
  return mechanics;
}

// ─── acceptJob ────────────────────────────────────────────────────────────────
// Called when a mechanic taps "Accept" on a pending job.
// updateDoc only changes the specified fields — other fields are left alone.
export async function acceptJob(jobId, mechanicId) {
  await updateDoc(doc(db, 'jobs', jobId), {
    mechanicId,              // Assign this mechanic to the job
    status: JOB_STATUS.ACCEPTED,
    updatedAt: serverTimestamp(),
  });
}

// ─── updateJobStatus ──────────────────────────────────────────────────────────
// Advances the job through the status lifecycle:
// ACCEPTED → EN_ROUTE → IN_PROGRESS → COMPLETE
export async function updateJobStatus(jobId, status) {
  await updateDoc(doc(db, 'jobs', jobId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ─── updateMechanicLocationOnJob ──────────────────────────────────────────────
// Writes the mechanic's current GPS position to the job document.
// Called every 10 seconds while the mechanic is on an active job.
// The customer's TrackJobScreen listens for this in real time and moves
// the mechanic's pin on the map.
export async function updateMechanicLocationOnJob(jobId, location) {
  await updateDoc(doc(db, 'jobs', jobId), {
    mechanicCurrentLocation: location, // { lat, lng }
    updatedAt: serverTimestamp(),
  });
}

// ─── subscribeToJob ───────────────────────────────────────────────────────────
// Sets up a real-time listener on a single job document.
// `callback` is called immediately with the current data, then again
// every time ANY field in the document changes.
// Returns an unsubscribe function — call it in useEffect cleanup to stop listening.
export function subscribeToJob(jobId, callback) {
  return onSnapshot(doc(db, 'jobs', jobId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

// ─── subscribeToPendingJobs ───────────────────────────────────────────────────
// Listens for all jobs with status 'pending' in real time.
// Used on MechanicHomeScreen to show the live list of open requests.
// The callback receives an array of job objects every time the list changes.
export function subscribeToPendingJobs(callback) {
  const q = query(collection(db, 'jobs'), where('status', '==', JOB_STATUS.PENDING));
  return onSnapshot(q, (snap) => {
    const jobs = [];
    snap.forEach((d) => jobs.push({ id: d.id, ...d.data() }));
    callback(jobs);
  });
}

// ─── subscribeMechanicActiveJob ───────────────────────────────────────────────
// Listens for a mechanic's current active job (any status that isn't pending or complete).
// Used on MechanicHomeScreen to show the "you have an active job" banner
// and redirect to ActiveJobScreen.
export function subscribeMechanicActiveJob(mechanicId, callback) {
  const q = query(
    collection(db, 'jobs'),
    where('mechanicId', '==', mechanicId),
    // 'in' checks if the field matches any value in the array
    where('status', 'in', [JOB_STATUS.ACCEPTED, JOB_STATUS.EN_ROUTE, JOB_STATUS.IN_PROGRESS])
  );
  return onSnapshot(q, (snap) => {
    if (!snap.empty) {
      const d = snap.docs[0]; // There should only ever be one active job at a time
      callback({ id: d.id, ...d.data() });
    } else {
      callback(null); // No active job
    }
  });
}

// ─── subscribeCustomerActiveJob ───────────────────────────────────────────────
// Listens for the customer's current open job (pending through in-progress).
// Used on CustomerHomeScreen to show the status banner and track button.
export function subscribeCustomerActiveJob(customerId, callback) {
  const q = query(
    collection(db, 'jobs'),
    where('customerId', '==', customerId),
    where('status', 'in', [
      JOB_STATUS.PENDING,
      JOB_STATUS.ACCEPTED,
      JOB_STATUS.EN_ROUTE,
      JOB_STATUS.IN_PROGRESS,
    ])
  );
  return onSnapshot(q, (snap) => {
    if (!snap.empty) {
      const d = snap.docs[0];
      callback({ id: d.id, ...d.data() });
    } else {
      callback(null); // No active job — show the "find mechanics" UI
    }
  });
}
