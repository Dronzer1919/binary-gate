import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Reveal } from './reveal';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Reveal],
  template: `<p [appReveal]="120">Hello</p>`,
})
class Host {}

describe('Reveal', () => {
  let trigger: (isIntersecting: boolean) => void = () => undefined;

  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          trigger = (isIntersecting) => {
            cb([{ isIntersecting }]);
          };
        }
        observe(): void {
          /* test double */
        }
        disconnect(): void {
          /* test double */
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('arms in the browser, then reveals on intersection', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const p = (fixture.nativeElement as HTMLElement).querySelector('p')!;
    expect(p.classList.contains('reveal')).toBe(true);
    expect(p.classList.contains('reveal--in')).toBe(false);
    expect(p.style.transitionDelay).toBe('120ms');

    trigger(true);
    await fixture.whenStable();
    expect(p.classList.contains('reveal--in')).toBe(true);
  });

  it('never hides content for reduced-motion users', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('p')!.classList.contains('reveal')).toBe(false);
  });
});
