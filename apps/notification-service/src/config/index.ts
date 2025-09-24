import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
    port: process.env.PORT || 4004,
    nodeEnv: process.env.NODE_ENV,
    rabbitmqUrl: process.env.RABBITMQ_URL as string,
    email: {
        host: process.env.EMAIL_HOST as string,
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        user: process.env.EMAIL_USER as string,
        pass: process.env.EMAIL_PASS as string,
        from: process.env.EMAIL_FROM as string,
    },
};

// Validate required config
if (!config.rabbitmqUrl || !config.email.host || !config.email.user || !config.email.pass) {
    console.error('FATAL ERROR: Missing required environment variables for notification-service.');
    process.exit(1);
}

export default config;