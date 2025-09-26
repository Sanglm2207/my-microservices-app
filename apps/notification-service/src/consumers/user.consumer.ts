import amqp from 'amqplib';
import config from '../config';
import logger from 'logger';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/email.service';
import { broadcast } from '../services/websocket.service';
import {
    publishVerificationEmailFailedEvent,
    publishVerificationEmailSentEvent
} from 'message-producer'; // <-- Import các hàm publish phản hồi

// --- Constants for Topology ---
const SAGA_EXCHANGE = 'saga_exchange';
const USER_EVENTS_EXCHANGE = 'user_events_exchange';

// Queue này sẽ lắng nghe các sự kiện nghiệp vụ và saga
const NOTIFICATION_QUEUE = 'notification_queue';

let connection: amqp.Connection | null = null;
export const getRabbitMQConnection = () => connection;

export const startUserConsumer = async (): Promise<void> => {
    try {
        connection = await amqp.connect(config.rabbitmqUrl);
        const channel = await connection.createChannel();

        // --- Thiết lập Exchanges ---
        await channel.assertExchange(SAGA_EXCHANGE, 'topic', { durable: true });
        await channel.assertExchange(USER_EVENTS_EXCHANGE, 'direct', { durable: true });

        // --- Thiết lập Queue và Bindings ---
        await channel.assertQueue(NOTIFICATION_QUEUE, { durable: true });
        // Lắng nghe sự kiện bắt đầu Saga từ auth-service
        await channel.bindQueue(NOTIFICATION_QUEUE, SAGA_EXCHANGE, 'auth.account.pending');
        // Lắng nghe các sự kiện nghiệp vụ thông thường
        await channel.bindQueue(NOTIFICATION_QUEUE, USER_EVENTS_EXCHANGE, 'user.events');

        logger.info(`[*] Waiting for messages in queue: ${NOTIFICATION_QUEUE}`);
        channel.prefetch(1);

        // --- Logic xử lý message ---
        channel.consume(NOTIFICATION_QUEUE, async (msg) => {
            if (msg !== null) {
                const message = JSON.parse(msg.content.toString());
                logger.info({ message }, `[x] Received message with type: ${message.type}`);

                try {
                    // Xử lý sự kiện Saga
                    if (message.type === 'ACCOUNT_PENDING') {
                        const { id, email, name, verificationToken } = message.payload;
                        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                        const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

                        try {
                            // Giả lập lỗi gửi email để test Saga rollback
                            // if (Math.random() > 0.5) throw new Error("SMTP server is down!");

                            // Thực hiện công việc: gửi email
                            await sendVerificationEmail({ to: email, name, verificationLink });

                            // Bắn sự kiện SAGA THÀNH CÔNG
                            await publishVerificationEmailSentEvent({ userId: id });

                        } catch (error: any) {
                            // Bắn sự kiện SAGA THẤT BẠI
                            await publishVerificationEmailFailedEvent({ userId: id, error: error.message });
                        }
                    }

                    // Xử lý các sự kiện nghiệp vụ thông thường (không thuộc Saga)
                    if (message.type === 'PASSWORD_RESET_REQUESTED') {
                        const resetFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                        const resetLink = `${resetFrontendUrl}/reset-password?token=${message.payload.resetToken}`;
                        await sendPasswordResetEmail({
                            to: message.payload.email,
                            name: message.payload.name,
                            resetLink: resetLink,
                        });
                    }

                    channel.ack(msg); // Xử lý thành công
                } catch (error) {
                    logger.error({ error, messageContent: msg.content.toString() }, 'Critical error processing message. Message will be nacked.');
                    // Từ chối message để nó có thể đi vào DLQ (nếu được cấu hình)
                    channel.nack(msg, false, false);
                }
            }
        });
    } catch (error) {
        logger.error({ error }, `Failed to start RabbitMQ consumer. Retrying in 10s...`);
        setTimeout(startUserConsumer, 10000);
    }
};