import amqp from 'amqplib';
import { Channel, Connection } from 'amqplib';

let connection: Connection | null = null;
let channel: Channel | null = null;
const RABBITMQ_URL = process.env.RABBITMQ_URL;

const getChannel = async (): Promise<Channel> => {
    if (channel) return channel;
    if (!RABBITMQ_URL) throw new Error('RABBITMQ_URL environment variable is not set.');

    try {
        connection = await amqp.connect(RABBITMQ_URL);
        connection.on('error', (err) => {
            console.error('RabbitMQ connection error', err);
            connection = null; channel = null;
        });
        connection.on('close', () => {
            console.warn('RabbitMQ connection closed.');
            connection = null; channel = null;
        });

        channel = await connection.createChannel();
        console.log('✅ RabbitMQ channel created successfully.');
        return channel;
    } catch (error) {
        console.error('❌ Failed to create RabbitMQ channel:', error);
        throw error;
    }
};

const USER_EVENTS_EXCHANGE = 'user_events_exchange';
const USER_EVENTS_ROUTING_KEY = 'user.events';
const SAGA_EXCHANGE = 'saga_exchange';

// --- Saga Events for Registration ---
export interface AccountPendingPayload { id: string; email: string; name: string | null; verificationToken: string; }
export const publishAccountPendingEvent = async (payload: AccountPendingPayload) => {
    const ch = await getChannel();
    await ch.assertExchange(SAGA_EXCHANGE, 'topic', { durable: true });
    const message = { type: 'ACCOUNT_PENDING', payload };
    ch.publish(SAGA_EXCHANGE, 'auth.account.pending', Buffer.from(JSON.stringify(message)), { persistent: true });
};

export interface VerificationEmailSentPayload { userId: string; }
export const publishVerificationEmailSentEvent = async (payload: VerificationEmailSentPayload) => {
    const ch = await getChannel();
    await ch.assertExchange(SAGA_EXCHANGE, 'topic', { durable: true });
    const message = { type: 'VERIFICATION_EMAIL_SENT', payload };
    ch.publish(SAGA_EXCHANGE, 'notification.email.sent', Buffer.from(JSON.stringify(message)), { persistent: true });
};

export interface VerificationEmailFailedPayload { userId: string; error: string; }
export const publishVerificationEmailFailedEvent = async (payload: VerificationEmailFailedPayload) => {
    const ch = await getChannel();
    await ch.assertExchange(SAGA_EXCHANGE, 'topic', { durable: true });
    const message = { type: 'VERIFICATION_EMAIL_FAILED', payload };
    ch.publish(SAGA_EXCHANGE, 'notification.email.failed', Buffer.from(JSON.stringify(message)), { persistent: true });
};

// --- STANDARD BUSINESS EVENTS ---
export interface PasswordResetPayload { email: string; name: string | null; resetToken: string; }
export const publishPasswordResetRequestedEvent = async (payload: PasswordResetPayload) => {
    const ch = await getChannel();
    await ch.assertExchange(USER_EVENTS_EXCHANGE, 'direct', { durable: true });
    const message = { type: 'PASSWORD_RESET_REQUESTED', payload };
    ch.publish(USER_EVENTS_EXCHANGE, USER_EVENTS_ROUTING_KEY, Buffer.from(JSON.stringify(message)), { persistent: true });
};

export interface UserProfileDeletedPayload { userId: string; }
export const publishUserProfileDeletedEvent = async (payload: UserProfileDeletedPayload) => {
    const ch = await getChannel();
    await ch.assertExchange(USER_EVENTS_EXCHANGE, 'direct', { durable: true });
    const message = { type: 'USER_PROFILE_DELETED', payload };
    ch.publish(USER_EVENTS_EXCHANGE, USER_EVENTS_ROUTING_KEY, Buffer.from(JSON.stringify(message)), { persistent: true });
};