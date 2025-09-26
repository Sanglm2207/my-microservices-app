import express from 'express';
import http from 'http';
import cors from 'cors';
import { connectMongo, mongoose } from 'document-store';
import config from './config';
import apiRoutes from './routes';
import logger from 'logger';
import { errorHandler } from 'middlewares';
import { setupSwagger } from 'swagger-docs';
import { setupGracefulShutdown, addCleanupAction } from 'utils';
import { redisClient } from 'cache';

const app = express();
const server = http.createServer(app);

const startServer = async () => {
    try {
        await connectMongo(config.mongoUri);

        app.use(cors({ origin: config.corsOrigin, credentials: true }));
        app.use(express.json());

        setupSwagger(app, {
            title: 'User Service API', version: '1.0.0',
            description: 'API docs for User Service',
            apiBaseUrl: `http://localhost:${config.port}`, apiDocsPath: '/api-docs'
        });

        app.use('/api/v1', apiRoutes);
        app.get('/health', (req, res) => res.send('User service is healthy!'));
        app.use(errorHandler);

        server.listen(config.port, () => {
            logger.info(`User service running on http://localhost:${config.port}`);

            // Setup Graceful Shutdown
            addCleanupAction(() => mongoose.connection.close());
            addCleanupAction(() => redisClient.quit());
            setupGracefulShutdown(server);
        });

    } catch (error) {
        logger.error({ error }, "Failed to start user service");
        process.exit(1);
    }
};

startServer();