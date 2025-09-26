import express from 'express';
import http from 'http';
import config from './config';
import logger from 'logger';
import { getRabbitMQConnection, startUserConsumer } from './consumers/user.consumer';
import { createWebSocketServer } from './services/websocket.service';
import { setupGracefulShutdown, addCleanupAction } from 'utils';

const app = express();
const server = http.createServer(app);

app.get('/health', (req, res) => res.send('Notification service is healthy!'));

const start = async () => {
    try {
        createWebSocketServer(server);
        await startUserConsumer();

        server.listen(config.port, () => {
            logger.info(`Notification service (HTTP & WebSocket) is running on http://localhost:${config.port}`);

            // Setup Graceful Shutdown
            addCleanupAction(async () => {
                const connection = getRabbitMQConnection();
                if (connection) {
                    await connection.close();
                }
            });
            setupGracefulShutdown(server);
        });

    } catch (error) {
        logger.error({ error }, 'Failed to start notification service');
        process.exit(1);
    }
};

start();