# V1 Acceptance Criteria

Mỗi tiêu chí phải được **kiểm chứng bằng cách chạy thật**. Ghi bằng chứng (lệnh + phần output liên quan, hoặc tên test) vào cột Bằng chứng. Tiêu chí chưa có bằng chứng thì chưa được coi là xong.

## Sprint V1.1 — Workspace foundations

| ID | Tiêu chí | Cách kiểm chứng | Bằng chứng |
|---|---|---|---|
| AC-1.1-01 | Repo là một git repository, `.env` bị ignore còn `.env.example` được track | `git check-ignore -v .env` in ra một rule; `git ls-files .env.example` in ra tên file | ✅ `git check-ignore -v .env` → `.gitignore:63:*.env	.env`; `git ls-files .env.example` → `.env.example`; `git ls-files .env` → 0 dòng (commit `abd2b64`) |
| AC-1.1-02 | `pnpm install` chạy thành công ở thư mục gốc và tạo ra `pnpm-lock.yaml` | Chạy lệnh trên repo sạch | ✅ `pnpm install` → "Already up to date"; có `pnpm-lock.yaml` (pnpm 12.11.2, Node 24.19.0) |
| AC-1.1-03 | `pnpm db:up` khởi động PostgreSQL 18 và đạt trạng thái `healthy` | `docker compose ps` hiển thị `(healthy)` | ✅ `pnpm db:up` → container `Healthy`; `docker compose ps` → `postgres:18-alpine ... Up (healthy)` |
| AC-1.1-04 | Bạn chạy được SQL bên trong database | `pnpm db:psql` → `SELECT version();` hiển thị 18.x | ✅ `current_user` = `pixelmart`; `SELECT version();` → `PostgreSQL 18.6` |
| AC-1.1-05 | Cả hai database `pixelmart` và `pixelmart_test` đều tồn tại | `\l` trong psql | ✅ `pg_database` liệt kê `pixelmart` và `pixelmart_test` |
| AC-1.1-06 | Dữ liệu còn sau `db:down`/`db:up`, và bị xoá sạch bởi `down -v` | Thí nghiệm về tính bền vững trong IMPLEMENTATION §6 | ✅ Sau `db:down` + `db:up`, `SELECT` vẫn trả dòng `1\|persist`; sau `docker compose down -v` + `db:up`, `to_regclass('ac_probe')` rỗng và `pixelmart_test` được tạo lại |
| AC-1.1-07 | Không có secret thật nào bị commit; `.env.example` chỉ chứa giá trị giả | Xem `git show --stat HEAD` và nội dung file | ✅ Commit `abd2b64` chỉ có `.env.example` (giá trị giả `pixelmart_dev_password`), không có `.env` |

## Sprint V1.2 — NestJS API skeleton

