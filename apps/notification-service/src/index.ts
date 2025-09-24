import express from 'express';
import http from 'http';
import config from './config';
import logger from 'logger';
import { startUserConsumer } from './consumers/user.consumer';
import { createWebSocketServer } from './services/websocket.service';

const app = express();
const server = http.createServer(app);

// Endpoint Health Check
app.get('/health', (req, res) => res.send('Notification service is healthy!'));

// Hàm khởi động chính
const start = async () => {
    try {
        // 1. Khởi chạy WebSocket Server và gắn nó vào HTTP server
        createWebSocketServer(server);

        // 2. Bắt đầu lắng nghe các sự kiện từ RabbitMQ
        await startUserConsumer();

        // 3. Khởi động HTTP server
        server.listen(config.port, () => {
            logger.info(`Notification service (HTTP & WebSocket) is running on http://localhost:${config.port}`);
        });
    } catch (error) {
        logger.error({ error }, 'Failed to start notification service');
        process.exit(1);
    }
};

start();