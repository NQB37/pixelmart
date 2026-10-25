# Relational database và PostgreSQL (nền tảng cho V1.3 trở đi)

> Ghi chú này được viết ở đầu V1.3, trước khi code. Đọc xong, bạn phải giải thích được primary key, foreign key và hành vi `ON DELETE`, unique constraint, CHECK constraint, index, và vì sao PixelMart dùng `numeric` cho tiền và `timestamptz` cho thời gian, mà không cần nhìn schema.

## 1. Nó là gì
**Relational database** lưu dữ liệu thành các **table**. Mỗi table có các **column** đã khai báo kiểu, và mỗi **row** là một bản ghi. Các table liên kết với nhau bằng **key**, và ta truy vấn chúng bằng **SQL**. **PostgreSQL** là một relational database mã nguồn mở. PixelMart dùng PostgreSQL 18, chạy trong Docker từ V1.1.

## 2. Tại sao nó tồn tại
Nếu lưu dữ liệu vào file JSON, mỗi chương trình phải tự kiểm tra dữ liệu có hợp lệ không, tự xử lý khi hai người ghi cùng lúc, và tự tìm kiếm nhanh. Relational database làm các việc đó ở một chỗ: nó **từ chối dữ liệu sai** (constraint), **ghi an toàn khi có nhiều người dùng đồng thời** (transaction, ở V1.7), và **tìm kiếm nhanh** (index).

## 3. Vấn đề nó giải quyết
- **Tính toàn vẹn:** một sản phẩm không thể trỏ tới danh mục không tồn tại, và giá không thể âm, kể cả khi code ứng dụng có bug.
- **Không lặp dữ liệu:** tên danh mục nằm ở một row duy nhất. Sản phẩm chỉ giữ `category_id` (normalization).
- **Truy vấn linh hoạt:** cùng một dữ liệu trả lời được nhiều câu hỏi ("sản phẩm đã publish mới nhất", "đơn hàng chờ xác nhận") mà không phải lưu thêm bản sao.
- **Bền vững:** dữ liệu đã commit vẫn còn sau khi crash.

## 4. Ví dụ đời thực
Coi database như sổ sách của một cửa hàng:
- **Table** là một cuốn sổ (sổ sản phẩm, sổ đơn hàng). **Column** là các cột kẻ sẵn. **Row** là một dòng đã ghi.
- **Primary key** là số hiệu in sẵn trên mỗi dòng, không trùng và không bao giờ đổi.
- **Foreign key** là dòng "xem danh mục số …" trong sổ sản phẩm. Người giữ sổ không cho ghi số danh mục không có thật.
- **CHECK constraint** là quy định "giá phải ≥ 0". Người giữ sổ từ chối ghi dòng sai, bất kể ai đưa vào.
- **Index** là mục lục ở cuối sổ: tìm theo slug mà không phải lật từng trang.
- **Snapshot** trong order item giống như hoá đơn đã in: giá in trên hoá đơn không đổi khi cửa hàng đổi giá ngày mai.

## 5. Cách hoạt động

### 5.1 Primary key
Mỗi table có một **primary key (PK)**: duy nhất, `NOT NULL`, và PostgreSQL tự tạo index cho nó. Ba lựa chọn phổ biến:

| Kiểu | Ưu điểm | Nhược điểm |
|---|---|---|
| `serial` / `identity` (1, 2, 3…) | Nhỏ, dễ đọc | Lộ số lượng bản ghi (`/orders/1042`), chỉ database sinh được |
| UUID v4 | Sinh ở đâu cũng được, không lộ gì | Hoàn toàn ngẫu nhiên, nên insert rải khắp B-tree index |
| **UUID v7** | Không lộ số lượng, và tăng dần theo thời gian nên insert thân thiện với index | 16 byte, dài hơn số nguyên |

PixelMart dùng **UUIDv7, do database sinh**: PostgreSQL 18 có sẵn hàm `uuidv7()`, và Prisma khai báo bằng `@default(dbgenerated("uuidv7()")) @db.Uuid`. Vì database tự sinh id, một câu `INSERT` viết tay trong psql hay trong test cũng không cần tự truyền id.

### 5.2 Foreign key và `ON DELETE`
**Foreign key (FK)** bắt buộc giá trị của một column phải tồn tại ở PK của table khác. Khi row cha bị xoá, `ON DELETE` quyết định chuyện gì xảy ra với các row con:

