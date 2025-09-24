import amqp from 'amqplib';
import { Channel, Connection } from 'amqplib';

// Biến để cache (singleton pattern) cho connection và channel
// Giúp tránh việc tạo kết nối mới cho mỗi lần gửi tin nhắn
let connection: Connection | null = null;
let channel: Channel | null = null;

// Đọc URL RabbitMQ từ biến môi trường của service đang gọi
const RABBITMQ_URL = process.env.RABBITMQ_URL;

/**
 * Hàm nội bộ để khởi tạo và lấy một channel RabbitMQ duy nhất.
 * Nếu channel đã tồn tại, nó sẽ được tái sử dụng.
 * @returns {Promise<Channel>} Một channel RabbitMQ.
 */
const getChannel = async (): Promise<Channel> => {
    // Nếu channel đã được cache, trả về ngay lập tức
    if (channel) {
        return channel;
    }

    // Kiểm tra xem biến môi trường đã được cung cấp chưa
    if (!RABBITMQ_URL) {
        console.error('FATAL ERROR: RABBITMQ_URL environment variable is not set.');
        // Trong môi trường thực tế, việc này nên làm sập service để cảnh báo
        throw new Error('RABBITMQ_URL environment variable is not set.');
    }

    try {
        // Tạo kết nối nếu chưa có
        console.log('Attempting to connect to RabbitMQ...');
        connection = await amqp.connect(RABBITMQ_URL);

        connection.on('error', (err) => {
            console.error('RabbitMQ connection error', err);
            // Reset connection và channel để lần gọi sau sẽ thử kết nối lại
            connection = null;
            channel = null;
        });

        connection.on('close', () => {
            console.warn('RabbitMQ connection closed. It will be reopened on the next publish.');
            connection = null;
            channel = null;
        });

        // Tạo channel
        channel = await connection.createChannel();
        console.log('✅ RabbitMQ channel created successfully.');
        return channel;
    } catch (error) {
        console.error('❌ Failed to create RabbitMQ channel:', error);
        throw error;
    }
};

// --- Định nghĩa các hàm publish sự kiện ---

// Tên các queue nên được định nghĩa ở một nơi tập trung
const USER_EVENTS_QUEUE = 'user_events';

// Interface cho payload của sự kiện
export interface UserRegisteredPayload {
    id: string;
    email: string;
    name: string | null;
}

/**
 * Gửi sự kiện khi một người dùng mới đăng ký thành công.
 * @param payload Dữ liệu của người dùng mới.
 */
export const publishUserRegisteredEvent = async (payload: UserRegisteredPayload): Promise<void> => {
    try {
        const ch = await getChannel();

        // Đảm bảo queue tồn tại. Nếu chưa có, nó sẽ được tạo ra.
        // `durable: true` giúp queue tồn tại kể cả khi RabbitMQ khởi động lại.
        await ch.assertQueue(USER_EVENTS_QUEUE, { durable: true });

        // Tạo message với cấu trúc chuẩn { type, payload }
        const message = { type: 'USER_REGISTERED', payload };

        // Gửi message vào queue dưới dạng Buffer
        ch.sendToQueue(USER_EVENTS_QUEUE, Buffer.from(JSON.stringify(message)), {
            persistent: true, // Đảm bảo message được lưu vào đĩa, không bị mất khi RabbitMQ restart
        });

        console.log(`[message-producer] Sent '${message.type}' event to queue '${USER_EVENTS_QUEUE}' with payload:`, payload);
    } catch (error) {
        console.error(`[message-producer] Error publishing USER_REGISTERED event for user ${payload.email}:`, error);
        // Có thể thêm logic retry hoặc gửi cảnh báo ở đây
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