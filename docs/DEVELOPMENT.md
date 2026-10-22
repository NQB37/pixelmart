# Môi trường phát triển

## Cấu hình máy hiện tại (ghi nhận ngày 2026-10-15)

| Công cụ | Đã cài | Yêu cầu | Ghi chú |
|---|---|---|---|
| Node.js | 24.19.0 | 24.x LTS | Prisma 7 cần `^20.19 \|\| ^22.12 \|\| >=24`. nestjs-pino cần `>=22.12`. |
| pnpm | 12.11.2 | 12.x | Được ghim qua `packageManager` (và `devEngines`) trong `package.json` ở thư mục gốc. |
| Git | 2.55 | bản mới gần đây | Nên đặt `core.autocrlf=false` (máy hiện đang là `true`). Ký tự xuống dòng do `.gitattributes` xử lý. |
| Docker Engine / Desktop | 29.8.0 | 27+ | Docker Desktop phải **đang chạy** trước mọi lệnh `docker`. |
| Docker Compose | v5.5.1 | cú pháp v2+ | Dùng `docker compose` (có dấu cách), không dùng `docker-compose` kiểu cũ. |
| psql (local) | chưa cài | không cần | Dùng `psql` bên trong container: `pnpm db:psql`. |

Hệ điều hành: Windows 11. Các lệnh trong tài liệu này được viết cho POSIX shell (Git Bash). Những chỗ khác biệt với PowerShell sẽ được ghi chú khi cần.

Editor: VS Code với các extension Oxc (oxlint), Prettier, Vitest, Prisma, Docker và EditorConfig.

## Các phiên bản đã chọn

Xem [ADR-0002](decisions/0002-tool-and-dependency-versions.md) để biết bằng chứng và lý do. Phiên bản chính xác sau khi resolve luôn nằm trong `pnpm-lock.yaml`.

| Tầng | Lựa chọn |
|---|---|
| Ngôn ngữ | TypeScript **6.0.x** (cố ý chưa dùng 7.0) |
| Backend | NestJS **12.1.x**, nền tảng Express |
| Validation | class-validator 0.15 + class-transformer (DTO), zod 4 (env) |
| Tài liệu API | @nestjs/swagger 12 |
| Logging | nestjs-pino 5.3 + pino 10 |
| ORM | Prisma **7.10.0** (CLI và client được ghim cùng một phiên bản chính xác) + `@prisma/adapter-pg` |
| Database | PostgreSQL **18** (`postgres:18-alpine`) |
| Frontend | Next.js **16.4.x**, React 19, App Router, Tailwind CSS 4 |
| Test API | Vitest 4 + supertest (xem [TESTING.md](TESTING.md)) |
| Lint / format | oxlint + Prettier (bắt buộc từ V5) |
| Test web | Vitest 4 + React Testing Library (phiên bản được ghim ở V1.6) |

## Port

| Service | Port | Có từ |
|---|---|---|
| PostgreSQL | 5432 (cấu hình qua `POSTGRES_PORT`) | V1.1 |
| NestJS API | 4000 | V1.2 |
| Next.js web | 3000 | V1.5 |

## Lệnh dùng hằng ngày

_Được bổ sung khi mỗi sprint thêm lệnh mới. Chỉ liệt kê những lệnh đã được kiểm chứng._

Chạy mọi lệnh ở thư mục gốc của repo.

| Lệnh | Tác dụng | Kiểm chứng ở |
|---|---|---|
| `pnpm install` | Cài dependency cho toàn bộ workspace, cập nhật `pnpm-lock.yaml` | V1.1 |
| `pnpm db:up` | `docker compose up -d --wait`: chạy PostgreSQL ở chế độ nền và chờ đến khi `healthy` | V1.1 |
| `pnpm db:down` | `docker compose down`: dừng và xoá container. **Volume vẫn còn**, dữ liệu không mất | V1.1 |
| `pnpm db:logs` | Theo dõi log của Postgres (`-f`). Nhấn `Ctrl+C` để thoát | V1.1 |
| `pnpm db:psql` | Mở `psql` bên trong container, kết nối user `pixelmart` vào database `pixelmart` | V1.1 |
| `docker compose ps` | Xem trạng thái container (`starting` / `healthy` / `unhealthy`) | V1.1 |
| `pnpm dev:api` | Chạy API (`nest start --watch`) ở port 4000, đọc `apps/api/.env`. Log dạng dễ đọc khi `NODE_ENV=development` | V1.2 |
| `pnpm --filter api test` | Unit test (Vitest, `src/**/*.spec.ts`) | V1.2 |
| `pnpm --filter api test:e2e` | e2e test qua HTTP bằng supertest (`test/**/*.e2e-spec.ts`). Không cần Postgres | V1.2 |
| `pnpm --filter api lint` | oxlint có type-aware (bao gồm `no-floating-promises`) | V1.2 |
| `pnpm --filter api build` | Biên dịch ra `apps/api/dist/` (CJS). Chạy bản build bằng `pnpm --filter api dev:prod` | V1.2 |

### Reset database (xoá sạch dữ liệu)

```sh
docker compose down -v   # -v xoá luôn volume postgres_data
pnpm db:up               # khởi tạo lại từ đầu; init script tạo lại pixelmart_test
```

Chỉ làm việc này khi bạn chấp nhận mất toàn bộ dữ liệu local.

### Lưu ý

- `db:psql` gõ cứng user `pixelmart`, nên giữ `POSTGRES_USER=pixelmart` trong `.env` như `.env.example`.
- Biến `POSTGRES_*` và các init script trong `infra/docker/postgres/init/` **chỉ có tác dụng ở lần khởi động đầu tiên**, khi volume còn trống. Đổi user hoặc mật khẩu trong `.env` sau đó sẽ không có hiệu lực cho đến khi bạn reset database như trên. Xem [TROUBLESHOOTING](versions/v1/TROUBLESHOOTING.md).
- Nếu port 5432 đã bị chiếm, đổi `POSTGRES_PORT` trong `.env`. Port phía trong container vẫn là 5432.
- API đọc `apps/api/.env`, không đọc `.env` ở gốc. Biến đã có trong shell sẽ thắng giá trị trong file. Đổi password Postgres thì phải sửa cả `POSTGRES_PASSWORD` (gốc) lẫn `DATABASE_URL` (API).
- Muốn xem log JSON thuần như production: `NODE_ENV=production pnpm dev:api`.
