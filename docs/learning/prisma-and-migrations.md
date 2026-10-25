# Prisma và migration (nền tảng cho V1.3 trở đi)

> Ghi chú này được viết ở đầu V1.3, trước khi code. Đọc xong, bạn phải giải thích được: Prisma đứng ở đâu giữa code và PostgreSQL, migration là gì và vì sao migration đã áp dụng không được sửa, `migrate dev` khác `migrate deploy` thế nào, và vì sao tiền phải đi qua `Prisma.Decimal`.

## 1. Nó là gì
**Prisma** là một ORM cho Node.js và TypeScript. Bạn mô tả dữ liệu trong một file `schema.prisma`. Từ file đó, Prisma làm hai việc:
- **Prisma Migrate** sinh ra các file SQL (**migration**) để tạo và thay đổi bảng trong database.
- **Prisma Client** là code TypeScript được sinh ra, có type khớp với schema, để đọc và ghi dữ liệu: `prisma.product.findMany({ where: { status: 'PUBLISHED' } })`.

**Migration** là một bước thay đổi schema, được lưu thành file SQL có thứ tự và được commit vào git. Toàn bộ thư mục migration là **lịch sử có version** của database, giống như git log của cấu trúc bảng.

## 2. Tại sao nó tồn tại
Có ba cách để code nói chuyện với database:

| Cách | Ví dụ | Ưu | Nhược |
|---|---|---|---|
| Raw SQL | `pg`: `client.query('SELECT … WHERE id = $1', [id])` | Kiểm soát hoàn toàn, dùng được mọi tính năng của Postgres | Không có type, đổi tên cột thì phải tự tìm mọi chỗ dùng |
| Query builder | Kysely, Knex | Viết gần giống SQL nhưng có type (Kysely) | Vẫn phải tự quản lý migration và kiểu dữ liệu trả về |
| ORM | Prisma, TypeORM | Type sinh từ schema, migration đi kèm, quan hệ dễ dùng | Che bớt SQL; một số tính năng (CHECK constraint, query phức tạp) phải viết SQL tay |

Prisma tồn tại để schema là **một nguồn sự thật duy nhất**: cùng một file sinh ra cả bảng trong database lẫn type trong code, nên hai bên không lệch nhau.

## 3. Vấn đề nó giải quyết
- **Type an toàn từ đầu tới cuối.** Đổi `price` thành `unitPrice` trong schema, chạy `prisma generate`, TypeScript báo lỗi ở mọi chỗ còn dùng tên cũ.
- **Mọi máy có cùng database.** Bạn, CI (V5) và production (V6) chạy cùng bộ migration theo cùng thứ tự, nên cấu trúc bảng giống hệt nhau.
- **Thay đổi schema có review.** Migration là file SQL trong pull request. Người review đọc được chính xác câu `ALTER TABLE` sẽ chạy trên production.
- **Không còn "ai đó đã sửa tay trên DB".** Prisma phát hiện khi database lệch khỏi lịch sử migration (**drift**).

## 4. Ví dụ đời thực
Coi database như một ngôi nhà đang có người ở:
- **`schema.prisma`** là bản vẽ hiện tại của ngôi nhà.
- **Mỗi migration** là một phiếu thi công: "đập tường A", "thêm cửa sổ B". Phiếu được đánh số và làm theo thứ tự.
- **`_prisma_migrations`** là sổ nhật ký thi công dán trong nhà: phiếu nào đã làm, làm lúc nào, kèm chữ ký (checksum) của từng phiếu.
- **Sửa một phiếu đã thi công** giống như tẩy xoá phiếu cũ: ngôi nhà không thay đổi theo, nhưng sổ nhật ký không còn khớp với phiếu. Muốn thay đổi thì viết **phiếu mới**.
- **Drift** là khi ai đó tự đục tường mà không có phiếu. Bản vẽ, phiếu và ngôi nhà không còn khớp nhau.

## 5. Cách hoạt động

