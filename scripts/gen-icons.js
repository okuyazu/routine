#!/usr/bin/env node
// Generates PNG app icons (no external deps — raw pixels + zlib).
// Renders a rounded-square gradient tile with a white checkmark.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function lerp(a, b, t) { return a + (b - a) * t; }

// Draw the icon into an RGBA buffer of size s.
function render(s) {
  const buf = Buffer.alloc(s * s * 4);
  const radius = s * 0.22;            // corner radius
  const g1 = [124, 58, 237];         // violet-600
  const g2 = [37, 99, 235];          // blue-600

  // rounded-rect coverage helper
  function inside(x, y) {
    const rx = Math.min(x, s - 1 - x);
    const ry = Math.min(y, s - 1 - y);
    if (rx >= radius || ry >= radius) return true;
    const dx = radius - rx, dy = radius - ry;
    return dx * dx + dy * dy <= radius * radius;
  }

  // checkmark geometry (two segments)
  const p1 = [s * 0.28, s * 0.52];
  const p2 = [s * 0.44, s * 0.68];
  const p3 = [s * 0.74, s * 0.34];
  const stroke = s * 0.085;

  function distToSeg(px, py, a, b) {
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const wx = px - a[0], wy = py - a[1];
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(px - a[0], py - a[1]);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(px - b[0], py - b[1]);
    const t = c1 / c2;
    return Math.hypot(px - (a[0] + t * vx), py - (a[1] + t * vy));
  }

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      if (!inside(x, y)) { buf[i + 3] = 0; continue; }
      const t = (x + y) / (2 * s);
      let r = lerp(g1[0], g2[0], t);
      let g = lerp(g1[1], g2[1], t);
      let b = lerp(g1[2], g2[2], t);
      const d = Math.min(distToSeg(x, y, p1, p2), distToSeg(x, y, p2, p3));
      const edge = stroke - d;
      if (edge > 0) {
        const a = Math.max(0, Math.min(1, edge)); // simple AA
        r = lerp(r, 255, a); g = lerp(g, 255, a); b = lerp(b, 255, a);
      }
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
  return buf;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function png(s, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(s, 0); ihdr.writeUInt32BE(s, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const raw = Buffer.alloc(s * (s * 4 + 1));
  for (let y = 0; y < s; y++) {
    raw[y * (s * 4 + 1)] = 0;
    rgba.copy(raw, y * (s * 4 + 1) + 1, y * s * 4, (y + 1) * s * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, '..', 'icons');
for (const s of [192, 512]) {
  fs.writeFileSync(path.join(outDir, `icon-${s}.png`), png(s, render(s)));
  console.log(`wrote icons/icon-${s}.png`);
}
// maskable variants share the same art (safe padding built in)
fs.copyFileSync(path.join(outDir, 'icon-512.png'), path.join(outDir, 'maskable-512.png'));
console.log('wrote icons/maskable-512.png');
