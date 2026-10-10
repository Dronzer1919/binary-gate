/**
 * Geometry of the catalogue tracker: one parabola, left to right.
 *
 * The curve is the quadratic y = Y_END - 4 * RISE * t * (1 - t), x = X0 + (X1 - X0) * t, drawn in a
 * 1000 x 240 box. A quadratic Bezier with its control point at the horizontal middle IS a parabola, so
 * the SVG path below draws exactly the same curve the dots and the travelling marker are placed on.
 * Positions are arc-length based, so products are spaced evenly along the curve, not just along x.
 */
export const VIEW_W = 1000;
export const VIEW_H = 240;

const X0 = 30;
const X1 = 970;
const Y_END = 205;
const RISE = 160;
const SAMPLES = 480;

/** SVG path of the parabola (start, control point, end). */
export const CURVE_PATH = `M${X0} ${Y_END} Q${(X0 + X1) / 2} ${Y_END - 2 * RISE} ${X1} ${Y_END}`;

export interface CurvePoint {
  /** Percent of the stage width (0-100). */
  readonly x: number;
  /** Percent of the stage height (0-100). */
  readonly y: number;
}

interface Sample {
  readonly x: number;
  readonly y: number;
}

const samples: Sample[] = Array.from({ length: SAMPLES + 1 }, (_, i) => {
  const t = i / SAMPLES;
  return { x: X0 + (X1 - X0) * t, y: Y_END - 4 * RISE * t * (1 - t) };
});

/** Cumulative arc length at each sample. */
const cumulative: number[] = [];
{
  let total = 0;
  samples.forEach((sample, i) => {
    const prev = samples[i - 1];
    if (prev) {
      total += Math.hypot(sample.x - prev.x, sample.y - prev.y);
    }
    cumulative.push(total);
  });
}
const LENGTH = cumulative.at(-1) ?? 1;

/** Point at `fraction` (0 = left end, 1 = right end) of the curve's arc length. */
export function pointAtFraction(fraction: number): CurvePoint {
  const target = Math.min(Math.max(fraction, 0), 1) * LENGTH;
  let lo = 0;
  let hi = SAMPLES;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((cumulative[mid] ?? 0) < target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const a = samples[lo] ?? { x: X0, y: Y_END };
  const b = samples[hi] ?? a;
  const span = (cumulative[hi] ?? 0) - (cumulative[lo] ?? 0);
  const k = span > 0 ? (target - (cumulative[lo] ?? 0)) / span : 0;
  return {
    x: ((a.x + (b.x - a.x) * k) / VIEW_W) * 100,
    y: ((a.y + (b.y - a.y) * k) / VIEW_H) * 100,
  };
}

/** Evenly spaced (by arc length) positions for `count` items, left to right. */
export function dotFractions(count: number): number[] {
  if (count <= 1) {
    return [0.5];
  }
  return Array.from({ length: count }, (_, i) => i / (count - 1));
}
