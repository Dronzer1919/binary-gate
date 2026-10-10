import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, skip } from 'rxjs';

import { THEMES, ThemeService } from './core/theme/theme.service';
import type { ThemeName } from './core/theme/theme.service';

interface NavItem {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly doc = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly themeService = inject(ThemeService);
  protected readonly themes = THEMES;

  protected readonly navItems: readonly NavItem[] = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'products', label: 'Products & Services' },
    { id: 'catalogue', label: 'Catalogue' },
    { id: 'solutions', label: 'Solutions' },
  ];

  /** Id of the section currently in view (drives aria-current in the nav). */
  protected readonly active = signal('home');
  /** Section links only mark a current section while the home page is showing. */
  protected readonly onHome = signal(true);

  private readonly injector = inject(Injector);
  private observer: IntersectionObserver | null = null;

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        const home = e.urlAfterRedirects.split(/[?#]/)[0] === '/';
        this.onHome.set(home);
        if (home) {
          // The home sections are re-created when navigating back: observe the new elements.
          afterNextRender(() => {
            this.watchSections();
          }, { injector: this.injector });
        }
      });

    // Move focus to the new page content after client-side navigation (screen readers + keyboard).
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.doc.getElementById('main')?.focus({ preventScroll: true });
      });

    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
    });
  }

  private watchSections(): void {
    if (!('IntersectionObserver' in window)) {
      return;
    }
    this.observer?.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) {
          this.active.set(hit.target.id);
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    this.navItems.forEach(({ id }) => {
      const section = this.doc.getElementById(id);
      if (section) {
        observer.observe(section);
      }
    });
    this.observer = observer;
  }

  protected onThemeChange(event: Event): void {
    this.themeService.set((event.target as HTMLSelectElement).value as ThemeName);
  }
}
