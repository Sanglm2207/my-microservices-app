import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import config from './config';
import apiRoutes from './routes';
import { errorHandler } from 'middlewares';
import logger from 'logger';
import { setupSwagger } from 'swagger-docs';
import { startUserConsumer } from './consumers/user.consumer'; // <-- Consumer đã được import

const app = express();

// --- Middleware Setup ---
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// --- Swagger Docs Setup ---
// Gọi setupSwagger trước các routes để nó không bị ảnh hưởng bởi prefix
setupSwagger(app, {
    title: 'Auth Service API',
    version: '1.0.0',
    description: 'API documentation for the Authentication Service',
    apiBaseUrl: `http://localhost:${config.port}`,
    apiDocsPath: '/api-docs'
});

// --- Routes Setup ---
app.use('/api/v1', apiRoutes);
app.get('/health', (req, res) => res.send('Auth service is healthy and running!'));

// --- Error Handler ---
app.use(errorHandler);


// --- Server & Consumer Initialization ---
const startServer = async () => {
    try {
        await startUserConsumer();

        app.listen(config.port, () => {
            logger.info(`Auth service (HTTP & Consumer) is running on http://localhost:${config.port}`);
        });

    } catch (error) {
        logger.error({ error }, "Failed to start the auth service");
        process.exit(1);
    }
}

startServer();