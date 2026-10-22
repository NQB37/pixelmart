# HTTP và REST (nền tảng cho V1.2 trở đi)

> Ghi chú này được viết ở đầu V1.2, trước khi code. Đọc xong, bạn phải giải thích được method, status code và định dạng lỗi của PixelMart mà không cần nhìn code.

## 1. Nó là gì
**HTTP** là giao thức request/response: client gửi một request (method + URL + header + body), server trả về một response (status code + header + body). **REST** không phải giao thức mới. Nó là cách tổ chức API trên HTTP: mọi thứ là **resource** (danh từ trong URL), hành động được biểu diễn bằng **method**, và kết quả được biểu diễn bằng **status code**.

## 2. Tại sao nó tồn tại
Browser, app mobile và các service khác cần một cách nói chuyện chung. HTTP đã là chuẩn ở mọi nơi. REST đặt thêm quy ước để người khác đoán được API làm gì chỉ từ URL và method, mà không phải đọc tài liệu từng dòng.

## 3. Vấn đề nó giải quyết
- Client biết ngay thành công hay thất bại từ status code, không phải phân tích chuỗi văn bản.
- Method có ngữ nghĩa rõ về **an toàn** (không đổi dữ liệu) và **idempotent** (gọi lặp lại cho cùng kết quả), nên cache và retry làm đúng được.
- Một quy ước dùng cho mọi resource: học một lần, áp dụng được ở mọi chỗ.

## 4. Ví dụ đời thực
Coi API như một nhà hàng:
- **Method** là động từ bạn nói với bồi bàn. `GET` là xem menu, không thay đổi gì. `POST` là gọi một món mới. `PUT` là thay nguyên món này bằng phiên bản mới. `PATCH` là chỉ đổi ghi chú của món. `DELETE` là huỷ món.
- **Resource** là món ăn và danh mục: `/products`, `/products/42`.
- **Status code** là phản hồi của bếp. `200` là đã làm xong. `201` là đã tạo món mới. `400` là bạn gọi sai (ghi chú không hợp lệ). `404` là không có món này. `500` là bếp gặp sự cố, không phải lỗi của bạn.

## 5. Cách hoạt động

### 5.1 Cấu trúc một request và response
```http
GET /health HTTP/1.1            ← method, path
Host: localhost:4000
Accept: application/json        ← header: client muốn nhận gì
x-request-id: abc-123           ← header tuỳ chỉnh (request ID, xem V1.2)

HTTP/1.1 200 OK                 ← status line
Content-Type: application/json
x-request-id: abc-123

{"status":"ok","timestamp":"2026-10-16T08:00:00.000Z"}   ← body
```

### 5.2 Method
| Method | Dùng để | Safe (không đổi dữ liệu) | Idempotent (lặp lại cho cùng kết quả) |
|---|---|---|---|
| GET | Đọc | ✔ | ✔ |
| POST | Tạo mới, hoặc một hành động không có địa chỉ sẵn | ✘ | ✘ |
| PUT | Thay thế toàn bộ resource | ✘ | ✔ |
| PATCH | Sửa một phần | ✘ | Không đảm bảo |
| DELETE | Xoá | ✘ | ✔ |

Hai điểm hay bị nhầm:
- `POST` không idempotent. Gọi hai lần sẽ tạo hai đơn hàng. Vì vậy checkout (V1.7) cần cơ chế chống tạo trùng riêng, không thể chỉ dựa vào method.
- `DELETE` lặp lại vẫn idempotent về trạng thái cuối (resource đã không còn), nhưng lần gọi thứ hai có thể trả `404`. Idempotent là nói về **trạng thái**, không phải về **status code**.

### 5.3 Status code cần nhớ
| Nhóm | Code | Ý nghĩa | Ví dụ ở PixelMart |
|---|---|---|---|
| 2xx | `200` | OK | `GET /health`, đọc catalog |
| | `201` | Created, kèm header `Location` trỏ tới resource mới | Tạo đơn hàng (V1.7) |
| | `204` | No Content | Xoá thành công |
| 4xx | `400` | Request sai cú pháp hoặc không qua validation | Body sai kiểu, thiếu field |
| | `401` | Chưa xác thực | Chưa đăng nhập vào admin (V1.8) |
| | `403` | Đã xác thực nhưng không có quyền | User thường vào khu admin (V1.8) |
| | `404` | Route hoặc resource không tồn tại | `/khong-co`, sản phẩm không có |
| | `409` | Xung đột với trạng thái hiện tại | Chuyển trạng thái đơn hàng không hợp lệ (V1.10) |
| 5xx | `500` | Lỗi không mong đợi ở server | Exception không được xử lý |

Cách phân biệt:
- `401` là "tôi không biết bạn là ai". `403` là "tôi biết bạn, nhưng bạn không được phép".
- `400` là request sai, dù đặt lúc nào cũng sai. `409` là request hợp lệ nhưng không đúng lúc, với trạng thái hiện tại của resource.
- Trả `200` kèm body có `"error"` là sai. Client sẽ không biết lấy status code để phân biệt, và cache có thể lưu nhầm kết quả lỗi.

