import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import config from './config';
import proxyRoutes from './routes/proxy';

const app = express();

// Middlewares cơ bản
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(cookieParser());
// Không cần app.use(express.json()) vì Gateway chỉ proxy, không đọc body

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('API Gateway is healthy and running!');
});

// Sử dụng proxy routes cho tất cả các request có prefix /api/v1
// Ví dụ: /api/v1/auth/login sẽ được xử lý bởi proxyRoutes
app.use('/api/v1', proxyRoutes);

// Xử lý lỗi 404 cho các route không khớp
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found.' });
});

app.listen(config.port, () => {
    console.log(`API Gateway is running on http://localhost:${config.port}`);
});