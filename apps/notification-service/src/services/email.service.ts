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