### 5.1 Schema
```prisma
model Product {
  id         String        @id @default(dbgenerated("uuidv7()")) @db.Uuid
  name       String        @db.VarChar(200)
  slug       String        @unique @db.VarChar(200)
  price      Decimal       @db.Decimal(12, 2)
  status     ProductStatus @default(DRAFT)
  categoryId String        @map("category_id") @db.Uuid
  category   Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  createdAt  DateTime      @default(now()) @map("created_at") @db.Timestamptz(3)

  @@index([status, createdAt(sort: Desc)])
  @@map("products")
}

enum ProductStatus {
  DRAFT
  PUBLISHED

  @@map("product_status")
}
```
- **`@map` / `@@map`**: tên trong code là camelCase/PascalCase (`categoryId`, `Product`), tên trong database là snake_case (`category_id`, `products`).
- **`@db.*`** chọn **native type** của Postgres. Thiếu nó, Prisma tự chọn kiểu mặc định. Ví dụ `DateTime` mặc định thành `timestamp(3)` **không có múi giờ**, nên ta phải ghi `@db.Timestamptz(3)` ([DATABASE.md](../DATABASE.md) yêu cầu `timestamptz`).
- **`onDelete`** quyết định FK làm gì khi bản ghi cha bị xoá: `Restrict`, `Cascade`, `SetNull`.
- **`@@index`** tạo index. PostgreSQL **không** tự tạo index cho cột FK, nên index cho FK phải khai báo.
- Schema của Prisma **không có CHECK constraint**. Các CHECK được viết bằng SQL tay (5.5).

### 5.2 `prisma.config.ts` (mới ở Prisma 7)
```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```
- Prisma 7 **không tự load `.env`** nữa. Dòng `import 'dotenv/config'` đọc `.env` ở cwd (`apps/api` khi chạy qua `pnpm --filter api`). dotenv **không ghi đè** biến đã có trong `process.env`, giống `ConfigModule` ở V1.2.
- `env('DATABASE_URL')` báo lỗi ngay nếu biến không tồn tại, kể cả với lệnh không cần kết nối DB như `prisma generate`.

### 5.3 Generator và Prisma Client
```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}
```
- Generator `prisma-client` sinh **code TypeScript thật** vào thư mục `output` (bắt buộc ở Prisma 7). Client không còn nằm trong `node_modules`. Generator cũ `prisma-client-js` đã deprecated.
- `moduleFormat = "cjs"` vì `apps/api` là CJS (xem V1.2 bước 2).
- Thư mục sinh ra bị git bỏ qua. Sau mỗi lần đổi schema, hoặc sau khi clone, phải chạy `prisma generate`.

### 5.4 Driver adapter
Prisma 7 dùng client viết bằng TypeScript, không còn query engine Rust. Việc kết nối do một **driver adapter** đảm nhận, và adapter là **bắt buộc**:
```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
```
`@prisma/adapter-pg` dùng driver `pg` bên dưới. Trong Nest, đoạn này nằm trong `PrismaService`, nhận `DATABASE_URL` từ `ConfigService`.

### 5.5 Migration
Mỗi migration là một thư mục `prisma/migrations/<timestamp>_<tên>/migration.sql`. Ba lệnh chính:

| Lệnh | Dùng ở đâu | Làm gì |
|---|---|---|
| `prisma migrate dev --name <tên>` | Máy dev | So schema với lịch sử migration, sinh migration mới, áp dụng nó. Dùng một **shadow database** tạm để kiểm tra lịch sử và phát hiện drift. |
| `prisma migrate dev --create-only --name <tên>` | Máy dev | Chỉ tạo file, **không áp dụng**. Bạn sửa SQL (ví dụ thêm CHECK constraint) rồi chạy `migrate dev` để áp dụng. |
| `prisma migrate deploy` | CI, production | Chỉ áp dụng các migration chưa chạy. Không sinh gì, không dùng shadow DB, không bao giờ reset. |
| `prisma migrate reset` | Dev, test | Xoá database, tạo lại, áp dụng mọi migration từ đầu. **Mất toàn bộ dữ liệu.** |

Prisma ghi mỗi migration đã áp dụng vào bảng `_prisma_migrations`, kèm **checksum** của file SQL. Lần chạy sau, nếu checksum của file không còn khớp, Prisma báo migration đã bị sửa sau khi áp dụng. Vì vậy **migration đã áp dụng là bất biến**: database production đã chạy phiên bản cũ của file, sửa file không làm thay đổi database đó, chỉ làm lịch sử nói dối. Muốn thay đổi thì tạo migration mới.

