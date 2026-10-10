import { Box3, Vector3 } from 'three';

import { PRODUCTS } from '../../features/catalog/catalog-data';
import { buildProductModel, PRODUCT_IDS } from './product-models';

describe('product models', () => {
  it('has exactly one model per catalogue product (30)', () => {
    expect(PRODUCT_IDS).toHaveLength(30);
    expect(PRODUCTS.map((p) => p.id).sort()).toEqual([...PRODUCT_IDS].sort());
    expect(PRODUCTS.map((p) => p.no)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it.each([...PRODUCT_IDS])('%s builds a finite, normalised model that animates', (id) => {
    const model = buildProductModel(id);
    model.group.updateMatrixWorld(true);

    const size = new Box3().setFromObject(model.group).getSize(new Vector3());
    expect(Number.isFinite(size.x + size.y + size.z)).toBe(true);
    // Auto-scaled so every product frames at a similar size (~3.7 units on its longest side;
    // the 0.35 rad tilt can add a little).
    const longest = Math.max(size.x, size.y, size.z);
    expect(longest).toBeGreaterThan(2.5);
    expect(longest).toBeLessThan(5);

    expect(() => {
      model.update(0);
      model.update(1.7);
    }).not.toThrow();
  });
});