| ID | Tiêu chí | Cách kiểm chứng | Bằng chứng |
|---|---|---|---|
| AC-1.2-01 | `GET /health` trả về 200 kèm JSON `{ status: "ok", uptime, timestamp }` | `curl -i localhost:4000/health`; e2e test | ✅ `curl -i localhost:4000/health` → `HTTP/1.1 200 OK`, body `{"status":"ok","uptime":3,"timestamp":"2026-10-22T19:27:23.272Z"}`; e2e `GET /health > returns 200 with status ok`; unit `HealthController > reports ok with uptime and an ISO timestamp` |
| AC-1.2-02 | API từ chối khởi động khi thiếu hoặc rỗng `DATABASE_URL`, thông báo có tên biến. Phải gỡ biến khỏi **cả shell lẫn `apps/api/.env`** thì test mới có ý nghĩa | Unit test `validateEnv`; chạy `pnpm dev:api` với biến đã gỡ → exit code ≠ 0 và log có `DATABASE_URL` | ✅ Thiếu biến (chạy `node apps/api/dist/main` từ gốc repo, nơi không có `apps/api/.env`, sau `unset DATABASE_URL`) → `Invalid environment variables: ✖ Invalid input: expected string, received undefined → at DATABASE_URL`, `exit=1`. Rỗng (`DATABASE_URL= node dist/main`) → `✖ Invalid string: must start with "postgresql://" → at DATABASE_URL`, `exit=1`. Unit `env.schema.spec.ts` (6 test) |
| AC-1.2-03 | Route không tồn tại (404) và lỗi bị throw (kể cả `Error` thường → 500) đều trả về cùng một định dạng `{ statusCode, error, message, path, requestId, timestamp }`. Lỗi 500 không lộ message hay stack | `curl -i localhost:4000/khong-co`; e2e và unit test của filter | ✅ `curl -i localhost:4000/khong-co` → `404`, `{"statusCode":404,"error":"Not Found","message":"Cannot GET /khong-co","path":"/khong-co","requestId":"99f5ac68-…","timestamp":"…"}`, `requestId` trùng header `x-request-id`. e2e `returns the standard error format for an unknown route`; unit `HttpExceptionFilter > hides the details of a plain Error behind a 500` (message `password=hunter2` không xuất hiện trong body, stack được log) |
| AC-1.2-04 | Log có cấu trúc: JSON ở `test`/`production`, dạng dễ đọc ở `development`. Mỗi request có request ID trùng với header `x-request-id` và `requestId` trong response; `x-request-id` do client gửi lên được giữ nguyên | Chạy `pnpm dev:api`, gọi hai request (một request có `-H "x-request-id: test-123"`), đọc log | ✅ `NODE_ENV=production`: mọi dòng là JSON, kể cả log khởi động (`{"level":30,…,"context":"NestFactory","msg":"Starting Nest application..."}`). `NODE_ENV=development`: `[22:01:52.598] INFO (1724): request completed` kèm `req: { "id": "test-123", … }`. `curl -H "x-request-id: test-123"` → header trả về `x-request-id: test-123`. Trường request ID trong JSON là `req.id`. e2e `generates an x-request-id header`, `echoes the x-request-id sent by the client` |
| AC-1.2-05 | Truy cập được Swagger UI tại `/docs` | Mở `http://localhost:4000/docs` | ✅ `curl localhost:4000/docs` → `200`, `<title>Swagger UI</title>`; `/docs-json` có `"paths":{"/health":{"get":{"operationId":"HealthController_check"…` |
| AC-1.2-06 | `pnpm --filter api test` và `pnpm --filter api test:e2e` (Vitest) đều pass | Chạy hai lệnh | ✅ `test` → `Test Files 3 passed (3)`, `Tests 11 passed (11)`; `test:e2e` → `Test Files 2 passed (2)`, `Tests 6 passed (6)`. Thêm: `pnpm --filter api lint` không lỗi, `tsc --noEmit` không lỗi |
| AC-1.2-07 | `ValidationPipe` global: body có field lạ bị trả 400 theo định dạng lỗi chuẩn, `message` là mảng có tên field đó | e2e test trên controller test riêng | ✅ e2e `validation.e2e-spec.ts > rejects an unknown field with 400 and names it` (body `{ name, foo }` → `400`, `message` là mảng chứa `foo`, `requestId` trùng header); unit `keeps a validation message array as an array` |

## Sprint V1.3 — Database schema with Prisma

| ID | Tiêu chí | Cách kiểm chứng | Bằng chứng |
|---|---|---|---|
| AC-1.3-01 | Toàn bộ migration áp dụng sạch lên một database trống | `pnpm --filter api test:int`: `globalSetup` chạy `migrate reset --force` lên `pixelmart_test`; `migrations.int-spec.ts` thấy 2 migration đã xong. `pnpm db:migrate` trên DB dev báo không có drift | ⬜ |
| AC-1.3-02 | Bảng, FK (kèm hành vi `ON DELETE`), unique constraint và index khớp DATABASE.md | `schema.int-spec.ts` (đọc `pg_constraint`, `pg_indexes`); `\d products`, `\di` trong psql | ⬜ |
| AC-1.3-03 | Cột tiền là `numeric(12,2)`; cột thời gian là `timestamptz` | `schema.int-spec.ts` (đọc `information_schema.columns`); `\d products` | ⬜ |
| AC-1.3-04 | **Database** (không phải code ứng dụng) từ chối giá âm, số lượng ngoài 1–99, `line_total` không khớp, tổng tiền âm và email có chữ hoa; mỗi lần từ chối đúng tên constraint | `constraints.int-spec.ts`: insert bằng SQL thuần, có ca đối chứng hợp lệ | ⬜ |
| AC-1.3-05 | Seed là idempotent (chạy hai lần vẫn 4 danh mục, 24 sản phẩm trong đó 4 DRAFT, 1 admin) và mật khẩu admin được hash bằng argon2id, không bao giờ lưu dạng plain text. Seed từ chối chạy khi thiếu `SEED_ADMIN_EMAIL` hoặc `SEED_ADMIN_PASSWORD` | `seed.int-spec.ts`; `pnpm db:seed` hai lần rồi đếm; `SELECT left(password_hash, 10) FROM users;` | ⬜ |
| AC-1.3-06 | `GET /health/ready` trả 200 kèm `checks.database: "up"` khi DB chạy, và 503 theo định dạng lỗi chuẩn (không lộ chi tiết DB) khi DB dừng. `GET /health` vẫn 200 khi DB dừng. API khởi động được khi DB dừng | `health.int-spec.ts`; unit test của `HealthController`; `pnpm db:down` rồi `curl -i` cả hai endpoint; e2e của V1.2 pass khi DB dừng | ⬜ |
| AC-1.3-07 | Integration test chỉ chạy trên `pixelmart_test`; database dev không bị thay đổi, và test dừng trước khi reset nếu URL không trỏ tới `pixelmart_test` | Unit `test-database.spec.ts`; đếm `products` trên `pixelmart` trước và sau `test:int` | ⬜ |

