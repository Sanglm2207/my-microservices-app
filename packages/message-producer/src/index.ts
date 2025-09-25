import amqp from 'amqplib';
import { Channel, Connection } from 'amqplib';

// Biến để cache (singleton pattern)
let connection: Connection | null = null;
let channel: Channel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL;

const getChannel = async (): Promise<Channel> => {
    if (channel) {
        return channel;
    }
    if (!RABBITMQ_URL) {
        throw new Error('RABBITMQ_URL environment variable is not set.');
    }
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        console.log('✅ RabbitMQ channel created successfully.');
        return channel;
    } catch (error) {
        console.error('❌ Failed to create RabbitMQ channel:', error);
        throw error;
    }
};

// --- Định nghĩa các hàm publish sự kiện ---
const USER_EVENTS_QUEUE = 'user_events';

export interface AccountCreatedPayload {
    id: string;
    email: string;
    name: string | null;
}

export const publishAccountCreatedEvent = async (payload: AccountCreatedPayload): Promise<void> => {
    try {
        const ch = await getChannel();
        await ch.assertQueue(USER_EVENTS_QUEUE, { durable: true });

        const message = { type: 'ACCOUNT_CREATED', payload }; // <-- Đổi type ở đây

        ch.sendToQueue(USER_EVENTS_QUEUE, Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log(`[message-producer] Sent '${message.type}' event to queue '${USER_EVENTS_QUEUE}'`);
    } catch (error) {
        console.error(`[message-producer] Error publishing ACCOUNT_CREATED event for user ${payload.email}:`, error);
    }
};

export interface VerificationEmailRequestedPayload {
    email: string;
    name: string | null;
    verificationToken: string;
}

export const publishVerificationEmailRequestedEvent = async (payload: VerificationEmailRequestedPayload): Promise<void> => {
    try {
        const ch = await getChannel();
        await ch.assertQueue(USER_EVENTS_QUEUE, { durable: true });
        const message = { type: 'VERIFICATION_EMAIL_REQUESTED', payload };
        ch.sendToQueue(USER_EVENTS_QUEUE, Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log(`[message-producer] Sent '${message.type}' event to queue '${USER_EVENTS_QUEUE}'`);
    } catch (error) {
        console.error(`[message-producer] Error publishing VERIFICATION_EMAIL_REQUESTED event for ${payload.email}:`, error);
    }
};

export interface PasswordResetPayload {
    email: string;
    name: string | null;
    resetToken: string;
}

export const publishPasswordResetRequestedEvent = async (payload: PasswordResetPayload): Promise<void> => {
    try {
        const ch = await getChannel();
        await ch.assertQueue(USER_EVENTS_QUEUE, { durable: true });
        const message = { type: 'PASSWORD_RESET_REQUESTED', payload };
        ch.sendToQueue(USER_EVENTS_QUEUE, Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log(`[message-producer] Sent '${message.type}' event to queue '${USER_EVENTS_QUEUE}'`);
    } catch (error) {
        console.error(`[message-producer] Error publishing PASSWORD_RESET_REQUESTED event for ${payload.email}:`, error);
    }
};

export interface UserProfileDeletedPayload {
    userId: string;
}

export const publishUserProfileDeletedEvent = async (payload: UserProfileDeletedPayload): Promise<void> => {
    try {
        const ch = await getChannel();
        await ch.assertQueue(USER_EVENTS_QUEUE, { durable: true });

        const message = { type: 'USER_PROFILE_DELETED', payload };

        ch.sendToQueue(USER_EVENTS_QUEUE, Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log(`[message-producer] Sent '${message.type}' event for userId: ${payload.userId}`);
    } catch (error) {
        console.error(`[message-producer] Error publishing USER_PROFILE_DELETED event for userId ${payload.userId}:`, error);
    }
};