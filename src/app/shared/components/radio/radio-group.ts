import { ChangeDetectionStrategy, Component, forwardRef, inject, input, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import type { ControlValueAccessor } from '@angular/forms';

import { uniqueId } from '../../utils/unique-id';
import { FORM_FIELD } from '../form-field/form-field.token';

/**
 * `role="radiogroup"` container. Options are native radios sharing one `name`,
 * so arrow-key navigation, roving tabindex and selection come from the browser.
 */
@Component({
  selector: 'app-radio-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RadioGroup), multi: true }],
  host: {
    role: 'radiogroup',
    '[attr.aria-labelledby]': 'field?.labelId ?? null',
    '[attr.aria-label]': 'field ? null : (ariaLabel() || null)',
    '[attr.aria-describedby]': 'field?.describedBy() ?? null',
    '[attr.aria-invalid]': "field?.invalid() ? 'true' : null",
    '[attr.aria-required]': "field?.required() ? 'true' : null",
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
    '[class.inline]': 'inline()',
  },
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    :host(.inline) {
      flex-flow: row wrap;
      gap: var(--space-2) var(--space-6);
    }
  `,
  template: `<ng-content />`,
})
export class RadioGroup implements ControlValueAccessor {
  protected readonly field = inject(FORM_FIELD, { optional: true });

  readonly name = input<string>(uniqueId('radio-group'));
  readonly ariaLabel = input<string>('');
  readonly inline = input<boolean>(false);

  readonly value = signal<string | null>(null);
  readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  select(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }

  touch(): void {
    this.onTouched();
  }

  writeValue(value: string | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
