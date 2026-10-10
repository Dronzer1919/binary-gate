import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { ErrorHandler } from '@angular/core';

import { SITE_CONFIG } from '../config/app-config';

type SentryModule = typeof import('@sentry/browser');

let sentry: SentryModule | undefined;

/** Lazy-loads Sentry so it never counts against the initial bundle. */
export async function initSentry(dsn: string, environment: string): Promise<void> {
  if (!dsn || sentry) {
    return;
  }
  const mod = await import('@sentry/browser');
  mod.init({ dsn, environment, tracesSampleRate: 0.1 });
  sentry = mod;
}

@Injectable()
export class SentryErrorHandler implements ErrorHandler {
  private readonly config = inject(SITE_CONFIG);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly queue: unknown[] = [];

  handleError(error: unknown): void {
    console.error(error);
    if (!this.isBrowser || !this.config.sentryDsn) {
      return;
    }
    if (sentry) {
      sentry.captureException(error);
      return;
    }
    // Sentry is still loading; flush once it is ready.
    this.queue.push(error);
    void initSentry(this.config.sentryDsn, this.config.environment).then(() => {
      this.queue.splice(0).forEach((e) => sentry?.captureException(e));
    });
  }
}
