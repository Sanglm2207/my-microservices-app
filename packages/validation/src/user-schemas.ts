import { z } from 'zod';

// Schema cho việc cập nhật profile người dùng (PATCH /users/me)
export const updateUserProfileSchema = z.object({
    body: z.object({
        name: z
            .string()
            .min(2, 'Name must be at least 2 characters long')
            .optional(),
        avatar: z.string().url('Avatar must be a valid URL').optional(),
        bio: z
            .string()
            .max(250, 'Bio cannot exceed 250 characters')
            .optional(),
    }),
});


export const getUsersSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().default('1'),
        limit: z.string().regex(/^\d+$/).optional().default('10'),
        search: z.string().optional(),
    }),
});