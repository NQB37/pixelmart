# Troubleshooting V1

Các vấn đề dự kiến, được viết **trước khi** chúng xảy ra. Mỗi mục gồm: triệu chứng → nguyên nhân gốc → cách xác nhận → cách sửa. Những vấn đề ta thực sự gặp sẽ được đánh dấu _(đã gặp)_ kèm ngày.

## V1.1 — Docker và PostgreSQL

### `error during connect … dockerDesktopLinuxEngine: The system cannot find the file specified`
- **Nguyên nhân gốc:** Docker CLI không kết nối được tới Docker engine, thường là do Docker Desktop chưa chạy.
- **Xác nhận:** `docker version` có phần Client nhưng không có phần Server.
- **Sửa:** khởi động Docker Desktop và đợi tới khi thấy "Engine running".

### `Bind for 0.0.0.0:5432 failed: port is already allocated`
- **Nguyên nhân gốc:** có thứ gì đó trên máy host đang lắng nghe ở 5432, thường là một PostgreSQL Windows service được cài trực tiếp, hoặc một container khác.
- **Xác nhận:** PowerShell `Get-NetTCPConnection -LocalPort 5432` hoặc `docker ps` để tìm một postgres khác.
- **Sửa:** dừng service kia, hoặc đặt `POSTGRES_PORT=5433` trong `.env`. Chỉ phía **host** của ánh xạ port thay đổi; bên trong mạng Docker, Postgres vẫn lắng nghe ở 5432.

### `password authentication failed for user "pixelmart"` sau khi sửa `.env`
- **Nguyên nhân gốc:** `POSTGRES_USER`, `POSTGRES_PASSWORD` và `POSTGRES_DB` **chỉ được áp dụng khi thư mục dữ liệu còn trống** (lần khởi động đầu tiên). Đổi chúng về sau không làm thay đổi database đã tồn tại.
- **Xác nhận:** `docker volume ls` cho thấy volume cũ vẫn còn.
- **Sửa (dữ liệu dev có thể bỏ):** `docker compose down -v` rồi `pnpm db:up`. **Sửa (giữ dữ liệu):** `ALTER USER pixelmart WITH PASSWORD '…';` trong psql.
- **Lưu ý:** `psql` bên trong container có thể vẫn đăng nhập được mà không cần mật khẩu, vì image tin tưởng các kết nối qua socket local. Điều đó che giấu vấn đề này cho tới khi API kết nối qua TCP ở V1.3.

### Container PostgreSQL 18 lỗi, báo về thư mục dữ liệu / cấu trúc volume cũ
- **Nguyên nhân gốc:** từ PostgreSQL 18, image chính thức lưu dữ liệu trong một thư mục con theo từng version và yêu cầu volume được mount tại **`/var/lib/postgresql`**, chứ không phải `/var/lib/postgresql/data` như nhiều hướng dẫn cũ.
- **Sửa:** mount named volume tại `/var/lib/postgresql`. Không bao giờ dùng lại volume được tạo bởi một major version cũ hơn. Nâng major version cần `pg_upgrade` hoặc dump/restore (học ở V15).

### Init script không chạy (thiếu `pixelmart_test`)
- **Nguyên nhân gốc:** các script trong `/docker-entrypoint-initdb.d` chỉ chạy ở lần khởi tạo đầu tiên. Nếu volume đã tồn tại, chúng bị bỏ qua.
- **Sửa:** `docker compose down -v && pnpm db:up`, hoặc tạo database bằng tay một lần.

### Shell init script lỗi `/bin/sh^M: bad interpreter`
- **Nguyên nhân gốc:** line ending CRLF của Windows trong một script được Linux thực thi.
- **Phòng tránh:** `.gitattributes` với `* text=auto eol=lf`. Init script của V1 là file `.sql`, chịu được CRLF, nhưng các file `.sh` về sau thì không.

### `pnpm install` cảnh báo build script bị bỏ qua (ví dụ Prisma, argon2) _(dự kiến từ V1.3)_
- **Nguyên nhân gốc:** các version pnpm gần đây không chạy lifecycle script của dependency trừ khi bạn cho phép rõ ràng. Đây là biện pháp bảo mật chuỗi cung ứng (supply chain).
- **Sửa:** phê duyệt các package cụ thể (pnpm in ra lệnh cần chạy). Commit cấu hình sinh ra trong `pnpm-workspace.yaml`. Chỉ phê duyệt những package bạn nhận ra.

## V1.2 — NestJS API

### Thư mục `src/` lạ xuất hiện ở gốc repo _(đã gặp 2026-10-21)_
- **Nguyên nhân gốc:** chạy `nest g …` ở gốc repo. Nest CLI đọc `nest-cli.json` ở cwd. Ở gốc repo không có file này, nên CLI dùng `sourceRoot` mặc định là `src/` của thư mục hiện tại.
- **Sửa:** xoá `src/` ở gốc. Chạy generator trong `apps/api`, hoặc dùng `pnpm --filter api exec nest g …`.

