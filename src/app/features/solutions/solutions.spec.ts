import { TestBed } from '@angular/core/testing';

import { Solutions } from './solutions';

describe('Solutions', () => {
  it('opens one item at a time and updates the 3D caption', async () => {
    const fixture = TestBed.createComponent(Solutions);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button[aria-expanded]'));
    expect(buttons).toHaveLength(4);
    expect(buttons.map((b) => b.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false', 'false']);
    expect(el.querySelector('figcaption')!.textContent).toContain('processor');

    buttons[1]!.click();
    await fixture.whenStable();
    expect(buttons.map((b) => b.getAttribute('aria-expanded'))).toEqual(['false', 'true', 'false', 'false']);
    expect(el.querySelector('figcaption')!.textContent).toContain('switch');
    expect(el.querySelector('figcaption')!.getAttribute('aria-live')).toBe('polite');
  });

  it('exposes the viewer as a keyboard-focusable, labelled group', async () => {
    const fixture = TestBed.createComponent(Solutions);
    await fixture.whenStable();
    const frame = (fixture.nativeElement as HTMLElement).querySelector('.frame')!;
    expect(frame.getAttribute('tabindex')).toBe('0');
    expect(frame.getAttribute('aria-label')).toContain('arrow keys');
    expect(frame.querySelector('canvas')!.getAttribute('aria-hidden')).toBe('true');
  });
});
