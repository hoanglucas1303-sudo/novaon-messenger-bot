// Sinh ảnh placeholder PNG (tông brand) để backend tự host — Facebook fetch được.
// Chạy: node scripts/gen-placeholders.mjs  → xuất ra public/products/*.png
// (Production: Client upload ảnh thật vào public/products/ qua Dashboard, thay các file này.)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'products');

// ---- PNG encoder tối giản (RGB, solid + dải màu phụ để nhìn có chủ đích) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function makePng(w, h, [r, g, b], band) {
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const rowStart = y * (1 + w * 3);
    raw[rowStart] = 0; // filter none
    // dải màu phụ ở phần trên cho có điểm nhấn
    const inBand = band && y < Math.floor(h * 0.28);
    const col = inBand ? band : [r, g, b];
    for (let x = 0; x < w; x++) {
      const p = rowStart + 1 + x * 3;
      raw[p] = col[0];
      raw[p + 1] = col[1];
      raw[p + 2] = col[2];
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// mã sản phẩm -> danh sách [tên file, màu nền, màu dải]
const IMAGES = [
  ['bong-ep-1.png', [157, 23, 77], [131, 24, 67]],
  ['bong-ep-2.png', [190, 24, 93], [131, 24, 67]],
  ['sieu-nay-1.png', [131, 24, 67], [157, 23, 77]],
  ['back-essential-1.png', [219, 39, 119], [157, 23, 77]],
  ['back-essential-2.png', [157, 23, 77], [219, 39, 119]],
  ['chan-ga-goi-1.png', [190, 24, 93], [219, 39, 119]],
];

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, bg, band] of IMAGES) {
  fs.writeFileSync(path.join(OUT_DIR, name), makePng(800, 600, bg, band));
  console.log('  ✓', name);
}
console.log('Xong:', OUT_DIR);
