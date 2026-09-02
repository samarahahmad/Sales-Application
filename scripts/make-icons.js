/* Generates the PWA icons (a water drop on the brand colour) so the app has a
   proper home-screen icon without shipping binary assets we cannot review. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BRAND = [15, 92, 140];
const DROP = [255, 255, 255];

function insideRoundedSquare(x, y, radius) {
  const dx = Math.max(radius - x, 0, x - (1 - radius));
  const dy = Math.max(radius - y, 0, y - (1 - radius));
  return dx * dx + dy * dy <= radius * radius;
}

function insideDrop(x, y) {
  const cx = 0.5, cy = 0.62, r = 0.27;
  if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) return true;
  if (y >= 0.16 && y <= cy) {
    const halfWidth = r * ((y - 0.16) / (cy - 0.16));
    return Math.abs(x - cx) <= halfWidth;
  }
  return false;
}

function crc32(buffer) {
  let c;
  const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let offset = 0;
  for (let py = 0; py < size; py++) {
    raw[offset++] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) / size;
      const y = (py + 0.5) / size;
      const opaque = insideRoundedSquare(x, y, 0.22);
      const colour = insideDrop(x, y) ? DROP : BRAND;
      raw[offset++] = colour[0];
      raw[offset++] = colour[1];
      raw[offset++] = colour[2];
      raw[offset++] = opaque ? 255 : 0;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [180, 192, 512]) {
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png(size));
  console.log(`icons/icon-${size}.png`);
}
