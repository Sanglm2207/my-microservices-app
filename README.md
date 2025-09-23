# Monorepo Backend Microservices with Node.js & Turborepo

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![Turborepo](https://img.shields.io/badge/Turborepo-v2.x-6F39B6?style=for-the-badge&logo=turborepo)
![Docker](https://img.shields.io/badge/Docker-20.10-2496ED?style=for-the-badge&logo=docker)
![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?style=for-the-badge&logo=prisma)
![pnpm](https://img.shields.io/badge/pnpm-8.x-F69220?style=for-the-badge&logo=pnpm)

Một bộ khung backend hoàn chỉnh được xây dựng theo kiến trúc microservice, quản lý dưới dạng monorepo sử dụng Turborepo. Project này bao gồm một hệ thống xác thực đầy đủ với JWT (Access & Refresh Token), phân quyền theo vai trò (RBAC), và được đóng gói bằng Docker.

## ✨ Các tính năng nổi bật

- **Kiến trúc Monorepo:** Quản lý code tập trung, dễ dàng chia sẻ và tái sử dụng logic với `pnpm workspaces`.
- **Tối ưu hóa Build System:** Tăng tốc độ build, test, và lint nhờ vào caching của `Turborepo`.
- **Microservices:**
  - `api-gateway`: Cổng vào duy nhất, chịu trách nhiệm xác thực, rate limiting, và điều hướng request.
  - `auth-service`: Xử lý đăng ký, đăng nhập, JWT, refresh token, và quản lý người dùng.
  - `user-service`: Quản lý thông tin hồ sơ (profile) của người dùng.
- **Xác thực an toàn:** Luồng xác thực sử dụng `httpOnly` cookie để lưu trữ token, giúp chống lại tấn công XSS.
- **Polyglot Persistence:** Sử dụng đúng database cho đúng nhu cầu:
  - **MySQL (Prisma):** Cho `auth-service` với dữ liệu có cấu trúc chặt chẽ.
  - **MongoDB (Mongoose):** Cho `user-service` với dữ liệu profile linh hoạt.
  - **Redis:** Dùng để caching và blacklist token.
- **Sẵn sàng cho Production:**
  - **Containerization:** Toàn bộ hệ thống (apps & databases) được đóng gói và quản lý bởi `Docker` và `docker-compose`.
  - **Validation:** Xác thực dữ liệu đầu vào một cách an toàn với `Zod`.
  - **RBAC:** Hệ thống phân quyền theo vai trò (`USER`, `ADMIN`).
  - **Logging tập trung:** Sử dụng `Pino` để tạo log dạng JSON có cấu trúc.
  - **API Documentation:** Tự động tạo tài liệu API tương tác với `Swagger (OpenAPI)`.
- **Quy trình phát triển chuyên nghiệp:** Cung cấp script `manage.sh` để tự động hóa các tác vụ phổ biến.

## 🏛️ Sơ đồ Kiến trúc

## 🚀 Bắt đầu

### Yêu cầu

- [Node.js](https://nodejs.org/) (v18.x trở lên)
- [pnpm](https://pnpm.io/) (v8.x trở lên)
- [Docker](https://www.docker.com/) và `docker-compose`

### Cài đặt

1.  **Clone repository:**

    ```bash
    git clone https://github.com/Sanglm2207/my-microservices-app.git
    cd my-microservices-app
    ```

2.  **Thiết lập file môi trường `.env`:**
    Sao chép các file `.env.example` thành `.env` trong từng thư mục service và điền các giá trị cần thiết.

    ```bash
    cp apps/api-gateway/.env.example apps/api-gateway/.env
    cp apps/auth-service/.env.example apps/auth-service/.env
    cp apps/user-service/.env.example apps/user-service/.env
    ```

    **Quan trọng:** Đảm bảo `ACCESS_TOKEN_SECRET` trong `.env` của `api-gateway` và `auth-service` phải giống hệt nhau.

3.  **Cài đặt dependencies:**

    ```bash
    pnpm install
    ```

4.  **Khởi tạo Database:**
    - Đầu tiên, khởi động các container database:
      ```bash
      docker-compose up -d mysql_auth redis_cache mongodb_user
      ```
    - Chạy database migration để tạo các bảng cần thiết:
      ```bash
      ./manage.sh db:migrate
      ```

### Chạy ứng dụng

Chúng tôi cung cấp một script `manage.sh` để đơn giản hóa các tác vụ. Cấp quyền thực thi cho nó nếu cần: `chmod +x manage.sh`.

- **Chạy ở chế độ Development (Hot-reloading):**
  ```bash
  ./manage.sh dev
  ```

### Các service sẽ chạy tại:

API Gateway: http://localhost:4000
Auth Service: http://localhost:4001 (API Docs: http://localhost:4001/api-docs)
User Service: http://localhost:4002 (API Docs: http://localhost:4002/api-docs)
Chạy bằng Docker (Môi trường giống Production):

```bash
docker-compose up --build
```

Lệnh này sẽ build image và khởi động tất cả các service và database.

### 🛠️ Các lệnh hữu ích (qua manage.sh)

./manage.sh dev <service-name>: Chạy một service cụ thể (ví dụ: api-gateway).
./manage.sh build: Build tất cả các app và package.
./manage.sh build:libs: Chỉ build các thư viện trong packages/.
./manage.sh lint: Chạy ESLint cho toàn bộ project.
./manage.sh test: Chạy Unit Test.
./manage.sh clean: Dọn dẹp project (xóa node_modules, dist, .turbo,...).

### 📦 Cấu trúc Monorepo

apps/: Chứa code của các microservice. Mỗi service là một ứng dụng độc lập.
packages/: Chứa code dùng chung (thư viện).
auth-client: Logic xác thực JWT.
cache: Client kết nối Redis.
common-types: Các interface và type TypeScript dùng chung.
database: Prisma client và schema.
document-store: Mongoose client.
logger: Logger Pino cấu hình sẵn.
middlewares: Các middleware Express dùng chung (validation, error handling).
swagger-docs: Logic tạo tài liệu Swagger.
tsconfig: Cấu hình TypeScript gốc.

## 📜 Giấy phép

Project này được cấp phép dưới [Giấy phép MIT](LICENSE).

---

## 📬 Liên hệ & Đóng góp

Cảm ơn bạn đã xem qua project này! Mọi ý tưởng đóng góp, báo lỗi, hoặc câu hỏi đều được chào đón. Vui lòng tạo một [Issue](https://github.com/Sanglm2207/my-microservices-app/issues) hoặc [Pull Request](https://github.com/Sanglm2207/my-microservices-app/pulls).

Kết nối với tôi qua các kênh sau:

[![Github](https://img.shields.io/badge/GitHub-Sanglm2207-181717?style=for-the-badge&logo=github)](https://github.com/sanglm2207)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Sanglm2207-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/kaidev99/)

[![Facebook](https://img.shields.io/badge/Facebook-kaidev99-1877F2?style=for-the-badge&logo=facebook)](https://www.facebook.com/kaidev99)

[![Email](https://img.shields.io/badge/Email-sanglm2207@gmail.com-D14836?style=for-the-badge&logo=gmail)](mailto:sanglm2207@gmail.com)
