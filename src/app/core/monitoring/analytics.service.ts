import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { SITE_CONFIG } from '../config/app-config';

type Gtag = (...args: unknown[]) => void;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag };

/** Google Analytics 4: browser only, only when configured, and only when the main thread is idle. */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly config = inject(SITE_CONFIG);
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  init(): void {
    const id = this.config.analyticsId;
    const win = this.doc.defaultView as AnalyticsWindow | null;
    if (!this.isBrowser || !id || !win) {
      return;
    }
    win.dataLayer ??= [];
    win.gtag = function gtag(...args: unknown[]): void {
      win.dataLayer?.push(args);
    };
    win.gtag('js', new Date());
    win.gtag('config', id, { send_page_view: false, anonymize_ip: true });

    const load = (): void => {
      const script = this.doc.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      this.doc.head.appendChild(script);
    };
    // Keep analytics off the critical path (3G friendly).
    if ('requestIdleCallback' in win) {
      win.requestIdleCallback(load, { timeout: 4000 });
    } else {
      setTimeout(load, 2000);
    }

    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      win.gtag?.('event', 'page_view', {
        page_path: e.urlAfterRedirects,
        page_title: this.doc.title,
      });
    });
  }
}