### 5.4 Quy ước đặt URL
- Danh từ số nhiều: `/products`, không phải `/getProducts`.
- Định danh trong path: `/products/42`. Lọc và phân trang nằm trong query: `/products?page=2&limit=20`.
- Lồng quan hệ ở mức vừa phải: `/orders/42/items`. Lồng sâu hơn thì nên cân nhắc lại.

### 5.5 Body và Content-Type
JSON là định dạng body mặc định. Client phải gửi `Content-Type: application/json`. Nếu thiếu, Nest không parse body và các field sẽ là `undefined`. Cách biểu diễn tiền được chốt trong [ADR-0003](../decisions/0003-money-representation.md), sẽ áp dụng ở V1.3 và V1.7.

### 5.6 Định dạng lỗi của PixelMart
Mọi lỗi (400, 404, 500) có cùng một hình dạng, kèm `requestId` để nối với log:
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
Client chỉ cần đọc một kiểu lỗi duy nhất. Chi tiết nằm ở [IMPLEMENTATION V1.2](../versions/v1/IMPLEMENTATION.md#sprint-v12--nestjs-api-skeleton).

## 6. Khi nào nên dùng
- API cho web và mobile, quản lý các resource như sản phẩm, đơn hàng, người dùng.
- Khi client cần cache (`GET`) hoặc retry an toàn (method idempotent).

## 7. Khi nào không nên dùng
- Dữ liệu cần đẩy liên tục theo thời gian thực: WebSocket hoặc Server-Sent Events hợp hơn.
- Gọi nội bộ giữa các service với nhiều thao tác phức tạp: RPC (gRPC) có thể hợp hơn.
- Ép mọi hành động thành CRUD một cách máy móc. Một hành động như thanh toán không nhất thiết phải là "tạo resource". Một endpoint kiểu `POST /orders/42/pay` vẫn là REST hợp lý nếu được thiết kế rõ.

## 8. Vị trí trong PixelMart
- **V1.2:** `GET /health` trả `200` JSON. Route không tồn tại trả `404` với định dạng lỗi chuẩn.
- **V1.4 (dự kiến):** catalog `GET /products?page=&limit=`.
- **V1.7 (dự kiến):** `POST /orders` trả `201`.
- **V1.9–V1.10 (dự kiến):** admin chuyển trạng thái đơn hàng. Trạng thái không hợp lệ trả `409` (đã có trong AC-1.10-02).

## 9. Bài tập thực hành
Làm sau khi V1.2 chạy được (dùng Git Bash):
1. `curl -i localhost:4000/health`. Chỉ ra status line, header `Content-Type`, header `x-request-id` và body.
2. `curl -i -X POST localhost:4000/health`. Server trả gì? Vì sao không phải `405 Method Not Allowed`? (Gợi ý: Nest khớp route theo cả path lẫn method. Không khớp thì coi như route không tồn tại.)
3. `curl -i localhost:4000/khong-co -H "x-request-id: test-123"`. `requestId` trong body có bằng `test-123` không? Giải thích vì sao.
4. Trên giấy: khi bạn chỉ muốn đổi tên sản phẩm, `PUT` và `PATCH` khác nhau thế nào? Client nên gửi gì trong mỗi trường hợp?

## 10. Lỗi thường gặp và cách debug
- **Quên `-i` khi dùng curl.** Bạn sẽ không thấy status code và header. Dùng `curl -i` để thấy header và body, hoặc `curl -v` để thấy cả request.
- **Gọi sai method.** Nest trả `404`, không phải "method not allowed". Khi gặp `404` bất ngờ, kiểm tra method trước khi nghi route bị thiếu.
- **`curl -d` không tự đặt `Content-Type: application/json`.** Mặc định nó gửi dạng form. Khi test API JSON, phải thêm header: `curl -H "Content-Type: application/json" -d '{"name":"x"}' ...`.
- **Body là `undefined` ở server.** Thường do thiếu `Content-Type` như trên, hoặc JSON không hợp lệ.
- **Status `200` nhưng body có lỗi.** Đây là lỗi thiết kế, không phải lỗi của client. Sửa bằng cách trả đúng status code.

## 11. Câu hỏi phỏng vấn
- `PUT` và `PATCH` khác nhau thế nào? Idempotent nghĩa là gì và vì sao quan trọng khi retry?
- Vì sao `POST` không idempotent? Có cách nào để làm cho việc tạo đơn hàng an toàn khi client retry?
- `401` và `403` khác nhau thế nào?
- `400` và `409` khác nhau thế nào? Cho một ví dụ cho mỗi loại.
- Khi nào `201` nên đi kèm header `Location`?

## 12. Tài liệu chính thức
- RFC 9110, HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110
- MDN, HTTP methods: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods
- MDN, HTTP status codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
- Roy Fielding, dissertation chương 5 (REST): https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm
