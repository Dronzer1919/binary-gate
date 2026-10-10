import { circularWindow, LIST_SLOTS, SCENE_SLOTS, sceneSize } from './list-window';

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

describe('circularWindow', () => {
  it('centres the selection with two neighbours each side (size 5)', () => {
    const w = circularWindow(range(30), 9, LIST_SLOTS);
    expect(w.items).toEqual([8, 9, 10, 11, 12]);
    expect(w.firstRel).toBe(-2);
  });

  it('wraps past the start and the end', () => {
    expect(circularWindow(range(30), 0, 5).items).toEqual([29, 30, 1, 2, 3]);
    expect(circularWindow(range(30), 29, 5).items).toEqual([28, 29, 30, 1, 2]);
  });

  it('is always full and centred, at every position and for the 3D size too', () => {
    for (const size of [LIST_SLOTS, SCENE_SLOTS]) {
      for (const count of [6, 7, 8, 10, 30]) {
        if (count < size) {
          continue; // a short list gets a short window (see sceneSize)
        }
        for (let centre = 0; centre < count; centre += 1) {
          const w = circularWindow(range(count), centre, size);
          expect(w.items).toHaveLength(size);
          expect(w.items[-w.firstRel]).toBe(centre + 1);
          expect(new Set(w.items).size).toBe(size); // no product twice in one window
        }
      }
    }
  });

  it('keeps the 3D window centred on the selection for 6 and 7 products too (the 7-item filter)', () => {
    expect(circularWindow(range(7), 0, 7).items).toEqual([5, 6, 7, 1, 2, 3, 4]);
    expect(circularWindow(range(7), 6, 7).items).toEqual([4, 5, 6, 7, 1, 2, 3]);
    expect(circularWindow(range(6), 2, 6).items).toHaveLength(6);
    expect(circularWindow(range(6), 2, 6).items[3]).toBe(3);
  });

  it('returns everything in order when there are five products or fewer', () => {
    const w = circularWindow(range(5), 3, 5);
    expect(w.items).toEqual([1, 2, 3, 4, 5]);
    expect(w.firstRel).toBe(-2);
    expect(circularWindow(range(3), 0, 5).items).toEqual([1, 2, 3]);
  });
});

describe('sceneSize', () => {
  it('renders seven products when rotating, otherwise the five (or fewer)', () => {
    expect(sceneSize(30)).toBe(7);
    expect(sceneSize(10)).toBe(7);
    expect(sceneSize(7)).toBe(7);
    expect(sceneSize(6)).toBe(6);
    expect(sceneSize(5)).toBe(5);
    expect(sceneSize(3)).toBe(5);
  });
});
