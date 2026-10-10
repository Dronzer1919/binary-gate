import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Accordion, AccordionItem } from './accordion';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Accordion, AccordionItem],
  template: `
    <app-accordion [multi]="multi">
      <app-accordion-item heading="One">First</app-accordion-item>
      <app-accordion-item heading="Two">Second</app-accordion-item>
      <app-accordion-item heading="Three" [disabled]="true">Third</app-accordion-item>
    </app-accordion>
  `,
})
class Host {
  multi = false;
}

describe('Accordion', () => {
  async function setup(multi = false) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.multi = multi;
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
    const panels = Array.from(el.querySelectorAll<HTMLElement>('[role=region]'));
    return { fixture, el, buttons, panels };
  }

  it('wires aria-expanded / aria-controls / region labelling', async () => {
    const { buttons, panels } = await setup();
    expect(buttons[0]!.getAttribute('aria-expanded')).toBe('false');
    expect(buttons[0]!.getAttribute('aria-controls')).toBe(panels[0]!.id);
    expect(panels[0]!.getAttribute('aria-labelledby')).toBe(buttons[0]!.id);
    expect(panels[0]!.hidden).toBe(true);
  });

  it('toggles on click', async () => {
    const { fixture, buttons, panels } = await setup();
    buttons[0]!.click();
    await fixture.whenStable();
    expect(buttons[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(panels[0]!.hidden).toBe(false);
    buttons[0]!.click();
    await fixture.whenStable();
    expect(panels[0]!.hidden).toBe(true);
  });

  it('keeps one panel open in single mode', async () => {
    const { fixture, buttons } = await setup(false);
    buttons[0]!.click();
    await fixture.whenStable();
    buttons[1]!.click();
    await fixture.whenStable();
    expect(buttons.map((b) => b.getAttribute('aria-expanded'))).toEqual(['false', 'true', 'false']);
  });

  it('allows several open panels in multi mode', async () => {
    const { fixture, buttons } = await setup(true);
    buttons[0]!.click();
    buttons[1]!.click();
    await fixture.whenStable();
    expect(buttons.map((b) => b.getAttribute('aria-expanded'))).toEqual(['true', 'true', 'false']);
  });

  it('moves focus with arrow keys, Home and End, skipping disabled headers', async () => {
    const { el, buttons } = await setup();
    const press = (key: string): void => {
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    };
    document.body.appendChild(el);
    buttons[0]!.focus();
    press('ArrowDown');
    expect(document.activeElement).toBe(buttons[1]);
    press('ArrowDown'); // wraps past the disabled third header
    expect(document.activeElement).toBe(buttons[0]);
    press('End');
    expect(document.activeElement).toBe(buttons[1]);
    press('Home');
    expect(document.activeElement).toBe(buttons[0]);
    press('ArrowUp');
    expect(document.activeElement).toBe(buttons[1]);
    el.remove();
  });
});
