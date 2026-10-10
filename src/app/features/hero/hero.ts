import type {
  ElementRef} from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { shouldSkip3d, whenIdleOrInteracted } from '../../core/three/load-policy';
import { Reveal } from '../../core/ui/reveal';
import { AppPicture, Icon } from '../../shared';

@Component({
  selector: 'app-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AppPicture, Icon, Reveal],
  styleUrl: './hero.scss',
  template: `
    <section id="home" class="hero" aria-labelledby="hero-title">
      <div class="container grid">
        <div class="copy">
          <p class="eyebrow annot">
            <span class="annot__dot"></span>Hardware · Networks · Software<span class="annot__line"></span>
          </p>
          <h1 id="hero-title" class="display">
            Infrastructure your business can <span class="grad">rely on</span>.
          </h1>
          <p class="lead">
            We source, deploy and support the computers, peripherals, networks and software that keep teams
            productive, from a single workstation to a full office build-out.
          </p>
          <div class="cta">
            <a class="btn" routerLink="/contact">
              Request a quote <app-icon name="arrow" />
            </a>
            <a class="btn btn--ghost" routerLink="/" fragment="solutions">Explore solutions</a>
          </div>
          <dl class="stats">
            <div><dt>Years supplying</dt><dd>15+</dd></div>
            <div><dt>Businesses served</dt><dd>1,200+</dd></div>
            <div><dt>Same-day dispatch</dt><dd>98%</dd></div>
          </dl>
        </div>

        <div #stage class="stage" [class.live]="live()">
          <app-picture
            class="fill poster"
            name="hero-poster"
            alt="Isometric illustration of three stacked rack servers with glowing indicator lights"
            sizes="(min-width: 60rem) 540px, 90vw"
            [width]="800"
            [height]="600"
            [priority]="true"
          />
          <canvas #canvas class="canvas" aria-hidden="true"></canvas>
          <ul class="callouts">
            <li class="callout a" [appReveal]="200">
              <span class="dot"></span><span class="annot__line"></span><span class="label">Rack-ready servers</span>
            </li>
            <li class="callout b" [appReveal]="350">
              <span class="dot"></span><span class="annot__line"></span><span class="label">10 GbE switching</span>
            </li>
            <li class="callout c" [appReveal]="500">
              <span class="dot"></span><span class="annot__line"></span><span class="label">Managed software</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  `,
})
export class Hero {
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  /** True once the WebGL scene is running; the poster then fades out. */
  protected readonly live = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Only this page shows the poster, so only this page's server-rendered <head> preloads it
    // (in the shared index.html it would be fetched, uselessly, on every route).
    if (isPlatformServer(inject(PLATFORM_ID))) {
      const doc = inject(DOCUMENT);
      const link = doc.createElement('link');
      link.setAttribute('rel', 'preload');
      link.setAttribute('as', 'image');
      link.setAttribute('type', 'image/avif');
      link.setAttribute('href', '/assets/img/hero-poster-800.avif');
      link.setAttribute('imagesrcset', '/assets/img/hero-poster-400.avif 400w, /assets/img/hero-poster-800.avif 800w');
      link.setAttribute('imagesizes', '(min-width: 60rem) 540px, 90vw');
      link.setAttribute('fetchpriority', 'high');
      doc.head.appendChild(link);
    }

    afterNextRender(() => {
      if (shouldSkip3d()) {
        return;
      }
      let dispose: (() => void) | null = null;
      let destroyed = false;

      // three.js (~136 kB gz) loads only after first input, or 6 s after load: never on the critical path.
      const cancel = whenIdleOrInteracted(() => {
        void import('../../core/three/hero-scene').then(({ initHeroScene }) => {
          if (destroyed) {
            return;
          }
          dispose = initHeroScene(this.canvas().nativeElement, this.stage().nativeElement);
          this.live.set(dispose !== null);
        });
      }, 6000);

      destroyRef.onDestroy(() => {
        destroyed = true;
        cancel();
        dispose?.();
      });
    });
  }
}
