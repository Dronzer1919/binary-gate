import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  | 'chip'
  | 'keyboard'
  | 'network'
  | 'code'
  | 'shield'
  | 'truck'
  | 'headset'
  | 'arrow'
  | 'mail'
  | 'phone'
  | 'pin';

/** Original, license-free stroke icons (24x24). Inline paths: no sprite, no extra request. */
const PATHS: Record<IconName, string> = {
  chip: 'M8 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM10 10h4v4h-4zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4',
  keyboard: 'M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10',
  network: 'M10 3h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM3 16h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1zM17 16h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1zM12 8v4M5 16v-4h14v4',
  code: 'm8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  shield: 'M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6zM9 12l2 2 4-4',
  truck: 'M2 6h11v10H2zM13 9h4l4 4v3h-8M9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM19 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  headset: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2zM17 14h3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-3zM19 20c0 1.5-2 2-5 2',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  mail: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 7l9 6 9-6',
  phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  pin: 'M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12zM12 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
};

/** Decorative icon (hidden from assistive tech; always pair with visible text). */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: inline-flex' },
  template: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path [attr.d]="path()" />
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly path = computed(() => PATHS[this.name()]);
}
