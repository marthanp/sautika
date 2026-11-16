/**
 * Builds the PWA icons from public/Logo_symbol.png.
 *
 *   node scripts/generate-icons.mjs
 *
 * The source logo is ~1.2 MB, far too heavy to ship as an app icon on a
 * low-data connection. This writes small 192 and 512 icons plus a maskable
 * 512 with the mark at 80% on the navy brand background.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'public', 'Logo_symbol.png');
const outDir = join(root, 'public', 'icons');

const NAVY = { r: 0x00, g: 0x17, b: 0x31, alpha: 1 };

/** Trims the transparent margin so the mark fills the icon predictably. */
async function trimmedMark() {
  return sharp(source).trim({ threshold: 10 }).toBuffer();
}

async function plain(mark, size) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .composite([
      {
        input: await sharp(mark)
          .resize(Math.round(size * 0.86), Math.round(size * 0.86), {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toBuffer(),
        gravity: 'centre',
      },
    ])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

/** Maskable icons get cropped to a circle by the OS, so keep the mark at 80%. */
async function maskable(mark, size) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .composite([
      {
        input: await sharp(mark)
          .resize(Math.round(size * 0.8), Math.round(size * 0.8), {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toBuffer(),
        gravity: 'centre',
      },
    ])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

const mark = await trimmedMark();
await mkdir(outDir, { recursive: true });

const files = [
  ['icon-192.png', await plain(mark, 192)],
  ['icon-512.png', await plain(mark, 512)],
  ['maskable-512.png', await maskable(mark, 512)],
];

for (const [name, buffer] of files) {
  await writeFile(join(outDir, name), buffer);
  console.log(`${name.padEnd(18)} ${(buffer.length / 1024).toFixed(1)} kB`);
}
