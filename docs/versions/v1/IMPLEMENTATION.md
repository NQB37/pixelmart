# Kế hoạch triển khai V1

Mọi sprint đều theo cùng một khung 10 phần: mục tiêu → khái niệm → công việc → file → test → kiểm tra thủ công → acceptance → bài tập troubleshooting → câu hỏi ôn tập → checkpoint commit.

Sprint V1.1 được viết đầy đủ chi tiết. Các sprint sau ở đây mới ở mức dàn ý và sẽ **được viết chi tiết khi bắt đầu từng sprint**, dựa trên những gì ta học được ở sprint trước.

Quy tắc: ta **dừng lại ở cuối mỗi sprint**. Sprint tiếp theo chỉ bắt đầu sau khi acceptance criteria đã được kiểm chứng và bạn xác nhận.

---

## Sprint V1.1 — Workspace foundations

### 1. Mục tiêu học tập
- Giải thích monorepo là gì và pnpm workspaces làm gì.
- Giải thích sự khác nhau giữa Docker **image**, **container** và **volume**, và chạy PostgreSQL trong một container.
- Giải thích vì sao `.env` bị git bỏ qua còn `.env.example` thì được commit.
- Kết nối tới PostgreSQL và chạy SQL bằng tay.
- Chứng minh dữ liệu vẫn còn sau khi restart container, và thấy nó biến mất khi xoá volume.

### 2. Khái niệm và điều kiện tiên quyết
Đọc trước khi code (ghi chú trong `docs/learning/`):
- [monorepo-and-pnpm-workspaces.md](../../learning/monorepo-and-pnpm-workspaces.md)
- [docker-fundamentals.md](../../learning/docker-fundamentals.md)
- [environment-variables-and-secrets.md](../../learning/environment-variables-and-secrets.md)

Điều kiện tiên quyết: Docker Desktop đã được cài và **đang chạy**. Có sẵn Node 24, pnpm 12 và git (đã kiểm tra trên máy này).

### 3. Các bước triển khai
1. Khởi tạo git; cấu hình line ending.
2. Tạo `package.json` ở thư mục gốc (workspace root dạng private, cố định package manager, engines, các script DB).
3. Tạo `pnpm-workspace.yaml` liệt kê `apps/*`.
4. Thêm `.gitignore`, `.gitattributes`, `.editorconfig`, `.node-version`.
5. Thêm `.env.example`. Copy nó thành `.env` trên máy local.
6. Thêm `docker-compose.yml` với một service duy nhất, `postgres`: image được cố định version, named volume, health check, port lấy từ env.
7. Thêm init script tạo database thứ hai, `pixelmart_test`, dành cho integration test (dùng từ V1.4).
8. Khởi động Postgres, kiểm tra health, chạy SQL và làm thí nghiệm về tính bền vững của dữ liệu.
9. Viết phần "Getting started (so far)" trong `README.md` ở thư mục gốc và điền bảng lệnh trong `docs/DEVELOPMENT.md` bằng các lệnh đã kiểm chứng.
10. Commit đầu tiên.

### 4. File cần tạo

| File | Trách nhiệm |
|---|---|
| `.gitignore` | Giữ `node_modules`, output của build, `.env*` (trừ `.env.example`) và các file rác của OS/editor ngoài git. |
| `.gitattributes` | Chuẩn hoá line ending về LF trong repo. Trên Windows, điều này giúp CRLF không làm hỏng shell script chạy trong Linux container sau này. |
| `.editorconfig` | Thống nhất thụt lề, charset và dòng trống cuối file giữa các editor. |
| `.node-version` | Ghi lại Node major (24) cho các công cụ quản lý version. |
| `package.json` | Workspace root: `"private": true`, `"packageManager": "pnpm@12.4.2"`, `engines`, các script `db:up`, `db:down`, `db:logs`, `db:psql`. |
| `pnpm-workspace.yaml` | Cho pnpm biết thư mục nào là workspace package (`apps/*`; `packages/*` chỉ thêm khi cần). |
| `.env.example` | Template có chú thích cho mọi biến, với giá trị **giả**. Được commit. |
| `.env` | Giá trị thật trên máy bạn. **Không bao giờ commit.** |
| `docker-compose.yml` | Hạ tầng local. Ở V1 chỉ có PostgreSQL. |
| `infra/docker/postgres/init/01-create-test-db.sql` | Chạy **một lần**, ở lần khởi động đầu tiên với volume trống. Tạo `pixelmart_test`. |
| `README.md` | Giới thiệu dự án và cách khởi động những gì đã có đến lúc này. |

Chưa tạo (chưa có lý do): `apps/`, `packages/`, `infra/nginx`, `.github/`.

### 5. Test cần viết và chạy
Chưa có code ứng dụng nên chưa có unit test. Việc kiểm chứng được làm bằng lệnh (mục 6). Health check là bước kiểm tra tự động đầu tiên của ta: Docker chạy `pg_isready` vài giây một lần và báo `healthy` hoặc `unhealthy`.

