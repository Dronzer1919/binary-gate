import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ComponentFixture } from '@angular/core/testing';

import { GROUPS, PRODUCTS } from './catalog-data';
import { Catalog } from './catalog';

describe('Catalog', () => {
  async function setup(): Promise<{ fixture: ComponentFixture<Catalog>; el: HTMLElement }> {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Catalog);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const itemButtons = (el: HTMLElement): HTMLButtonElement[] =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('.item'));

  it('lists all 30 products in four labelled groups with function and interface in the HTML', async () => {
    const { el } = await setup();
    expect(itemButtons(el)).toHaveLength(30);
    expect(el.querySelectorAll('section.group')).toHaveLength(4);
    const first = PRODUCTS[0];
    expect(el.textContent).toContain(first.function);
    expect(el.textContent).toContain(first.interface);
    const headings = Array.from(el.querySelectorAll('.group-title')).map((h) => h.textContent);
    GROUPS.forEach((g, i) => {
      expect(headings[i]).toContain(g.title);
    });
    el.querySelectorAll('section.group').forEach((s) => {
      expect(document.getElementById(s.getAttribute('aria-labelledby')!) ?? el.querySelector(`#${s.getAttribute('aria-labelledby')}`)).not.toBeNull();
    });
  });

  it('selects a product on click and reflects it in the detail panel (aria-pressed)', async () => {
    const { fixture, el } = await setup();
    const buttons = itemButtons(el);
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('true');

    buttons[19]!.click(); // 20 Network Switch
    await fixture.whenStable();
    expect(buttons.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(buttons[19]!.getAttribute('aria-pressed')).toBe('true');
    const info = el.querySelector('.info')!;
    expect(info.textContent).toContain('Network Switch');
    expect(info.textContent).toContain('Active Networking');
    // Auto-play is on by default, so rotations are not announced; pausing switches announcements on.
    expect(info.getAttribute('aria-live')).toBe('off');
    el.querySelectorAll<HTMLButtonElement>('.step')[1]!.click();
    await fixture.whenStable();
    expect(info.getAttribute('aria-live')).toBe('polite');
  });

  it('filters by category and keeps the selection visible', async () => {
    const { fixture, el } = await setup();
    const chips = Array.from(el.querySelectorAll<HTMLButtonElement>('.filters .chip'));
    expect(chips).toHaveLength(5);
    expect(chips[0]!.getAttribute('aria-pressed')).toBe('true');

    chips[3]!.click(); // Active Networking
    await fixture.whenStable();
    expect(chips[3]!.getAttribute('aria-pressed')).toBe('true');
    expect(itemButtons(el)).toHaveLength(7);
    expect(el.querySelectorAll('section.group')).toHaveLength(1);
    // CPU (previously selected) is no longer visible, so the first visible product is selected.
    expect(el.querySelector('.info h2')!.textContent).toContain('NIC');

    chips[0]!.click();
    await fixture.whenStable();
    expect(itemButtons(el)).toHaveLength(30);
  });

  it('shows a "now showing" label and a List/Curve toggle above the heading, and the tracker under the filters', async () => {
    const { fixture, el } = await setup();
    expect(el.querySelector('.top .now')!.textContent).toContain('01 CPU');
    const [list, curve] = Array.from(el.querySelectorAll<HTMLButtonElement>('.view .seg'));
    expect(list!.textContent).toContain('List');
    // List is the default: five products in a row, not the curve.
    expect(list!.getAttribute('aria-pressed')).toBe('true');
    expect(curve!.getAttribute('aria-pressed')).toBe('false');
    expect(el.querySelector('.filters + app-catalog-track .strip')).not.toBeNull();
    expect(el.querySelector('app-catalog-track .stage')).toBeNull();
    expect(el.querySelectorAll('app-catalog-track .chip')).toHaveLength(5);

    curve!.click();
    await fixture.whenStable();
    expect(curve!.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('app-catalog-track .strip')).toBeNull();
    expect(el.querySelectorAll('app-catalog-track .dot')).toHaveLength(30);

    list!.click();
    await fixture.whenStable();
    // The tracker follows selection and filters.
    el.querySelectorAll<HTMLButtonElement>('.item')[6]!.click(); // 07 PSU
    await fixture.whenStable();
    expect(el.querySelector('.now')!.textContent).toContain('07 PSU');
    expect(el.querySelectorAll('app-catalog-track .chip')[2]!.textContent).toContain('PSU');
    el.querySelectorAll<HTMLButtonElement>('.filters .chip')[3]!.click(); // Active Networking filter
    await fixture.whenStable();
    expect(el.querySelectorAll('app-catalog-track .chip')).toHaveLength(5);
  });

  it('lets the tracker pick a product (mouse/touch shortcut)', async () => {
    const { fixture, el } = await setup();
    el.querySelectorAll<HTMLButtonElement>('app-catalog-track .chip')[3]!.click(); // the slot after the centre
    await fixture.whenStable();
    expect(el.querySelector('.info h2')!.textContent).toContain('Motherboard');
  });

  it('steps through products with previous/next and wraps around', async () => {
    const { fixture, el } = await setup();
    const [prev, , next] = Array.from(el.querySelectorAll<HTMLButtonElement>('.step')); // prev, play/pause, next
    prev!.click();
    await fixture.whenStable();
    expect(el.querySelector('.info h2')!.textContent).toContain('Server Rack');
    next!.click();
    await fixture.whenStable();
    expect(el.querySelector('.info h2')!.textContent).toContain('CPU');
  });

  it('renders as a labelled home-page section (h2 + anchor) when embedded, and as an h1 page otherwise', async () => {
    const page = await setup();
    expect(page.el.querySelector('h1')).not.toBeNull();
    expect(page.el.querySelector('section')!.hasAttribute('id')).toBe(false);
    expect(page.el.querySelector('a[href="/catalog"]')).toBeNull();

    const embedded = TestBed.createComponent(Catalog);
    embedded.componentRef.setInput('embedded', true);
    await embedded.whenStable();
    const el = embedded.nativeElement as HTMLElement;
    const section = el.querySelector('section')!;
    expect(section.id).toBe('catalogue');
    expect(section.getAttribute('aria-labelledby')).toBe('catalogue-title');
    expect(el.querySelector('h1')).toBeNull();
    expect(el.querySelector('h2#catalogue-title')!.textContent).toContain('30 products');
    expect(el.querySelector('a[href="/catalog"]')).not.toBeNull();
    expect(el.querySelectorAll('.item')).toHaveLength(30);
  });

  it('hosts a labelled, keyboard-focusable 3D viewer', async () => {
    const { el } = await setup();
    const frame = el.querySelector('app-model-viewer .frame')!;
    expect(frame.getAttribute('tabindex')).toBe('0');
    expect(frame.getAttribute('aria-label')).toContain('3D model of CPU');
    expect(frame.getAttribute('aria-label')).toContain('arrow keys');
  });
});

