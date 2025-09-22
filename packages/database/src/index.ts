import { PrismaClient } from '@prisma/client';

// Khởi tạo một instance duy nhất của PrismaClient để tái sử dụng trong toàn bộ ứng dụng
export const prisma = new PrismaClient();

// Export lại tất cả các types được Prisma tự động tạo ra từ schema
// Điều này giúp các service khác có thể import types như `User` một cách an toàn
export * from '@prisma/client';