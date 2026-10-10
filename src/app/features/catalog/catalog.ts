import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icon, ModelViewer } from '../../shared';
import { GROUPS, PRODUCTS } from './catalog-data';
import { CatalogTrack } from './catalog-track';
import type { TrackItem, TrackView } from './catalog-track';
import type { GroupId, Product } from './catalog-data';

type Filter = GroupId | 'all';

/** Time each product is shown while auto-play is running. */
const AUTOPLAY_MS = 3000;

/** "CPU (Central Processing Unit)" -> "CPU"; "Server Rack & PDU" stays as is. */
function shortName(name: string): string {
  return name.split(' (')[0] ?? name;
}

interface ListedProduct extends Product {
  readonly label: string;
}

/**
 * Product catalogue: every product is in the server-rendered HTML (SEO, no-JS), and a single shared
 * draggable 3D viewer shows whichever one is selected, so only one WebGL context is ever used.
 */
@Component({
  selector: 'app-catalog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, ModelViewer, RouterLink, CatalogTrack],
  styleUrl: './catalog.scss',
  host: { '[class.is-embedded]': 'embedded()' },
  template: `
    <section
      class="catalog"
      [class.embedded]="embedded()"
      [attr.id]="embedded() ? 'catalogue' : null"
      [attr.aria-labelledby]="embedded() ? 'catalogue-title' : null"
    >
    <div class="container page">
      <header class="head">
        <div class="top">
          <p class="eyebrow annot">
            <span class="annot__dot"></span>{{ embedded() ? '03 / ' : '' }}Product catalogue<span class="annot__line"></span>
          </p>
          <div class="top-right">
            <p class="now" aria-hidden="true">
              <span class="now-label">Now showing</span>
              <strong>{{ nowLabel() }}</strong>
            </p>
            <div class="view" role="group" aria-label="Catalogue overview style">
              <button type="button" class="seg" [attr.aria-pressed]="view() === 'list'" (click)="view.set('list')">
                List
              </button>
              <button type="button" class="seg" [attr.aria-pressed]="view() === 'curve'" (click)="view.set('curve')">
                Curve
              </button>
            </div>
          </div>
        </div>
        @if (embedded()) {
          <h2 id="catalogue-title" class="h2">{{ products.length }} products, from components to racks.</h2>
        } @else {
          <h1 class="h2">{{ products.length }} products, from components to racks.</h1>
        }
        <p class="lead">
          Select any product to inspect it in 3D. Drag the model to rotate it, or focus the viewer and use the
          left and right arrow keys.
        </p>

        <div class="filters" role="group" aria-label="Filter by category">
          <button type="button" class="chip" [attr.aria-pressed]="filter() === 'all'" (click)="setFilter('all')">
            All <span class="count">{{ products.length }}</span>
          </button>
          @for (group of groups; track group.id) {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="filter() === group.id"
              (click)="setFilter(group.id)"
            >
              {{ group.title }} <span class="count">{{ countOf(group.id) }}</span>
            </button>
          }
        </div>

        <app-catalog-track [items]="trackItems()" [selectedId]="selectedId()" [view]="view()" (picked)="pick($event)" />
      </header>

      <div class="showcase">
        <app-model-viewer
          source="products"
          [model]="selected().id"
          [name]="'3D model of ' + selected().name"
          [deferLoad]="true"
        />
        <aside class="detail" aria-label="Selected product">
          <div class="info" [attr.aria-live]="playing() ? 'off' : 'polite'">
            <p class="eyebrow">{{ groupTitle() }}</p>
            <h2 class="h3">{{ selected().name }}</h2>
            <p class="fn">{{ selected().function }}</p>
            <p class="spec"><strong>Interface:</strong> {{ selected().interface }}</p>
          </div>
          <div class="steps">
            <button type="button" class="step" (click)="onStep(-1)">Previous product</button>
            <button type="button" class="step" (click)="togglePlay()" [attr.aria-pressed]="playing()">
              {{ playing() ? 'Pause auto-play' : 'Play auto-play' }}
            </button>
            <button type="button" class="step" (click)="onStep(1)">Next product</button>
          </div>
        </aside>
      </div>

      <div class="list">
          @for (group of visibleGroups(); track group.id) {
            <section class="group" [attr.aria-labelledby]="'group-' + group.id">
              <h2 class="h3 group-title" [id]="'group-' + group.id">
                <app-icon [name]="group.icon" />{{ group.title }}
                <span class="small">{{ group.items.length }} products</span>
              </h2>
              <p class="small">{{ group.blurb }}</p>
              <ul class="items">
                @for (item of group.items; track item.id) {
                  <li>
                    <button
                      type="button"
                      class="item"
                      [attr.aria-pressed]="selectedId() === item.id"
                      (click)="select(item.id)"
                    >
                      <span class="no" aria-hidden="true">{{ item.label }}</span>
                      <span class="text">
                        <span class="name">{{ item.name }}</span>
                        <span class="fn">{{ item.function }}</span>
                        <span class="spec"><span class="visually-hidden">Interface: </span>{{ item.interface }}</span>
                      </span>
                    </button>
                  </li>
                }
              </ul>
            </section>
          }
          @if (embedded()) {
            <p class="more">
              <a class="btn btn--ghost" routerLink="/catalog">Open the full catalogue page</a>
            </p>
          }
      </div>
    </div>
    </section>
  `,
})
export class Catalog {
  /** Rendered as a section of the home page (h2, anchor id) instead of a standalone page (h1). */
  readonly embedded = input<boolean>(false);

