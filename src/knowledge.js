import { config } from './config.js';
import { proxiedImageUrl } from './media.js';

// Link ảnh sản phẩm tự host trên backend (Facebook fetch được từ domain Railway)
const img = (file) => `${config.publicBaseUrl}/assets/products/${file}`;
const remoteImg = (url) => proxiedImageUrl(config.publicBaseUrl, url);

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
    'Nếu catalog có giá, chỉ nói là giá tham khảo/giá đang ghi nhận trong catalog tại thời điểm test. Không cam kết khuyến mại còn hiệu lực; khi khách muốn mua hoặc hỏi chốt giá, xin thông tin để Sale xác nhận lại.',
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
    priceNote: 'Giá tham khảo từ các đại lý online, có thể thay đổi theo thời điểm và khu vực.',
    variants: [
      { size: '120x190cm', thickness: '9cm', listPrice: 2680000, salePrice: 1876000 },
      { size: '160x200cm', thickness: '9cm', listPrice: 3490000, salePrice: 2443000 },
      { size: '180x200cm', thickness: '9cm', listPrice: 3940000, salePrice: 2758000 },
      { size: '160x200cm', thickness: '15cm', listPrice: 4800000, salePrice: 3360000 },
      { size: '180x200cm', thickness: '18cm', listPrice: 7330000, salePrice: 5131000 },
    ],
    sourceUrl: 'https://demxanh.com/bang-gia-dem-bong-ep-song-hong-khuyen-mai.html',
    images: [
      remoteImg('https://songhonghanoi.vn/media/product/31______m_b__ng___p_s__ng_h___ng_v____g___m.jpg'),
      remoteImg('https://demxanh.com/media/product/1997_dem_bong_ep_song_hong_vo_gam__2_.jpg'),
      img('bong-ep-1.png'),
    ],
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
    priceNote: 'Giá tham khảo từ bảng giá đại lý online.',
    variants: [
      { size: '120x190cm', thickness: '10cm', listPrice: 4180000, salePrice: 2926000 },
      { size: '160x200cm', thickness: '10cm', listPrice: 5300000, salePrice: 3710000 },
      { size: '180x200cm', thickness: '10cm', listPrice: 5950000, salePrice: 4165000 },
      { size: '160x200cm', thickness: '15cm', listPrice: 7690000, salePrice: 5383000 },
      { size: '180x200cm', thickness: '20cm', listPrice: 9390000, salePrice: 6573000 },
    ],
    sourceUrl: 'https://demxanh.com/bang-gia-dem-bong-ep-song-hong-khuyen-mai.html',
    images: [
      remoteImg('https://songhonghanoi.vn/media/product/32________m_si__u_n___y_m___i.jpg'),
      remoteImg('https://demxanh.com/media/product/3103_10.jpg'),
      img('sieu-nay-1.png'),
    ],
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
    priceNote: 'Giá tham khảo theo bảng giá Back Essential online.',
    variants: [
      { size: '120x190cm', thickness: '17cm', listPrice: 8400000, salePrice: 5460000 },
      { size: '160x200cm', thickness: '17cm', listPrice: 10510000, salePrice: 6832000 },
      { size: '180x200cm', thickness: '17cm', listPrice: 11490000, salePrice: 7469000 },
      { size: '160x200cm', thickness: '22cm', listPrice: 11310000, salePrice: 7352000 },
      { size: '180x200cm', thickness: '27cm', listPrice: 13500000, salePrice: 8775000 },
    ],
    sourceUrl: 'https://demxanh.com/bang-gia-dem-bong-ep-song-hong-khuyen-mai.html',
    images: [
      remoteImg('https://songhonghanoi.vn/media/product/1182______m_back_essential.jpg'),
      remoteImg('https://demxanh.com/media/product/4916_dem_bong_ep_song_hong_cao_cap_backessential__1_.jpg'),
      img('back-essential-1.png'),
    ],
  },
  {
    id: 'chan-ga-goi',
    name: 'Chăn – Ga – Gối Sông Hồng',
    line: 'Bộ chăn ga gối',
    description:
      'Bộ chăn ga gối Sông Hồng nhiều mẫu mã, chất cotton mềm mại, đồng bộ với đệm, phù hợp làm quà tặng hoặc thay mới phòng ngủ.',
    features: ['Chất cotton mềm', 'Nhiều màu/hoạ tiết', 'Đồng bộ với đệm', 'Có nhiều bộ sưu tập Basic/Urban/Youth/Junior'],
    sizes: ['Theo kích thước giường 1m2 / 1m6 / 1m8'],
    price: 'Từ khoảng 608.000đ đến hơn 3.000.000đ tuỳ dòng và bộ sưu tập',
    priceNote: 'Giá tham khảo theo website Sông Hồng online/đại lý, phụ thuộc mã mẫu và kích thước.',
    variants: [
      { size: 'Basic Cotton', thickness: 'BC23074/75/76', listPrice: 760000, salePrice: 608000 },
      { size: 'Youth YC22014', thickness: 'Bộ chăn ga gối', listPrice: 2070000, salePrice: 1449000 },
      { size: 'Junior JC22001', thickness: 'Bộ chăn ga gối', listPrice: 1770000, salePrice: 1239000 },
      { size: 'Urban UT23028 phủ 200x220', thickness: 'Bộ cao cấp', listPrice: 4260000, salePrice: 2343000 },
      { size: 'Urban SH_UC25 113', thickness: '3 kích thước', listPrice: 3920000, salePrice: 3332000 },
    ],
    sourceUrl: 'https://songhonghanoi.vn/',
    images: [
      remoteImg('https://product.hstatic.net/200000485279/product/1_c32dd0dd5bea49559c5995844461db9a_grande.jpg'),
      remoteImg('https://songhonghanoi.vn/media/product/1373_untitled_1_ut23028.jpg'),
      img('chan-ga-goi-1.png'),
    ],
  },
];
