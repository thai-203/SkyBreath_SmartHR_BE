# SkyBreath SmartHR Backend

Backend API cho hệ thống SkyBreath SmartHR, được xây dựng với Express, TypeScript và TypeORM.

## Tech Stack

- **Framework**: [Express](https://expressjs.com/)
- **Ngôn ngữ**: TypeScript
- **Database**: MySQL với [TypeORM](https://typeorm.io/)
- **Authentication**: JWT, Passport
- **Documentation**: Swagger (OpenAPI)

## Prerequisites

- [Node.js](https://nodejs.org/) (v22.0.1 hoặc cao hơn)
- [MySQL](https://www.mysql.com/)
- [Redis](https://redis.io/) (Để caching và reset password)
- [PM2](https://pm2.keymetrics.io/) (Để chạy production)

### Khởi động Redis với Docker (Khuyến nghị)

```bash
docker run -d --name smarthr-redis -p 6379:6379 redis
```

## Cài đặt

1.  **Clone repository**

2.  **Cài đặt dependencies**

    ```bash
    npm install
    ```

3.  **Cấu hình Environment**

    Copy `.env.development` sang `.env` và cập nhật thông tin database của bạn:

    ```bash
    cp .env.development .env
    ```

    *Đảm bảo đã tạo database trong MySQL phù hợp với cấu hình `.env` (mặc định: `skybreath_smarthr`).*

## Chạy Ứng dụng

### Development

Chạy ứng dụng ở chế độ watch (hot-reload):

```bash
npm run start:dev
```

Server sẽ khởi động tại `http://localhost:3000` (hoặc PORT đã cấu hình).

### Production với PM2 trên Ubuntu

#### 1. Cài đặt môi trường

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Cài đặt PM2 globally
sudo npm install -g pm2

# Cài đặt MySQL
sudo apt install -y mysql-server

# Cài đặt Redis (hoặc dùng Docker)
sudo apt install -y redis-server
```

#### 2. Cấu hình Database

```bash
# Khởi động MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Tạo database
sudo mysql -e "CREATE DATABASE IF NOT EXISTS skybreath_smarthr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Hoặc đăng nhập MySQL để tạo database
sudo mysql
```

Trong MySQL console:

```sql
CREATE DATABASE IF NOT EXISTS skybreath_smarthr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### 3. Clone và cài đặt Project

```bash
# Clone repository
git clone <repo-url>
cd SkyBreath_SmartHR_BE

# Cài đặt dependencies
npm install

# Copy và cấu hình .env
cp .env.development .env
# Chỉnh sửa .env với thông tin database của bạn (DB_HOST, DB_USER, DB_PASSWORD, etc.)
```

#### 4. Build và Migration

```bash
# Chạy migrations để tạo bảng trong database
npm run typeorm migration:run

# Seed data (tùy chọn - tạo Admin user, Roles mặc định)
npm run seed

# Build project
npm run build
```

#### 5. Chạy với PM2

```bash
# Di chuyển vào thư mục đã build
cd dist/src

# Chạy với PM2
pm2 start main.js --name skybreath-smarthr

# Hoặc chạy với cổng tùy chỉnh
PORT=3000 pm2 start main.js --name skybreath-smarthr
```

#### 6. Cấu hình PM2 tự khởi động

```bash
# Lưu cấu hình PM2 hiện tại
pm2 save

# Cấu hình PM2 khởi động cùng hệ thống
pm2 startup
```

Lệnh `pm2 startup` sẽ hiển thị một lệnh cần chạy với quyền sudo. Chạy lệnh đó để hoàn tất cấu hình.

#### 7. Các câu lệnh PM2 hữu ích

```bash
# Xem trạng thái các ứng dụng
pm2 status

# Xem logs realtime
pm2 logs skybreath-smarthr

# Xem logs với số dòng cụ thể
pm2 logs skybreath-smarthr --lines 100

# Restart app
pm2 restart skybreath-smarthr

# Reload app (zero-downtime)
pm2 reload skybreath-smarthr

# Stop app
pm2 stop skybreath-smarthr

# Delete app khỏi PM2
pm2 delete skybreath-smarthr

# Monitor real-time (CPU/RAM usage)
pm2 monit

# Xem thông tin chi tiết
pm2 info skybreath-smarthr
```

#### 8. Cấu hình Nginx làm Reverse Proxy (Khuyến nghị)

```bash
sudo apt install -y nginx
```

Tạo file cấu hình:

```bash
sudo nano /etc/nginx/sites-available/skybreath-smarthr
```

Thêm nội dung:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Kích hoạt site:

```bash
sudo ln -s /etc/nginx/sites-available/skybreath-smarthr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 9. Cấu hình Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

#### 10. SSL với Let's Encrypt (Tùy chọn)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Database Seeding

Để populate database với dữ liệu ban đầu (Admin user, Roles, etc.), chạy script seed:

```bash
npm run seed
```

**Lưu ý:** Đảm bảo database đang chạy và cấu hình kết nối trong `.env` đúng trước khi chạy seed.

## API Documentation

Khi server đang chạy, bạn có thể truy cập Swagger UI documentation tại:

`http://localhost:3000/api/docs`

## ArcFace Service (AI Worker cho Face Recognition)

ArcFace service là một microservice riêng biệt dựa trên Python, xử lý face recognition, liveness detection và face extraction. Nó sử dụng FastAPI và InsightFace cho AI-powered facial analysis.

### Prerequisites

- [Python](https://www.python.org/) (v3.10 hoặc cao hơn)
- [pip](https://pip.pypa.io/) (Python package manager)
- CUDA GPU (tùy chọn, nhưng khuyến nghị để có hiệu suất tốt hơn)

### Cài đặt

1. **Di chuyển vào thư mục arcface-service**

   ```bash
   cd arcface-service
   ```

2. **Tạo Python virtual environment**

   ```bash
   python -m venv venv
   ```

3. **Kích hoạt virtual environment**

   - Trên Ubuntu/Linux:

     ```bash
     source venv/bin/activate
     ```

   - Trên Windows:

     ```bash
     venv\Scripts\activate
     ```

4. **Cài đặt Python dependencies**

   ```bash
   pip install -r requirements.txt
   ```

### Chạy Service

1. **Kích hoạt virtual environment** (nếu chưa kích hoạt)

   ```bash
   source venv/bin/activate
   ```

2. **Khởi động ArcFace service**

   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Service sẽ khởi động tại `http://localhost:8000`

3. **Truy cập API documentation**

   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

### API Endpoints

- `GET /health` - Kiểm tra trạng thái health của service
- `POST /extract` - Trích xuất face data từ một ảnh (cho check-in/check-out)
- `POST /extract-multi` - Trích xuất face data từ nhiều ảnh (cho registration và multi-frame liveness detection)

### Lần chạy đầu tiên

Lần đầu chạy, service sẽ tự động download các AI models cần thiết (ArcFace và anti-spoof models). Quá trình này có thể mất một thời gian tùy thuộc vào kết nối internet. Các models được cache local tại `~/.insightface/models/` sau lần download đầu tiên.

### Troubleshooting

- **Models không download được?** Đảm bảo bạn có kết nối internet ổn định
- **Vấn đề về GPU memory?** Service có thể chạy trên CPU, nhưng sẽ chậm hơn
- **Port 8000 đã được sử dụng?** Đổi port trong command: `--port 8001`
