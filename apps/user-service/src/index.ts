import express from 'express';
import cors from 'cors';
import { connectMongo } from 'document-store';
import config from './config';
import apiRoutes from './routes';
import { errorHandler } from 'middlewares';

const startServer = async () => {
    // Kết nối đến MongoDB trước khi khởi động server
    await connectMongo(config.mongoUri);

    const app = express();

    app.use(cors({ origin: config.corsOrigin, credentials: true }));
    app.use(express.json());

    // Gắn routes vào prefix /api/v1
    app.use('/api/v1', apiRoutes);

    app.get('/health', (req, res) => res.send('User service is healthy and running!'));

    app.use(errorHandler);

    app.listen(config.port, () => {
        console.log(`User service is running on http://localhost:${config.port}`);
    });
};

startServer();