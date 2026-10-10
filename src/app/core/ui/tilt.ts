import { Directive, ElementRef, inject } from '@angular/core';

const MAX_TILT = 7; // degrees

/**
 * Pointer-driven 3D tilt. Sets --rx/--ry on the host; the element's own CSS applies the transform.
 * Mouse only, and disabled for reduced motion (listeners never run during SSR).
 */
@Directive({
  selector: '[appTilt]',
  host: {
    '(pointermove)': 'onMove($event)',
    '(pointerleave)': 'reset()',
  },
})
export class Tilt {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private frame = 0;

  protected onMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const rect = this.el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      this.el.style.setProperty('--ry', `${(x * MAX_TILT * 2).toFixed(2)}deg`);
      this.el.style.setProperty('--rx', `${(-y * MAX_TILT * 2).toFixed(2)}deg`);
    });
  }

  protected reset(): void {
    cancelAnimationFrame(this.frame);
    this.el.style.setProperty('--rx', '0deg');
    this.el.style.setProperty('--ry', '0deg');
  }
}
