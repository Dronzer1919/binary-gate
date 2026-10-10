import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { uniqueId } from '../../utils/unique-id';

/**
 * Content card. Slots: `[cardMedia]`, default content, `[cardFooter]`.
 * The article is named by its heading (aria-labelledby) when one is given.
 */
@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.scss',
  template: `
    <article class="card" [class.card--elevated]="elevated()" [attr.aria-labelledby]="heading() ? headingId : null">
      <ng-content select="[cardMedia]" />
      <div class="body">
        @if (heading()) {
          <div class="heading" role="heading" [attr.aria-level]="headingLevel()" [id]="headingId">
            {{ heading() }}
          </div>
        }
        <ng-content />
      </div>
      <footer class="footer"><ng-content select="[cardFooter]" /></footer>
    </article>
  `,
})
export class Card {
  readonly heading = input<string>('');
  /** Pick the level that fits the page outline (never skip levels). */
  readonly headingLevel = input<2 | 3 | 4 | 5 | 6>(2);
  readonly elevated = input<boolean>(true);

  protected readonly headingId = uniqueId('card-heading');
}
