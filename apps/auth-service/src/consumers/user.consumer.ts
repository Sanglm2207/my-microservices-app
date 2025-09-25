import amqp from 'amqplib';
import config from '../config';
import logger from 'logger';
import { prisma } from 'database';

const USER_EVENTS_QUEUE = 'user_events';

export const startUserConsumer = async (): Promise<void> => {
    try {
        const connection = await amqp.connect(config.rabbitmqUrl);
        const channel = await connection.createChannel();

        // Auth-service cũng lắng nghe cùng một queue
        await channel.assertQueue(USER_EVENTS_QUEUE, { durable: true });

        logger.info(`[*] Auth-service is waiting for messages in queue: ${USER_EVENTS_QUEUE}`);

        channel.consume(USER_EVENTS_QUEUE, async (msg) => {
            if (msg !== null) {
                try {
                    const message = JSON.parse(msg.content.toString());
                    logger.info({ message }, `[x] Auth-service received message from ${USER_EVENTS_QUEUE}`);

                    if (message.type === 'USER_PROFILE_DELETED') {
                        const { userId } = message.payload;

                        const user = await prisma.user.findUnique({ where: { id: userId } });

                        if (user) {
                            await prisma.user.delete({ where: { id: userId } });
                            logger.info({ userId }, 'User account deleted from auth database.');
                        } else {
                            logger.warn({ userId }, 'Received USER_PROFILE_DELETED event for a user not found in auth database.');
                        }
                    }

                    channel.ack(msg);
                } catch (error) {
                    logger.error({ error, messageContent: msg.content.toString() }, 'Error processing RabbitMQ message in auth-service');
                    channel.nack(msg, false, false);
                }
            }
        });
    } catch (error) {
        logger.error({ error }, `Failed to start RabbitMQ consumer in auth-service. Retrying in 10s...`);
        setTimeout(startUserConsumer, 10000);
    }
};