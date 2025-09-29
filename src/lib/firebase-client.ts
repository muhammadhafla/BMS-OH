// src/lib/firebase-client.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'studio-7965627895-c51d6',
  appId: '1:970195522489:web:96d1c13f85b7c4f78b5c68',
  apiKey: 'AIzaSyA-2u2gUxSL8vm_TeKFFaQpYYsy63Z254Q',
  authDomain: 'studio-7965627895-c51d6.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '970195522489',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);

export { app, auth, firestore };
