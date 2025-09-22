import { mongoose } from 'document-store';
import { User as UserProfile } from 'common-types';

// Mongoose schema sẽ linh hoạt hơn interface
const userProfileSchema = new mongoose.Schema<UserProfile>(
    {
        // ID người dùng sẽ được lấy từ auth-service và lưu ở đây
        _id: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        name: { type: String },
        avatar: { type: String },
        bio: { type: String, maxlength: 250 },
        // more fields can be added as needed
    },
    {
        // _id: false để Mongoose không tự tạo ObjectId
        _id: false,
        timestamps: true, // Tự động thêm createdAt và updatedAt
    }
);

// Tạo model từ schema
export const UserProfileModel = mongoose.model<UserProfile>('UserProfile', userProfileSchema);