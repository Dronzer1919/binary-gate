import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import { DEFAULT_SITE_CONFIG, SITE_CONFIG } from '../../core/config/app-config';
import { Contact } from './contact';

describe('Contact', () => {
  async function setup(): Promise<{ fixture: ComponentFixture<Contact>; el: HTMLElement }> {
    TestBed.configureTestingModule({ providers: [{ provide: SITE_CONFIG, useValue: DEFAULT_SITE_CONFIG }] });
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('labels every field and the radio group', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('label').length).toBeGreaterThanOrEqual(4);
    expect(el.querySelector('[role=radiogroup]')!.getAttribute('aria-labelledby')).toBeTruthy();
    expect(el.querySelectorAll('input[type=radio]')).toHaveLength(5);
  });

  it('blocks an empty submit, shows errors and focuses the first invalid field', async () => {
    const { fixture, el } = await setup();
    document.body.appendChild(el);
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();

    const errors = Array.from(el.querySelectorAll('[aria-live="polite"]'))
      .map((e) => e.textContent.trim())
      .filter(Boolean);
    expect(errors).toHaveLength(4); // name, email, topic, message (phone is optional)
    const firstInvalid = el.querySelector('input[aria-invalid="true"]')!;
    expect(el.querySelector('[role=status]')!.textContent).toContain('fix the highlighted fields');
    await fixture.whenStable();
    expect(document.activeElement!.id).toBe(firstInvalid.id);
    el.remove();
  });

  it('validates email format and the optional phone pattern', async () => {
    const { fixture, el } = await setup();
    const email = el.querySelector<HTMLInputElement>('input[type=email]')!;
    email.value = 'nope';
    email.dispatchEvent(new Event('input'));
    email.dispatchEvent(new Event('blur'));
    const phone = el.querySelector<HTMLInputElement>('input[type=tel]')!;
    phone.value = 'abc';
    phone.dispatchEvent(new Event('input'));
    phone.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(el.textContent).toContain('Enter a valid email address.');
    expect(el.textContent).toContain('Use digits, spaces');
  });
});
