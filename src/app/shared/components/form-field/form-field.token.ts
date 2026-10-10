import { InjectionToken } from '@angular/core';
import type { Signal } from '@angular/core';

/**
 * What a projected control (app-input, app-radio-group, ...) needs from its
 * surrounding FormField to be correctly labelled and described for assistive tech.
 */
export interface FormFieldContext {
  readonly controlId: string;
  readonly labelId: string;
  /** Space-separated ids of hint + error elements, or null when there are none. */
  readonly describedBy: Signal<string | null>;
  readonly invalid: Signal<boolean>;
  readonly required: Signal<boolean>;
}

export const FORM_FIELD = new InjectionToken<FormFieldContext>('FORM_FIELD');
