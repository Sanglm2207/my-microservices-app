import { UserProfileModel } from '../models/user.model';
import axios from 'axios';
import config from '../config';
import logger from 'logger';
import { redisClient } from 'cache';
import { publishUserProfileDeletedEvent } from 'message-producer';

interface UserProfileUpdatePayload {
    name?: string;
    avatar?: string;
    bio?: string;
}

// Định nghĩa key cho cache và thời gian hết hạn (TTL)
const USER_PROFILE_CACHE_KEY = (userId: string) => `user-profile:${userId}`;
const CACHE_TTL_SECONDS = 5 * 60; // 5 phút

/**
 * Lấy hoặc tạo mới hồ sơ người dùng.
 * @param userId - ID người dùng từ header (do API Gateway cung cấp).
 * @returns Hồ sơ người dùng.
 */
export const findOrCreateUserProfile = async (userId: string, userEmail: string) => {
    const cacheKey = USER_PROFILE_CACHE_KEY(userId);

    // Tìm trong Redis trước
    try {
        const cachedProfile = await redisClient.get(cacheKey);
        if (cachedProfile) {
            logger.info({ userId }, 'Cache HIT for user profile');
            return JSON.parse(cachedProfile); // Dữ liệu trong Redis là string, cần parse lại
        }
    } catch (error) {
        logger.error({ error, userId }, 'Error reading from Redis cache');
    }

    // Nếu không có trong cache (Cache Miss), đọc từ MongoDB
    logger.info({ userId }, 'Cache MISS for user profile, fetching from DB');
    let userProfile = await UserProfileModel.findById(userId).exec();

    if (!userProfile) {
        // Nếu chưa có profile, tạo một profile mới
        userProfile = await UserProfileModel.create({
            _id: userId,
            email: userEmail,
            name: `User_${userId.substring(0, 6)}`,
        });
    }

    // Lưu kết quả từ DB vào Redis với TTL
    try {
        // .lean() để lấy object thuần túy, không phải Mongoose document
        const profileToCache = userProfile.toObject ? userProfile.toObject() : userProfile;
        await redisClient.set(cacheKey, JSON.stringify(profileToCache), 'EX', CACHE_TTL_SECONDS);
    } catch (error) {
        logger.error({ error, userId }, 'Error setting Redis cache');
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
    // Cập nhật trong MongoDB trước
    const updatedProfile = await UserProfileModel.findByIdAndUpdate(
        userId,
        { $set: payload },
        { new: true }
    ).exec();

    // Nếu cập nhật thành công, xóa (invalidate) cache
    if (updatedProfile) {
        const cacheKey = USER_PROFILE_CACHE_KEY(userId);
        try {
            logger.info({ userId }, 'Invalidating user profile cache');
            await redisClient.del(cacheKey);
        } catch (error) {
            logger.error({ error, userId }, 'Error invalidating Redis cache');
            // Lỗi xóa cache không nên làm hỏng request chính, chỉ cần log lại
        }
    }

    return updatedProfile;
};

export const findAllUsers = async (options: { page: number; limit: number; search?: string }) => {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};
    if (search) {
        whereCondition.OR = [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
        ];
    }

    const users = await UserProfileModel.find(whereCondition)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

    const totalUsers = await UserProfileModel.countDocuments(whereCondition);

    return {
        data: users,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
        totalUsers,
    };
};

export const findUserById = (userId: string) => {
    return UserProfileModel.findById(userId).lean().exec();
};

export const updateUserById = (userId: string, payload: any) => {
    return UserProfileModel.findByIdAndUpdate(userId, { $set: payload }, { new: true }).lean().exec();
};

export const deleteUserProfile = async (userId: string) => {
    const deletedProfile = await UserProfileModel.findByIdAndDelete(userId).exec();

    // Nếu tìm thấy và xóa thành công profile, bắn sự kiện để các service khác xử lý
    if (deletedProfile) {
        await publishUserProfileDeletedEvent({ userId });
    }

    return deletedProfile;
};
