import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import config from './config';
import proxyRoutes from './routes/proxy';
import { generalRateLimiter, getRateLimitRedisClient } from './middlewares/rateLimiter';
import { setupGracefulShutdown, addCleanupAction } from 'utils';
import logger from 'logger';

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(cookieParser());
app.use('/api/v1', generalRateLimiter);

// Routes
app.get('/health', (req, res) => res.status(200).send('API Gateway is healthy!'));
app.use('/api/v1', proxyRoutes);
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));

// Start Server
server.listen(config.port, () => {
    logger.info(`API Gateway is running on http://localhost:${config.port}`);

    // Setup Graceful Shutdown
    const rateLimitRedisClient = getRateLimitRedisClient();
    if (rateLimitRedisClient) {
        addCleanupAction(() => rateLimitRedisClient.quit());
    }
    setupGracefulShutdown(server);
});