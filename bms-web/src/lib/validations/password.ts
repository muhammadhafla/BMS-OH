import { z } from 'zod';

// Password strength validation
const passwordStrength = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

// Password strength checker
export const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  isValid: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;

  // Check length
  if (password.length >= passwordStrength.minLength) {
    score += 25;
  } else {
    feedback.push(`Password must be at least ${passwordStrength.minLength} characters long`);
  }

  // Check uppercase
  if (/[A-Z]/.test(password)) {
    score += 25;
  } else {
    feedback.push('Password must contain at least one uppercase letter');
  }

  // Check lowercase
  if (/[a-z]/.test(password)) {
    score += 25;
  } else {
    feedback.push('Password must contain at least one lowercase letter');
  }

  // Check numbers and special characters
  if (/\d/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 25;
  } else {
    feedback.push('Password must contain at least one number and one special character');
  }

  return {
    score,
    feedback,
    isValid: score >= 75 // Requires at least 3 of 4 criteria
  };
};

// Change password validation schema
export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  
  newPassword: z.string()
    .min(passwordStrength.minLength, `Password must be at least ${passwordStrength.minLength} characters long`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
  
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
}).refine((data) => {
  // Check if new password matches confirmation
  return data.newPassword === data.confirmPassword;
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => {
  // Check if new password is different from current password
  return data.newPassword !== data.currentPassword;
}, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required'),
  
  newPassword: z.string()
    .min(passwordStrength.minLength, `Password must be at least ${passwordStrength.minLength} characters long`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
  
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
}).refine((data) => {
  return data.newPassword === data.confirmPassword;
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// TypeScript types for form data
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Password strength levels
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export const getPasswordStrengthLevel = (score: number): PasswordStrength => {
  if (score < 25) return 'weak';
  if (score < 50) return 'fair';
  if (score < 75) return 'good';
  return 'strong';
};

// Default values for forms
export const defaultChangePasswordValues: ChangePasswordFormData = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export const defaultForgotPasswordValues: ForgotPasswordFormData = {
  email: '',
};

export const defaultResetPasswordValues: ResetPasswordFormData = {
  token: '',
  newPassword: '',
  confirmPassword: '',
};