**Thay đổi ở Prisma 7:** `migrate dev` **không còn** tự chạy `prisma generate` và seed. `migrate reset` cũng không seed. Các cờ `--skip-generate` và `--skip-seed` đã bị bỏ. Vì vậy PixelMart có script riêng cho từng việc: `db:migrate`, `db:generate`, `db:seed`.

### 5.6 Tiền: `Prisma.Decimal`
Cột `@db.Decimal(12, 2)` được trả về dưới dạng `Prisma.Decimal` (dựa trên decimal.js), không phải `number`. Tính toán bằng method: `unitPrice.mul(quantity)`, `a.add(b)`. **Không bao giờ** gọi `Number(price)` rồi tính, vì sẽ quay lại lỗi float `0.1 + 0.2 ≠ 0.3` ([ADR-0003](../decisions/0003-money-representation.md)). Khi ghi, truyền chuỗi: `price: '49.99'`.

### 5.7 Seed
Seed là script đưa dữ liệu ban đầu vào database (danh mục, sản phẩm, admin). Chạy bằng `prisma db seed`, lệnh này gọi câu lệnh khai báo ở `migrations.seed` trong `prisma.config.ts`. Seed phải **idempotent**: chạy hai lần cho cùng kết quả. Cách làm: `upsert` theo một khoá unique (`slug`, `email`), nghĩa là "có rồi thì cập nhật, chưa có thì tạo".

### 5.8 Prisma Studio
`prisma studio` mở một giao diện web để xem và sửa dữ liệu. Tiện để kiểm tra kết quả seed. Đừng dùng nó để sửa cấu trúc bảng.

## 6. Khi nào nên dùng
- App CRUD có quan hệ rõ ràng, nhiều người cùng sửa schema, cần type an toàn. PixelMart thuộc loại này.
- Khi muốn migration nằm trong git và chạy giống nhau ở mọi môi trường.

## 7. Khi nào không nên dùng
- Báo cáo và analytics phức tạp (window function, CTE nhiều tầng): viết SQL bằng `$queryRaw` hoặc dùng query builder.
- Khi cần tính năng database mà schema Prisma không diễn đạt được (CHECK, trigger, partial index): vẫn dùng Prisma, nhưng viết phần đó bằng SQL tay trong migration `--create-only`.
- Khi chưa hiểu SQL: ORM che mất câu SQL thật, nên bạn khó biết vì sao một query chậm. Đọc `relational-databases-and-postgresql.md` trước.