describe('Catalog auto-play (carousel)', () => {
  let visible = true;

  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn(); // jsdom does not implement it
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: !query.includes('prefers-reduced-motion') && false }));
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          queueMicrotask(() => {
            cb([{ isIntersecting: visible }]);
          });
        }
        observe(): void {
          /* test double */
        }
        disconnect(): void {
          /* test double */
        }
      },
    );
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    visible = true;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function start(): Promise<{ fixture: ComponentFixture<Catalog>; el: HTMLElement }> {
    const fixture = TestBed.createComponent(Catalog);
    fixture.detectChanges(); // first render + afterNextRender (starts the timer, arms the observer)
    await vi.advanceTimersByTimeAsync(0); // let the IntersectionObserver double report visibility
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const title = (el: HTMLElement): string => el.querySelector('.info h2')!.textContent;

  it('advances to the next product every 3 seconds', async () => {
    const { fixture, el } = await start();
    expect(title(el)).toContain('CPU');
    await vi.advanceTimersByTimeAsync(3000);
    fixture.detectChanges();
    expect(title(el)).toContain('Motherboard');
    await vi.advanceTimersByTimeAsync(3000);
    fixture.detectChanges();
    expect(title(el)).toContain('RAM');
  });

  it('does not announce rotations to screen readers while playing, and does once paused', async () => {
    const { fixture, el } = await start();
    const info = el.querySelector('.info')!;
    expect(info.getAttribute('aria-live')).toBe('off');
    el.querySelectorAll<HTMLButtonElement>('.step')[1]!.click();
    fixture.detectChanges();
    expect(info.getAttribute('aria-live')).toBe('polite');
  });

  it('pauses with the Pause button, and resumes with Play', async () => {
    const { fixture, el } = await start();
    const toggle = el.querySelectorAll<HTMLButtonElement>('.step')[1]!;
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.textContent).toContain('Pause auto-play');

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    const before = title(el);
    await vi.advanceTimersByTimeAsync(9000);
    fixture.detectChanges();
    expect(title(el)).toBe(before);

    toggle.click();
    fixture.detectChanges();
    expect(toggle.textContent).toContain('Pause auto-play');
    await vi.advanceTimersByTimeAsync(3000);
    fixture.detectChanges();
    expect(title(el)).not.toBe(before);
  });

  it('restarts the 3 s countdown after a manual pick, then keeps going', async () => {
    const { fixture, el } = await start();
    await vi.advanceTimersByTimeAsync(2000);
    el.querySelectorAll<HTMLButtonElement>('.item')[9]!.click(); // Audio Interface
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(2500); // 4.5 s since start, but only 2.5 s since the pick
    fixture.detectChanges();
    expect(title(el)).toContain('Audio Interface');
    await vi.advanceTimersByTimeAsync(750);
    fixture.detectChanges();
    expect(title(el)).toContain('Keyboard');
    expect(el.querySelectorAll<HTMLButtonElement>('.step')[1]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps rotating while the pointer is over the catalogue or focus is inside it', async () => {
    const { fixture, el } = await start();
    el.dispatchEvent(new Event('pointerenter'));
    el.querySelector<HTMLButtonElement>('.chip')!.focus();
    await vi.advanceTimersByTimeAsync(3000);
    fixture.detectChanges();
    expect(title(el)).toContain('Motherboard');
  });

  it('does not advance while the viewer is off screen', async () => {
    visible = false;
    const { fixture, el } = await start();
    await vi.advanceTimersByTimeAsync(9000);
    fixture.detectChanges();
    expect(title(el)).toContain('CPU');
  });

  it('still auto-plays for reduced-motion visitors, who can stop it with Pause', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') }));
    const { fixture, el } = await start();
    await vi.advanceTimersByTimeAsync(3000);
    fixture.detectChanges();
    expect(title(el)).toContain('Motherboard');
    el.querySelectorAll<HTMLButtonElement>('.step')[1]!.click();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(9000);
    fixture.detectChanges();
    expect(title(el)).toContain('Motherboard');
  });
});
