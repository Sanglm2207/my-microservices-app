import nodemailer from 'nodemailer';
import config from '../config';
import logger from 'logger';

const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    auth: {
        user: config.email.user,
        pass: config.email.pass,
    },
});

interface WelcomeEmailPayload {
    to: string;
    name: string;
}

export const sendWelcomeEmail = async (payload: WelcomeEmailPayload): Promise<void> => {
    const { to, name } = payload;
    try {
        const info = await transporter.sendMail({
            from: config.email.from,
            to,
            subject: '🎉 Welcome to Our Platform!',
            text: `Hi ${name},\n\nThank you for registering. We are excited to have you on board!`,
            html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px 40px; border: 1px solid #ddd; border-radius: 8px;">
          <h1 style="color: #4A90E2;">Welcome, ${name}!</h1>
          <p style="font-size: 16px;">Thank you for registering. We are excited to have you on board!</p>
          <p style="margin-top: 30px; font-size: 12px; color: #888;">If you did not sign up for this account, you can ignore this email.</p>
        </div>
      `,
        });
        logger.info({ messageId: info.messageId, recipient: to }, 'Welcome email sent successfully');
    } catch (error) {
        logger.error({ error, recipient: to }, 'Failed to send welcome email');
    }
};

export interface ResetPasswordEmailPayload {
    to: string;
    name: string | null;
    resetLink: string;
}

export const sendPasswordResetEmail = async (payload: ResetPasswordEmailPayload) => {
    const { to, name, resetLink } = payload;
    try {
        const info = await transporter.sendMail({
            from: config.email.from,
            to,
            subject: 'Your Password Reset Request',
            text: `Hi ${name},\n\nPlease click the following link to reset your password: ${resetLink}\n\nThis link will expire in 15 minutes.`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Hi ${name || 'there'},</p>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <a href="${resetLink}" style="background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          <p style="margin-top: 20px;">This link will expire in 15 minutes.</p>
        </div>
      `,
        });
        logger.info({ messageId: info.messageId, recipient: to }, 'Password reset email sent');
    } catch (error) {
        logger.error({ error, recipient: to }, 'Failed to send password reset email');
    }
};