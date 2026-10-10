import { CURVE_PATH, dotFractions, pointAtFraction } from './parabola';

describe('parabola geometry', () => {
  it('draws one quadratic (a parabola) from the left end to the right end', () => {
    expect(CURVE_PATH).toMatch(/^M30 205 Q500 -115 970 205$/);
  });

  it('starts at the left, ends at the right, and peaks in the middle', () => {
    const start = pointAtFraction(0);
    const middle = pointAtFraction(0.5);
    const end = pointAtFraction(1);
    expect(start.x).toBeCloseTo(3, 1);
    expect(end.x).toBeCloseTo(97, 1);
    expect(middle.x).toBeCloseTo(50, 1);
    // y grows downwards: the apex has the smallest y, both ends sit lower and level with each other.
    expect(middle.y).toBeLessThan(start.y);
    expect(start.y).toBeCloseTo(end.y, 5);
    expect(middle.y).toBeCloseTo(18.75, 1);
  });

  it('moves strictly left to right and is symmetric about the middle', () => {
    let previous = -1;
    for (let i = 0; i <= 40; i += 1) {
      const p = pointAtFraction(i / 40);
      expect(p.x).toBeGreaterThan(previous);
      previous = p.x;
      const mirror = pointAtFraction(1 - i / 40);
      expect(p.y).toBeCloseTo(mirror.y, 1);
      expect(p.x + mirror.x).toBeCloseTo(100, 0);
    }
  });

  it('clamps out-of-range fractions', () => {
    expect(pointAtFraction(-1)).toEqual(pointAtFraction(0));
    expect(pointAtFraction(2)).toEqual(pointAtFraction(1));
  });

  it('spaces N items evenly along the curve, left to right', () => {
    const f = dotFractions(30);
    expect(f).toHaveLength(30);
    expect(f[0]).toBe(0);
    expect(f[29]).toBe(1);
    const gaps = f.slice(1).map((v, i) => v - f[i]!);
    gaps.forEach((g) => {
      expect(g).toBeCloseTo(1 / 29, 10);
    });
    expect(dotFractions(1)).toEqual([0.5]);
  });
});
