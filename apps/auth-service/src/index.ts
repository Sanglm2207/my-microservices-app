import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import config from './config';
import apiRoutes from './routes';
import { errorHandler } from 'middlewares';
import logger from 'logger';
import { setupSwagger } from 'swagger-docs';

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Gắn tất cả routes vào prefix /api/v1
app.use('/api/v1', apiRoutes);

app.get('/health', (req, res) => res.send('Auth service is healthy and running!'));

app.use(errorHandler);

setupSwagger(app, {
    title: 'Auth Service API',
    version: '1.0.0',
    description: 'API documentation for the Authentication Service',
    apiBaseUrl: `http://localhost:${config.port}`,
    apiDocsPath: '/api-docs'
});

app.listen(config.port, () => {
    logger.info(`Auth service is running on http://localhost:${config.port}`);
});