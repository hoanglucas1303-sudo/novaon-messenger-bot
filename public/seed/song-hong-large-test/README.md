# Seed Test Case: Sông Hồng Bedding

Bộ tài liệu mẫu để test một dự án chatbot tư vấn chăn ga gối đệm Sông Hồng ở quy mô lớn hơn.

Nếu muốn nhìn nhanh quy mô seed trước khi đọc từng file, mở trang overview:
`/seed/song-hong-large-test/overview.html`

Mục tiêu:
- Tạo campaign mới từ tài liệu ban đầu.
- Import catalog có sản phẩm, giá theo biến thể, ảnh sản phẩm.
- Import FAQ/chính sách và playbook tư vấn.
- Test update sau khi đã có campaign: cập nhật giá và thêm sản phẩm mới.
- Test chatbot trả lời có chủ đích, gửi ảnh, báo giá tham khảo và xin lead.

Lưu ý về dữ liệu:
- Đây là seed synthetic cho demo/QA, không phải bảng giá chính thức để bán hàng.
- Giá và ảnh được tổng hợp/paraphrase từ nguồn public, cần PM/Sale review trước khi dùng thật.
- Bot chỉ được nói "giá tham khảo theo catalog tại thời điểm test", không cam kết khuyến mại còn hiệu lực.

Thứ tự test đề xuất:
1. Mở Import Center: `/studio/import`.
2. Chọn campaign đích hoặc tạo campaign mới trong `/studio` trước.
3. Import lần 1 bằng URL file `02-initial-catalog-products.txt`.
4. Import tiếp `03-initial-faq-policies.txt` và `04-initial-sales-playbook.txt`.
5. Mở web chat `/chat/song-hong-demo?model=auto` để test các prompt trong `test-prompts.md`.
6. Import file `05-update-price-and-new-products.txt` để test cập nhật giá và thêm sản phẩm.

Nguồn tham khảo public:
- https://songhong.info/
- https://songhong.info/dem-song-hong-3-tam-vo-gam
- https://songhonghanoi.vn/
- https://demxanh.com/bang-gia-dem-bong-ep-song-hong-khuyen-mai.html
- https://songhongchinhhang.vn/
- https://khodemhanoi.vn/dem-bong-ep-song-hong-gia-bao-nhieu-do-day-va-kich-thuoc-dem-song-hong/
