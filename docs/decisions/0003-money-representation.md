# ADR-0003: Cách biểu diễn tiền

- Trạng thái: Accepted (Đã chấp nhận)
- Ngày: 2026-10-15

## Bối cảnh

Kiểu `number` của JavaScript là số thực dấu phẩy động IEEE-754: `0.1 + 0.2 === 0.30000000000000004`. Tổng tiền tính bằng float bị lệch vài phần nhỏ của một cent, và sai số này cộng dồn qua các dòng hàng, giảm giá và báo cáo.

## Các phương án đã cân nhắc

1. **Dùng float ở mọi nơi.** Loại: không chính xác.
2. **Dùng số nguyên theo đơn vị nhỏ nhất (cent) ở mọi nơi** (`price_cents int`). Chính xác, nhanh, Stripe cũng dùng cách này. Nhưng phải cẩn thận với các loại tiền có 0 hoặc 3 chữ số thập phân, và trong code UI rất dễ nhầm giữa cent và đơn vị.
3. **`numeric(12,2)` trong PostgreSQL + thư viện decimal trong Node + chuỗi trong JSON.** Được chọn.

## Quyết định

- **Database:** `numeric(12,2)`, kiểu thập phân chính xác. Tối đa 9,999,999,999.99.
- **Backend:** Prisma trả về `Prisma.Decimal` (decimal.js). Mọi phép tính (`unitPrice.mul(quantity)`, tính tổng) dùng các method của Decimal, **không bao giờ** dùng `Number(...)`.
- **JSON của API:** tiền được serialize thành **chuỗi** có hai chữ số thập phân: `"price": "19.99"`. Nếu là số JSON, bất kỳ client nào cũng có thể parse ngược thành float.
- **Frontend:** chỉ định dạng tiền để hiển thị (`Intl.NumberFormat`). Không bao giờ tính bất cứ thứ gì mà backend tin dùng.
- **Loại tiền:** một loại tiền duy nhất cho cửa hàng, lấy từ config (`STORE_CURRENCY`, ISO 4217), được ghi vào mỗi đơn hàng.

## Hệ quả

- ➕ Tổng tiền chính xác. CHECK của database `line_total = unit_price * quantity` đáng tin cậy.
- ➖ Frontend xử lý tiền dưới dạng chuỗi. Cần một helper nhỏ để định dạng.
- Việc tiếp theo: nếu sau này cần đa tiền tệ thì phải có loại tiền theo từng sản phẩm và quy tắc tỷ giá (FX), và sẽ có ADR riêng.

## Sửa đổi 2026-10-22 (Sprint V1.3)

**Bối cảnh:** quyết định gốc để mở loại tiền của cửa hàng. Seed của V1.3 cần giá thật, nên phải chọn ngay bây giờ.

**Quyết định:** `STORE_CURRENCY` là **EUR**. Dữ liệu seed và mọi giá trong V1 đều tính bằng EUR.

**Lý do:** EUR có hai chữ số thập phân, khớp với `numeric(12,2)` và với cách Stripe (V3) biểu diễn số tiền theo cent, nên không phải đổi gì trong ADR này. VND đã được cân nhắc và bị loại: VND không có phần thập phân, nên hoặc phải đổi sang `numeric(12,0)`, hoặc có hai chữ số `.00` luôn vô nghĩa, và Stripe coi VND là zero-decimal currency.

**Hệ quả:** biến `STORE_CURRENCY` được thêm vào env của API ở V1.7, lúc đơn hàng đầu tiên được tạo, chứ không thêm sớm ở V1.3.
