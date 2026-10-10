/** How many products the list view shows at once. */
export const LIST_SLOTS = 5;

/** The 3D row renders two extra products (one each side) so a slide never reveals an empty slot. */
export const SCENE_SLOTS = 7;

export interface ListWindow<T> {
  readonly items: readonly T[];
  /** Position of `items[0]` relative to the centre slot (e.g. -2: two slots left of centre). */
  readonly firstRel: number;
}

/**
 * `size` consecutive items with the item at `centre` in the middle, wrapping past either end.
 * With LIST_SLOTS (five) products or fewer there is nothing to rotate: all are returned in order,
 * and the first sits `floor(size / 2)` slots left of centre. Anything larger rotates, for every
 * `size`, so the 3D row always stays aligned with the five labels drawn over it.
 */
export function circularWindow<T>(all: readonly T[], centre: number, size: number): ListWindow<T> {
  const count = all.length;
  const half = Math.floor(size / 2);
  if (count <= LIST_SLOTS) {
    return { items: [...all], firstRel: -half };
  }
  // The list is repeated three times so the window can wrap in both directions: the centre sits in
  // the middle copy, which always leaves `half` items available before and after it.
  const start = count + centre - half;
  return { items: [...all, ...all, ...all].slice(start, start + size), firstRel: -half };
}

/** Size of the 3D window for `count` products: seven when rotating, otherwise just the five (or fewer). */
export function sceneSize(count: number): number {
  return count > LIST_SLOTS ? Math.min(SCENE_SLOTS, count) : LIST_SLOTS;
}
