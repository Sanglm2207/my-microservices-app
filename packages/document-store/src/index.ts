import mongoose from 'mongoose';

// Tắt strictQuery để chuẩn bị cho Mongoose v8
mongoose.set('strictQuery', false);

/**
 * Hàm để kết nối đến MongoDB.
 * Hàm này sẽ được gọi bởi service (ví dụ: user-service) lúc khởi động.
 * @param mongoUri - Chuỗi kết nối MongoDB.
 */
export const connectMongo = async (mongoUri: string) => {
    if (mongoose.connection.readyState >= 1) {
        return; // Đã kết nối
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('MongoDB connected successfully.');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        // Thoát tiến trình nếu không kết nối được DB
        process.exit(1);
    }
};

// Export mongoose để các service có thể sử dụng để tạo Model
export { mongoose };