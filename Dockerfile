# Stage 1: Base - Nền tảng chung
FROM node:18-alpine AS base
WORKDIR /app
# Cài đặt pnpm toàn cục
RUN npm install -g pnpm

# Stage 2: Dependencies - Chỉ cài đặt dependencies của production
FROM base AS prod-deps
# Chỉ copy các file cần thiết để cài đặt dependencies
COPY package.json pnpm-lock.yaml ./
COPY apps /app/apps
COPY packages /app/packages
# Cài đặt CHỈ dependencies của production cho toàn bộ workspace
RUN pnpm install --prod --frozen-lockfile

# Stage 3: Builder - Cài đặt devDependencies và build code
FROM base AS builder
# Copy source code và các file config
COPY . .
# Cài đặt TẤT CẢ dependencies (bao gồm cả devDependencies)
RUN pnpm install --frozen-lockfile
# Chạy lệnh build của Turborepo
RUN pnpm turbo build

# Stage 4: Runner - Image cuối cùng để chạy ứng dụng
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy các dependencies của production đã được cài đặt ở stage 'prod-deps'
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy code JavaScript đã được build từ stage 'builder'
# Chỉ copy các thư mục 'dist' bên trong 'apps' và 'packages'
COPY --from=builder /app/apps /app/apps
COPY --from=builder /app/packages /app/packages

# Expose port (có thể bị ghi đè bởi docker-compose nhưng là good practice)
EXPOSE 4000 4001 4002 4003 4004

# Lệnh CMD mặc định, sẽ bị ghi đè bởi docker-compose.yml
CMD ["node", "apps/api-gateway/dist/src/index.js"]