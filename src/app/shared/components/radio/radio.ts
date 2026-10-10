import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { RadioGroup } from './radio-group';

@Component({
  selector: 'app-radio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './radio.scss',
  template: `
    <label class="radio" [class.radio--disabled]="isDisabled()">
      <input
        class="native"
        type="radio"
        [name]="group.name()"
        [value]="value()"
        [checked]="checked()"
        [disabled]="isDisabled()"
        (change)="group.select(value())"
        (blur)="group.touch()"
      />
      <span class="mark" aria-hidden="true"></span>
      <span class="text"><ng-content /></span>
    </label>
  `,
})
export class Radio {
  protected readonly group = inject(RadioGroup);

  readonly value = input.required<string>();
  readonly disabled = input<boolean>(false);

  protected readonly checked = computed(() => this.group.value() === this.value());
  protected readonly isDisabled = computed(() => this.disabled() || this.group.disabled());
}
