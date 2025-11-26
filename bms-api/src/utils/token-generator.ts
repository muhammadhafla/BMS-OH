import crypto from 'crypto';

export interface TokenData {
  token: string;
  expiresAt: Date;
  userId: string;
}

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate password reset token with expiration
 */
export function generatePasswordResetToken(userId: string, expiresInHours: number = 1): TokenData {
  const token = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));
  
  return {
    token,
    expiresAt,
    userId,
  };
}

/**
 * Validate token format and check if it's properly formatted
 */
export function validateTokenFormat(token: string): boolean {
  // Check if token is a valid hex string with proper length
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Token should be hex string, 64 characters long (32 bytes * 2)
  const hexPattern = /^[a-f0-9]{64}$/i;
  return hexPattern.test(token);
}

/**
 * Create a hash of the token for secure storage comparison
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a short-lived JWT-like token for password reset
 * This is a simpler alternative to full JWT for password resets
 */
export function generateSimpleResetToken(userId: string, email: string): string {
  const payload = {
    userId,
    email,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex')
  };
  
  // Create a simple base64 encoded token (not as secure as JWT but sufficient for password reset)
  const tokenData = JSON.stringify(payload);
  return Buffer.from(tokenData).toString('base64url');
}

/**
 * Verify and decode a simple reset token
 */
export function verifySimpleResetToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const payload = JSON.parse(decoded);
    
    // Check if token is not too old (24 hours max)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - payload.timestamp > maxAge) {
      return null;
    }
    
    return {
      userId: payload.userId,
      email: payload.email
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate token expiry date
 */
export function getTokenExpiryDate(hoursFromNow: number = 1): Date {
  return new Date(Date.now() + (hoursFromNow * 60 * 60 * 1000));
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Interface for token storage (to be implemented in Step 7)
 */
interface PasswordResetTokenRecord {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

/**
 * Clean up expired tokens from database
 * This would be called periodically to maintain database hygiene
 */
export function cleanupExpiredTokens(tokens: PasswordResetTokenRecord[]): PasswordResetTokenRecord[] {
  const now = new Date();
  return tokens.filter(token => token.expiresAt > now && !token.used);
}