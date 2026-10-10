import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';

import { shouldSkip3d, whenIdleOrInteracted } from '../../core/three/load-policy';
import type { ModelInstance } from '../../core/three/models';
import type { StripScene, StripWindow } from '../../core/three/strip-scene';
import { circularWindow, LIST_SLOTS, sceneSize } from './list-window';
import { CURVE_PATH, dotFractions, pointAtFraction, VIEW_H, VIEW_W } from './parabola';

export interface TrackItem {
  readonly id: string;
  /** Short number, e.g. "07". */
  readonly label: string;
  /** Short name, e.g. "PSU". */
  readonly name: string;
  /** Full name for the tooltip. */
  readonly title: string;
}

export type TrackView = 'curve' | 'list';

const TRAVEL_MS = 700;
const SLIDE_MS = 480;
const FRAMES = 16;

/** Once three.js has been fetched there is no reason to wait for another idle moment. */
let threeReady = false;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

/**
 * Overview of the visible products.
 *  - "list": exactly five products in a row, each one a live 3D model (one shared canvas), the current
 *    one in the centre. When the selection advances the row slides one step.
 *  - "curve": every product on one parabola; a marker travels along it, left to right.
 * Purely a visual/pointer aid: the accessible way to pick a product is the list below, so this is
 * hidden from assistive tech and its buttons are skipped by Tab. Without WebGL (or on Save-Data / 2G)
 * the list view degrades to five plain labelled cards.
 */
@Component({
  selector: 'app-catalog-track',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './catalog-track.scss',
  template: `
    @if (view() === 'curve') {
      <div class="stage" aria-hidden="true">
        <svg class="curve" [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="none" focusable="false">
          <path class="trail" [attr.d]="path" />
        </svg>
        @for (dot of dots(); track dot.id; let i = $index) {
          <button
            type="button"
            tabindex="-1"
            class="dot"
            [class.on]="dot.id === selectedId()"
            [class.passed]="i < index()"
            [style.left.%]="dot.x"
            [style.top.%]="dot.y"
            [attr.aria-label]="dot.title"
            [attr.title]="dot.label + ' ' + dot.title"
            (click)="picked.emit(dot.id)"
          ></button>
        }
        @if (current(); as cur) {
          <span
            #ball
            class="ball"
            [class.at-start]="cur.fraction < 0.14"
            [class.at-end]="cur.fraction > 0.86"
            [style.left.%]="cur.x"
            [style.top.%]="cur.y"
          >
            <span class="tip">{{ cur.label }} · {{ cur.name }}</span>
          </span>
        }
      </div>
    } @else {
      <div #strip class="strip" [class.live]="live()" aria-hidden="true">
        <canvas #canvas class="strip-canvas"></canvas>
        <ol #row class="row">
          @for (slot of slots(); track slot.item.id) {
            <li>
              <button
                type="button"
                tabindex="-1"
                class="chip"
                [class.on]="slot.current"
                [attr.title]="slot.item.title"
                (click)="picked.emit(slot.item.id)"
              >
                <span class="num">{{ slot.item.label }}</span>
                <span class="name">{{ slot.item.name }}</span>
              </button>
            </li>
          }
        </ol>
      </div>
    }
  `,
})
export class CatalogTrack {
  readonly items = input.required<readonly TrackItem[]>();
  readonly selectedId = input.required<string>();
  readonly view = input<TrackView>('list');
  readonly picked = output<string>();

  protected readonly path = CURVE_PATH;
  protected readonly width = VIEW_W;
  protected readonly height = VIEW_H;

  /** True once the 3D row is running (the cards then become transparent labels over the models). */
  protected readonly live = signal(false);

  // ----- curve geometry -----
  protected readonly dots = computed(() => {
    const items = this.items();
    const fractions = dotFractions(items.length);
    return items.map((item, i) => {
      const fraction = fractions[i] ?? 0;
      return { ...item, fraction, ...pointAtFraction(fraction) };
    });
  });
  protected readonly index = computed(() => Math.max(0, this.items().findIndex((d) => d.id === this.selectedId())));
  protected readonly current = computed(() => this.dots()[this.index()]);

  // ----- list window -----
  /** The five products in the row, current one in the centre (wrapping around the ends). */
  protected readonly slots = computed(() => {
    const { items } = circularWindow(this.items(), this.index(), LIST_SLOTS);
    const selected = this.selectedId();
    return items.map((item) => ({ item, current: item.id === selected }));
  });

  /** What the 3D row renders: seven models when rotating (so a slide never shows an empty slot). */
  private readonly sceneWindow = computed<StripWindow>(() => {
    const { items, firstRel } = circularWindow(this.items(), this.index(), sceneSize(this.items().length));
    return { ids: items.map((item) => item.id), firstRel };
  });

