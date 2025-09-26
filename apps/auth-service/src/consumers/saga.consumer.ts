import amqp from 'amqplib';
import config from '../config';
import logger from 'logger';
import { prisma } from 'database';

const SAGA_EXCHANGE = 'saga_exchange';
const AUTH_SAGA_QUEUE = 'auth_saga_queue';

export const startSagaConsumer = async () => {
    try {
        const connection = await amqp.connect(config.rabbitmqUrl);
        const channel = await connection.createChannel();

        // Auth-service lắng nghe các sự kiện từ notification-service
        await channel.assertExchange(SAGA_EXCHANGE, 'topic', { durable: true });
        await channel.assertQueue(AUTH_SAGA_QUEUE, { durable: true });
        // Bind vào các routing key cụ thể
        await channel.bindQueue(AUTH_SAGA_QUEUE, SAGA_EXCHANGE, 'notification.email.sent');
        await channel.bindQueue(AUTH_SAGA_QUEUE, SAGA_EXCHANGE, 'notification.email.failed');

        logger.info(`[*] Auth-service is waiting for Saga messages.`);

        channel.consume(AUTH_SAGA_QUEUE, async (msg) => {
            if (msg) {
                const message = JSON.parse(msg.content.toString());
                const { userId } = message.payload;

                try {
                    if (message.type === 'VERIFICATION_EMAIL_SENT') {
                        // Saga thành công: Cập nhật trạng thái user
                        await prisma.user.update({
                            where: { id: userId },
                            data: { status: 'ACTIVE' },
                        });
                        logger.info({ userId }, 'Saga completed: User registration is now ACTIVE.');

                    } else if (message.type === 'VERIFICATION_EMAIL_FAILED') {
                        // Saga thất bại: Thực hiện hành động bù trừ (Compensating Action)
                        logger.error({ payload: message.payload }, 'Saga failed: Verification email failed to send. Rolling back user creation.');
                        await prisma.user.delete({ where: { id: userId } });
                        // Hoặc update status: await prisma.user.update({ where: { id: userId }, data: { status: 'FAILED' } });
                    }
                    channel.ack(msg);
                } catch (error) {
                    logger.error({ error, userId }, 'Error processing Saga message in auth-service');
                    channel.nack(msg);
                }
            }
        });
    } catch (error) {
        logger.error({ error }, 'Failed to start Saga consumer in auth-service');
    }
};