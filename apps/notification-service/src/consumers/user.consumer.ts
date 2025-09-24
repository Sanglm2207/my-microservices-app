import amqp from 'amqplib';
import config from '../config';
import logger from 'logger';
import { sendWelcomeEmail } from '../services/email.service';
import { broadcast } from '../services/websocket.service';

const USER_EVENTS_QUEUE = 'user_events';

export const startUserConsumer = async (): Promise<void> => {
    try {
        const connection = await amqp.connect(config.rabbitmqUrl);
        const channel = await connection.createChannel();

        await channel.assertQueue(USER_EVENTS_QUEUE, { durable: true });

        // Chỉ xử lý 1 message tại một thời điểm để tránh quá tải
        channel.prefetch(1);

        logger.info(`[*] Waiting for messages in queue: ${USER_EVENTS_QUEUE}`);

        channel.consume(USER_EVENTS_QUEUE, (msg) => {
            if (msg !== null) {
                try {
                    const message = JSON.parse(msg.content.toString());
                    logger.info({ message }, `[x] Received message from ${USER_EVENTS_QUEUE}`);

                    // Xử lý sự kiện dựa trên 'type'
                    switch (message.type) {
                        case 'USER_REGISTERED':
                            // 1. Gửi email chào mừng
                            sendWelcomeEmail({
                                to: message.payload.email,
                                name: message.payload.name,
                            });

                            // 2. Broadcast thông báo real-time
                            broadcast({
                                type: 'NEW_USER_REGISTERED',
                                payload: {
                                    email: message.payload.email,
                                    name: message.payload.name,
                                    timestamp: new Date().toISOString(),
                                }
                            });
                            break;

                        // Thêm các case khác ở đây trong tương lai
                        // case 'PASSWORD_RESET_REQUESTED':
                        //   // ...
                        //   break;

                        default:
                            logger.warn({ type: message.type }, 'Received unhandled message type');
                    }

                    channel.ack(msg); // Xác nhận đã xử lý xong
                } catch (error) {
                    logger.error({ error, messageContent: msg.content.toString() }, 'Error processing RabbitMQ message');
                    // Từ chối message nhưng không đưa lại vào queue để tránh vòng lặp lỗi
                    channel.nack(msg, false, false);
                }
            }
        });
    } catch (error) {
        logger.error({ error }, `Failed to start RabbitMQ consumer for ${USER_EVENTS_QUEUE}. Retrying in 10s...`);
        // Chờ 10 giây rồi thử lại, thay vì thoát
        setTimeout(startUserConsumer, 10000);
    }
};