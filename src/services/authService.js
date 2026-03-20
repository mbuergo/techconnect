import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export async function register(email, password, name) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  // Create user doc without role — role is set on RoleSelectScreen
  await setDoc(doc(db, 'users', credential.user.uid), {
    name,
    email,
    role: null,
    averageRating: 0,
    totalRatings: 0,
    createdAt: serverTimestamp(),
  });
  return credential.user;
}

export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout() {
  await signOut(auth);
}

export async function setUserRole(uid, role) {
  const base = {
    role,
    updatedAt: serverTimestamp(),
  };
  const extra =
    role === 'mechanic'
      ? { bio: '', specialties: [], isAvailable: false, location: null, profilePhotoUrl: '' }
      : { vehicles: [] };

  await setDoc(doc(db, 'users', uid), { ...base, ...extra }, { merge: true });
}

export async function getCurrentUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}
