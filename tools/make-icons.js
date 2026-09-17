// Generates the PWA icons (PNG) with no dependencies: orange rounded square, white badge, orange "A" + star.
const fs = require('fs'), zlib = require('zlib'), path = require('path');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---- tiny vector rasterizer (coverage via 4x4 supersampling) ----
function makeIcon(size) {
  const SS = 4, W = size * SS;
  const layers = []; // each: {test(x,y)->bool, color:[r,g,b,a]}
  const S = W;
  const rr = (x, y, x0, y0, x1, y1, r) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = Math.max(x0 + r, Math.min(x1 - r, x)), cy = Math.max(y0 + r, Math.min(y1 - r, y));
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
  const circle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  const segment = (x, y, ax, ay, bx, by, w) => { // distance from point to segment <= w/2
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, py = ay + t * dy;
    return (x - px) ** 2 + (y - py) ** 2 <= (w / 2) ** 2;
  };
  const star = (x, y, cx, cy, R, r) => { // 5-point star via winding over polygon
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rad = i % 2 ? r : R; pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]); }
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };
  const orange = [255, 122, 26, 255], white = [255, 255, 255, 255], gold = [255, 197, 49, 255], navy = [27, 36, 64, 255];
  layers.push({ test: (x, y) => rr(x, y, 0, 0, S, S, S * 0.22), color: orange });
  layers.push({ test: (x, y) => circle(x, y, S * 0.5, S * 0.47, S * 0.30), color: white });
  // letter A (orange strokes) inside the white circle
  const w = S * 0.085, top = [S * 0.5, S * 0.27], bl = [S * 0.34, S * 0.64], br = [S * 0.66, S * 0.64];
  layers.push({ test: (x, y) => segment(x, y, top[0], top[1], bl[0], bl[1], w) || segment(x, y, top[0], top[1], br[0], br[1], w) || segment(x, y, S * 0.41, S * 0.5, S * 0.59, S * 0.5, w * 0.8), color: navy });
  layers.push({ test: (x, y) => star(x, y, S * 0.72, S * 0.24, S * 0.09, S * 0.04), color: gold });
  layers.push({ test: (x, y) => star(x, y, S * 0.26, S * 0.27, S * 0.06, S * 0.026), color: gold });

  const out = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const x = px * SS + sx + 0.5, y = py * SS + sy + 0.5;
      let col = [0, 0, 0, 0];
      for (const L of layers) if (L.test(x, y)) col = L.color;
      r += col[0]; g += col[1]; b += col[2]; a += col[3];
    }
    const n = SS * SS, i = (py * size + px) * 4;
    out[i] = Math.round(r / n); out[i + 1] = Math.round(g / n); out[i + 2] = Math.round(b / n); out[i + 3] = Math.round(a / n);
  }
  return png(size, size, out);
}

const dir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(dir, { recursive: true });
[[512, 'icon-512.png'], [192, 'icon-192.png'], [180, 'apple-touch-icon.png']].forEach(([s, name]) => {
  const buf = makeIcon(s); fs.writeFileSync(path.join(dir, name), buf); console.log(name, buf.length, 'bytes');
});