## Sprint V1.4 — Catalog API
| ID | Tiêu chí |
|---|---|
| AC-1.4-01 | Các endpoint sản phẩm public không bao giờ trả về sản phẩm DRAFT |
| AC-1.4-02 | Pagination validate input (`page ≥ 1`, `1 ≤ pageSize ≤ 100`) và trả về tổng số đúng |
| AC-1.4-03 | Lọc theo danh mục hoạt động; slug không tồn tại trả về 404 theo định dạng lỗi chuẩn |
| AC-1.4-04 | Các trường tiền là chuỗi có hai chữ số thập phân |
| AC-1.4-05 | Integration test của catalog dùng hạ tầng `test:int` của V1.3 (chạy trên `pixelmart_test`, không bao giờ trên DB dev) |

## Sprint V1.5 — Storefront
| ID | Tiêu chí |
|---|---|
| AC-1.5-01 | Trang chủ, trang chi tiết sản phẩm và trang danh mục hiển thị sản phẩm và ảnh lấy từ API |
| AC-1.5-02 | Có thể trình diễn được từng state: loading, empty, not-found và error |
| AC-1.5-03 | API URL chỉ dùng phía server (không xuất hiện trong bundle của trình duyệt) |
| AC-1.5-04 | Link pagination hoạt động trên các trang danh mục |

## Sprint V1.6 — Cart
| ID | Tiêu chí |
|---|---|
| AC-1.6-01 | Thêm, đổi số lượng (1–99) và xoá đều hoạt động và vẫn còn sau khi reload trang |
| AC-1.6-02 | localStorage bị hỏng không làm app crash |
| AC-1.6-03 | Không có cảnh báo hydration trong console |
| AC-1.6-04 | Unit test của reducer pass |

## Sprint V1.7 — Checkout
| ID | Tiêu chí |
|---|---|
| AC-1.7-01 | Guest đặt được đơn hàng và thấy mã đơn hàng trên trang xác nhận |
| AC-1.7-02 | Tổng tiền được tính trên server từ giá trong DB; giá do client gửi lên bị từ chối/bỏ qua |
| AC-1.7-03 | Sản phẩm không hợp lệ, sản phẩm chưa publish và số lượng không hợp lệ đều trả về 4xx với `code` ổn định, và UI hiển thị thông báo hữu ích |
| AC-1.7-04 | Lỗi giữa transaction **không** để lại đơn hàng dở dang nào (được chứng minh bằng test) |
| AC-1.7-05 | Order item giữ snapshot của tên và giá |
| AC-1.7-06 | Endpoint summary không để lộ PII của khách hàng |

## Sprint V1.8 — Admin auth
| ID | Tiêu chí |
|---|---|
| AC-1.8-01 | Admin được seed đăng nhập được. Sai thông tin đăng nhập nhận về 401 chung chung. |
| AC-1.8-02 | Endpoint admin: không có/không hợp lệ/hết hạn token → 401; không phải admin → 403 |
| AC-1.8-03 | Token nằm trong httpOnly cookie và không đọc được qua `document.cookie` |
| AC-1.8-04 | Các trang `/admin/*` chuyển hướng về login khi chưa đăng nhập; logout hoạt động |

## Sprints V1.9 / V1.10 — Admin management
| ID | Tiêu chí |
|---|---|
| AC-1.9-01 | CRUD danh mục và sản phẩm hoạt động end-to-end qua admin UI |
| AC-1.9-02 | Slug trùng → 409. Xoá danh mục còn sản phẩm → 409. Cả hai đều được hiển thị trên UI. |
| AC-1.9-03 | Publish/unpublish có tác dụng ngay lập tức lên storefront |
| AC-1.9-04 | **Mọi** route API `/admin/*` đều từ chối request chưa xác thực (một test tự động bao phủ danh sách route) |
| AC-1.10-01 | Admin xem danh sách (có pagination, lọc được), xem chi tiết và chuyển trạng thái đơn hàng |
| AC-1.10-02 | Chuyển trạng thái không hợp lệ trả về 409 (table-driven test) |

## V1 overall (Sprint V1.11)
| ID | Tiêu chí |
|---|---|
| AC-1-01 | Clone mới → làm theo các bước trong README → app chạy được, không có bước nào không được ghi lại |
| AC-1-02 | Toàn bộ unit test và integration test đều pass |
| AC-1-03 | Mọi tiêu chí ở trên đều đã có bằng chứng được ghi lại |
| AC-1-04 | ROADMAP, ARCHITECTURE (trạng thái hiện tại) và TROUBLESHOOTING đều được cập nhật |
| AC-1-05 | Đã viết danh sách tech debt và điều kiện tiên quyết cho V2 |
