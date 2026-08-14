// ============================================================================
// THÔNG TIN NGƯỜI GỬI (public_profile) — lấy tên hiển thị Facebook của khách
// khi họ nhắn tin, để bot xưng hô đúng thay vì phải hỏi lại tên mỗi lần.
// Suy đoán thêm giới tính TỪ TÊN (Facebook đã bỏ field "gender" công khai từ
// lâu vì lý do riêng tư) — chỉ dùng để chọn "anh"/"chị" cho tự nhiên, không
// chắc chắn tuyệt đối nên khi không rõ thì giữ nguyên "anh/chị" trung tính.
// ============================================================================
import { config } from './config.js';

const GRAPH = `https://graph.facebook.com/${config.graphApiVersion}`;

// Cache đơn giản trong RAM (đủ cho MVP, cùng kiểu với cache lịch sử hội thoại
// trong llm.js) — PSID đã page-scoped nên không lo đụng giữa các Trang khác nhau.
const cache = new Map(); // senderId -> { profile, fetchedAt }
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function getSenderProfile(senderId, pageToken) {
  if (!senderId || !pageToken) return null;

  const cached = cache.get(senderId);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.profile;

  try {
    const url = new URL(`${GRAPH}/${senderId}`);
    url.searchParams.set('fields', 'first_name,last_name,name');
    url.searchParams.set('access_token', pageToken);
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) {
      console.warn('[profile] Không lấy được thông tin người dùng:', data.error || data);
      return null;
    }

    const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
    const profile = { name, gender: guessVietnameseGender(name) };
    cache.set(senderId, { profile, fetchedAt: Date.now() });
    return profile;
  } catch (e) {
    console.warn('[profile] Lỗi gọi Graph API lấy profile:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Suy đoán giới tính từ tên tiếng Việt.
// Ưu tiên tên đệm truyền thống (đáng tin nhất: "Văn" → nam, "Thị" → nữ) →
// không có thì tra bảng tên gọi phổ biến → không chắc thì trả về null (bot
// giữ nguyên "anh/chị" trung tính, không đoán bừa).
// ---------------------------------------------------------------------------
const MALE_MIDDLE = /\bVăn\b/i;
const FEMALE_MIDDLE = /\bThị\b/i;

const MALE_GIVEN_NAMES = new Set([
  'hùng', 'dũng', 'nam', 'quân', 'long', 'sơn', 'tuấn', 'minh', 'đức', 'hiếu',
  'phong', 'khang', 'huy', 'khoa', 'đạt', 'bình', 'cường', 'kiên', 'vũ', 'thắng',
  'hải', 'duy', 'đông', 'phúc', 'quang', 'trung', 'tài', 'thành', 'việt', 'hoàng',
  'lộc', 'tân', 'vinh', 'toàn', 'khánh', 'phát', 'đăng', 'nguyên', 'thịnh', 'kha',
]);
const FEMALE_GIVEN_NAMES = new Set([
  'hoa', 'lan', 'linh', 'trang', 'huyền', 'thảo', 'vy', 'nhi', 'my', 'hương',
  'thu', 'hằng', 'ngân', 'trâm', 'quyên', 'yến', 'xuân', 'mai', 'oanh', 'loan',
  'phương', 'ánh', 'ly', 'chi', 'giang', 'thư', 'uyên', 'như', 'duyên', 'tâm',
  'vân', 'nga', 'nhung', 'diệp', 'quỳnh', 'ngọc', 'khánh', 'nhàn',
]);

export function guessVietnameseGender(fullName) {
  if (!fullName) return null;
  const normalized = fullName.trim().normalize('NFC');
  if (MALE_MIDDLE.test(normalized)) return 'male';
  if (FEMALE_MIDDLE.test(normalized)) return 'female';

  // Tên đệm "Khánh" có thể trùng cả 2 bảng tên gọi (dùng cho cả nam/nữ) —
  // chỉ lấy TỪ CUỐI (tên gọi) làm tín hiệu phụ, và nếu trùng cả 2 bảng thì bỏ qua.
  const given = normalized.split(/\s+/).pop()?.toLowerCase();
  if (!given) return null;
  const isFemale = FEMALE_GIVEN_NAMES.has(given);
  const isMale = MALE_GIVEN_NAMES.has(given);
  if (isFemale && isMale) return null; // tên unisex, không đoán bừa
  if (isFemale) return 'female';
  if (isMale) return 'male';
  return null;
}
