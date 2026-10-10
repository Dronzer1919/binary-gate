import { ChangeDetectionStrategy, Component, forwardRef, inject, input, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import type { ControlValueAccessor } from '@angular/forms';

import { uniqueId } from '../../utils/unique-id';
import { FORM_FIELD } from '../form-field/form-field.token';

export type InputType = 'text' | 'email' | 'password' | 'tel' | 'url' | 'search' | 'number';

/**
 * Accessible text input. Works with reactive/template forms (ControlValueAccessor)
 * and picks up its id, description and invalid state from a surrounding FormField.
 */
@Component({
  selector: 'app-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextInput), multi: true }],
  styleUrl: './input.scss',
  template: `
    <input
      class="input"
      [id]="id()"
      [type]="type()"
      [value]="value()"
      [disabled]="disabled()"
      [required]="field?.required() ?? false"
      [attr.name]="name() || null"
      [attr.placeholder]="placeholder() || null"
      [attr.autocomplete]="autocomplete() || null"
      [attr.inputmode]="inputmode() || null"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-describedby]="field?.describedBy() ?? null"
      [attr.aria-invalid]="field?.invalid() ? 'true' : null"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
  `,
})
export class TextInput implements ControlValueAccessor {
  protected readonly field = inject(FORM_FIELD, { optional: true });
  private readonly ownId = uniqueId('input');

  readonly type = input<InputType>('text');
  readonly name = input<string>('');
  readonly placeholder = input<string>('');
  readonly autocomplete = input<string>('');
  readonly inputmode = input<string>('');
  /** Only needed when used outside an app-form-field. */
  readonly ariaLabel = input<string>('');

  protected readonly value = signal('');
  protected readonly disabled = signal(false);

  protected id(): string {
    return this.field?.controlId ?? this.ownId;
  }

  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.onChange(next);
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
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