| Hành vi | Ý nghĩa | Trong PixelMart |
|---|---|---|
| `RESTRICT` | Từ chối xoá row cha nếu còn row con | `categories → products`: không xoá được danh mục còn sản phẩm. API chuyển lỗi này thành `409` (V1.9). |
| `CASCADE` | Xoá luôn các row con | `orders → order_items`: các dòng hàng không có nghĩa nếu không có đơn hàng. |
| `SET NULL` | Đặt FK của row con thành `NULL`. Column phải cho phép `NULL` | `products → order_items.product_id`: lịch sử đơn hàng vẫn còn sau khi xoá sản phẩm. |
| `NO ACTION` (mặc định) | Giống `RESTRICT`, nhưng kiểm tra ở cuối câu lệnh thay vì ngay lập tức | Không dùng. Ta ghi rõ hành vi mong muốn. |

PostgreSQL **không tự tạo index cho column FK**. Thiếu index, mỗi lần xoá một sản phẩm, database phải quét toàn bộ `order_items` để tìm row cần `SET NULL`. Vì vậy DATABASE.md có index `order_items(product_id)`.

### 5.3 `NOT NULL`, unique và CHECK
- **`NOT NULL`:** column bắt buộc có giá trị.
- **Unique constraint:** không có hai row trùng giá trị (`products.slug`, `users.email`). Unique có thể gồm nhiều column: `UNIQUE (order_id, product_id)` nghĩa là mỗi sản phẩm chỉ có một dòng trong mỗi đơn hàng. PostgreSQL tạo index cho unique constraint, nên nó cũng giúp tra cứu nhanh.
- **CHECK constraint:** một biểu thức phải đúng với mọi row, ví dụ `price >= 0` hoặc `line_total = unit_price * quantity`.

Vì sao kiểm tra ở database, khi API đã validate rồi? Vì API chỉ là **một** đường ghi dữ liệu. Script seed, migration, một câu SQL gõ tay hay một service mới viết sau này đều có thể bỏ qua validation của API. Constraint là tuyến phòng thủ cuối cùng, và nó luôn được áp dụng.

⚠ Một CHECK **được coi là đạt khi biểu thức cho ra `NULL`**. `CHECK (price >= 0)` vẫn chấp nhận `price = NULL`. Muốn cấm, phải thêm `NOT NULL`.

### 5.4 Kiểu dữ liệu quan trọng
- **`numeric(12,2)`:** số thập phân chính xác, tối đa 12 chữ số, trong đó 2 chữ số sau dấu phẩy. `real` và `double precision` là số thực dấu phẩy động: `0.1 + 0.2` cho ra `0.30000000000000004`. PixelMart lưu giá bằng EUR trong `numeric(12,2)` ([ADR-0003](../decisions/0003-money-representation.md)). Giá trị có nhiều hơn 2 chữ số thập phân sẽ bị **làm tròn**, không báo lỗi. Giá trị vượt quá 12 chữ số thì bị từ chối.
- **`timestamptz`:** lưu một **thời điểm tuyệt đối** (bên trong là UTC). Khi đọc ra, PostgreSQL hiển thị theo `TimeZone` của session. `timestamp` (không có tz) chỉ là "ngày giờ trên lịch", không biết đó là múi giờ nào. PixelMart dùng `timestamptz(3)`, tức độ chính xác tới mili giây, khớp với `Date` của JavaScript. Lưu ý: Prisma mặc định map `DateTime` sang `timestamp(3)` không có tz, nên phải khai báo `@db.Timestamptz(3)`.
- **Enum:** một kiểu chỉ nhận một tập giá trị cố định, ví dụ `product_status` (`DRAFT`, `PUBLISHED`). Thêm giá trị mới thì dễ (`ALTER TYPE … ADD VALUE`), nhưng xoá hay đổi tên giá trị thì khó. Chỉ dùng enum cho những tập ít thay đổi.
- **`varchar(n)` và `text`:** trong PostgreSQL, hai kiểu này lưu giống nhau. `varchar(n)` chỉ thêm một giới hạn độ dài.

### 5.5 Index
Index mặc định là **B-tree**: một cây đã sắp xếp, giúp tìm một giá trị hoặc một khoảng giá trị mà không phải quét toàn bộ table. Cái giá là mỗi lần ghi phải cập nhật thêm index, và index chiếm thêm dung lượng.

Với **composite index**, thứ tự column rất quan trọng. Index `products(status, created_at DESC)` phục vụ được `WHERE status = 'PUBLISHED' ORDER BY created_at DESC`, nhưng gần như vô dụng với `WHERE created_at > …` khi không lọc theo `status`. Giống danh bạ sắp theo (họ, tên): tìm theo họ thì nhanh, chỉ biết tên thì phải đọc hết.

`EXPLAIN` cho biết database định chạy câu lệnh thế nào: `Seq Scan` là quét toàn bộ table, `Index Scan` là dùng index. Với table nhỏ, `Seq Scan` thường nhanh hơn, nên đừng ngạc nhiên khi index không được dùng.

