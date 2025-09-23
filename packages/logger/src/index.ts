import pino from 'pino';

// Cấu hình logger
// - Trong môi trường development, sử dụng pino-pretty để log đẹp và dễ đọc.
// - Trong các môi trường khác (production, staging), output ra JSON thuần túy.
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    ...(process.env.NODE_ENV === 'development' && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
                ignore: 'pid,hostname',
            },
        },
    }),
});

export default logger;