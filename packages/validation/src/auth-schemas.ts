import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters long'),
        name: z.string().optional(),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required'),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email('A valid email is required to reset your password.'),
    }),
});

// Schema cho request đặt lại mật khẩu mới
export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Reset token is required.'),
        newPassword: z.string().min(8, 'New password must be at least 8 characters long.'),
    }),
});