  private readonly detail = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly groups = GROUPS;
  protected readonly products = PRODUCTS;

  /**
   * Carousel: moves to the next product every 3 s on its own. A click on a product, Previous/Next or a
   * filter just restarts the 3 s countdown; only the Pause button stops it (WCAG 2.2.2).
   */
  protected readonly playing = signal(true);
  private inView = false;
  private lastChange = 0;

  protected readonly filter = signal<Filter>('all');
  protected readonly view = signal<TrackView>('list');
  protected readonly selectedId = signal<Product['id']>('cpu');

  protected readonly visibleGroups = computed(() =>
    GROUPS.filter((g) => this.filter() === 'all' || this.filter() === g.id).map((group) => ({
      ...group,
      items: PRODUCTS.filter((p) => p.group === group.id).map<ListedProduct>((p) => ({
        ...p,
        label: String(p.no).padStart(2, '0'),
      })),
    })),
  );

  private readonly flat = computed(() => this.visibleGroups().flatMap((g) => g.items));

  protected readonly selected = computed<Product>(
    () => PRODUCTS.find((p) => p.id === this.selectedId()) ?? PRODUCTS[0],
  );
  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.lastChange = Date.now();

      // Only advance while the viewer is actually on screen.
      const target = this.detail.nativeElement.querySelector('.showcase') ?? this.detail.nativeElement;
      let observer: IntersectionObserver | null = null;
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
          this.inView = entries.some((e) => e.isIntersecting);
        });
        observer.observe(target);
      } else {
        this.inView = true;
      }

      // Check often, but only advance once the current product has been shown for 3 s.
      const timer = window.setInterval(() => {
        const due = Date.now() - this.lastChange >= AUTOPLAY_MS;
        if (due && this.playing() && this.inView && !document.hidden) {
          this.step(1);
        }
      }, 250);

      destroyRef.onDestroy(() => {
        window.clearInterval(timer);
        observer?.disconnect();
      });
    });
  }

  /** Every visible product, for the tracker below the filters. */
  protected readonly trackItems = computed<readonly TrackItem[]>(() =>
    this.flat().map((p) => ({
      id: p.id,
      label: p.label,
      name: shortName(p.name),
      title: p.name,
    })),
  );
  protected readonly nowLabel = computed(() => {
    const p = this.selected();
    return `${String(p.no).padStart(2, '0')} ${shortName(p.name)}`;
  });

  protected readonly groupTitle = computed(() => GROUPS.find((g) => g.id === this.selected().group)?.title ?? '');

  protected countOf(group: GroupId): number {
    return PRODUCTS.filter((p) => p.group === group).length;
  }

  protected togglePlay(): void {
    this.playing.update((on) => !on);
    this.lastChange = Date.now();
  }

  protected onStep(direction: 1 | -1): void {
    this.step(direction);
  }

  protected setFilter(filter: Filter): void {
    this.lastChange = Date.now();
    this.filter.set(filter);
    // Keep the selection inside the visible set.
    if (!this.flat().some((p) => p.id === this.selectedId())) {
      const first = this.flat()[0];
      if (first) {
        this.selectedId.set(first.id);
      }
    }
  }

  /** Selection coming from the tracker (plain string id): ignore anything that is not a known product. */
  protected pick(id: string): void {
    const product = PRODUCTS.find((p) => p.id === id);
    if (product) {
      this.select(product.id);
    }
  }

  protected select(id: Product['id']): void {
    this.lastChange = Date.now();
    this.selectedId.set(id);
    // The viewer sits above the (long) product list: bring it into view after a pick.
    const viewer = this.detail.nativeElement.querySelector('.showcase');
    if (viewer && typeof viewer.scrollIntoView === 'function') {
      viewer.scrollIntoView({ block: 'nearest', behavior: this.prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }

  private prefersReducedMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return true;
    }
  }

  protected step(direction: 1 | -1): void {
    const list = this.flat();
    const index = list.findIndex((p) => p.id === this.selectedId());
    const next = list[(index + direction + list.length) % list.length];
    if (next) {
      this.lastChange = Date.now();
      this.selectedId.set(next.id);
    }
  }
}
