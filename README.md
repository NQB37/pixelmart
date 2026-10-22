# PixelMart

Một nền tảng thương mại điện tử theo định hướng production, được xây dựng như một hành trình học tập dài hạn theo dự án (project-based learning): từ một MVP chạy local đến một hệ thống đã deploy, có observability và hướng event-driven.

**Stack:** Next.js · NestJS · PostgreSQL · Prisma · TypeScript, cùng với Docker, Nginx, Redis, RabbitMQ, Kafka, GitHub Actions, Prometheus/Grafana, Coolify và Kubernetes được đưa vào dần dần.

## Trạng thái

Sprint V1.1 (nền tảng workspace + PostgreSQL local) đã hoàn thành. Sprint V1.2 (khung NestJS API) đã có đủ bằng chứng cho AC-1.2-01…07 và đang chờ xác nhận. Xem [docs/ROADMAP.md](docs/ROADMAP.md).

## Tài liệu

Bắt đầu từ [docs/README.md](docs/README.md).

## Bắt đầu (đến V1.2)

Hiện tại repo có workspace, một database PostgreSQL chạy trong Docker và khung NestJS API (`apps/api`). API chưa kết nối database (từ V1.3). Chưa có web.

**Cần có:** Node.js 24, pnpm 12 (phiên bản chính xác được ghim trong `package.json`), Git và Docker Desktop **đang chạy**. Chi tiết xem [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

```sh
git clone <repo-url> pixelmart
cd pixelmart
cp .env.example .env   # rồi sửa giá trị nếu cần; .env không bao giờ được commit
pnpm install
pnpm db:up             # khởi động PostgreSQL 18 và chờ đến khi healthy
pnpm db:psql           # mở psql bên trong container
```

Trong psql, chạy `SELECT version();` (phải hiện `PostgreSQL 18.x`) và `\l` (phải có `pixelmart` và `pixelmart_test`). Thoát bằng `\q`.

Dừng database bằng `pnpm db:down`. Dữ liệu vẫn được giữ trong Docker volume cho lần sau.

### Chạy API

```sh
cp apps/api/.env.example apps/api/.env   # user/password trong DATABASE_URL phải khớp POSTGRES_* ở .env gốc
pnpm dev:api                             # NestJS ở chế độ watch, port 4000
```

Kiểm tra:

- `curl -i localhost:4000/health` → `200` với `{"status":"ok",…}` và header `x-request-id`.
- `http://localhost:4000/docs` → Swagger UI.
- `pnpm --filter api test` và `pnpm --filter api test:e2e` → đều pass. Test không cần Postgres chạy, nhưng cần `apps/api/.env` hợp lệ.
