# ---- Base Stage ----
# Sử dụng một base image Node.js gọn nhẹ
FROM node:18-alpine AS base
WORKDIR /app

# ---- Dependencies Stage ----
# Stage này chỉ để cài đặt dependencies và tận dụng Docker layer caching
FROM base AS dependencies
# Copy package.json và lock file của toàn bộ monorepo
COPY package.json pnpm-lock.yaml ./
# Copy package.json của từng app và package
COPY apps apps
COPY packages packages
# Cài đặt tất cả dependencies bằng pnpm
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# ---- Builder Stage ----
# Stage này để build code TypeScript thành JavaScript
FROM base AS builder
# Copy dependencies đã được cài đặt từ stage trước
COPY --from=dependencies /app/node_modules ./node_modules
# Copy toàn bộ source code
COPY . .
# Chạy lệnh build của Turborepo
RUN npm install -g pnpm && pnpm turbo build

# ---- Runner Stage ----
# Đây là image cuối cùng, gọn nhẹ nhất có thể để chạy ứng dụng
FROM base AS runner
WORKDIR /app

# Copy các file cần thiết từ các stage trước
COPY --from=dependencies /app/pnpm-lock.yaml ./
COPY --from=builder /app .

# Lệnh CMD mặc định, sẽ bị ghi đè bởi docker-compose
CMD ["node", "apps/api-gateway/dist/index.js"]