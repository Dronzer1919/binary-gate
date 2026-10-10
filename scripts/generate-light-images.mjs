// Recolours the dark illustrations in public/assets/img into light-theme variants
// (<name>-light-<w>.png|webp|avif): pale lavender ground, logo purple and orange linework.
// Usage: node scripts/generate-light-images.mjs   (re-run after the dark artwork changes)
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'img');
const NAMES = ['about', 'hardware', 'network', 'peripherals', 'software', 'hero-poster'];
const WIDTHS = [400, 800];

const PURPLE = [106, 44, 145];
const ORANGE = [245, 130, 32];
const GROUND = [233, 225, 243];
const PANEL = [255, 255, 255];

const clamp = (x) => Math.min(1, Math.max(0, x));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function hueOf(r, g, b, max, min) {
  const d = max - min;
  if (d === 0) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

function recolour(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const surface = mix(GROUND, PANEL, clamp((max - 0.06) / 0.35));
  const ink = hueOf(r / 255, g / 255, b / 255, max, min) >= 238 ? ORANGE : PURPLE;
  return mix(surface, ink, clamp((max - 0.45) / 0.4));
}

for (const name of NAMES) {
  for (const w of WIDTHS) {
    const { data, info } = await sharp(join(dir, `${name}-${w}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i += 3) {
      const [r, g, b] = recolour(data[i], data[i + 1], data[i + 2]);
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
    }
    const img = () => sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } });
    const base = join(dir, `${name}-light-${w}`);
    await Promise.all([
      img().png({ compressionLevel: 9 }).toFile(`${base}.png`),
      img().webp({ quality: 80 }).toFile(`${base}.webp`),
      img().avif({ quality: 55 }).toFile(`${base}.avif`),
    ]);
    console.log(`${name}-light-${w}`);
  }
}
