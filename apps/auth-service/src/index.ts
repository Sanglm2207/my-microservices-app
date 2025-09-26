import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import config from './config';
import apiRoutes from './routes';
import { errorHandler } from 'middlewares';
import logger from 'logger';
import { setupSwagger } from 'swagger-docs';
import { startUserConsumer } from './consumers/user.consumer';
import { setupGracefulShutdown, addCleanupAction } from 'utils';
import { prisma } from 'database';
import { redisClient } from 'cache';
import { startSagaConsumer } from './consumers/saga.consumer';

const app = express();
const server = http.createServer(app);

// Middlewares, Swagger, Routes...
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
setupSwagger(app, {
    title: 'Auth Service API', version: '1.0.0',
    description: 'API docs for Auth Service',
    apiBaseUrl: `http://localhost:${config.port}`, apiDocsPath: '/api-docs'
});
app.use('/api/v1', apiRoutes);
app.get('/health', (req, res) => res.send('Auth service is healthy!'));
app.use(errorHandler);

// Server & Consumer Initialization
const startServer = async () => {
    try {
        await startUserConsumer();
        await startSagaConsumer();

        server.listen(config.port, () => {
            logger.info(`Auth service running on http://localhost:${config.port}`);

            // Setup Graceful Shutdown
            addCleanupAction(() => prisma.$disconnect());
            addCleanupAction(() => redisClient.quit());
            // addCleanupAction(() => rabbitmqConnection.close()); // TODO: Refactor producer
            setupGracefulShutdown(server);
        });

    } catch (error) {
        logger.error({ error }, "Failed to start auth service");
        process.exit(1);
    }
}

startServer();