# Tài liệu PixelMart

PixelMart là một nền tảng thương mại điện tử học theo dự án (project-based learning, PBL). Nó phát triển từ một MVP chạy local thành một hệ thống đã deploy, có observability và hướng event-driven. Tài liệu này có **trước** code: mỗi phiên bản đều được lên kế hoạch, giải thích và có acceptance criteria trước khi bắt đầu triển khai.

## Bản đồ tài liệu

| Tài liệu | Mục đích | Trạng thái |
|---|---|---|
| [ROADMAP.md](ROADMAP.md) | Các phiên bản, sprint, dependency giữa chúng, trạng thái, sprint log | Đang dùng |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Những gì **thực sự đang chạy** hiện tại, cùng mục tiêu của phiên bản hiện tại | Đang dùng |
| [DATABASE.md](DATABASE.md) | Mô hình dữ liệu, constraint, index, lý do thiết kế | Thiết kế V1, plan ở V1.3 (chưa migrate) |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Môi trường local, phiên bản công cụ, lệnh dùng hằng ngày | Đang dùng |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Các sự cố lặp lại và nguyên nhân gốc | Đang dùng |
| [decisions/](decisions/) | Architecture Decision Records (ADR) | Đang dùng |
| [learning/](learning/) | Ghi chú khái niệm dùng lại được (định dạng 12 phần) | Bổ sung theo từng sprint |
| [TESTING.md](TESTING.md) | Công cụ, quy ước đặt file và lệnh chạy test | Từ V1.2 |
| [versions/v1/](versions/v1/) | Phạm vi V1, kiến thức cần học, kế hoạch triển khai, acceptance criteria | Đang dùng |

Chỉ được tạo khi lần đầu có nội dung thật (không tạo trước):

- `API.md`: ở V1.4, khi các endpoint public đầu tiên tồn tại (Swagger tại `/docs` vẫn là source of truth).
- `DEPLOYMENT.md`: ở V6, khi deploy lần đầu.

## Quy ước

- **Trung thực về trạng thái:** ARCHITECTURE.md mô tả những gì đang tồn tại. Mọi thứ còn trong kế hoạch đều được gắn nhãn _planned_.
- **ADR** được đánh số và không bao giờ bị xoá. Một quyết định bị đảo ngược sẽ có ADR mới thay thế (supersede) ADR cũ.
- **Ghi chú học tập** dùng định dạng 12 phần: nó là gì · vì sao tồn tại · vấn đề nó giải quyết · ví dụ so sánh · cách hoạt động · khi nào nên dùng · khi nào không nên dùng · vị trí trong PixelMart · bài tập · lỗi thường gặp & debug · câu hỏi phỏng vấn · tài liệu chính thức.
- **Thư mục phiên bản** (`versions/vN/`) gồm: README, LEARNING, IMPLEMENTATION, ACCEPTANCE_CRITERIA, ARCHITECTURE, TROUBLESHOOTING.
- Sơ đồ dùng Mermaid để chúng nằm trong git và hiển thị được trên GitHub.
