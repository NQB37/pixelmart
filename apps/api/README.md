# PixelMart API

NestJS 12 API của PixelMart. Package này là CommonJS (không có `"type": "module"`).

## Chạy

Từ gốc repo:

```sh
cp apps/api/.env.example apps/api/.env
pnpm dev:api                    # port 4000, Swagger ở /docs
pnpm --filter api test          # unit test
pnpm --filter api test:e2e      # e2e test
pnpm --filter api lint
```

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `src/main.ts` | Khởi động app: logger pino, `configureApp`, port từ `ConfigService` |
| `src/app.module.ts` | ConfigModule, LoggerModule (request ID), global pipe và filter |
| `src/app.setup.ts` | Cấu hình dùng chung giữa `main.ts` và e2e (Swagger) |
| `src/config/` | Schema env (zod) và `validateEnv` |
| `src/common/` | Phần dùng chung, ví dụ `HttpExceptionFilter` |
| `src/modules/<tên>/` | Feature module |
| `test/` | e2e test |

Chi tiết: [docs/versions/v1/IMPLEMENTATION.md](../../docs/versions/v1/IMPLEMENTATION.md) (Sprint V1.2), [docs/TESTING.md](../../docs/TESTING.md).
