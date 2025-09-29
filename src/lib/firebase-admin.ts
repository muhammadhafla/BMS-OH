import {initializeApp, getApps, App, cert, getApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';

// Decode the base64 encoded service account key
const serviceAccountBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;

if (!serviceAccountBase64) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Firebase Admin SDK credentials are not set. App will not function correctly in production.');
  } else {
    console.warn('Firebase Admin SDK credentials not set. Using unauthenticated access for local development. Firestore security rules may block operations.');
  }
}

const getServiceAccount = () => {
  if (!serviceAccountBase64) return undefined;
  try {
    const decodedKey = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
    return JSON.parse(decodedKey);
  } catch (error) {
    console.error('Failed to parse Firebase Admin SDK credentials:', error);
    return undefined;
  }
};

let app: App;

if (!getApps().length) {
  const serviceAccount = getServiceAccount();
  app = initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
  });
} else {
  app = getApp();
}

export const firestore = getFirestore(app);
export const auth = getAuth(app);
