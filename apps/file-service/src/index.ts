import express from 'express';
import config from './config';
import logger from 'logger';
import { errorHandler } from 'middlewares';
import apiRoutes from './routes';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/v1', apiRoutes);
// Health Check
app.get('/health', (req, res) => res.status(200).send('File service is healthy!'));

// Error Handler
app.use(errorHandler);

app.listen(config.port, () => {
    logger.info(`File service is running on http://localhost:${config.port}`);
});