## 8. Vị trí trong PixelMart
- **V1.3:** `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, `apps/api/prisma/migrations/` (migration `init` và migration CHECK constraint viết tay), `apps/api/prisma/seed.ts`, client sinh ra ở `apps/api/src/generated/prisma`. `PrismaService` + `PrismaModule` trong Nest. Phiên bản ghim **đúng 7.10.0** cho `prisma`, `@prisma/client` và `@prisma/adapter-pg` ([ADR-0002](../decisions/0002-tool-and-dependency-versions.md)).
- **V1.4 (dự kiến):** ánh xạ lỗi Prisma (unique, FK) sang HTTP 409/404.
- **V1.7 (dự kiến):** tạo đơn hàng trong `prisma.$transaction`.
- **V2, V3 (dự kiến):** thêm bảng và cột bằng migration mới. Bài tập tiến hoá schema trên dữ liệu đã có.
- **V5, V6 (dự kiến):** CI và production chỉ chạy `migrate deploy`.

## 9. Bài tập thực hành
Làm trên database dev, sau khi V1.3 chạy được. Mọi thứ đều khôi phục được bằng `pnpm db:migrate` hoặc reset.
1. **Đọc code sinh ra:** chạy `prisma generate`, mở `src/generated/prisma`, tìm type của `Product`. Trường `price` có type gì? Vì sao không phải `number`?
2. **Đọc SQL của migration:** mở `migration.sql` của migration `init`. Tìm câu tạo FK của `products.category_id` và chỗ ghi `ON DELETE RESTRICT`. Tìm các index.
3. **Sửa migration đã áp dụng:** thêm một dòng comment vào `migration.sql` của migration CHECK, rồi chạy `migrate dev`. Đọc thông báo. Vì sao chỉ một dòng comment cũng bị phát hiện? Khôi phục file bằng `git checkout`.
4. **Tạo drift:** trong `pnpm db:psql`, chạy `ALTER TABLE products ADD COLUMN ghi_chu text;`. Chạy `migrate dev` và đọc phản ứng của Prisma. Dọn bằng `ALTER TABLE products DROP COLUMN ghi_chu;` hoặc reset DB dev.
5. **Decimal và number:** trong Node, so sánh `0.1 + 0.2` với `new Prisma.Decimal('0.1').add('0.2').toString()`. Trong psql, chạy `SELECT 0.1::numeric + 0.2::numeric;` và `SELECT 0.1::float8 + 0.2::float8;`.

## 10. Lỗi thường gặp và cách debug
- **CLI báo thiếu `DATABASE_URL`**, kể cả khi chạy `prisma generate`: `env()` trong `prisma.config.ts` đòi biến phải có. Kiểm tra `apps/api/.env` có tồn tại, và lệnh chạy với cwd là `apps/api` (`pnpm --filter api exec prisma …`).
- **`Cannot find module '../generated/prisma/client'`** (hoặc thông báo tương tự): chưa chạy `prisma generate` sau khi clone hoặc sau khi đổi schema.
- **`P1001: Can't reach database server`**: Postgres chưa chạy hoặc chưa healthy (`pnpm db:up`), sai port, hoặc sai host trong `DATABASE_URL`.
- **Cài ra `prisma@8.0.0-rc…`**: chạy `pnpm add prisma` không ghi phiên bản, trong khi dist-tag `latest` trỏ tới bản RC. Luôn ghi `@7.10.0`, và kiểm tra bằng `npm view prisma dist-tags`.
- **pnpm cảnh báo build script bị chặn** (thông báo kiểu "Ignored build scripts: …"): pnpm không chạy lifecycle script của dependency nếu chưa được phép. Chỉ phê duyệt package bạn nhận ra. Xem [TROUBLESHOOTING V1](../versions/v1/TROUBLESHOOTING.md).
- **Thông báo kiểu "migration was modified after it was applied"**: ai đó đã sửa file migration đã áp dụng. Khôi phục file bằng git. Nếu thật sự cần thay đổi, tạo migration mới.
- **Thông báo kiểu "Drift detected"**: database có thay đổi không nằm trong migration nào. Ở dev, tìm thay đổi đó (thường do sửa tay trong psql), rồi đưa nó vào một migration hoặc reset DB dev. Ở production, **không bao giờ** reset: viết migration để đưa lịch sử về khớp.
- **Cột thời gian là `timestamp without time zone`**: quên `@db.Timestamptz(3)`. Xem bằng `\d products` trong psql.
- **Debug**: đọc SQL thật trong `migration.sql`; dùng `\d <bảng>` trong psql để xem cấu trúc thực tế; `prisma migrate status` để xem migration nào đã và chưa áp dụng.

## 11. Câu hỏi phỏng vấn
- ORM, query builder và raw SQL khác nhau thế nào? Khi nào bạn bỏ ORM để viết SQL tay?
- Vì sao không được sửa một migration đã áp dụng? Nếu phát hiện sai thì làm gì?
- `migrate dev` và `migrate deploy` khác nhau thế nào? Vì sao production không chạy `migrate dev`?
- Shadow database dùng để làm gì?
- Schema drift là gì, và nó xảy ra như thế nào?
- Bạn biểu diễn tiền trong database và trong code như thế nào? Vì sao không dùng float?
- Làm sao để một seed script chạy nhiều lần mà không tạo bản ghi trùng?

## 12. Tài liệu chính thức
- Prisma docs: https://www.prisma.io/docs
- Prisma ORM v7: https://www.prisma.io/docs/orm/v7
- Nâng cấp lên Prisma 7 (config, generator, adapter, seed): https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- CLI reference (`migrate dev`, `migrate deploy`, `db seed`, `generate`): https://www.prisma.io/docs/orm/v7/reference/prisma-cli-reference
- `migrate reset`: https://www.prisma.io/docs/cli/v7/migrate/reset
