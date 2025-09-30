// src/app/api/auth/verify-pin/route.ts

import { NextResponse } from 'next/server';
import { jwtVerify, importJWK } from 'jose';
import { cookies } from 'next/headers';

const JWE_SECRET = process.env.JWE_SECRET;
if (!JWE_SECRET) {
  throw new Error('JWE_SECRET environment variable is not set');
}

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();
    const token = request.headers.get('Authorization')?.split(' ')[1];

    if (!pin || !token) {
      return NextResponse.json({ success: false, error: 'PIN and token are required' }, { status: 400 });
    }

    const secretKey = await importJWK({ kty: 'oct', k: JWE_SECRET }, 'HS256');
    
    try {
      const { payload } = await jwtVerify(token, secretKey);
      
      if (payload.pin === pin) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
      }
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

  } catch (error) {
    console.error('Error verifying PIN:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