### Vite cảnh báo `ESM syntax in a file loaded as CommonJS (vitest.config.ts)` _(đã gặp 2026-10-21)_
- **Nguyên nhân gốc:** `apps/api/package.json` không có `"type": "module"` (cố ý, xem IMPLEMENTATION V1.2 bước 2), nên Node coi file `.ts` là CJS. Trong khi đó, file config lại dùng `import`/`export`.
- **Sửa:** đổi tên thành `vitest.config.mts` / `vitest.config.e2e.mts`. Đuôi `.mts` luôn được hiểu là ESM. Cập nhật đường dẫn trong script `test:e2e`.

### Lỗi validation chỉ trả `"Bad Request Exception"`
- **Nguyên nhân gốc:** filter đọc `exception.message`. Danh sách lỗi của `ValidationPipe` nằm ở `exception.getResponse().message`, dưới dạng mảng.
- **Sửa:** filter đọc `getResponse()` (IMPLEMENTATION V1.2 bước 8).

### Request ID trong log là `1`, `2`, `3`… và không khớp header
- **Nguyên nhân gốc:** chưa cấu hình `genReqId`. Mặc định pino-http dùng một bộ đếm tăng dần, không đọc và không trả header `x-request-id`.
- **Sửa:** cấu hình `pinoHttp.genReqId` (IMPLEMENTATION V1.2 bước 9).

### API chạy port 3000 thay vì 4000, hoặc log khởi động không phải JSON
- **Nguyên nhân gốc:** `main.ts` đọc thẳng `process.env.PORT ?? 3000`, bỏ qua giá trị đã validate trong `ConfigService`. Log khởi động không phải JSON vì app chưa gọi `bufferLogs` / `useLogger`.
- **Sửa:** IMPLEMENTATION V1.2 bước 10.

### e2e test fail ngay lúc import `AppModule` với `must start with "postgresql://"` _(đã gặp 2026-10-22)_
- **Triệu chứng:** `pnpm --filter api test:e2e` báo `Tests 1 skipped`, `Errors 1 error`, stack trỏ vào `ConfigModule.forRoot` trong `app.module.ts`.
- **Nguyên nhân gốc:** `apps/api/.env` vẫn còn giá trị thử nghiệm (`DATABASE_URL='test'`) sau khi thử AC-1.2-02. `ConfigModule.forRoot()` được gọi ngay khi file `app.module.ts` được import (lúc decorator `@Module` chạy), nên env sai làm hỏng việc import trước khi test nào kịp chạy.
- **Sửa:** khôi phục `DATABASE_URL` từ `apps/api/.env.example`. Khi thử AC-1.2-02, ưu tiên ghi đè bằng shell (`DATABASE_URL= pnpm dev:api`) thay vì sửa file, để không quên khôi phục.

### Xoá `DATABASE_URL` trong `.env` nhưng API vẫn khởi động
- **Nguyên nhân gốc:** biến vẫn còn trong shell. `ConfigModule` không ghi đè `process.env`, nên biến trong shell thắng. Một khả năng khác: bạn sửa nhầm `.env` ở gốc, trong khi API đọc `apps/api/.env`.
- **Xác nhận:** `echo $DATABASE_URL` (PowerShell: `$env:DATABASE_URL`).
- **Sửa:** `unset DATABASE_URL` (PowerShell: `Remove-Item Env:DATABASE_URL`) và sửa đúng file `apps/api/.env`.

## V1.3 — Prisma và database (dự kiến)

### Cài `prisma` ra version `8.0.0-rc.x`
- **Nguyên nhân gốc:** dist-tag `latest` của `prisma` từng trỏ tới một bản RC, trong khi `@prisma/client@latest` là 7.10.0 ([ADR-0002](../../decisions/0002-tool-and-dependency-versions.md)).
- **Xác nhận:** `pnpm --filter api exec prisma --version` cho thấy CLI và client khác version.
- **Sửa:** cài lại với version chính xác `@7.10.0` và `--save-exact` (IMPLEMENTATION V1.3 bước 2).

### Prisma CLI báo thiếu `DATABASE_URL`, kể cả với `prisma generate`
- **Nguyên nhân gốc:** Prisma 7 không tự đọc `.env`. `prisma.config.ts` load nó qua `dotenv/config`, theo cwd. Hoặc `apps/api/.env` chưa có, hoặc lệnh chạy từ sai thư mục. `env()` báo lỗi ngay khi thiếu biến, kể cả khi lệnh không kết nối DB.
- **Sửa:** tạo `apps/api/.env` từ `.env.example`, chạy Prisma qua script ở gốc (`pnpm db:generate`, …) hoặc `pnpm --filter api exec prisma …`, để cwd là `apps/api`.

### `Cannot find module '../generated/prisma/client'`
- **Nguyên nhân gốc:** chưa chạy `prisma generate`. Từ Prisma 7, client sinh vào `src/generated/prisma` (bị git bỏ qua), không còn nằm trong `node_modules`, và `migrate dev` không còn tự generate.
- **Sửa:** `pnpm db:generate`. Chạy lại mỗi khi sửa `schema.prisma`.

