import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';

import { shouldSkip3d, whenIdleOrInteracted } from '../../../core/three/load-policy';
import type { ModelInstance } from '../../../core/three/models';
import type { Viewer } from '../../../core/three/viewer-scene';

/** Which procedural model set to draw from. Each is a separate lazy chunk. */
export type ModelSource = 'solutions' | 'products';

/**
 * Draggable 3D model viewer (pointer drag, or Left/Right arrow keys when focused).
 * three.js is fetched only when the frame is about to scroll into view (or, with `deferLoad`, on first
 * input / after load + idle), and not at all on Save-Data / 2G / low-memory devices.
 */
@Component({
  selector: 'app-model-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './model-viewer.scss',
  template: `
    <div
      #frame
      class="frame"
      tabindex="0"
      role="group"
      aria-roledescription="3D model viewer"
      [attr.aria-label]="label()"
    >
      <canvas #canvas class="canvas" aria-hidden="true"></canvas>
      @if (!live()) {
        <p class="fallback">{{ message() }}</p>
      }
    </div>
  `,
})
export class ModelViewer {
  /** Model id within the chosen `source`. */
  readonly model = input.required<string>();
  readonly source = input<ModelSource>('solutions');
  /** Accessible name; the arrow-key hint is appended automatically. */
  readonly name = input<string>('3D model viewer');
  /** Wait for first input / idle before loading three.js even when the viewer is already on screen. */
  readonly deferLoad = input<boolean>(false);

  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly live = signal(false);
  protected readonly message = signal('Interactive 3D preview is loading…');
  protected label(): string {
    return `${this.name()}. Use left and right arrow keys to rotate.`;
  }

  private viewer: Viewer | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Keep the scene in sync with the selected model.
    effect(() => {
      const model = this.model();
      this.viewer?.setModel(model);
    });

    afterNextRender(() => {
      if (shouldSkip3d()) {
        this.message.set('3D preview is turned off to save data on your connection.');
        return;
      }
      if (!('IntersectionObserver' in window)) {
        this.message.set('Your browser is too old for the interactive 3D preview.');
        return;
      }
      const frame = this.frame().nativeElement;
      let cancelIdle: (() => void) | null = null;
      let destroyed = false;

      const load = (): void => {
        const source = this.source();
        const builder: Promise<(name: string) => ModelInstance> =
          source === 'products'
            ? import('../../../core/three/product-models').then((m) => m.buildProductModel as (n: string) => ModelInstance)
            : import('../../../core/three/models').then((m) => m.buildModel as (n: string) => ModelInstance);
        void Promise.all([import('../../../core/three/viewer-scene'), builder]).then(([{ initViewer }, build]) => {
          if (destroyed) {
            return;
          }
          this.viewer = initViewer(this.canvas().nativeElement, frame, this.model(), build);
          if (this.viewer) {
            this.live.set(true);
          } else {
            this.message.set('Your browser does not support WebGL, so the 3D preview is unavailable.');
          }
        });
      };

      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) {
            return;
          }
          observer.disconnect();
          if (this.deferLoad()) {
            cancelIdle = whenIdleOrInteracted(load, 6000);
          } else {
            load();
          }
        },
        { rootMargin: '400px' },
      );
      observer.observe(frame);
      destroyRef.onDestroy(() => {
        destroyed = true;
        observer.disconnect();
        cancelIdle?.();
        this.viewer?.dispose();
      });
    });
  }
}
