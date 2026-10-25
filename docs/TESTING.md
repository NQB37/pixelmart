# Testing

Quy ước test của PixelMart. Tạo ở V1.2, bổ sung khi các sprint sau thêm loại test mới. Lý do chọn Vitest: [ADR-0002](decisions/0002-tool-and-dependency-versions.md).

## Công cụ

| Phạm vi | Công cụ | Có từ |
|---|---|---|
| API: unit + e2e | Vitest 4 + `@nestjs/testing` + supertest | V1.2 |
| API: integration với DB thật | Vitest + database `pixelmart_test` (reset trước mỗi lần chạy) | V1.3 (dự kiến) |
| Web: unit + component | Vitest 4 + React Testing Library | V1.5–V1.6 (dự kiến) |

## Quy ước đặt file

| Loại | Vị trí | Mẫu tên | Config |
|---|---|---|---|
| Unit test | Cạnh file nguồn, trong `src/` | `*.spec.ts` | `apps/api/vitest.config.mts` |
| e2e test (HTTP, dựng cả `AppModule`) | `apps/api/test/` | `*.e2e-spec.ts` | `apps/api/vitest.config.e2e.mts` |
| Integration test (DB thật) _(dự kiến V1.3)_ | `apps/api/test/integration/` | `*.int-spec.ts` | `apps/api/vitest.config.int.mts` |

Ví dụ: `src/common/filters/http-exception.filter.ts` có test ở `src/common/filters/http-exception.filter.spec.ts`.

## Lệnh

Chạy ở thư mục gốc repo:

| Lệnh | Tác dụng |
|---|---|
| `pnpm --filter api test` | Chạy toàn bộ unit test một lần |
| `pnpm --filter api test:watch` | Unit test ở chế độ watch |
| `pnpm --filter api test:cov` | Unit test kèm coverage (v8) |
| `pnpm --filter api test:e2e` | Chạy e2e test |
| `pnpm --filter api test:int` _(dự kiến V1.3)_ | Reset `pixelmart_test` rồi chạy integration test. Cần `pnpm db:up` |

## Nguyên tắc

1. **e2e dựng app giống production.** Dùng `Test.createTestingModule({ imports: [AppModule] })`, rồi gọi `configureApp(app)` giống `main.ts`. Pipe và filter toàn cục đăng ký qua `APP_PIPE` / `APP_FILTER` nên tự có trong test.
2. **Không thêm route debug vào app để phục vụ test.** Cần một route chỉ để test (ví dụ để kiểm tra `ValidationPipe`) thì khai báo controller ngay trong file spec và thêm vào `controllers` của testing module.
3. **Kiểm tra từng field, không so cả object** khi response có giá trị thay đổi theo thời gian (`timestamp`, `uptime`, `requestId`).
4. **Unit test gọi thẳng hàm thuần** (ví dụ `validateEnv`) thay vì khởi động Nest.
5. **Test không bao giờ chạy trên database dev.** Từ V1.3, test có DB chỉ dùng `pixelmart_test`.
6. Vitest dùng `globals: true`, nên `describe` / `it` / `expect` / `vi` không cần import. Vitest tự đặt `NODE_ENV=test`.

## Integration test với database (dự kiến V1.3)

Chi tiết: [IMPLEMENTATION V1.3](versions/v1/IMPLEMENTATION.md#sprint-v13--database-schema-with-prisma), bước 12–13.

- URL của DB test được **suy ra** từ `DATABASE_URL` bằng cách đổi tên database thành `pixelmart_test`. Nếu kết quả không trỏ tới `pixelmart_test`, test dừng **trước** khi reset.
- `globalSetup` chạy `prisma migrate reset --force` lên `pixelmart_test`: mỗi lần chạy bắt đầu từ một DB trống đã áp đủ migration. Seed không tự chạy; test nào cần dữ liệu thì tự tạo, hoặc gọi `seed()`.
- Các file chạy tuần tự (`fileParallelism: false`) vì dùng chung một DB. Mỗi file dọn dữ liệu của chính nó.
- Muốn chứng minh **database** từ chối một giá trị, insert bằng SQL thuần (`$executeRaw`), có ca đối chứng hợp lệ, và kiểm tra đúng tên constraint trong lỗi.

## Điều kiện để chạy test (V1.2)

- Chưa cần Postgres chạy.
- `AppModule` validate env lúc khởi động. Vì vậy e2e cần `apps/api/.env` có `DATABASE_URL` hợp lệ, hoặc biến đó có sẵn trong shell.