### `Can't reach database server at localhost:5432` (P1001)
- **Nguyên nhân gốc:** DB chưa chạy/chưa healthy, sai port (đã đổi `POSTGRES_PORT` nhưng chưa sửa `DATABASE_URL`), hoặc sai host (`localhost` khi chạy từ máy bạn, `postgres` khi chạy bên trong Docker ở V4).
- **Xác nhận:** `docker compose ps`; so port trong `DATABASE_URL` với `POSTGRES_PORT`.

### `password authentication failed` khi Prisma kết nối, dù `pnpm db:psql` vẫn vào được
- **Nguyên nhân gốc:** `psql` trong container đi qua socket local nên không cần mật khẩu; Prisma đi qua TCP nên mật khẩu phải đúng. Thường do mật khẩu trong `DATABASE_URL` khác `POSTGRES_PASSWORD`, hoặc volume được tạo với mật khẩu cũ (xem mục V1.1 ở trên).

### `pnpm install` cảnh báo build script bị bỏ qua (`argon2`, có thể cả package của Prisma)
- **Nguyên nhân gốc:** pnpm không chạy lifecycle script của dependency nếu chưa được cho phép trong `allowBuilds`. Đây là biện pháp bảo mật supply chain.
- **Triệu chứng nếu bỏ qua:** seed lỗi lúc `import argon2` vì thiếu native binding.
- **Sửa:** phê duyệt đúng package bạn nhận ra, commit `pnpm-workspace.yaml`. Không dùng cờ cho phép mọi package.

### Cột thời gian ra `timestamp(3) without time zone`
- **Nguyên nhân gốc:** khai báo `DateTime` mà thiếu `@db.Timestamptz(3)`. Mặc định của Prisma với PostgreSQL là `timestamp(3)`.
- **Sửa:** thêm `@db.Timestamptz(3)` và tạo **migration mới**. Không sửa migration đã áp dụng.

### `The migration … was modified after it was applied`
- **Nguyên nhân gốc:** file `migration.sql` đã áp dụng bị sửa. Prisma lưu checksum của mỗi migration trong `_prisma_migrations` và so sánh lại.
- **Sửa:** khôi phục file bằng git, rồi đưa thay đổi vào một migration mới. Chỉ ở DB dev có thể bỏ được dữ liệu thì mới chấp nhận reset.

### `Drift detected` khi chạy `migrate dev`
- **Nguyên nhân gốc:** cấu trúc DB không còn khớp lịch sử migration, thường vì ai đó sửa bảng trực tiếp trong psql.
- **Sửa:** hoàn tác thay đổi thủ công, hoặc (chỉ ở dev) reset. Mọi thay đổi cấu trúc phải đi qua migration.

### `migrate reset` bị chặn khi chạy bởi một AI agent
- **Nguyên nhân gốc:** các bản Prisma gần đây chặn lệnh phá dữ liệu (như `migrate reset --force`) khi phát hiện đang chạy trong một AI coding agent, và yêu cầu người dùng đồng ý rõ ràng. `globalSetup` của `test:int` chạy đúng lệnh này.
- **Sửa:** bạn tự chạy `pnpm --filter api test:int` trong terminal của mình. Đọc thông báo của Prisma; chỉ đồng ý khi URL trỏ tới `pixelmart_test`.

### Test constraint "pass" nhưng không chứng minh gì
- **Nguyên nhân gốc:** test chỉ kiểm tra "có lỗi", và lỗi thật là sai tên cột hoặc thiếu cột NOT NULL, không phải CHECK.
- **Phòng tránh:** luôn có ca đối chứng hợp lệ, và kiểm tra tên constraint trong lỗi (IMPLEMENTATION V1.3 mục 5).

### `/health/ready` treo lâu khi DB không phản hồi
- **Nguyên nhân gốc:** thiếu timeout. Khi container dừng hẳn, kết nối bị từ chối ngay; khi DB treo hoặc mạng chậm, query có thể chờ rất lâu.
- **Sửa:** đua query với `READINESS_TIMEOUT_MS` (IMPLEMENTATION V1.3 bước 9).

## Các sprint sau của V1 (dự kiến)

| Sprint | Vấn đề có thể gặp | Gợi ý nguyên nhân gốc |
|---|---|---|
| V1.5 | Ảnh từ host bên ngoài lỗi trong `next/image` | Host chưa được liệt kê trong `images.remotePatterns`. |
| V1.6 | Cảnh báo "Hydration failed" | Server render một cart rỗng trong khi client render nội dung từ localStorage. Chỉ đọc localStorage sau khi component đã mount. |
| V1.7 | Tổng tiền kiểu `59.970000000000006` | Đâu đó đang tính bằng Number thay vì Decimal. |
| V1.8 | Cookie không được gửi lên server | Sai các flag `path`/`sameSite`/`secure`. `secure: true` trên http://localhost thuần sẽ lỗi ở một số trình duyệt. |
