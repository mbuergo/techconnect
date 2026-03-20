// firebase.js — connects the app to your Firebase project.
// This file is imported by every service file that needs to talk to Firebase.
// It runs once when the app starts and exports three things:
//   auth    — handles login/logout/registration
//   db      — Firestore database (stores users, jobs, ratings)
//   storage — Firebase Storage (stores profile photos)

import { initializeApp } from 'firebase/app';

// initializeAuth is the mobile-safe version of getAuth.
// getReactNativePersistence tells Firebase to remember the login session
// even when the app is closed and reopened.
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';

import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// AsyncStorage is like localStorage for React Native — it saves data to
// the phone's disk so it persists between app sessions.
import AsyncStorage from '@react-native-async-storage/async-storage';

// This config object identifies YOUR specific Firebase project.
// These values come from: Firebase Console → Project Settings → Your Apps.
// Note: Firebase client keys like these are safe to include in mobile apps —
// they identify the project, but your Firestore Security Rules control access.
const firebaseConfig = {
  apiKey: 'AIzaSyCMGkApl0PtsdIv91ABO0GMngvm4ikBgpE',
  authDomain: 'techconnect-8f92a.firebaseapp.com',
  projectId: 'techconnect-8f92a',
  storageBucket: 'techconnect-8f92a.firebasestorage.app',
  messagingSenderId: '809674310740',
  appId: '1:809674310740:web:5493c28f91b236269719c1',
};

// Initialize the Firebase app with our config. This must happen before
// anything else — auth, db, and storage all depend on this app instance.
const app = initializeApp(firebaseConfig);

// Set up Authentication with phone-disk persistence.
// Without getReactNativePersistence(AsyncStorage), the user would be
// logged out every time they close and reopen the app.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore is our NoSQL database. Data is stored as documents inside collections.
// Example: the "users" collection has one document per user, keyed by their uid.
export const db = getFirestore(app);

// Firebase Storage stores binary files (photos, videos).
// We use it for mechanic profile photos.
export const storage = getStorage(app);
