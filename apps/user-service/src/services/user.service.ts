import { UserProfileModel } from '../models/user.model';
import axios from 'axios';
import config from '../config';

interface UserProfileUpdatePayload {
    name?: string;
    avatar?: string;
    bio?: string;
}

/**
 * Lấy hoặc tạo mới hồ sơ người dùng.
 * @param userId - ID người dùng từ header (do API Gateway cung cấp).
 * @returns Hồ sơ người dùng.
 */
export const findOrCreateUserProfile = async (userId: string) => {
    let userProfile = await UserProfileModel.findById(userId).exec();

    if (!userProfile) {
        try {
            // Gọi đến auth-service để lấy thông tin cơ bản
            const response = await axios.get(`${config.authServiceInternalUrl}/users/${userId}`);
            const { email, name } = response.data;

            userProfile = await UserProfileModel.create({
                _id: userId,
                email: email,
                name: name || `User_${userId.substring(0, 6)}`,
            });
        } catch (error) {
            console.error("Failed to fetch user data from auth-service", error);
            // Nếu auth-service bị lỗi, vẫn tạo profile cơ bản
            userProfile = await UserProfileModel.create({ _id: userId, email: 'unknown@service.error' });
        }
    }

    return userProfile;
};

/**
 * Cập nhật hồ sơ người dùng.
 * @param userId - ID người dùng cần cập nhật.
 * @param payload - Dữ liệu cần cập nhật.
 * @returns Hồ sơ người dùng sau khi đã cập nhật.
 */
export const updateUserProfile = async (
    userId: string,
    payload: UserProfileUpdatePayload
) => {
    const updatedProfile = await UserProfileModel.findByIdAndUpdate(
        userId,
        { $set: payload },
        { new: true, runValidators: true } // new: true để trả về document sau khi update
    ).exec();

    return updatedProfile;
};