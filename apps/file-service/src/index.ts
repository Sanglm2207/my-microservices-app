import express from 'express';
import http from 'http';
import config from './config';
import logger from 'logger';
import { errorHandler } from 'middlewares';
import apiRoutes from './routes';
import { setupGracefulShutdown } from 'utils';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

// Routes
app.use('/api/v1', apiRoutes);

// Health Check
app.get('/health', (req, res) => res.status(200).send('File service is healthy!'));

// Error Handler
app.use(errorHandler);

server.listen(config.port, () => {
    logger.info(`File service is running on http://localhost:${config.port}`);
    // Service này không có kết nối DB lâu dài nên chỉ cần shutdown server
    setupGracefulShutdown(server);
});