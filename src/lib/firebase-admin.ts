
import * as admin from 'firebase-admin';

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


if (!admin.apps.length) {
  const serviceAccount = getServiceAccount();
  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : undefined,
  });
}

export const firestore = admin.firestore();
export const auth = admin.auth();
