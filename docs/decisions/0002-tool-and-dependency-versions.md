# ADR-0002: Phiên bản công cụ và dependency cho V1

- Trạng thái: Accepted (Đã chấp nhận)
- Ngày: 2026-10-15

## Bối cảnh

Dự án kéo dài nhiều tháng. Peer dependency không khớp là nguyên nhân phổ biến nhất gây ra lỗi cài đặt khó hiểu cho người mới. Các phiên bản được kiểm tra trên npm registry ngày 2026-10-15.

## Quyết định

| Thành phần | Phiên bản | Bằng chứng / lý do |
|---|---|---|
| Node.js | 24.x LTS | Đã cài sẵn (24.19.0). Đáp ứng Prisma 7 (`>=24`) và nestjs-pino (`>=22.12`). |
| pnpm | 12.11.2 | Đã cài sẵn (ban đầu ghi nhầm là 12.4.2, sửa ngày 2026-10-21). Ghim qua `packageManager` để mọi người (và CI) dùng cùng một phiên bản. |
| TypeScript | **6.0.x** | TypeScript 7.0 (compiler native mới) đang là `latest`, nhưng `@nestjs/swagger@12.0.2` khai báo peer `typescript ^5.5 \|\| ^6.0`, `@nestjs/cli@12.0.8` phụ thuộc `typescript ~6.0.2`, và template dự án NestJS 12 dùng `^6.0.2`. Các công cụ dùng TypeScript compiler API (Swagger plugin của Nest CLI, ts-jest) chưa hỗ trợ TS 7. **Xem xét lại ở V5 (CI).** |
| NestJS | 12.1.x | 12.0.0 phát hành ngày 2026-08-27. Đã kiểm tra hệ sinh thái: `@nestjs/swagger` 12, `@nestjs/config` 12.0.1 (`^11 \|\| ^12`), `@nestjs/jwt` 12, `nestjs-pino` 5.3.1 (`^11.0.8 \|\| ^12.0.2`). Template 12.x dùng oxlint và TS 6. Scaffold thực tế của `apps/api` đi kèm Vitest thay vì Jest (xem Sửa đổi 2026-10-21). |
| Prisma | **Đúng 7.10.0**, CLI và `@prisma/client` giống hệt nhau | ⚠ Ngày 2026-10-15, dist-tag `latest` của package `prisma` trỏ tới **`8.0.0-rc.23`, một bản pre-release**, trong khi `@prisma/client@latest` là 7.10.0. Chạy `pnpm add prisma` mà không ghi phiên bản sẽ cài một bản release candidate không khớp với client. Luôn cài `prisma@7.10.0 @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0`. |
| PostgreSQL | 18 (`postgres:18-alpine`) | Major hiện tại. Lưu ý: image chính thức đã đổi cấu trúc thư mục dữ liệu từ bản 18 (xem V1 TROUBLESHOOTING). |
| Next.js | 16.4.x, React 19.x | Dòng stable hiện tại. Next 16 dùng `proxy.ts` (trước đây là `middleware.ts`) và mặc định dùng Turbopack. |
| Tailwind CSS | 4.x | Viết style nhanh mà không cần thiết kế kiến trúc CSS trước. Bản thân nó không phải mục tiêu học. |
| Test API | **Vitest 4** + supertest (đổi từ Jest 30 ngày 2026-10-21, xem mục Sửa đổi) | Unit test và integration test ở mức HTTP. |
| Env validation | zod 4 | Validate env lúc khởi động và sinh type `Env`. DTO vẫn dùng class-validator. |
| Lint / format | oxlint 1.x + Prettier 3 | Có sẵn trong template NestJS 12. Bắt buộc từ V5 (CI). |
| Test web | Vitest 4 + Testing Library | Cùng major với API để một runner dùng chung cho cả repo. Xem lại ở V1.6 nếu Vitest 5 đã ổn định. |

## Quy tắc

1. **Lockfile mới là nơi ghim phiên bản thật sự.** `pnpm-lock.yaml` được commit. Trong CI dùng `pnpm install --frozen-lockfile`.
2. **Chỉ đổi major qua ADR.** Trước khi nâng major, kiểm tra peer dependency của các package phụ thuộc vào nó.
3. **Đừng tin `latest` một cách mù quáng.** Kiểm tra `npm view <pkg> dist-tags` (xem trường hợp Prisma ở trên).

## Hệ quả

- ➕ Có một baseline đã biết là tương thích. Khi gặp vấn đề có thể so với tài liệu này.
- ➖ Ta sẽ chậm một major TypeScript trong một thời gian. Việc nâng cấp đã được lên lịch, không bị bỏ quên.

## Sửa đổi 2026-10-21 (Sprint V1.2)

**Bối cảnh:** scaffold `apps/api` thực tế đi kèm Vitest, oxlint và Prettier chứ không có Jest. Code dùng zod để validate env. Phiên bản trong lockfile: `vitest` 4.1.12, `vite` 8.3.4, `zod` 4.6.7, `oxlint` 1.88.0, `prettier` 3.9.10, `typescript` 6.0.3, `@nestjs/core` 12.1.3.

**Quyết định:**
- Test API dùng **Vitest 4** thay Jest 30. Vitest chạy TypeScript trực tiếp, không cần ts-jest (một trong các lý do giữ TS 6 ở trên); khởi động nhanh; và cùng runner với web.
- **zod** cho env, **class-validator** cho DTO. Mỗi thư viện phục vụ một ranh giới (chi tiết ở V1 IMPLEMENTATION, Sprint V1.2, mục 3a).
- Giữ **oxlint + Prettier** của template. Không thêm ESLint.

**Hệ quả:**
- ➕ Một test runner cho cả monorepo. Không phụ thuộc ts-jest vào TypeScript compiler API.
- ➖ `apps/api` là CJS, nên file config Vitest phải dùng đuôi `.mts`. `tsconfig.json` cần `types: ["vitest/globals"]`.
- ➖ Gỡ `jest` khỏi `apps/api/package.json`, vì nó không còn được dùng.