### 5.6 Normalization và snapshot
**Normalization** là mỗi sự thật chỉ lưu ở một chỗ: tên danh mục nằm trong `categories`, không lặp trong từng sản phẩm. Nhưng `order_items` **cố ý** lưu lại `product_name` và `unit_price`. Lý do: đó không phải bản sao của "giá hiện tại", mà là một sự thật khác, "giá khách đã đồng ý trả lúc đặt hàng". Nếu order item join với giá sản phẩm hiện tại, mỗi lần đổi giá sẽ âm thầm viết lại các đơn hàng cũ.

### 5.7 Xem schema trong psql
| Lệnh | Cho biết |
|---|---|
| `\dt` | Danh sách table |
| `\d products` | Column, kiểu, default, index, constraint và FK của một table |
| `\di` | Danh sách index |
| `\dT+` | Danh sách enum và giá trị của chúng |
| `SELECT column_name, data_type, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name = 'products';` | Kiểu của từng column |
| `SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'order_items'::regclass;` | Constraint: `p` primary key, `f` foreign key, `u` unique, `c` check |
| `\set VERBOSITY verbose` | Thông báo lỗi kèm mã SQLSTATE |

## 6. Khi nào nên dùng
- Dữ liệu có quan hệ rõ ràng (danh mục, sản phẩm, đơn hàng, người dùng) và có những quy tắc phải luôn đúng.
- Cần transaction: nhiều thay đổi cùng thành công hoặc cùng thất bại, ví dụ tạo đơn hàng ở V1.7.
- Cần truy vấn linh hoạt mà lúc thiết kế chưa biết hết.

## 7. Khi nào không nên dùng
- Dữ liệu tạm, cần tốc độ rất cao và có thể mất: cache dùng Redis (V9).
- Luồng event khối lượng lớn, đọc lại theo thứ tự: Kafka (V14).
- File lớn như ảnh: object storage như R2 (V8). Database chỉ lưu URL.
- Dữ liệu không có cấu trúc cố định: có thể cân nhắc `jsonb` trong PostgreSQL trước khi chuyển sang một database khác.

## 8. Vị trí trong PixelMart
- **V1.1:** PostgreSQL 18 chạy trong Docker, có hai database `pixelmart` (dev) và `pixelmart_test` (test).
- **V1.3:** năm table `categories`, `products`, `orders`, `order_items`, `users` theo [DATABASE.md](../DATABASE.md). Schema do Prisma migration tạo ra. CHECK constraint được viết tay bằng SQL. Xem [prisma-and-migrations.md](prisma-and-migrations.md).
- **V1.7:** transaction khi tạo đơn hàng.
- **V2:** tồn kho và reservation, cần locking khi có nhiều checkout đồng thời.
- **V15:** backup và restore.

## 9. Bài tập thực hành
Chạy trong `pnpm db:psql`. Mọi table có tên `lab_*` và được xoá ở cuối. **Không đụng tới table thật.**

1. **Tiền: numeric và float.**
   ```sql
   SELECT 0.1::double precision + 0.2::double precision AS float_sum,
          0.1::numeric + 0.2::numeric AS numeric_sum;
   SELECT 19.999::numeric(12,2);
   ```
   Chạy thêm `node -e "console.log(0.1 + 0.2)"` trong terminal. Giải thích vì sao `float_sum` và kết quả của Node giống nhau, và vì sao `19.999` thành `20.00`.
2. **CHECK và NULL.**
   ```sql
   CREATE TABLE lab_products (id uuid PRIMARY KEY DEFAULT uuidv7(), price numeric(12,2) CHECK (price >= 0));
   INSERT INTO lab_products (price) VALUES (10.00);
   INSERT INTO lab_products (price) VALUES (-1);
   INSERT INTO lab_products (price) VALUES (NULL);
   ```
   Câu nào bị từ chối? Vì sao câu `NULL` lọt qua? Sửa table để cấm `NULL`. Chạy `SELECT id FROM lab_products;` và nhận xét: các id mới tăng dần theo thời gian.
3. **`ON DELETE`.**
   ```sql
   CREATE TABLE lab_categories (id int PRIMARY KEY);
   CREATE TABLE lab_items (id int PRIMARY KEY, category_id int REFERENCES lab_categories(id) ON DELETE RESTRICT);
   INSERT INTO lab_categories VALUES (1);
   INSERT INTO lab_items VALUES (1, 1);
   DELETE FROM lab_categories WHERE id = 1;
   INSERT INTO lab_items VALUES (2, 99);
   ```
   Đọc hai lỗi. Sau đó tạo lại `lab_items` với `ON DELETE CASCADE`, rồi với `ON DELETE SET NULL`, và quan sát `lab_items` sau mỗi lần xoá danh mục.