### 6. Kiểm tra thủ công
| Bước | Lệnh | Kết quả mong đợi |
|---|---|---|
| Toolchain | `node -v`, `pnpm -v`, `docker version` | v24.x, 12.4.x, có cả phần client + server (thiếu phần server ⇒ Docker Desktop chưa chạy) |
| Workspace hợp lệ | `pnpm install` | Chạy xong, tạo `pnpm-lock.yaml`, không lỗi |
| Khởi động DB | `pnpm db:up` rồi `docker compose ps` | `postgres` có trạng thái `healthy` (có thể hiện `starting` trong vài giây) |
| Kết nối | `pnpm db:psql` rồi `SELECT version();` | `PostgreSQL 18.x …` |
| DB test tồn tại | `\l` trong psql | Liệt kê `pixelmart` và `pixelmart_test` |
| Tính bền vững | Tạo một bảng và insert một dòng → `pnpm db:down` → `pnpm db:up` → `SELECT` | Dòng dữ liệu vẫn còn |
| Xoá volume | `docker compose down -v` → `pnpm db:up` → `SELECT` | Bảng biến mất (DB mới, init script đã chạy lại) |
| Secret không bị track | `git status` / `git check-ignore -v .env` | `.env` bị ignore. `.env.example` được track. |

### 7. Acceptance criteria
AC-1.1-01 … AC-1.1-07 trong [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md#sprint-v11--workspace-foundations).

### 8. Bài tập troubleshooting
1. **Xung đột port:** giả sử 5432 đã bị chiếm. Đổi `POSTGRES_PORT` thành 5433 trong `.env` rồi kết nối lại. Giải thích vì sao port phía container vẫn là 5432.
2. **Cái bẫy "đổi mật khẩu không có tác dụng":** đổi `POSTGRES_PASSWORD` trong `.env`, chạy `pnpm db:down && pnpm db:up`, rồi thử đăng nhập bằng mật khẩu mới qua TCP. Giải thích vì sao thất bại (init chỉ chạy khi thư mục dữ liệu trống) và hai cách khắc phục.
3. **Docker không chạy:** tắt Docker Desktop, chạy `pnpm db:up` và đọc lỗi. Tầng nào đã sinh ra lỗi đó?

### 9. Câu hỏi ôn tập
1. Tính năng workspace của pnpm mang lại gì mà hai thư mục riêng, mỗi thư mục một `package.json`, không có?
2. Image, container và volume: cái nào giữ dữ liệu của bạn, và cái nào bạn có thể xoá mà không mất dữ liệu?
3. Vì sao cần `.env.example` khi `.env` đã liệt kê đủ các biến?
4. Container ở trạng thái `running` khác gì với `healthy`?
5. Vì sao init script chỉ tạo `pixelmart_test` đúng một lần?

### 10. Checkpoint
`git commit -m "chore: initialize pnpm workspace and local PostgreSQL"`, sau đó cập nhật sprint log trong ROADMAP.

---

## Sprint V1.2 — NestJS API skeleton

> Kế hoạch chi tiết, viết trước khi code. **Cập nhật 2026-10-21** để khớp với scaffold thực tế: Vitest thay Jest, zod để validate env, giữ oxlint và Prettier, dùng `apps/api/.env`. Các quyết định nằm ở mục 3a. Những việc còn lại sau lần review code nằm ở mục 3b. **Cập nhật 2026-10-22:** đã sửa xong các mục 3b (trừ câu hỏi ✋), AC-1.2-01…07 đã có bằng chứng.

### 1. Mục tiêu học tập
- Mô tả được request lifecycle của Nest (middleware → guard → interceptor → pipe → handler → interceptor; filter bắt lỗi ở mọi tầng) và chỉ ra chỗ nào đặt validation, chỗ nào đặt xử lý lỗi, vì sao.
- Giải thích module / controller / provider và dependency injection; vì sao DI giúp test được mà không cần khởi động cả hệ thống.
- Giải thích vì sao config phải được validate lúc khởi động (fail fast) thay vì để lỗi lộ ra ở request đầu tiên.
- Đọc được một dòng log JSON và nối nó với đúng một request và đúng một response bằng request ID.

### 2. Khái niệm và điều kiện tiên quyết
Đọc trước khi code (ghi chú trong `docs/learning/`, viết ở đầu sprint này):
- `http-and-rest.md`: HTTP method, status code 200/400/404/500, resource và REST.
- `nestjs-fundamentals.md`: module, controller, provider, DI, request lifecycle.

Theo [LEARNING.md](LEARNING.md), bạn phải giải thích được các khái niệm này bằng lời của mình (✋) **trước khi viết dòng code đầu tiên** của sprint. Điều kiện tiên quyết: `pnpm install` của V1.1 chạy được; Node 24.x; pnpm 12.11.2. V1.2 không cần Postgres chạy, vì DB chỉ được kiểm tra từ V1.3.

### 3. Các bước triển khai
Phiên bản thực tế trong `pnpm-lock.yaml` (kiểm tra ngày 2026-10-21, khớp với [ADR-0002](../../decisions/0002-tool-and-dependency-versions.md)): `@nestjs/core` 12.1.3, `@nestjs/cli` 12.0.8, `@nestjs/config` 12.0.1, `@nestjs/swagger` 12.0.2, `nestjs-pino` 5.3.1 (`pino` 10.4.0, `pino-http` 11.0.0), `pino-pretty` 13.2.0, `zod` 4.6.7, `class-validator` 0.15.1, `vitest` 4.1.12 (`vite` 8.3.4), `supertest` 7.3.1, `oxlint` 1.88.0, `prettier` 3.9.10, `typescript` 6.0.3.

Đánh dấu: ✅ đã có trong code và đúng kế hoạch; 🟡 đã có nhưng cần sửa (chi tiết ở 3b); ⬜ chưa làm.

0. ✅/⬜ **Trước khi code:** hai file `docs/learning/http-and-rest.md` và `docs/learning/nestjs-fundamentals.md` đã viết xong. Các câu ✋ ở mục 9 vẫn chưa được trả lời.
1. ✅ **Scaffold `apps/api`:** dùng Nest CLI 12 trong thư mục tạm **ngoài repo**, rồi chuyển vào `apps/api`. Bỏ `.git`, `node_modules`, lockfile và `.gitignore` của template, vì repo đã có các file này ở thư mục gốc. Đặt `"name": "api"` và `"private": true` để khớp với `pnpm --filter api`. Template 12 có sẵn Vitest, oxlint và Prettier (xem 3a).
   - Lệnh generator (`nest g module …`) phải chạy **bên trong `apps/api`**, hoặc dùng `pnpm --filter api exec nest g …`. Nếu chạy ở gốc repo, Nest CLI không thấy `nest-cli.json` nên sẽ tạo file vào `src/` ở gốc. ✅ Thư mục `src/` thừa ở gốc (sinh ra theo cách đó) đã được xoá.
2. ✅ **Không đặt `"type": "module"` trong `apps/api/package.json`.** Nest biên dịch ra CJS. Root có `"type": "module"`, nhưng Node dùng `package.json` gần nhất để quyết định, nên file trong `apps/api` vẫn là CJS.
   - ✅ Hệ quả: Vite cảnh báo khi đọc `vitest.config.ts` viết bằng cú pháp ESM trong một package CJS. Đã sửa bằng cách đổi tên thành `vitest.config.mts` và `vitest.config.e2e.mts`, và cập nhật script `test:e2e`.
3. ✅ **Dependency:** `@nestjs/config @nestjs/swagger nestjs-pino pino-http class-validator class-transformer zod`; dev: `pino-pretty`. pnpm lưu dạng `^`, lockfile ghim phiên bản thật. ADR-0002 chỉ yêu cầu ghim exact cho Prisma. Đã gỡ `jest`, vì project dùng Vitest.
4. ✅ **Env validation** (`src/config/env.schema.ts`, zod):
   - `DATABASE_URL`: bắt buộc, `z.string().startsWith('postgresql://')`. Chuỗi rỗng phải bị từ chối. Chưa dùng ở V1.2, nhưng khai báo ngay để V1.3 không phải sửa.
   - `PORT`: `z.coerce.number().int().positive().default(4000)`. Thiếu `.default` thì khi không có biến, `Number(undefined)` thành `NaN` và bị báo lỗi.
   - `NODE_ENV`: `development | test | production`, mặc định `development`.
   - `LOG_LEVEL`: `trace | debug | info | warn | error | fatal`, mặc định `info`.
   - Export `type Env = z.infer<typeof envSchema>` và một hàm `validateEnv(config)`: gọi `safeParse`; nếu thất bại thì `throw new Error('Invalid environment variables:\n' + z.prettifyError(result.error))`. zod tự gom **mọi** lỗi, không dừng ở biến đầu tiên. Tách thành hàm riêng để unit test gọi trực tiếp.
   - `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, envFilePath: '.env' })`. Đường dẫn tương đối tính theo cwd. `pnpm --filter api …` chạy script với cwd là `apps/api`, nên file được đọc là `apps/api/.env`.
   - `ConfigModule` **không ghi đè** biến đã có trong `process.env`. Biến trong shell thắng biến trong `.env`.
5. ✅ **`apps/api/.env.example`:** `DATABASE_URL=postgresql://pixelmart:pixelmart_dev_password@localhost:5432/pixelmart`, `PORT=4000`, `NODE_ENV=development`, `LOG_LEVEL=info`. `.env.example` ở gốc giữ nguyên, chỉ chứa biến `POSTGRES_*` cho Compose. User, password và port trong `DATABASE_URL` phải khớp với `.env` ở gốc.
6. ✅ **Cấu hình app dùng chung** (`src/app.setup.ts`, hàm `configureApp(app)`): hiện chứa Swagger. `main.ts` và e2e test **cùng gọi `configureApp`**, để test không chạy một cấu hình khác production.
7. ✅ **Global pipe và filter đăng ký bằng provider** (`APP_PIPE`, `APP_FILTER`) trong `AppModule`: `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` và `HttpExceptionFilter`. Đăng ký kiểu này thì sau này inject được service, và e2e dựng từ `AppModule` cũng tự có chúng.
8. ✅ **Exception filter** (`src/common/filters/http-exception.filter.ts`): `@Catch()` bắt **mọi** exception, không chỉ `HttpException`. Định dạng thống nhất:
   ```json
   {
     "statusCode": 404,
     "error": "Not Found",
     "message": "Cannot GET /khong-co",
     "path": "/khong-co",
     "requestId": "3f2a…",
     "timestamp": "2026-10-16T08:00:00.000Z"
   }
   ```
   - Với `HttpException`, đọc nội dung từ **`exception.getResponse()`**, không lấy `exception.message`. Kết quả có thể là chuỗi, hoặc object `{ message, error, statusCode }`. Với lỗi của `ValidationPipe`, `message` là **mảng chuỗi** (ví dụ `["property foo should not exist"]`), còn `exception.message` chỉ là `"Bad Request Exception"`.
   - Nếu không có `error` thì dùng reason phrase của status, ví dụ `STATUS_CODES[status]` từ module `node:http`.
   - Lỗi không phải `HttpException` → `500`, `error: "Internal Server Error"`, `message: "Internal server error"`. Không đưa stack ra response. Ghi stack vào log ở mức `error` bằng `new Logger(HttpExceptionFilter.name)` từ `@nestjs/common`; sau bước 9, log này đi qua pino.
   - `requestId` lấy từ `request.id`, do pino-http gán.
9. ✅ **Request ID và logging** (`LoggerModule.forRootAsync` trong `AppModule`):
   - `pinoHttp.genReqId(req, res)`: dùng header `x-request-id` nếu client gửi chuỗi không rỗng dài tối đa 128 ký tự, nếu không thì `randomUUID()` (từ `node:crypto`). Luôn `res.setHeader('x-request-id', id)` rồi trả `id`. Giới hạn độ dài để client không nhồi được chuỗi tuỳ ý vào log. Mặc định pino-http chỉ đánh số tăng dần 1, 2, 3…, không đọc header.
   - `transport: pino-pretty` **chỉ khi `NODE_ENV === 'development'`**. `test` và `production` ghi JSON thuần. Vitest tự đặt `NODE_ENV=test`.
   - **Tên trường request ID trong JSON** là `req.id` (đã xác minh bằng output thật ngày 2026-10-22: `"req":{"id":"test-123","method":"GET",…}`).
10. ✅ **`main.ts`:**
    - `NestFactory.create(AppModule, { bufferLogs: true })`, rồi `app.useLogger(app.get(Logger))` với `Logger` từ `nestjs-pino`. Thiếu bước này thì log của Nest (khởi động, route mapping) không đi qua pino.
    - Port lấy từ `app.get(ConfigService<Env, true>).get('PORT', { infer: true })`, không đọc `process.env.PORT ?? 3000`. Như vậy giá trị đã validate và mặc định 4000 mới có tác dụng.
    - `app.enableShutdownHooks()` ✅.
    - Gọi `void bootstrap();`. Rule `no-floating-promises` của oxlint báo lỗi nếu Promise bị bỏ lơ.
11. ✅ **Health** (`src/modules/health/`): `GET /health` → `200 { "status": "ok", "uptime": <giây>, "timestamp": "…" }`. Không kiểm tra DB ở bước này; phần đó thuộc V1.3.
12. ✅ **Swagger:** `DocumentBuilder` với title `PixelMart API`, version `1.0`; UI tại `/docs`.
13. ✅ **Scripts trong `apps/api/package.json`:** `build`, `dev` (`nest start --watch`), `dev:debug`, `dev:prod` (`node dist/main`), `lint` (oxlint), `format` (Prettier), `test` (`vitest run`), `test:watch`, `test:cov`, `test:e2e` (`vitest run --config ./vitest.config.e2e.mts`). Bỏ `deploy`, vì project không dùng `nest deploy`.
14. ✅ **Scripts gốc:** thêm `"dev:api": "pnpm --filter api dev"`.
15. ✅ **Docs:** `docs/TESTING.md` đã tạo ngày 2026-10-21. Ngày 2026-10-22 đã cập nhật `README.md` (tạo `apps/api/.env`, chạy `pnpm dev:api`), bảng lệnh trong `docs/DEVELOPMENT.md` và `apps/api/README.md`.

**Cấu trúc file:**

| File | Trách nhiệm |
|---|---|
| `apps/api/package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json` | Cấu hình package và build (CJS). |
| `apps/api/vitest.config.mts`, `vitest.config.e2e.mts` | Cấu hình Vitest cho unit (`**/*.spec.ts`) và e2e (`**/*.e2e-spec.ts`). |
| `apps/api/.oxlintrc.json`, `.prettierrc` | Lint và format (giữ từ template, xem 3a). |
| `apps/api/src/main.ts` | Khởi động app: logger pino, `configureApp`, shutdown hooks, port từ `ConfigService`. |
| `apps/api/src/app.module.ts` | Ghép ConfigModule, LoggerModule, HealthModule; đăng ký `APP_PIPE`, `APP_FILTER`. |
| `apps/api/src/app.setup.ts` | `configureApp(app)`: Swagger và các cấu hình dùng chung giữa `main.ts` và e2e. |
| `apps/api/src/config/env.schema.ts` | Schema zod, type `Env`, hàm `validateEnv`. |
| `apps/api/src/common/filters/http-exception.filter.ts` | Định dạng lỗi thống nhất. |
| `apps/api/src/modules/health/health.controller.ts`, `health.module.ts` | `GET /health`. |
| `apps/api/src/**/*.spec.ts` | Unit test (đặt cạnh file nguồn). |
| `apps/api/test/app.e2e-spec.ts`, `test/validation.e2e-spec.ts` | e2e test. |
| `apps/api/.env.example` | `DATABASE_URL`, `PORT`, `NODE_ENV`, `LOG_LEVEL` với giá trị giả. |
| `package.json` (gốc) | Thêm `dev:api`. |
| `docs/TESTING.md`, `docs/learning/http-and-rest.md`, `docs/learning/nestjs-fundamentals.md` | Tài liệu của sprint. |

Quy ước thư mục: feature module nằm trong `src/modules/<tên>/`; phần dùng chung nằm trong `src/common/` và `src/config/`.

#### 3a. Quyết định đã chốt (cập nhật 2026-10-21)

- **`DATABASE_URL` bắt buộc ngay ở V1.2**, dù chưa dùng. Lý do: AC-1.2-02 cần một biến bắt buộc thật để kiểm chứng; và V1.3 chỉ việc dùng biến này.
- **`apps/api` là CJS**, không phải ESM (xem bước 2).
- **Vitest 4 thay Jest 30** để test API. Scaffold đã có sẵn Vitest; nó chạy TypeScript không cần ts-jest, nhanh hơn, và web (V1.6) sẽ dùng cùng runner. Đã ghi vào [ADR-0002](../../decisions/0002-tool-and-dependency-versions.md). Hệ quả: `tsconfig.json` có `types: ["vitest/globals"]`, và file config phải là `.mts`.
- **zod cho env, class-validator cho DTO.** Env là một object phẳng gồm toàn chuỗi. zod vừa validate, vừa sinh type `Env` từ chính schema (`z.infer`), và gom mọi lỗi trong một lần. DTO vẫn dùng class-validator, vì `ValidationPipe` và Swagger đọc metadata của class. Cái giá phải trả: project dùng hai thư viện validation, mỗi cái cho một ranh giới riêng.
- **Giữ oxlint và Prettier của template.** Quyết định này thay cho quyết định cũ "bỏ ESLint và Prettier". Template 12 dùng oxlint chứ không dùng ESLint: chạy nhanh, cấu hình nhỏ, và có rule `no-floating-promises`. Prettier đọc `.editorconfig`, nên không có hai bộ quy tắc mâu thuẫn. `pnpm --filter api lint` và `format` dùng được ngay, nhưng **chưa thuộc AC của V1.2**. Chúng trở thành bắt buộc khi có CI ở V5.
- **Mỗi app có file `.env` riêng** (`apps/api/.env`), không đọc `../../.env`. Mỗi app sở hữu cấu hình của nó; `apps/web/.env` sẽ có từ V1.5, và không app nào phải đọc ngược lên thư mục cha. Hệ quả: thông tin Postgres xuất hiện ở hai nơi, là `POSTGRES_*` trong `.env` ở gốc (cho Compose) và `DATABASE_URL` trong `apps/api/.env`. Đổi password thì phải sửa cả hai. Rule `*.env` trong `.gitignore` đã bao phủ file mới.
- **Filter bắt mọi exception** và **filter/pipe đăng ký qua provider**, để không phải viết lại khi thêm DI.
- **AC-1.2-07** (`ValidationPipe` trả 400 đúng định dạng và từ chối field lạ) được giữ. Không có AC này thì `ValidationPipe` không được kiểm chứng ở sprint nào.

#### 3b. Việc còn lại sau review code (2026-10-21)

Kết quả review: `tsc --noEmit` không có lỗi. `pnpm --filter api test` pass, nhưng chỉ có 1 test (`should be defined`). `pnpm --filter api test:e2e` **fail**: test chờ `{ status: 'OK' }` còn API trả `{ status: 'ok', uptime, timestamp }`.

| # | Việc | Bước | AC | Trạng thái (2026-10-22) |
|---|---|---|---|---|
| 1 | Filter đọc `getResponse()`, trả đủ `statusCode`, `error`, `message`, `path`, `requestId`, `timestamp`; log stack khi lỗi 500 | 8 | 03, 07 | ✅ Mảng `message` được giữ nguyên (trước đó bị `join(', ')`); tên lỗi lấy từ `STATUS_CODES` |
| 2 | `genReqId` + header `x-request-id`; `pino-pretty` chỉ ở `development` | 9 | 03, 04 | ✅ |
| 3 | `main.ts`: `bufferLogs` + `useLogger`, port từ `ConfigService`, `void bootstrap()` | 10 | 04 | ✅ |
| 4 | Env: `PORT` có mặc định, `DATABASE_URL` phải có tiền tố `postgresql://`, `validateEnv` dùng `prettifyError` | 4 | 02 | ✅ |
| 5 | Test theo mục 5: sửa e2e hiện có, thêm unit cho filter và env, thêm e2e validation | 5 | 06 | ✅ 11 unit test + 6 e2e test |
| 6 | Dọn: xoá `src/` ở gốc repo, gỡ `jest`, bỏ script `deploy`, đổi config sang `.mts`, sửa `apps/api/.env.example`, thêm `dev:api` | 1–3, 5, 13–14 | — | ✅ |
| 7 | Trả lời các câu ✋ ở mục 9 | 0 | — | ⬜ |
| 8 | Sau kiểm chứng: README, DEVELOPMENT, bằng chứng trong ACCEPTANCE_CRITERIA, sprint log | 15 | tất cả | ✅ |

### 4. File cần tạo
Xem bảng ở mục 3. Chưa tạo: `Prisma`, `apps/web`, `packages/*`, các module của catalog.

### 5. Test cần viết và chạy
Runner là Vitest 4 (`globals: true`, nên dùng `describe`/`it`/`expect` không cần import). Quy ước chung nằm ở [TESTING.md](../../TESTING.md).

- **Unit `src/common/filters/http-exception.filter.spec.ts`:** tạo `ArgumentsHost` giả bằng object (`switchToHttp().getRequest()/getResponse()`, với `status` và `json` là `vi.fn()`). Các trường hợp:
  - `NotFoundException` → đúng shape, `statusCode: 404`.
  - `BadRequestException` có mảng message → `message` vẫn là mảng.
  - `Error` thường → `500`, không lộ message gốc.
  - `requestId` lấy đúng từ `request.id`.
- **Unit `src/config/env.schema.spec.ts`:** gọi thẳng `validateEnv`:
  - thiếu `DATABASE_URL` → lỗi có tên biến;
  - `DATABASE_URL=""` → lỗi;
  - `PORT=abc` → lỗi;
  - thiếu nhiều biến → lỗi liệt kê đủ tất cả;
  - giá trị hợp lệ → `PORT` được ép thành số;
  - không có `PORT` → `4000`.
- **Unit `src/modules/health/health.controller.spec.ts`:** thay test `should be defined` bằng test kiểm tra `check()` trả `status: 'ok'` và `timestamp` là chuỗi ISO hợp lệ.
- **e2e `test/app.e2e-spec.ts`:**
  - `GET /health` → 200, `body.status === 'ok'`. Kiểm tra từng field, không so cả object, vì `timestamp` và `uptime` thay đổi.
  - Response có header `x-request-id`.
  - Gửi `x-request-id: test-123` → header trả về đúng `test-123`.
  - `GET /khong-co` → 404 đúng shape, `body.requestId` khớp với header.
- **e2e `test/validation.e2e-spec.ts`:** một controller test đặt ngay trong file spec (không đưa vào `AppModule`), với DTO dùng `class-validator`. Dựng bằng `Test.createTestingModule({ imports: [AppModule], controllers: [TestController] })`. Gửi body có field lạ → 400, `message` là mảng có tên field lạ (AC-1.2-07).
- Toàn bộ e2e dựng app bằng `Test.createTestingModule` và gọi `configureApp`. Không cần Postgres chạy, nhưng `AppModule` validate env, nên `apps/api/.env` phải có `DATABASE_URL` hợp lệ.

### 6. Kiểm tra thủ công
| Bước | Lệnh | Kết quả mong đợi |
|---|---|---|
| Cài | `pnpm install` | Không lỗi. Nếu pnpm báo build script bị chặn, làm theo [TROUBLESHOOTING](TROUBLESHOOTING.md) và chỉ phê duyệt package bạn nhận ra. |
| Env | `cp apps/api/.env.example apps/api/.env` | Có file `.env` cho API. |
| Khởi động | `pnpm dev:api` | Log báo đã lắng nghe ở port 4000. Log khởi động của Nest cũng đi qua pino. |
| Health | `curl -i localhost:4000/health` | `200`, JSON có `status: "ok"`, có header `x-request-id`. |
| Request ID từ client | `curl -i -H "x-request-id: test-123" localhost:4000/health` | Header trả về `x-request-id: test-123`. |
| 404 | `curl -i localhost:4000/khong-co` | `404`, đúng định dạng lỗi; `requestId` trong body khớp `x-request-id`. |
| Log | Đọc log của các request trên | Mỗi request có một dòng log với cùng request ID. Chạy với `NODE_ENV=production` để thấy JSON thuần. |
| Swagger | Mở `http://localhost:4000/docs` | Swagger UI tải được và liệt kê `/health`. |
| Thiếu env | Comment `DATABASE_URL` trong `apps/api/.env` (nhớ khôi phục) và chắc chắn shell không có biến này, rồi chạy `pnpm dev:api` | Process thoát với mã khác 0, thông báo có `DATABASE_URL`. Khôi phục `.env` sau bước này. |

Lỗi 500 không có route sẵn để gọi. Kiểm chứng bằng unit test của filter; **không thêm route debug vào app**.

### 7. Acceptance criteria
AC-1.2-01 … AC-1.2-07 trong [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md#sprint-v12--nestjs-api-skeleton).

### 8. Bài tập troubleshooting
1. **Thiếu `DATABASE_URL`:** xoá biến và đọc lỗi khi khởi động. Vì sao lỗi xuất hiện ngay lúc boot? Vì sao chạy `unset DATABASE_URL` trong shell **không đủ** để tái hiện lỗi? Ngược lại, vì sao nếu shell đang có `DATABASE_URL` thì xoá nó trong `.env` cũng không đủ? (Gợi ý: `ConfigModule` đọc `apps/api/.env` và không ghi đè `process.env`.)
2. **Route không tồn tại:** gọi `/khong-co` và lần ra thành phần nào tạo ra 404: router của Nest, hay filter? Vì sao nó đi qua cùng một định dạng lỗi?
3. **Port bị chiếm:** chạy `pnpm dev:api` hai lần cùng lúc, đọc lỗi `EADDRINUSE`. Sửa bằng `PORT` khác, và giải thích vì sao không cần đổi port của container.
4. **Generator chạy sai thư mục** _(đã gặp)_: vì sao `nest g module health` chạy ở gốc repo lại tạo `src/modules/health` ở gốc, thay vì trong `apps/api`? (Gợi ý: Nest CLI đọc `nest-cli.json` ở cwd.)
5. **Message lỗi validation bị mất:** khi filter dùng `exception.message`, body có field lạ trả về `"Bad Request Exception"`. Danh sách lỗi thật nằm ở đâu, và vì sao?

### 9. Câu hỏi ôn tập (✋ trước khi code, ✅ sau khi xong)
1. Vì sao validation nằm ở pipe (ranh giới hệ thống) chứ không nằm trong service?
2. Vì sao filter phải bắt được cả `Error` thường, không chỉ `HttpException`?
3. Request ID đến từ đâu, và vì sao phải trả nó về trong cả header lẫn body?
4. Vì sao `ConfigService` đọc được `apps/api/.env` khi bạn chạy `pnpm dev:api` ở gốc repo? (Gợi ý: cwd của `pnpm --filter` và `envFilePath` tương đối.)
5. Vì sao e2e test dùng chung `configureApp` với `main.ts`? Điều gì xảy ra nếu hai bên khác nhau?
6. Vì sao env dùng zod còn DTO dùng class-validator? Nếu chỉ được chọn một thì bạn chọn cái nào, và mất gì?

### 10. Checkpoint
Commit theo nhóm có ý nghĩa, ví dụ:
1. `docs: align V1.2 plan with Vitest, zod and per-app env`
2. `feat(api): scaffold NestJS API with config validation`
3. `feat(api): add error format, request ID and Swagger`
4. `test(api): cover env validation, error filter and e2e`

Cuối cùng cập nhật sprint log trong ROADMAP. Sau đó **dừng lại** và chờ bạn xác nhận AC-1.2-01…07 trước khi sang V1.3.

## Sprint V1.3 — Database schema with Prisma

- **Mục tiêu:** mô hình hoá quan hệ, PK/FK, unique constraint, index, migration như một lịch sử có version, ORM so với raw SQL, vì sao tiền không dùng float, seeding.
- **Công việc:** cài `prisma@7.10.0`, `@prisma/client@7.10.0`, `@prisma/adapter-pg@7.10.0`. Tạo `prisma.config.ts` (file cấu hình của Prisma 7), `schema.prisma` với Category / Product / Order / OrderItem / User và các enum. Migration đầu tiên. Migration thứ hai tạo bằng `--create-only` chứa các CHECK constraint trong [DATABASE.md](../../DATABASE.md). `PrismaService` + `PrismaModule`. Seed idempotent (dùng upsert): 4 danh mục, ~24 sản phẩm (một số ở trạng thái DRAFT), 1 admin với mật khẩu đã hash lấy từ env. Health check giờ ping tới DB.
- **Test:** migration test áp dụng toàn bộ migration lên `pixelmart_test` từ đầu. Constraint test cho thấy việc insert giá âm và `line_total` không khớp bị từ chối ở tầng **database**. Chạy seed hai lần cho ra cùng số lượng bản ghi.
- **Kiểm chứng:** xem bảng trong psql (`\d products`). Mở Prisma Studio.
- **Bài tập troubleshooting:** sửa một file migration đã được áp dụng và quan sát lỗi checksum/drift. Giải thích vì sao migration đã áp dụng là bất biến.
- **Docs:** `docs/learning/relational-databases-and-postgresql.md`, `docs/learning/prisma-and-migrations.md`. Trạng thái của DATABASE.md → đã triển khai.

## Sprint V1.4 — Public catalog API

- **Mục tiêu:** thiết kế resource, query DTO, pagination, `select` so với over-fetching, N+1 problem, integration test với DB thật.
- **Công việc:** `CatalogModule` với `GET /categories`, `/categories/:slug`, `/products` (chỉ sản phẩm đã publish, lọc theo `category`, pagination), `/products/:slug`. Response DTO: tiền dưới dạng chuỗi. Swagger annotation. Ánh xạ lỗi Prisma → HTTP trong exception filter.
- **Test:** unit test cho phép tính pagination. Integration test (supertest + `pixelmart_test`) cho: sản phẩm draft không hiển thị, `pageSize=101` → 400, slug không tồn tại → 404, `totalPages` đúng.
- **Docs:** tạo `docs/API.md` (tổng quan + link tới Swagger). Viết `docs/learning/rest-api-design.md`.

## Sprint V1.5 — Storefront pages

- **Mục tiêu:** App Router, Server và Client Components, lấy dữ liệu phía server, `loading.tsx` / `error.tsx` / `not-found.tsx`, `next/image` và remote patterns, env var chỉ dùng phía server.
- **Công việc:** scaffold `apps/web` (Next 16, TS, Tailwind 4, App Router, `src/`). API client có kiểu dữ liệu trong `src/lib/api/`. Các trang: `/` (sản phẩm mới nhất), `/products/[slug]`, `/categories/[slug]` có pagination. Loading skeleton, empty state, error boundary. Script gốc `pnpm dev` chạy web + api cùng lúc.
- **Quyết định (ADR-0006):** kiểu dữ liệu API viết tay hay sinh ra từ OpenAPI. Mặc định: viết tay trước để bạn cảm nhận vấn đề lệch kiểu (drift), rồi chuyển sang sinh tự động ở V2.
- **Test:** unit test bằng Vitest cho hàm định dạng tiền. Kiểm tra thủ công từng state: tắt API → error state, danh mục rỗng → empty state.
- **Docs:** `docs/learning/nextjs-app-router-and-rendering.md`.

## Sprint V1.6 — Shopping cart

- **Mục tiêu:** client state, `useReducer` + Context, lưu bền vững bằng localStorage, lỗi hydration mismatch, thiết kế để dễ thay thế.
- **Công việc:** `features/cart/` với một `cartReducer` thuần (add, setQuantity, remove, clear) và một interface `CartStore` đứng trước implementation `LocalStorageCartStore`, để V2 có thể thay bằng cart phía server. Trang cart và badge trên header. Giới hạn số lượng 1–99 giống backend (chỉ phục vụ UX).
- **Test:** unit test cho reducer (thêm cùng một sản phẩm hai lần thì gộp lại, số lượng 0 thì xoá, tối đa 99). Test rằng giá trị localStorage bị hỏng được reset an toàn.
- **Các hạn chế được ghi lại:** chỉ trên từng thiết bị, mất khi xoá dữ liệu trình duyệt, người dùng sửa được (nên server không bao giờ tin), không có reservation tồn kho, giá hiển thị có thể đã cũ.

## Sprint V1.7 — Checkout and order creation

- **Mục tiêu:** không bao giờ tin client, tính giá phía server, DB transaction và ACID, tính toán bằng Decimal, mã lỗi mà UI có thể dựa vào để xử lý.
- **Công việc:** `OrdersModule`: `CreateOrderDto` (chỉ gồm các trường thông tin khách hàng + items `{productId, quantity}`). `OrdersService.create`: gộp các mục trùng → lấy các sản phẩm đã publish → 422 nếu thiếu sản phẩm nào → tính toán bằng Decimal → `prisma.$transaction` tạo order + items → thử lại khi trùng mã đơn hàng. `GET /orders/:orderNumber/summary` (không có PII). Web: form checkout (Server Action), lỗi theo từng trường, vô hiệu hoá nút submit khi đang xử lý, trang xác nhận, xoá cart khi thành công.
- **Test:** unit test cho bộ tính tổng tiền (bao gồm `0.10 × 3`). Integration test: giá bị sửa trong request body bị bỏ qua (và bị `forbidNonWhitelisted` từ chối); sản phẩm chưa publish → 422; số lượng 0 → 400; **một lỗi được cố ý gây ra khi insert item sẽ rollback cả dòng order** (sau đó có 0 đơn hàng).
- **Docs:** `docs/learning/transactions-and-acid.md`. Ghi lại lỗ hổng gửi trùng và kế hoạch cho V2.

## Sprint V1.8 — Admin authentication and authorization

- **Mục tiêu:** authentication và authorization, hash mật khẩu (argon2id), JWT là gì và không là gì, httpOnly cookie, guard, role, 401 và 403.
- **Công việc:** `AuthModule`: `POST /auth/login` (so sánh constant-time thông qua argon2 verify, thông báo lỗi chung chung), JWT (TTL ngắn, ví dụ 1h), `JwtAuthGuard`, `RolesGuard` + `@Roles('ADMIN')`, `GET /auth/me`. Web: Server Action ở `/admin/login` đặt một httpOnly cookie. `proxy.ts` chuyển hướng các request `/admin/*` chưa đăng nhập về trang login. Logout xoá cookie.
- **Quyết định (ADR-0007):** admin auth của V1 = JWT stateless trong httpOnly cookie trên origin của web. Hạn chế đã biết: không thu hồi được phía server trước khi hết hạn, sẽ xem lại ở V2.
- **Test:** không có token → 401. Token hợp lệ nhưng role không phải admin → 403. Token hết hạn/bị sửa → 401. Sai mật khẩu và email không tồn tại trả về **cùng một** response.
- **Cố ý làm trước admin CRUD**, để không bao giờ có admin write endpoint nào tồn tại mà không được bảo vệ.

## Sprint V1.9 — Admin catalog management

- **Công việc:** các endpoint `/admin/categories` và `/admin/products` (tất cả đều có guard). Sinh slug + kiểm tra unique → 409. Xoá danh mục còn sản phẩm → 409. Bật/tắt trạng thái sản phẩm. Validate image URL (https, độ dài). Admin UI: bảng có pagination, form tạo/sửa hiển thị lỗi từ server, xác nhận trước khi xoá.
- **Test:** integration test cho mọi trường hợp 409. Publish làm sản phẩm xuất hiện trong `/products` public; unpublish làm nó ẩn đi. Mọi route admin không có token → 401 (một test tham số hoá chạy qua danh sách route).

## Sprint V1.10 — Admin order management

- **Công việc:** danh sách `/admin/orders` (lọc theo trạng thái, pagination, mới nhất trước), trang chi tiết có dữ liệu khách hàng và snapshot của item, endpoint chuyển trạng thái tuân theo state machine. Admin UI cho danh sách/chi tiết/chuyển trạng thái.
- **Test:** một test dạng bảng (table-driven) cho mọi chuyển trạng thái được phép và bị cấm. Đổi tên sản phẩm sau khi đặt hàng không làm thay đổi `productName` của đơn hàng (chứng minh snapshot).

## Sprint V1.11 — V1 release

- **Công việc:** chạy thử từ một bản clone mới, chỉ làm theo README. Chạy toàn bộ test suite. Đi qua từng acceptance criterion kèm bằng chứng. Lấp các chỗ còn thiếu. Viết retrospective cho V1 (danh sách tech debt). Gắn tag `v1.0.0`.
- **Sản phẩm bàn giao:** V1 chỉ được đánh dấu ✅ trong ROADMAP khi mọi tiêu chí của V1 đã được kiểm chứng.
