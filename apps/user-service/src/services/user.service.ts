
import { UserProfileModel } from '../models/user.model';

interface UserProfileUpdatePayload {
    name?: string;
    avatar?: string;
    bio?: string;
}

/**
 * Lấy hoặc tạo mới hồ sơ người dùng.
 * @param userId - ID người dùng từ header (do API Gateway cung cấp).
 * @param userEmail - Email người dùng (giả sử Gateway cũng cung cấp).
 * @returns Hồ sơ người dùng.
 */
export const findOrCreateUserProfile = async (userId: string, userEmail: string) => {
    let userProfile = await UserProfileModel.findById(userId).exec();

    if (!userProfile) {
        // Nếu chưa có profile, tạo một profile mới với thông tin cơ bản
        userProfile = await UserProfileModel.create({
            _id: userId,
            email: userEmail,
            name: `User_${userId.substring(0, 6)}`, // Tên mặc định
        });
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