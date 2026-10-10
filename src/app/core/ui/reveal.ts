import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input, numberAttribute, signal } from '@angular/core';

/**
 * Scroll reveal: the element fades/rises in (and its `.annot__line` children draw) the first time it
 * enters the viewport. It is only hidden once the browser has taken over, so server-rendered HTML,
 * no-JS visitors, crawlers and reduced-motion users always see the content.
 * Optional input: stagger delay in ms.
 */
@Directive({
  selector: '[appReveal]',
  host: {
    '[class.reveal]': 'armed()',
    '[class.reveal--in]': 'shown()',
    '[style.transition-delay.ms]': 'armed() ? delay() : null',
  },
})
export class Reveal {
  readonly delay = input<number, number | string>(0, {
    alias: 'appReveal',
    transform: (value) => numberAttribute(value, 0),
  });

  protected readonly armed = signal(false);
  protected readonly shown = signal(false);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const reduceMotion = 'matchMedia' in window && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion || !('IntersectionObserver' in window)) {
        return;
      }
      this.armed.set(true);
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            this.shown.set(true);
            observer.disconnect();
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      );
      observer.observe(el);
      destroyRef.onDestroy(() => {
        observer.disconnect();
      });
    });
  }
}
