// src/lib/services/auth.ts
'use server';

import { auth as adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { redirect } from 'next/navigation';

const sessionCookieName = '__session';

export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // This is a simplified sign-in process for a simulated environment.
    // In a real-world application, you would use the Firebase client SDK
    // to sign in the user, get an ID token, and then post it to the server
    // to create a session cookie. The Admin SDK cannot verify passwords directly.

    // 1. Verify if the user exists.
    const userRecord = await adminAuth.getUserByEmail(email);

    // 2. Since we cannot verify passwords on the server, we will just create a session cookie if the user exists.
    // THIS IS INSECURE FOR PRODUCTION but necessary for this simulated environment.
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(userRecord.uid, { expiresIn });

    cookies().set(sessionCookieName, sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return { success: true };
  } catch (error: any) {
    let errorMessage = 'An unexpected error occurred.';
    
    // Firebase Authentication errors have a 'code' property.
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Email tidak terdaftar. Silakan hubungi administrator Anda.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Format email tidak valid.';
          break;
        default:
          errorMessage = 'Gagal login. Silakan coba lagi nanti.';
          break;
      }
    } else if (error.message) {
        errorMessage = error.message;
    }

    console.error('Authentication Error:', error);
    return { success: false, error: errorMessage };
  }
}

export async function signOut() {
  cookies().delete(sessionCookieName);
  redirect('/');
}

export async function getCurrentUser() {
  const sessionCookie = cookies().get(sessionCookieName)?.value;
  if (!sessionCookie) {
    return null;
  }
  try {
    const decodedIdToken = await getAuth().verifySessionCookie(sessionCookie, true);
    return decodedIdToken;
  } catch (error) {
    return null;
  }
}
