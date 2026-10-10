import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, forwardRef, input } from '@angular/core';
import { Validators } from '@angular/forms';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { of, startWith, switchMap } from 'rxjs';

import { uniqueId } from '../../utils/unique-id';
import { FORM_FIELD } from './form-field.token';
import type { FormFieldContext } from './form-field.token';

const DEFAULT_MESSAGES: Record<string, (e: unknown) => string> = {
  required: () => 'This field is required.',
  email: () => 'Enter a valid email address.',
  minlength: (e) => `Enter at least ${(e as { requiredLength: number }).requiredLength} characters.`,
  maxlength: (e) => `Enter no more than ${(e as { requiredLength: number }).requiredLength} characters.`,
  pattern: () => 'The value is not in the expected format.',
};

/**
 * Label + hint + validation message wrapper. Wires `for`, `aria-describedby`,
 * `aria-invalid` and a polite live region so errors are announced.
 *
 * Use `group` when wrapping a radio group: the label then names the
 * `role="radiogroup"` via aria-labelledby instead of a `for` attribute.
 */
@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: FORM_FIELD, useExisting: forwardRef(() => FormField) }],
  styleUrl: './form-field.scss',
  template: `
    <div class="field" [class.field--invalid]="invalid()">
      @if (group()) {
        <span class="label" [id]="labelId">
          {{ label() }}
          @if (required()) {
            <span aria-hidden="true" class="req">*</span>
          }
        </span>
      } @else {
        <label class="label" [id]="labelId" [for]="controlId">
          {{ label() }}
          @if (required()) {
            <span aria-hidden="true" class="req">*</span>
          }
        </label>
      }
      @if (hint()) {
        <p class="hint" [id]="hintId">{{ hint() }}</p>
      }
      <ng-content />
      <div class="error" [id]="errorId" aria-live="polite">
        @if (errorText(); as text) {
          <span aria-hidden="true">⚠ </span><span class="visually-hidden">Error: </span>{{ text }}
        }
      </div>
    </div>
  `,
})
export class FormField implements FormFieldContext {
  readonly label = input.required<string>();
  readonly hint = input<string>('');
  readonly control = input<AbstractControl | null>(null);
  /** Override messages per validator key, e.g. `{ required: 'Tell us your name.' }`. */
  readonly messages = input<Record<string, string>>({});
  /** Treat the content as a group of controls (radios) rather than a single labelable control. */
  readonly group = input<boolean>(false);

  readonly controlId = uniqueId('field');
  readonly labelId = `${this.controlId}-label`;
  protected readonly hintId = `${this.controlId}-hint`;
  protected readonly errorId = `${this.controlId}-error`;

  /** Bumps on every status / touched / value event of the bound control. */
  private readonly controlEvents = toSignal(
    toObservable(this.control).pipe(
      switchMap((c) => (c ? c.events.pipe(startWith(null)) : of(null))),
    ),
    { initialValue: null },
  );

  readonly required = computed(() => {
    this.controlEvents();
    return this.control()?.hasValidator(Validators.required) ?? false;
  });

  readonly invalid = computed(() => {
    this.controlEvents();
    const c = this.control();
    return !!c && c.invalid && (c.touched || c.dirty);
  });

  protected readonly errorText = computed(() => {
    if (!this.invalid()) {
      return null;
    }
    const errors: ValidationErrors | null = this.control()?.errors ?? null;
    const key = errors ? Object.keys(errors)[0] : undefined;
    if (!errors || !key) {
      return null;
    }
    return (
      this.messages()[key] ?? DEFAULT_MESSAGES[key]?.(errors[key]) ?? 'This value is invalid.'
    );
  });

  readonly describedBy = computed(() => {
    const ids = [this.hint() ? this.hintId : null, this.errorId].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  });
}
