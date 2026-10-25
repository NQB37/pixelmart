# Hướng dẫn học V1

Các khái niệm bạn cần **giải thích được bằng lời của mình** trước (✋) hoặc sau (✅) mỗi sprint. Ghi chú chi tiết nằm trong `docs/learning/` và được viết khi bắt đầu sprint cần đến chúng, để luôn gắn với code.

## Tự kiểm tra trước V1.1

Bạn không cần là chuyên gia ở bất kỳ mục nào. Bạn chỉ cần thấy thoải mái với:

- [ ] Mở terminal, di chuyển giữa các thư mục, chạy một lệnh và đọc output của nó.
- [ ] Git cơ bản: `init`, `add`, `commit`, `status`, `log`.
- [ ] JavaScript cơ bản: biến, hàm, object, mảng, `async`/`await`.
- [ ] Hiểu đại khái "server" và "port" là gì.

Nếu mục nào còn chưa chắc, cứ nói và ta sẽ làm một bài tập ngắn trước.

## Khái niệm theo sprint

| Sprint | Trước khi code ✋ | Sau sprint bạn giải thích được ✅ | Ghi chú |
|---|---|---|---|
| V1.1 | Monorepo, pnpm workspaces, Docker image/container/volume, env vars | Vì sao dữ liệu còn sau khi restart, vì sao init script chỉ chạy một lần, vì sao secret không được đưa vào git | [monorepo](../../learning/monorepo-and-pnpm-workspaces.md) · [docker](../../learning/docker-fundamentals.md) · [env vars](../../learning/environment-variables-and-secrets.md) |
| V1.2 | HTTP method/status code, REST, JSON, Nest module/DI | Request lifecycle của Nest; vì sao validation diễn ra ở ranh giới hệ thống | [http-and-rest](../../learning/http-and-rest.md) · [nestjs-fundamentals](../../learning/nestjs-fundamentals.md) |
| V1.3 | Bảng, khoá, quan hệ, `ON DELETE`, index, migration | Vì sao tiền không dùng float; vì sao order item snapshot giá; CHECK constraint bảo vệ điều gì; liveness và readiness | [relational-databases](../../learning/relational-databases-and-postgresql.md) · [prisma-and-migrations](../../learning/prisma-and-migrations.md) |
| V1.4 | Pagination, DTO, over-fetching | Offset và cursor pagination; N+1 problem | `rest-api-design.md` |
| V1.5 | Server và Client Components, các chế độ rendering | Cái gì chạy ở đâu; vì sao API URL chỉ được dùng phía server | `nextjs-app-router-and-rendering.md` |
| V1.6 | Client state, lưu trữ bền vững, hydration | Vì sao không thể tin một cart lưu trong localStorage và ta sẽ thay thế nó thế nào | (trong ghi chú Next.js) |
| V1.7 | Transaction, ACID, "không bao giờ tin client" | Chuyện gì xảy ra khi lỗi giữa chừng lúc checkout và vì sao không có gì bị lưu dở dang | `transactions-and-acid.md` |
| V1.8 | AuthN và AuthZ, hashing, JWT, cookie | 401 và 403; vì sao `proxy.ts` không phải ranh giới bảo mật | `authentication-basics.md` |
| V1.9–1.10 | Quyền sở hữu resource, state machine, cập nhật idempotent | Vì sao chuyển trạng thái không hợp lệ trả về 409; vì sao unpublish tốt hơn xoá | (trong ghi chú REST) |

## Góc phỏng vấn cho V1

Khi kết thúc V1, bạn nên trả lời được các câu sau, dẫn chứng bằng chính code của bạn:

1. Hãy mô tả chuyện gì xảy ra khi người dùng bấm "Đặt hàng".
2. Làm sao bạn đảm bảo khách hàng không thể sửa giá?
3. Bạn lưu tiền như thế nào, và vì sao?
4. Chuyện gì xảy ra nếu database lỗi giữa chừng khi đang tạo đơn hàng?
5. Vì sao order item lưu lại tên và giá sản phẩm?
6. Các endpoint của admin được bảo vệ thế nào? 401 khác 403 ở điểm nào?
7. Cart của bạn có những hạn chế gì, và bạn sẽ khắc phục chúng ra sao?
