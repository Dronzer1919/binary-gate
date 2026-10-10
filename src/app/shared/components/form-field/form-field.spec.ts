import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { Radio } from '../radio/radio';
import { RadioGroup } from '../radio/radio-group';
import { TextInput } from '../input/input';
import { FormField } from './form-field';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormField, TextInput, RadioGroup, Radio],
  template: `
    <app-form-field label="Email" hint="Used for replies" [control]="email">
      <app-input type="email" [formControl]="email" />
    </app-form-field>
    <app-form-field label="Plan" [group]="true" [control]="plan">
      <app-radio-group [formControl]="plan">
        <app-radio value="a">A</app-radio>
        <app-radio value="b">B</app-radio>
      </app-radio-group>
    </app-form-field>
  `,
})
class Host {
  readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  readonly plan = new FormControl('', { nonNullable: true, validators: Validators.required });
}

describe('FormField', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    return { fixture, el, host: fixture.componentInstance };
  }

  it('links the label to the input and marks it required', async () => {
    const { el } = await setup();
    const label = el.querySelector('label')!;
    const input = el.querySelector('input[type=email]')!;
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.hasAttribute('required')).toBe(true);
    expect(input.getAttribute('aria-describedby')).toContain('-hint');
  });

  it('shows no error until the control is touched, then announces it', async () => {
    const { fixture, el, host } = await setup();
    const input = el.querySelector<HTMLInputElement>('input[type=email]')!;
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(el.querySelector('.error')!.textContent.trim()).toBe('');

    host.email.markAsTouched();
    await fixture.whenStable();

    expect(input.getAttribute('aria-invalid')).toBe('true');
    const error = el.querySelector('.error')!;
    expect(error.getAttribute('aria-live')).toBe('polite');
    expect(error.textContent).toContain('This field is required.');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('reports validator-specific messages and clears when valid', async () => {
    const { fixture, el, host } = await setup();
    const input = el.querySelector<HTMLInputElement>('input[type=email]')!;
    input.value = 'nope';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el.querySelector('.error')!.textContent).toContain('valid email');

    input.value = 'a@b.co';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(host.email.valid).toBe(true);
    expect(el.querySelector('.error')!.textContent.trim()).toBe('');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('labels a radio group via aria-labelledby when `group` is set', async () => {
    const { el } = await setup();
    const group = el.querySelector('app-radio-group')!;
    const labelId = group.getAttribute('aria-labelledby')!;
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(el.querySelector(`#${labelId}`)!.textContent).toContain('Plan');
    expect(group.getAttribute('aria-required')).toBe('true');
  });
});
