import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCMGkApl0PtsdIv91ABO0GMngvm4ikBgpE',
  authDomain: 'techconnect-8f92a.firebaseapp.com',
  projectId: 'techconnect-8f92a',
  storageBucket: 'techconnect-8f92a.firebasestorage.app',
  messagingSenderId: '809674310740',
  appId: '1:809674310740:web:5493c28f91b236269719c1',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);
