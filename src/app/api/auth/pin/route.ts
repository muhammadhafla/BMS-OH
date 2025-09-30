// src/app/api/auth/pin/route.ts

import { NextResponse } from 'next/server';
import { SignJWT, importJWK } from 'jose';

// This secret should be in an environment variable
const JWE_SECRET = process.env.JWE_SECRET;
if (!JWE_SECRET) {
  throw new Error('JWE_SECRET environment variable is not set');
}

/**
 * Generates a random 6-digit PIN.
 */
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * API route to generate and return a time-limited authorization PIN.
 * The PIN is encrypted in a JWE token and sent to the client.
 */
export async function GET() {
  try {
    const pin = generatePin();
    const secretKey = await importJWK({ kty: 'oct', k: JWE_SECRET }, 'HS256');

    const token = await new SignJWT({ pin })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('6h') // Set token to expire in 6 hours
      .sign(secretKey);

    return NextResponse.json({ pin, token });
    
  } catch (error) {
    console.error('Error generating PIN token:', error);
    return NextResponse.json({ error: 'Failed to generate PIN token' }, { status: 500 });
  }
}
