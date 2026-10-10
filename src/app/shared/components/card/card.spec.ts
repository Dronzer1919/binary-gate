import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Card } from './card';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card],
  template: `
    <app-card heading="Title" [headingLevel]="3">
      <img cardMedia alt="" src="data:," />
      Body text
      <a cardFooter href="#x">More</a>
    </app-card>
    <app-card>No heading</app-card>
  `,
})
class Host {}

describe('Card', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('names the article with its heading at the requested level', async () => {
    const el = await setup();
    const [first] = Array.from(el.querySelectorAll('article'));
    const heading = first!.querySelector('[role=heading]')!;
    expect(heading.getAttribute('aria-level')).toBe('3');
    expect(first!.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.textContent).toContain('Title');
  });

  it('projects media, body and footer slots', async () => {
    const el = await setup();
    const [first] = Array.from(el.querySelectorAll('article'));
    expect(first!.querySelector('img')).not.toBeNull();
    expect(first!.querySelector('.body')!.textContent).toContain('Body text');
    expect(first!.querySelector('.footer a')).not.toBeNull();
  });

  it('omits the heading and aria-labelledby when no heading is given', async () => {
    const el = await setup();
    const second = el.querySelectorAll('article')[1]!;
    expect(second.querySelector('[role=heading]')).toBeNull();
    expect(second.hasAttribute('aria-labelledby')).toBe(false);
  });
});
