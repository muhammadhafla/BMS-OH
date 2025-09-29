'use server';
//berisi tentang auth//

import { auth as adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_COOKIE_NAME = '__session';

export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // THIS IS INSECURE FOR PRODUCTION.
    // In a real app, you would use the client SDK to sign in, get an ID token,
    // and post it to an API route to create a session cookie.
    // The Admin SDK cannot verify passwords directly.
    const userRecord = await adminAuth.getUserByEmail(email); //berisi tentang auth//

    // If user exists, create a session cookie.
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(userRecord.uid, { expiresIn }); //berisi tentang auth//

    cookies().set(SESSION_COOKIE_NAME, sessionCookie, { //berisi tentang auth//
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return { success: true };
  } catch (error: any) {
    let errorMessage = 'An unexpected error occurred.';
    
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
  cookies().delete(SESSION_COOKIE_NAME); //berisi tentang auth//
  redirect('/');
}

export async function getCurrentUser() {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value; //berisi tentang auth//
  if (!sessionCookie) {
    return null;
  }
  try {
    // Verify the session cookie. In this case an additional check is added to detect
    // if the user's Firebase session was revoked, user deleted/disabled, etc.
    const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true); //berisi tentang auth//
    return decodedIdToken;
  } catch (error) {
    console.log('Error verifying session cookie:', error);
    // Session cookie is invalid. Force user to login again.
    return null;
  }
}
