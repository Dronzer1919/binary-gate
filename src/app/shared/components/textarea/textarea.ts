import { ChangeDetectionStrategy, Component, forwardRef, inject, input, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import type { ControlValueAccessor } from '@angular/forms';

import { uniqueId } from '../../utils/unique-id';
import { FORM_FIELD } from '../form-field/form-field.token';

/** Accessible multi-line input; same contract as app-input (CVA + FormField wiring). */
@Component({
  selector: 'app-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextArea), multi: true }],
  styleUrl: '../input/input.scss',
  template: `
    <textarea
      class="input"
      [id]="id()"
      [rows]="rows()"
      [value]="value()"
      [disabled]="disabled()"
      [required]="field?.required() ?? false"
      [attr.name]="name() || null"
      [attr.maxlength]="maxlength()"
      [attr.aria-describedby]="field?.describedBy() ?? null"
      [attr.aria-invalid]="field?.invalid() ? 'true' : null"
      (input)="onInput($event)"
      (blur)="onTouched()"
    ></textarea>
  `,
})
export class TextArea implements ControlValueAccessor {
  protected readonly field = inject(FORM_FIELD, { optional: true });
  private readonly ownId = uniqueId('textarea');

  readonly rows = input<number>(5);
  readonly name = input<string>('');
  readonly maxlength = input<number | null>(null);

  protected readonly value = signal('');
  protected readonly disabled = signal(false);

  protected id(): string {
    return this.field?.controlId ?? this.ownId;
  }

  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected onInput(event: Event): void {
    const next = (event.target as HTMLTextAreaElement).value;
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
