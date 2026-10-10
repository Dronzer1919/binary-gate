import type { Color } from 'three';

/**
 * 3D colours per UI theme. The light theme uses the logo's purple and orange; every other theme
 * keeps the original blue palette. Materials and lights register through `tint`, so they follow
 * the `data-theme` attribute on <html> without the scenes knowing about the theme service.
 */
export const PALETTE = {
  accent: ['#5cc8ff', '#f58220'],
  accent2: ['#a899ff', '#9b51d0'],
  metal: ['#2b3c68', '#3d2468'],
  dark: ['#121a30', '#1a1030'],
  pDark: ['#1f3160', '#2d1a4d'],
  pMetal: ['#46609c', '#5b3a86'],
  gold: ['#d8b45c', '#f7a23b'],
  steel: ['#9fb0d4', '#b9a9d1'],
  paper: ['#e8eefc', '#f3ecf8'],
  screen: ['#12306b', '#2a1450'],
  glass: ['#7aa7ff', '#c9a2f0'],
} as const satisfies Record<string, readonly [string, string]>;

export type PaletteKey = keyof typeof PALETTE;

const targets = new Set<{ ref: WeakRef<Color>; key: PaletteKey }>();
const root = typeof document === 'undefined' ? null : document.documentElement;

function isLight(): boolean {
  return root?.getAttribute('data-theme') === 'light';
}

function paint(color: Color, key: PaletteKey): void {
  color.set(PALETTE[key][isLight() ? 1 : 0]);
}

/** Colours `obj` from the palette now and again whenever the theme changes. */
export function tint<T extends { color: Color }>(obj: T, key: PaletteKey): T {
  paint(obj.color, key);
  targets.add({ ref: new WeakRef(obj.color), key });
  return obj;
}

if (root && typeof MutationObserver !== 'undefined') {
  new MutationObserver(() => {
    for (const entry of targets) {
      const color = entry.ref.deref();
      if (color) {
        paint(color, entry.key);
      } else {
        targets.delete(entry);
      }
    }
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
}
