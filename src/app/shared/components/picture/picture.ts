import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Responsive image: AVIF > WebP > PNG at 400w/800w from /assets/img/<name>-<w>.<ext>.
 * Set `priority` for the LCP image (eager + high fetch priority); everything else is lazy.
 * With `lightVariant`, the light theme swaps in <name>-light-<w>.* (scripts/generate-light-images.mjs).
 * Add class `fill` to stretch it over a positioned parent.
 */
@Component({
  selector: 'app-picture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './picture.scss',
  template: `
    <picture class="dark">
      <source type="image/avif" [attr.srcset]="srcset('avif')" [attr.sizes]="sizes()" />
      <source type="image/webp" [attr.srcset]="srcset('webp')" [attr.sizes]="sizes()" />
      <img
        [attr.src]="'/assets/img/' + name() + '-' + (priority() ? 800 : 400) + '.png'"
        [attr.srcset]="srcset('png')"
        [attr.sizes]="sizes()"
        [attr.width]="width()"
        [attr.height]="height()"
        [attr.loading]="priority() ? 'eager' : 'lazy'"
        [attr.fetchpriority]="priority() ? 'high' : null"
        decoding="async"
        [attr.alt]="alt()"
      />
    </picture>
    @if (lightVariant()) {
      <picture class="light">
        <source type="image/avif" [attr.srcset]="srcset('avif', true)" [attr.sizes]="sizes()" />
        <source type="image/webp" [attr.srcset]="srcset('webp', true)" [attr.sizes]="sizes()" />
        <img
          [attr.src]="'/assets/img/' + name() + '-light-' + (priority() ? 800 : 400) + '.png'"
          [attr.srcset]="srcset('png', true)"
          [attr.sizes]="sizes()"
          [attr.width]="width()"
          [attr.height]="height()"
          loading="lazy"
          decoding="async"
          [attr.alt]="alt()"
        />
      </picture>
    }
  `,
})
export class AppPicture {
  readonly name = input.required<string>();
  readonly alt = input.required<string>();
  readonly sizes = input<string>('100vw');
  readonly width = input<number>(400);
  readonly height = input<number>(300);
  readonly priority = input<boolean>(false);
  /** Also render the recoloured light-theme artwork (only about and the product images have it in use). */
  readonly lightVariant = input<boolean>(false);

  protected srcset(ext: 'avif' | 'webp' | 'png', light = false): string {
    const base = `/assets/img/${this.name()}${light ? '-light' : ''}`;
    return `${base}-400.${ext} 400w, ${base}-800.${ext} 800w`;
  }
}
