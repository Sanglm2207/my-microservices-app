import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import config from './config';
import apiRoutes from './routes';

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Gắn tất cả routes vào prefix /api/v1
app.use('/api/v1', apiRoutes);

app.get('/health', (req, res) => res.send('Auth service is healthy and running!'));

app.listen(config.port, () => {
    console.log(`Auth service is running on http://localhost:${config.port}`);
});