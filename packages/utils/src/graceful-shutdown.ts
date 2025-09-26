import { Server } from 'http';
import logger from 'logger';

// Mảng này sẽ lưu trữ các hàm cleanup cần được thực thi khi service tắt.
// Mỗi hàm nên trả về một Promise có thể chờ nó hoàn thành.
const cleanupActions: (() => Promise<any>)[] = [];

/**
 * Đăng ký một hành động dọn dẹp (cleanup action).
 * Các hành động này sẽ được gọi khi service nhận được tín hiệu shutdown.
 * Ví dụ: đóng kết nối database, redis, message broker.
 * @param action - Một hàm async thực hiện việc dọn dẹp.
 */
export const addCleanupAction = (action: () => Promise<any>) => {
    cleanupActions.push(action);
};

/**
 * Thiết lập các listener để xử lý việc tắt service một cách "duyên dáng".
 * @param server - HTTP server instance của service.
 */
export const setupGracefulShutdown = (server: Server) => {

    const shutdown = async (signal: string) => {
        logger.warn(`Received ${signal}. Starting graceful shutdown...`);

        // 1. Ngăn server nhận các kết nối mới, nhưng giữ các kết nối hiện tại
        server.close((err?: Error) => {
            if (err) {
                logger.error(err, 'Error closing HTTP server');
                // Nếu không thể đóng server, buộc thoát
                process.exit(1);
            }
            logger.info('HTTP server closed successfully. No longer accepting new requests.');
        });

        // 2. Thực hiện tuần tự hoặc song song các hành động dọn dẹp
        logger.info(`Performing ${cleanupActions.length} cleanup actions...`);

        try {
            // Chạy tất cả các hành động dọn dẹp một cách song song
            await Promise.all(cleanupActions.map(action => action()));
            logger.info('All cleanup actions completed successfully.');
        } catch (error) {
            logger.error(error, 'Error occurred during cleanup actions.');
        } finally {
            // 3. Sau khi mọi thứ đã xong, thoát tiến trình
            logger.info('Graceful shutdown complete. Exiting process.');
            process.exit(0);
        }
    };

    // Lắng nghe các tín hiệu shutdown từ hệ điều hành
    // SIGINT: Thường được gửi khi nhấn Ctrl+C trong terminal
    process.on('SIGINT', () => shutdown('SIGINT'));

    // SIGTERM: Tín hiệu tắt tiêu chuẩn được gửi bởi các công cụ như Docker, Kubernetes, systemd
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Bắt các lỗi không được xử lý để tránh crash đột ngột
    process.on('uncaughtException', (error) => {
        logger.fatal(error, 'Uncaught Exception. Shutting down...');
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.fatal({ reason, promise }, 'Unhandled Rejection. Shutting down...');
        shutdown('unhandledRejection');
    });
};