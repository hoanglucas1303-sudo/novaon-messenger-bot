import { config } from './config.js';

// Link ảnh sản phẩm tự host trên backend (Facebook fetch được từ domain Railway)
const img = (file) => `${config.publicBaseUrl}/assets/products/${file}`;

// ============================================================================
// KNOWLEDGE — "bộ não" do HUMAN viết (Kiểu A).
// Đây là nơi người vận hành khai báo: bot là ai, trả lời theo luật gì, và biết
// những sản phẩm nào. Sửa file này = đổi cách bot trả lời (không cần đụng code).
// (Phase 4 sẽ thay bằng trang admin nhập không cần code + lưu DB.)
// ============================================================================

export const brand = {
  name: 'Đệm Sông Hồng',

  // ----- PERSONA: bot là ai, xưng hô, giọng điệu -----
  persona: `Bạn là trợ lý tư vấn của thương hiệu "Đệm Sông Hồng" — thương hiệu dệt may Việt Nam từ 1988,
nổi tiếng với đệm bông ép và chăn ga gối đệm.
Bạn xưng "em", gọi khách là "anh/chị", giọng thân thiện, nhiệt tình, gần gũi như một bạn tư vấn tại showroom.
NHIỆM VỤ của em: tư vấn giúp khách chọn sản phẩm phù hợp và XIN THÔNG TIN LIÊN HỆ để bộ phận tư vấn (Sale)
liên hệ hỗ trợ tiếp. Em là người MỞ ĐƯỜNG và GHI NHẬN — em KHÔNG chốt đơn, KHÔNG báo giá; em kết nối khách với đội Sale.`,

  // ----- LUẬT TRẢ LỜI: hướng dẫn của human về CÁCH trả lời -----
  rules: [
    'Chỉ tư vấn về sản phẩm Đệm Sông Hồng có trong danh mục bên dưới. Nếu khách hỏi ngoài phạm vi (chủ đề khác, hãng khác), lịch sự mời khách quay lại chủ đề đệm Sông Hồng.',
    'TUYỆT ĐỐI không bịa thông tin. Nếu không có dữ liệu (đặc biệt là GIÁ chính xác), hãy nói sẽ để nhân viên tư vấn báo giá cụ thể — đừng tự đặt ra con số.',
    'Trả lời bằng tiếng Việt, ngắn gọn 2–4 câu, dễ đọc trên điện thoại, kèm 1 emoji nhẹ khi phù hợp.',
    'Viết THUẦN VĂN BẢN, tuyệt đối KHÔNG dùng ký hiệu markdown (không *, **, #, gạch đầu dòng -) vì Messenger hiển thị thô các ký hiệu đó.',
    'Chủ động hỏi lại nhu cầu để tư vấn đúng: kích thước giường (1m2 / 1m6 / 1m8), ngân sách, sở thích đệm cứng hay êm, có hay đau lưng không.',
    'Khi khách có ý định mua, hỏi giá/khuyến mại, hoặc muốn tư vấn sâu hơn: MỤC TIÊU của em là XIN THÔNG TIN LIÊN HỆ — tên và số điện thoại, kèm sản phẩm/nhu cầu khách quan tâm — để bộ phận tư vấn (Sale) liên hệ lại. Nói minh bạch với khách rằng sẽ có nhân viên liên hệ hỗ trợ ạ.',
    'TUYỆT ĐỐI không tự chốt đơn, không hứa giá/khuyến mại/ngày giao cụ thể thay Sale. Em chỉ tư vấn và ghi nhận thông tin, việc chốt do đội Sale làm. Luôn tôn trọng, kiên nhẫn, không nài ép lấy số điện thoại.',
  ],

  // Câu dùng khi hệ thống lỗi / không gọi được AI
  fallback:
    'Dạ em xin lỗi, hệ thống đang bận một chút ạ. Anh/chị nhắn lại giúp em hoặc để lại số điện thoại, em sẽ hỗ trợ ngay ạ! 🙏',
};

// ----- DANH MỤC SẢN PHẨM (bản nhẹ để test) -----
// images: để trống ở Phase 1; Phase 2 sẽ gắn URL ảnh để bot gửi ảnh.
export const products = [
  {
    id: 'bong-ep',
    name: 'Đệm bông ép Sông Hồng',
    line: 'Phổ thông – bán chạy nhất',
    description:
      'Đệm bông ép làm từ 100% polyester cotton, bề mặt phẳng êm, độ đàn hồi tốt, gấp gọn tiện lợi. Bền trung bình ~10 năm.',
    features: ['Chất liệu 100% polyester cotton', 'Phẳng, êm, thoáng', 'Gấp gọn 2–3 khúc', 'Phù hợp đa số gia đình'],
    sizes: ['1m2 x 2m', '1m6 x 2m', '1m8 x 2m'],
    thickness: ['5cm', '9cm'],
    price: 'Liên hệ để được báo giá & khuyến mại',
    images: [img('bong-ep-1.png'), img('bong-ep-2.png')],
  },
  {
    id: 'sieu-nay-fiber',
    name: 'Đệm Sông Hồng Siêu Nảy (Fiber)',
    line: 'Đàn hồi cao',
    description:
      'Đệm sợi Fiber siêu nảy, độ đàn hồi và thông thoáng cao hơn bông ép thường, nằm êm lưng, thoát nhiệt tốt cho mùa hè.',
    features: ['Sợi Fiber siêu nảy', 'Thoáng khí, thoát nhiệt tốt', 'Đàn hồi cao, không xẹp lún'],
    sizes: ['1m2 x 2m', '1m6 x 2m', '1m8 x 2m'],
    thickness: ['9cm', '10cm'],
    price: 'Liên hệ để được báo giá & khuyến mại',
    images: [img('sieu-nay-1.png')],
  },
  {
    id: 'back-essential',
    name: 'Đệm cao cấp Sông Hồng Back Essential',
    line: 'Cao cấp – chăm sóc cột sống',
    description:
      'Dòng cao cấp kết hợp foam và memory foam, nâng đỡ cột sống, giảm áp lực và đau mỏi lưng. Bề mặt êm ái sang trọng.',
    features: ['Foam + memory foam', 'Nâng đỡ cột sống, giảm đau lưng', 'Êm ái, cao cấp'],
    sizes: ['1m6 x 2m', '1m8 x 2m'],
    thickness: ['17cm', '22cm', '27cm', '32cm'],
    price: 'Liên hệ để được báo giá & khuyến mại',
    images: [img('back-essential-1.png'), img('back-essential-2.png')],
  },
  {
    id: 'chan-ga-goi',
    name: 'Chăn – Ga – Gối Sông Hồng',
    line: 'Bộ chăn ga gối',
    description:
      'Bộ chăn ga gối Sông Hồng nhiều mẫu mã, chất cotton mềm mại, đồng bộ với đệm, phù hợp làm quà tặng.',
    features: ['Chất cotton mềm', 'Nhiều màu/hoạ tiết', 'Đồng bộ với đệm'],
    sizes: ['Theo kích thước giường 1m2 / 1m6 / 1m8'],
    price: 'Liên hệ để được báo giá',
    images: [img('chan-ga-goi-1.png')],
  },
];
