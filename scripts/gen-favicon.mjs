/**
 * Converts public/logo-icon.svg → public/favicon.png (32×32) and public/favicon.ico
 * Uses sharp (bundled with Next.js) — no extra installs needed.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'public', 'logo-icon.svg');
const outPng = path.join(root, 'public', 'favicon.png');
const outIco = path.join(root, 'public', 'favicon.ico');

const svgBuffer = fs.readFileSync(svgPath);

// Generate 32×32 PNG
const pngBuffer = await sharp(svgBuffer, { density: 300 })
  .resize(32, 32)
  .png()
  .toBuffer();

fs.writeFileSync(outPng, pngBuffer);
console.log(`favicon.png written (${pngBuffer.length} bytes)`);

// Wrap the PNG inside a minimal ICO container (PNG-in-ICO, supported everywhere)
const pngSize = pngBuffer.length;
const offset = 6 + 16; // ICO header (6) + 1 directory entry (16)
const buf = Buffer.alloc(offset + pngSize);

// ICO file header (6 bytes)
buf.writeUInt16LE(0, 0);   // reserved
buf.writeUInt16LE(1, 2);   // type: 1 = ICO
buf.writeUInt16LE(1, 4);   // number of images

// ICO directory entry (16 bytes at offset 6)
buf.writeUInt8(32, 6);     // width  (0 = 256, but 32 here)
buf.writeUInt8(32, 7);     // height
buf.writeUInt8(0, 8);      // color count (0 = true colour)
buf.writeUInt8(0, 9);      // reserved
buf.writeUInt16LE(1, 10);  // colour planes
buf.writeUInt16LE(32, 12); // bits per pixel
buf.writeUInt32LE(pngSize, 14); // size of PNG data
buf.writeUInt32LE(offset, 18);  // offset to PNG data

pngBuffer.copy(buf, offset);

fs.writeFileSync(outIco, buf);
console.log(`favicon.ico written (${buf.length} bytes)`);
