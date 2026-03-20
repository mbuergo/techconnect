// authService.js — all Firebase Authentication and user profile logic.
// Screens call these functions instead of calling Firebase directly,
// which keeps all the auth code in one place.

import {
  createUserWithEmailAndPassword, // Creates a new Firebase Auth account
  signInWithEmailAndPassword,      // Signs in an existing user
  signOut,                         // Signs the current user out
} from 'firebase/auth';

import {
  doc,             // Creates a reference to a Firestore document path
  setDoc,          // Writes (or overwrites) a document
  getDoc,          // Reads a document once
  serverTimestamp, // Tells Firestore to use the server's current time (not the phone's clock)
} from 'firebase/firestore';

import { auth, db } from '../config/firebase';

// ─── register ─────────────────────────────────────────────────────────────────
// Creates a new Firebase Auth account AND a matching Firestore user document.
// We do both because Firebase Auth only stores email/password — all other
// profile data (name, role, rating) lives in Firestore.
export async function register(email, password, name) {
  // Step 1: Create the auth account. This throws an error if the email is taken.
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // Step 2: Create a Firestore document for this user.
  // doc(db, 'users', uid) is the path: users/{uid}
  // setDoc writes the whole document (creates it if it doesn't exist).
  await setDoc(doc(db, 'users', credential.user.uid), {
    name,
    email,
    role: null,          // Role is set on the next screen (RoleSelectScreen)
    averageRating: 0,    // Starts at 0, updated as ratings come in
    totalRatings: 0,     // Count of ratings received, used to calculate average
    createdAt: serverTimestamp(), // Recorded by Firebase server, not the device
  });

  return credential.user; // Return the user object in case the caller needs it
}

// ─── login ────────────────────────────────────────────────────────────────────
// Signs in with email and password. Firebase handles the session automatically.
// After this succeeds, onAuthStateChanged in App.js fires and redirects the user.
export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// ─── logout ───────────────────────────────────────────────────────────────────
// Signs the user out. Firebase clears the session from AsyncStorage,
// and onAuthStateChanged in App.js fires with null, redirecting to Login.
export async function logout() {
  await signOut(auth);
}

// ─── setUserRole ──────────────────────────────────────────────────────────────
// Called once on RoleSelectScreen to permanently assign the user's role.
// { merge: true } means "update these fields without erasing the rest of the document."
// Without merge, setDoc would wipe out the name/email/rating we set during register.
export async function setUserRole(uid, role) {
  const base = {
    role,
    updatedAt: serverTimestamp(),
  };

  // Add role-specific default fields so the document has the right shape
  // from the start, even before the user fills them in.
  const extra =
    role === 'mechanic'
      ? {
          bio: '',
          specialties: [],     // Array of strings like ['Brakes', 'Engine']
          isAvailable: false,  // Whether the mechanic is accepting jobs
          location: null,      // { lat, lng } — updated while online
          profilePhotoUrl: '', // Firebase Storage download URL
        }
      : {
          vehicles: [], // Array of vehicle objects added on VehicleSetupScreen
        };

  // merge: true = update existing doc instead of replacing it entirely
  await setDoc(doc(db, 'users', uid), { ...base, ...extra }, { merge: true });
}

// ─── getCurrentUserProfile ────────────────────────────────────────────────────
// Fetches a user's full profile document from Firestore by their uid.
// Returns the data as a plain JS object, or null if the document doesn't exist.
export async function getCurrentUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  // snap.exists() is false if no document was found at that path
  // We spread snap.data() and add uid separately (uid isn't stored in the document itself)
  return snap.exists() ? { uid, ...snap.data() } : null;
}
