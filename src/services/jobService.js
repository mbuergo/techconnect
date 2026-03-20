import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { haversineDistance } from './locationService';

export const JOB_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EN_ROUTE: 'enRoute',
  IN_PROGRESS: 'inProgress',
  COMPLETE: 'complete',
};

export async function createJob({ customerId, vehicleInfo, issueDescription, customerLocation }) {
  const ref = await addDoc(collection(db, 'jobs'), {
    customerId,
    mechanicId: null,
    vehicleInfo,
    issueDescription,
    customerLocation,
    status: JOB_STATUS.PENDING,
    mechanicCurrentLocation: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getJob(jobId) {
  const snap = await getDoc(doc(db, 'jobs', jobId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Find available mechanics within radiusMiles and sort by distance from customerLocation.
 */
export async function findNearbyMechanics(customerLocation, radiusMiles = 25) {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'mechanic'),
    where('isAvailable', '==', true)
  );
  const snap = await getDocs(q);
  const mechanics = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data.location) {
      const dist = haversineDistance(customerLocation, data.location);
      if (dist <= radiusMiles) {
        mechanics.push({ uid: d.id, ...data, distance: dist });
      }
    }
  });
  mechanics.sort((a, b) => a.distance - b.distance);
  return mechanics;
}

export async function acceptJob(jobId, mechanicId) {
  await updateDoc(doc(db, 'jobs', jobId), {
    mechanicId,
    status: JOB_STATUS.ACCEPTED,
    updatedAt: serverTimestamp(),
  });
}

export async function updateJobStatus(jobId, status) {
  await updateDoc(doc(db, 'jobs', jobId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function updateMechanicLocationOnJob(jobId, location) {
  await updateDoc(doc(db, 'jobs', jobId), {
    mechanicCurrentLocation: location,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Subscribe to a job document in real time.
 * Returns an unsubscribe function.
 */
export function subscribeToJob(jobId, callback) {
  return onSnapshot(doc(db, 'jobs', jobId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

/**
 * Subscribe to all pending jobs (for mechanic home screen).
 * Returns an unsubscribe function.
 */
export function subscribeToPendingJobs(callback) {
  const q = query(collection(db, 'jobs'), where('status', '==', JOB_STATUS.PENDING));
  return onSnapshot(q, (snap) => {
    const jobs = [];
    snap.forEach((d) => jobs.push({ id: d.id, ...d.data() }));
    callback(jobs);
  });
}

/**
 * Subscribe to the active job for a mechanic (accepted/enRoute/inProgress).
 */
export function subscribeMechanicActiveJob(mechanicId, callback) {
  const q = query(
    collection(db, 'jobs'),
    where('mechanicId', '==', mechanicId),
    where('status', 'in', [JOB_STATUS.ACCEPTED, JOB_STATUS.EN_ROUTE, JOB_STATUS.IN_PROGRESS])
  );
  return onSnapshot(q, (snap) => {
    if (!snap.empty) {
      const d = snap.docs[0];
      callback({ id: d.id, ...d.data() });
    } else {
      callback(null);
    }
  });
}

/**
 * Subscribe to the latest non-complete job for a customer.
 */
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
      callback(null);
    }
  });
}
