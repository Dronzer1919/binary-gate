// Generates responsive AVIF / WebP / PNG renditions of the hero artwork.
// Usage: npm run images   (re-run after editing the SVG below or adding sources)
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images');
const WIDTHS = [480, 960, 1440];
const RATIO = 9 / 16;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e3a8a"/>
      <stop offset="1" stop-color="#0ea5e9"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#g)"/>
  <g fill="#fff" fill-opacity=".12"><circle cx="1280" cy="200" r="260"/><circle cx="300" cy="760" r="320"/></g>
  <g fill="#fff">
    <rect x="360" y="230" width="880" height="440" rx="28" fill-opacity=".95"/>
    <rect x="410" y="285" width="300" height="34" rx="12" fill="#1d4ed8"/>
    <rect x="410" y="350" width="780" height="20" rx="10" fill="#cbd5e1"/>
    <rect x="410" y="394" width="640" height="20" rx="10" fill="#cbd5e1"/>
    <rect x="410" y="470" width="220" height="150" rx="16" fill="#e0ecff"/>
    <rect x="660" y="470" width="220" height="150" rx="16" fill="#e0ecff"/>
    <rect x="910" y="470" width="280" height="150" rx="16" fill="#e0ecff"/>
  </g>
</svg>`;

await mkdir(outDir, { recursive: true });

for (const width of WIDTHS) {
  const height = Math.round(width * RATIO);
  const base = () => sharp(Buffer.from(svg)).resize(width, height);
  await Promise.all([
    base().avif({ quality: 50, effort: 6 }).toFile(join(outDir, `hero-${width}.avif`)),
    base().webp({ quality: 75, effort: 6 }).toFile(join(outDir, `hero-${width}.webp`)),
    base().png({ palette: true, quality: 70, compressionLevel: 9 }).toFile(join(outDir, `hero-${width}.png`)),
  ]);
  console.log(`hero-${width}: avif, webp, png`);
}