4. **Index và `EXPLAIN`.**
   ```sql
   CREATE TABLE lab_orders AS
     SELECT g AS id, (ARRAY['PENDING','CONFIRMED','SHIPPED'])[1 + g % 3] AS status,
            now() - g * interval '1 minute' AS created_at
     FROM generate_series(1, 200000) g;
   ANALYZE lab_orders;
   EXPLAIN SELECT * FROM lab_orders WHERE status = 'PENDING' ORDER BY created_at DESC LIMIT 20;
   CREATE INDEX ON lab_orders (status, created_at DESC);
   EXPLAIN SELECT * FROM lab_orders WHERE status = 'PENDING' ORDER BY created_at DESC LIMIT 20;
   EXPLAIN SELECT * FROM lab_orders WHERE created_at > now() - interval '1 hour';
   ```
   So sánh plan trước và sau khi có index. Vì sao câu cuối không tận dụng tốt index này?
5. **Múi giờ.** `SELECT now();`, rồi `SET TIME ZONE 'Asia/Ho_Chi_Minh'; SELECT now();`. Giá trị có thật sự thay đổi không, hay chỉ cách hiển thị?
6. **Dọn dẹp:** `DROP TABLE lab_items, lab_categories, lab_products, lab_orders;`

## 10. Lỗi thường gặp và cách debug
Mỗi lỗi của PostgreSQL có một mã **SQLSTATE** gồm 5 ký tự. Code ứng dụng nên dựa vào mã này, không dựa vào câu thông báo. Bật `\set VERBOSITY verbose` trong psql để thấy mã.

| SQLSTATE | Tên | Ví dụ thông báo | Nguyên nhân thường gặp |
|---|---|---|---|
| `23505` | `unique_violation` | `duplicate key value violates unique constraint "products_slug_key"` | Slug hoặc email trùng. API trả `409` (V1.9). |
| `23503` | `foreign_key_violation` | `update or delete on table "categories" violates foreign key constraint … on table "products"` | Xoá row cha khi còn row con (`RESTRICT`), hoặc insert FK trỏ tới id không tồn tại. |
| `23514` | `check_violation` | `new row for relation "products" violates check constraint "products_price_nonnegative"` | Dữ liệu sai quy tắc, ví dụ giá âm hoặc `line_total` không khớp. |
| `23502` | `not_null_violation` | `null value in column "name" of relation "categories" violates not-null constraint` | Thiếu giá trị bắt buộc. |

Cách đọc lỗi: tên **constraint** cho biết quy tắc nào bị vi phạm, còn dòng `DETAIL: Failing row contains (…)` cho biết row nào. Đặt tên constraint rõ nghĩa (như `products_price_nonnegative`) giúp đọc lỗi nhanh hơn.

Các lỗi khác hay gặp:
- **Truy vấn chậm dần khi dữ liệu tăng:** chạy `EXPLAIN` và tìm `Seq Scan` trên table lớn. Thường là thiếu index, nhất là trên column FK.
- **Giờ bị lệch vài tiếng:** column là `timestamp` thay vì `timestamptz`, hoặc ứng dụng hiểu sai múi giờ. Kiểm tra bằng `\d <table>`.
- **Tổng tiền kiểu `59.970000000000006`:** đâu đó đang dùng float, ở column hoặc trong code JavaScript.

## 11. Câu hỏi phỏng vấn
- Primary key khác unique constraint thế nào?
- `ON DELETE RESTRICT`, `CASCADE` và `SET NULL` khác nhau ra sao? Bạn chọn cái nào cho đơn hàng, và vì sao?
- Vì sao kiểm tra dữ liệu ở database khi ứng dụng đã validate?
- Vì sao không lưu tiền bằng float?
- `timestamp` và `timestamptz` khác nhau thế nào?
- PostgreSQL có tự tạo index cho foreign key không? Hệ quả là gì?
- Thứ tự column trong composite index ảnh hưởng thế nào?
- UUID v4, UUID v7 và số tự tăng: ưu nhược điểm của từng loại khi làm primary key?
- Normalization là gì? Khi nào bạn cố ý lặp dữ liệu?

## 12. Tài liệu chính thức
- Constraints: https://www.postgresql.org/docs/18/ddl-constraints.html
- Numeric types: https://www.postgresql.org/docs/18/datatype-numeric.html
- Date/time types: https://www.postgresql.org/docs/18/datatype-datetime.html
- Enum types: https://www.postgresql.org/docs/18/datatype-enum.html
- Indexes: https://www.postgresql.org/docs/18/indexes.html
- Multicolumn indexes: https://www.postgresql.org/docs/18/indexes-multicolumn.html
- `EXPLAIN`: https://www.postgresql.org/docs/18/using-explain.html
- UUID functions: https://www.postgresql.org/docs/18/functions-uuid.html
- Error codes (SQLSTATE): https://www.postgresql.org/docs/18/errcodes-appendix.html
- psql: https://www.postgresql.org/docs/18/app-psql.html
