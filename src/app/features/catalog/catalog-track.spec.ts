import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import { CatalogTrack } from './catalog-track';
import type { TrackItem, TrackView } from './catalog-track';

const ITEMS: readonly TrackItem[] = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i + 1}`,
  label: String(i + 1).padStart(2, '0'),
  name: `Item ${i + 1}`,
  title: `Item number ${i + 1}`,
}));

describe('CatalogTrack', () => {
  async function create(view: TrackView, selectedId = 'p3'): Promise<ComponentFixture<CatalogTrack>> {
    const fixture = TestBed.createComponent(CatalogTrack);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.componentRef.setInput('selectedId', selectedId);
    fixture.componentRef.setInput('view', view);
    await fixture.whenStable();
    return fixture;
  }

  const root = (f: ComponentFixture<CatalogTrack>): HTMLElement => f.nativeElement as HTMLElement;

  it('curve: puts every item on the parabola, marks progress, and labels the marker', async () => {
    const fixture = await create('curve');
    const el = root(fixture);
    const dots = Array.from(el.querySelectorAll<HTMLElement>('.dot'));
    expect(dots).toHaveLength(6);
    expect(el.querySelector('path.trail')!.getAttribute('d')).toBe('M30 205 Q500 -115 970 205');
    expect(el.querySelectorAll('.dot.on')).toHaveLength(1);
    expect(dots[2]!.classList.contains('on')).toBe(true);
    expect(dots.filter((d) => d.classList.contains('passed'))).toHaveLength(2); // items before the current one
    // dots run left to right
    const lefts = dots.map((d) => parseFloat(d.style.left));
    expect(lefts).toEqual([...lefts].sort((a, b) => a - b));
    expect(el.querySelector('.ball .tip')!.textContent).toContain('03 · Item 3');
  });

  it('is decorative: hidden from assistive tech, buttons skipped by Tab but named', async () => {
    const fixture = await create('curve');
    const el = root(fixture);
    expect(el.querySelector('.stage')!.getAttribute('aria-hidden')).toBe('true');
    el.querySelectorAll('.dot').forEach((dot) => {
      expect(dot.getAttribute('tabindex')).toBe('-1');
      expect(dot.getAttribute('aria-label')).toMatch(/^Item number \d$/);
    });
  });

  it('emits the clicked product', async () => {
    const fixture = await create('curve');
    const picked: string[] = [];
    fixture.componentInstance.picked.subscribe((id) => picked.push(id));
    root(fixture).querySelectorAll<HTMLButtonElement>('.dot')[4]!.click();
    expect(picked).toEqual(['p5']);
  });

  it('moves the marker to the new product when the selection advances', async () => {
    const fixture = await create('curve', 'p1');
    const el = root(fixture);
    const before = parseFloat(el.querySelector<HTMLElement>('.ball')!.style.left);
    fixture.componentRef.setInput('selectedId', 'p2');
    await fixture.whenStable();
    const after = parseFloat(el.querySelector<HTMLElement>('.ball')!.style.left);
    expect(after).toBeGreaterThan(before);
    expect(el.querySelector('.ball .tip')!.textContent).toContain('02 · Item 2');
  });

  it('keeps the label inside the box at both ends of the arc', async () => {
    const first = await create('curve', 'p1');
    expect(root(first).querySelector('.ball')!.classList.contains('at-start')).toBe(true);
    const last = await create('curve', 'p6');
    expect(root(last).querySelector('.ball')!.classList.contains('at-end')).toBe(true);
  });

  describe('list view', () => {
    const ids = (el: HTMLElement): string[] =>
      Array.from(el.querySelectorAll<HTMLElement>('.chip')).map((c) => c.querySelector('.num')!.textContent);

    it('is the default view and shows exactly five products in a row', async () => {
      const fixture = TestBed.createComponent(CatalogTrack);
      fixture.componentRef.setInput('items', ITEMS);
      fixture.componentRef.setInput('selectedId', 'p3');
      await fixture.whenStable();
      const el = root(fixture);
      expect(el.querySelector('.stage')).toBeNull();
      expect(el.querySelectorAll('.chip')).toHaveLength(5);
      expect(el.querySelector('.strip')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('keeps the selected product in the centre slot, with two neighbours each side', async () => {
      const fixture = await create('list', 'p3');
      expect(ids(root(fixture))).toEqual(['01', '02', '03', '04', '05']);
      const chips = Array.from(root(fixture).querySelectorAll<HTMLElement>('.chip'));
      expect(chips.filter((c) => c.classList.contains('on'))).toHaveLength(1);
      expect(chips[2]!.classList.contains('on')).toBe(true);
      expect(chips[2]!.textContent).toContain('03');
      expect(chips[2]!.textContent).toContain('Item 3');
    });

    it('advances the window by one when the selection advances (the next product enters the centre)', async () => {
      const fixture = await create('list', 'p3');
      fixture.componentRef.setInput('selectedId', 'p4');
      await fixture.whenStable();
      expect(ids(root(fixture))).toEqual(['02', '03', '04', '05', '06']);
      expect(root(fixture).querySelectorAll('.chip')[2]!.textContent).toContain('04');
    });

    it('wraps around at both ends, always showing five', async () => {
      const first = await create('list', 'p1');
      expect(ids(root(first))).toEqual(['05', '06', '01', '02', '03']);
      const last = await create('list', 'p6');
      expect(ids(root(last))).toEqual(['04', '05', '06', '01', '02']);
    });

    it('always shows five with the selection centred, at every position of a 30-item list', async () => {
      const many: TrackItem[] = Array.from({ length: 30 }, (_, i) => ({
        id: `m${i + 1}`,
        label: String(i + 1).padStart(2, '0'),
        name: `M${i + 1}`,
        title: `Model ${i + 1}`,
      }));
      const fixture = TestBed.createComponent(CatalogTrack);
      fixture.componentRef.setInput('items', many);
      for (let i = 0; i < 30; i += 1) {
        fixture.componentRef.setInput('selectedId', `m${i + 1}`);
        await fixture.whenStable();
        const labels = ids(root(fixture));
        expect(labels).toHaveLength(5);
        expect(labels.map(Number)).toEqual([-2, -1, 0, 1, 2].map((d) => ((i + d + 30) % 30) + 1));
        expect(root(fixture).querySelectorAll('.chip')[2]!.classList.contains('on')).toBe(true);
      }
    });

    it('shows all items in order when there are five or fewer (no rotation)', async () => {
      const fixture = TestBed.createComponent(CatalogTrack);
      fixture.componentRef.setInput('items', ITEMS.slice(0, 5));
      fixture.componentRef.setInput('selectedId', 'p2');
      await fixture.whenStable();
      expect(ids(root(fixture))).toEqual(['01', '02', '03', '04', '05']);
      expect(root(fixture).querySelectorAll('.chip.on')).toHaveLength(1);
      expect(root(fixture).querySelectorAll('.chip')[1]!.classList.contains('on')).toBe(true);
    });

    it('emits the clicked product', async () => {
      const fixture = await create('list', 'p3');
      const picked: string[] = [];
      fixture.componentInstance.picked.subscribe((id) => picked.push(id));
      root(fixture).querySelectorAll<HTMLButtonElement>('.chip')[4]!.click();
      expect(picked).toEqual(['p5']);
    });

    it('slides the row (Web Animations) when the selection advances by one', async () => {
      const calls: { keyframes: Keyframe[] }[] = [];
      vi.stubGlobal('matchMedia', () => ({ matches: false }));
      const original = Element.prototype.animate;
      Element.prototype.animate = function (keyframes) {
        calls.push({ keyframes: keyframes as Keyframe[] });
        return { cancel: () => undefined } as unknown as Animation;
      };
      try {
        const fixture = await create('list', 'p3');
        calls.length = 0;
        fixture.componentRef.setInput('selectedId', 'p4');
        await fixture.whenStable();
        expect(calls).toHaveLength(1);
        // one slot of five, entering from the right
        expect(calls[0]!.keyframes[0]!['transform']).toBe('translateX(20%)');
        expect(calls[0]!.keyframes[1]!['transform']).toBe('translateX(0)');
      } finally {
        Element.prototype.animate = original;
        vi.unstubAllGlobals();
      }
    });
  });

  it('copes with a single item', async () => {
    const fixture = TestBed.createComponent(CatalogTrack);
    fixture.componentRef.setInput('items', [ITEMS[0]]);
    fixture.componentRef.setInput('selectedId', 'p1');
    fixture.componentRef.setInput('view', 'curve');
    await fixture.whenStable();
    expect(root(fixture).querySelectorAll('.dot')).toHaveLength(1);
    expect(parseFloat(root(fixture).querySelector<HTMLElement>('.ball')!.style.left)).toBeCloseTo(50, 0);
  });
});
