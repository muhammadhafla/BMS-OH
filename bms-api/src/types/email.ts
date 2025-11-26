export interface PasswordResetEmailData {
  to: string;
  userName: string;
  resetToken: string;
  resetUrl: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}