  private readonly ball = viewChild<ElementRef<HTMLElement>>('ball');
  private readonly row = viewChild<ElementRef<HTMLElement>>('row');
  private readonly strip = viewChild<ElementRef<HTMLElement>>('strip');
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  private previousFraction = -1;
  private previousCount = 0;
  private previousIndex = -1;
  private previousListCount = 0;

  private scene: StripScene | null = null;
  private boundCanvas: HTMLCanvasElement | null = null;
  private cancelLoad: (() => void) | null = null;
  private stopWatching: (() => void) | null = null;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.teardown();
    });

    // 3D row: (re)create it whenever the list view's canvas appears, drop it when the view goes away.
    afterRenderEffect(() => {
      const canvas = this.canvas()?.nativeElement ?? null;
      if (canvas === this.boundCanvas) {
        return;
      }
      this.teardown();
      this.boundCanvas = canvas;
      if (canvas) {
        this.startStrip(canvas);
      }
    });

    // Curve view: glide the marker along the parabola, left to right, to the newly selected product.
    afterRenderEffect(() => {
      const cur = this.current();
      const ball = this.ball()?.nativeElement;
      const count = this.items().length;
      if (!cur || !ball) {
        this.previousFraction = -1;
        return;
      }
      const from = this.previousFraction;
      const sameSet = count === this.previousCount;
      this.previousFraction = cur.fraction;
      this.previousCount = count;

      // Wrapping from the last product back to the first (or a changed filter) simply jumps.
      if (from < 0 || !sameSet || cur.fraction <= from || prefersReducedMotion() || typeof ball.animate !== 'function') {
        return;
      }
      const frames = Array.from({ length: FRAMES + 1 }, (_, i) => {
        const p = pointAtFraction(from + ((cur.fraction - from) * i) / FRAMES);
        return { left: `${p.x}%`, top: `${p.y}%` };
      });
      ball.animate(frames, { duration: TRAVEL_MS, easing: 'ease-in-out' });
    });

    // List view: slide the labels (and the 3D row with them) one step so the next product is centred.
    afterRenderEffect(() => {
      const row = this.row()?.nativeElement;
      const index = this.index();
      const count = this.items().length;
      const win = this.sceneWindow();
      if (!row) {
        this.previousIndex = -1;
        return;
      }
      const from = this.previousIndex;
      const sameSet = count === this.previousListCount;
      this.previousIndex = index;
      this.previousListCount = count;

      const moved = from >= 0 && sameSet && from !== index;
      const forward = (index - from + count) % count;
      const backward = (from - index + count) % count;
      const dir = moved && count > LIST_SLOTS ? (forward === 1 ? 1 : backward === 1 ? -1 : 0) : 0;
      const animate = !prefersReducedMotion();

      this.scene?.setWindow(win, animate ? dir : 0);

      if (!moved || !animate || typeof row.animate !== 'function') {
        return;
      }
      const step = 100 / LIST_SLOTS; // one slot, as a percentage of the row's width
      row.animate(
        [
          { transform: `translateX(${dir * step}%)`, opacity: dir === 0 ? 0.35 : 0.6 },
          { transform: 'translateX(0)', opacity: 1 },
        ],
        { duration: SLIDE_MS, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' },
      );
    });
  }

  private startStrip(canvas: HTMLCanvasElement): void {
    const host = this.strip()?.nativeElement ?? canvas.parentElement;
    if (!host || shouldSkip3d() || !('IntersectionObserver' in window)) {
      return;
    }

    const load = (): void => {
      void Promise.all([
        import('../../core/three/strip-scene'),
        import('../../core/three/product-models'),
      ]).then(([{ initStrip }, { buildProductModel }]) => {
        threeReady = true;
        if (this.destroyed || this.boundCanvas !== canvas) {
          return;
        }
        const scene = initStrip(canvas, host, buildProductModel as (id: string) => ModelInstance);
        if (scene) {
          this.scene = scene;
          scene.setWindow(this.sceneWindow(), 0);
          this.live.set(true);
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) {
          return;
        }
        observer.disconnect();
        if (threeReady) {
          load();
        } else {
          // First load: wait for the first input (or load + idle), like the other 3D scenes.
          this.cancelLoad = whenIdleOrInteracted(load, 6000);
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(host);
    this.stopWatching = () => {
      observer.disconnect();
    };
  }

  private teardown(): void {
    this.cancelLoad?.();
    this.stopWatching?.();
    this.scene?.dispose();
    this.cancelLoad = null;
    this.stopWatching = null;
    this.scene = null;
    this.boundCanvas = null;
    this.live.set(false);
  }
}
