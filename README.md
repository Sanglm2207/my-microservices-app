# Monorepo Backend Microservices with Node.js & Turborepo

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![Turborepo](https://img.shields.io/badge/Turborepo-v2.x-6F39B6?style=for-the-badge&logo=turborepo)
![Docker](https://img.shields.io/badge/Docker-20.10-2496ED?style=for-the-badge&logo=docker)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.11-FF6600?style=for-the-badge&logo=rabbitmq)
![Amazon S3](https://img.shields.io/badge/Amazon_S3-232F3E?style=for-the-badge&logo=amazon-s3)
![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?style=for-the-badge&logo=prisma)
![pnpm](https://img.shields.io/badge/pnpm-8.x-F69220?style=for-the-badge&logo=pnpm)

Một bộ khung backend hoàn chỉnh được xây dựng theo kiến trúc microservice, quản lý dưới dạng monorepo sử dụng Turborepo. Project này là một minh chứng thực tế về cách xây dựng một hệ thống phân tán, có khả năng mở rộng và sẵn sàng cho môi trường production.

## ✨ Các tính năng nổi bật

- **Kiến trúc Monorepo:** Quản lý code tập trung, tối ưu hóa quy trình build và chia sẻ logic giữa các service với `pnpm workspaces` và `Turborepo`.
- **Hệ thống Microservice:**
  - `api-gateway`: Cổng vào duy nhất, chịu trách nhiệm xác thực, rate limiting, và điều hướng request.
  - `auth-service`: Xử lý toàn bộ vòng đời xác thực: đăng ký, đăng nhập, JWT (Access & Refresh Token), quên mật khẩu.
  - `user-service`: Quản lý thông tin hồ sơ (profile) của người dùng.
  - `file-service`: Xử lý upload file, tối ưu hóa ảnh với `sharp` và lưu trữ trên **Amazon S3**.
  - `notification-service`: Hệ thống thông báo bất đồng bộ, gửi email (Nodemailer) và thông báo real-time (WebSocket) dựa trên các sự kiện từ **RabbitMQ**.
- **Xác thực và Bảo mật:**
  - Luồng xác thực an toàn sử dụng `httpOnly` cookie để chống tấn công XSS.
  - Cơ chế **Refresh Token** và vô hiệu hóa session cũ khi đổi mật khẩu.
  - **RBAC (Phân quyền theo vai trò)** cho các route `USER` và `ADMIN`.
  - **Rate Limiting** trên API Gateway để chống tấn công brute-force và lạm dụng API.
- **Kiến trúc Hướng sự kiện (Event-Driven):** Giao tiếp giữa các service (`auth` -> `notification`) được thực hiện một cách tách rời và bền bỉ qua **RabbitMQ**.
- **Polyglot Persistence:** Sử dụng đúng database cho đúng nhu cầu:
  - **MySQL (Prisma):** Cho `auth-service` với dữ liệu có cấu trúc chặt chẽ.
  - **MongoDB (Mongoose):** Cho `user-service` với dữ liệu profile linh hoạt.
  - **Redis:** Dùng để caching dữ liệu (profile người dùng), blacklist token và hỗ trợ rate limiting.
- **Sẵn sàng cho Production:**
  - **Containerization:** Toàn bộ hệ thống (apps & databases) được đóng gói và quản lý bởi `Docker` và `docker-compose`.
  - **Validation:** Xác thực dữ liệu đầu vào một cách an toàn và nhất quán với `Zod`.
  - **Logging tập trung:** Sử dụng `Pino` để tạo log dạng JSON có cấu trúc, sẵn sàng cho các hệ thống thu thập log.
  - **API Documentation:** Tự động tạo tài liệu API tương tác cho từng service với `Swagger (OpenAPI)`.
- **Trải nghiệm Nhà phát triển (DX):**
  - Cung cấp script `manage.sh` để tự động hóa các tác vụ phổ biến.
  - Cấu hình **Hot-Reloading** cho cả service và các package dùng chung.
  - Tích hợp **CI/CD Pipeline** cơ bản với GitHub Actions để tự động chạy lint và test.

## 🏛️ Sơ đồ Kiến trúc

 <!-- Gợi ý: bạn có thể vẽ sơ đồ bằng draw.io hoặc excalidraw và upload lên imgur -->

## 🚀 Bắt đầu

### Yêu cầu

- [Node.js](https://nodejs.org/) (v18.x trở lên)
- [pnpm](https://pnpm.io/) (v8.x trở lên)
- [Docker](https://www.docker.com/) và `docker-compose`
- Tài khoản AWS với quyền truy cập S3.
- Tài khoản [Mailtrap.io](https://mailtrap.io/) (để test email).

### Cài đặt

1.  **Clone repository:**

    ```bash
    git clone https://github.com/Sanglm2207/my-microservices-app.git
    cd my-microservices-app
    ```

2.  **Thiết lập file môi trường `.env`:**
    Sao chép tất cả các file `.env.example` trong `apps/` thành file `.env` và `.env.docker`.

    - Các file `.env` sẽ được dùng khi chạy ở chế độ dev local. **URL phải là `localhost`**.
    - Các file `.env.docker` sẽ được dùng khi chạy bằng Docker. **URL phải là tên service** (ví dụ: `auth-service`).
    - Điền đầy đủ các giá trị (AWS keys, Mailtrap credentials,...).

3.  **Cài đặt dependencies:**

    ```bash
    pnpm install
    ```

4.  **Khởi tạo Database:**
    - Khởi động các container database và RabbitMQ:
      ```bash
      docker-compose up -d mysql_auth redis_cache mongodb_user rabbitmq
      ```
    - Chạy database migration cho `auth-service`:
      ```bash
      ./manage.sh db:migrate
      ```

### Chạy ứng dụng

Chúng tôi cung cấp một script `manage.sh` để đơn giản hóa các tác vụ. Cấp quyền thực thi nếu cần: `chmod +x manage.sh`.

#### Chế độ Development (Hot-Reloading)

Chạy tất cả các service trên máy host.

```bash
./manage.sh dev
```

#### Các endpoint truy cập:

API Gateway: http://localhost:4000
Auth Service: http://localhost:4001 (API Docs: http://localhost:4001/api-docs)
User Service: http://localhost:4002 (API Docs: http://localhost:4002/api-docs)
File Service: http://localhost:4003
Notification Service: ws://localhost:4004 (WebSocket)
RabbitMQ UI: http://localhost:15672 (user: user, pass: password)

#### Chế độ Docker (Giống Production)

Build image và khởi động toàn bộ hệ thống trong các container.

```bash
docker-compose up --build
```

#### 🛠️ Các lệnh hữu ích (qua manage.sh)

dev [service-name]: Chạy tất cả hoặc một service cụ thể ở chế độ dev.
build [package-name]: Build tất cả hoặc một package/app cụ thể.
build:libs: Chỉ build các thư viện trong packages/.
lint: Chạy ESLint cho toàn bộ project.
test: Chạy Unit Test.
clean: Dọn dẹp project (xóa node_modules, dist, pnpm-lock.yaml...).

#### 📦 Cấu trúc Monorepo

apps/: Chứa code của các microservice độc lập.
packages/: Chứa code dùng chung (thư viện), giúp đảm bảo tính nhất quán và nguyên tắc DRY.
auth-client: Logic xác thực JWT.
cache: Client kết nối Redis.
common-types: Các interface và type TypeScript dùng chung.
database: Prisma client và schema.
document-store: Mongoose client.
logger: Logger Pino cấu hình sẵn.
message-producer: Logic gửi tin nhắn đến RabbitMQ.
middlewares: Các middleware Express dùng chung.
swagger-docs: Logic tạo tài liệu Swagger.
tsconfig: Cấu hình TypeScript gốc.
validation: Các schema validation với Zod.

#### 📜 Giấy phép

Project này được cấp phép dưới Giấy phép MIT.

#### 📬 Liên hệ & Đóng góp

Cảm ơn bạn đã xem qua project này! Mọi ý tưởng đóng góp, báo lỗi, hoặc câu hỏi đều được chào đón. Vui lòng tạo một Issue hoặc Pull Request.
Kết nối với tôi qua các kênh sau:
![alt text](https://img.shields.io/badge/GitHub-Sanglm2207-181717?style=for-the-badge&logo=github)

![alt text](https://img.shields.io/badge/LinkedIn-Sanglm2207-0A66C2?style=for-the-badge&logo=linkedin)

![alt text](https://img.shields.io/badge/Facebook-kaidev99-1877F2?style=for-the-badge&logo=facebook)

![alt text](https://img.shields.io/badge/Email-sanglm2207@gmail.com-D14836?style=for-the-badge&logo=gmail)
