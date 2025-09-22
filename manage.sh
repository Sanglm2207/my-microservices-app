#!/bin/bash

# --- Script quản lý Monorepo Microservices ---
# Dừng script ngay lập tức nếu có bất kỳ lệnh nào thất bại
set -e

# --- CÁC BIẾN ---
# Liệt kê tên các app có thể chạy độc lập
APPS=("api-gateway" "auth-service" "user-service")

# --- HÀM HIỂN THỊ HƯỚNG DẪN SỬ DỤNG ---
show_usage() {
  echo "-----------------------------------------------------"
  echo "Usage: ./manage.sh <command> [service_name]"
  echo "-----------------------------------------------------"
  echo ""
  echo "Commands:"
  echo "  dev       Chạy tất cả các service ở chế độ development."
  echo "  dev <app> Chạy một service cụ thể ở chế độ development."
  echo "            <app> can be: api-gateway, auth-service, user-service"
  echo ""
  echo "  build     Build tất cả các app và package."
  echo "  build <app> Build một app hoặc package cụ thể."
  echo "  build:libs  Chỉ build các thư viện trong thư mục 'packages/'."
  echo ""
  echo "  lint      Lint toàn bộ project."
  echo ""
  echo "  db:migrate Chạy migration cho database (prisma)."
  echo ""
  echo "  clean     Xóa tất cả node_modules, các thư mục build/dist và .turbo."
  echo "            Hữu ích khi cần cài đặt lại từ đầu."
  echo ""
  echo "Ví dụ:"
  echo "  ./manage.sh dev"
  echo "  ./manage.sh dev api-gateway"
  echo "  ./manage.sh build user-service"
  echo "  ./manage.sh clean"
  echo "-----------------------------------------------------"
}

# --- LOGIC CHÍNH CỦA SCRIPT ---

# Lấy command (dev, build,...) và service_name
COMMAND=$1
SERVICE_NAME=$2

# Nếu không có command nào được cung cấp, hiển thị hướng dẫn và thoát
if [ -z "$COMMAND" ]; then
  show_usage
  exit 1
fi

# Xử lý các command
case "$COMMAND" in
  dev)
    if [ -z "$SERVICE_NAME" ]; then
      echo "🚀 Bắt đầu chạy TẤT CẢ các service ở chế độ development..."
      pnpm turbo dev
    else
      # Kiểm tra xem service_name có hợp lệ không
      if [[ " ${APPS[@]} " =~ " ${SERVICE_NAME} " ]]; then
        echo "🚀 Bắt đầu chạy service '$SERVICE_NAME' ở chế độ development..."
        pnpm turbo dev --filter=$SERVICE_NAME
      else
        echo "❌ Lỗi: Service '$SERVICE_NAME' không hợp lệ."
        echo "Các service hợp lệ: ${APPS[*]}"
        exit 1
      fi
    fi
    ;;

  build)
    if [ -z "$SERVICE_NAME" ]; then
      echo "📦 Bắt đầu build TẤT CẢ các app và package..."
      pnpm turbo build
    else
      echo "📦 Bắt đầu build app/package '$SERVICE_NAME'..."
      pnpm turbo build --filter=$SERVICE_NAME
    fi
    ;;

  build:libs)
    echo "📚 Bắt đầu build các thư viện trong 'packages/'..."
    pnpm build:libs
    ;;

  lint)
    echo "🔍 Bắt đầu lint toàn bộ project..."
    pnpm turbo lint
    ;;

  db:migrate)
    echo "🗄️ Bắt đầu chạy database migration..."
    # Lệnh này sẽ chạy script "db:migrate" trong package "database"
    pnpm --filter auth-service db:migrate
    ;;

  clean)
    echo "🧹 Bắt đầu dọn dẹp project..."

    # Xóa thư mục .turbo ở gốc
    echo "   - Xóa thư mục .turbo"
    rm -rf .turbo

    # Xóa file pnpm-lock.yaml ở gốc
    echo "   - Xóa file pnpm-lock.yaml"
    rm -f pnpm-lock.yaml

    # Sử dụng find để xóa tất cả node_modules, dist, build, .next
    echo "   - Xóa tất cả các thư mục node_modules, dist, build..."
    find . -type d \( -name "node_modules" -o -name "dist" -o -name "build" -o -name ".next" \) -prune -exec rm -rf '{}' +

    echo "✅ Dọn dẹp hoàn tất. Bạn có thể chạy 'pnpm install' để cài đặt lại từ đầu."
    exit 0 # Thoát ngay sau khi clean, không cần in "Hoàn thành!" nữa
    ;;

  *)
    echo "❌ Lỗi: Command '$COMMAND' không hợp lệ."
    echo ""
    show_usage
    exit 1
    ;;
esac

echo "✅ Hoàn thành!"