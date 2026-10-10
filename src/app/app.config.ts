import { ErrorHandler, provideAppInitializer, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import type { ApplicationConfig } from '@angular/core';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withPreloading } from '@angular/router';

import { routes } from './app.routes';
import { DEFAULT_SITE_CONFIG, SITE_CONFIG } from './core/config/app-config';
import { AnalyticsService } from './core/monitoring/analytics.service';
import { initSentry, SentryErrorHandler } from './core/monitoring/sentry-error-handler';
import { NetworkAwarePreloading } from './core/routing/network-aware-preloading';
import { SeoService } from './core/seo/seo.service';
import { ThemeService } from './core/theme/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: SITE_CONFIG, useValue: DEFAULT_SITE_CONFIG },
    { provide: ErrorHandler, useClass: SentryErrorHandler },
    provideRouter(
      routes,
      withPreloading(NetworkAwarePreloading),
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideClientHydration(withEventReplay(), withIncrementalHydration()),
    provideAppInitializer(() => {
      inject(ThemeService); // apply stored theme as early as possible
      inject(SeoService).init();
      inject(AnalyticsService).init();
      const config = inject(SITE_CONFIG);
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => void initSentry(config.sentryDsn, config.environment));
      }
    }),
  ],
};
