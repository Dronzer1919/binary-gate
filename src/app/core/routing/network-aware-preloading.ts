import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { PreloadingStrategy, Route } from '@angular/router';
import { EMPTY } from 'rxjs';
import type { Observable } from 'rxjs';

interface NetworkInformation {
  readonly saveData?: boolean;
  readonly effectiveType?: string;
}

/**
 * Preloads lazy routes after the first render, except on Save-Data or 2G
 * connections, and for routes flagged `data: { preload: false }`.
 */
@Injectable({ providedIn: 'root' })
export class NetworkAwarePreloading implements PreloadingStrategy {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (!this.isBrowser || route.data?.['preload'] === false) {
      return EMPTY;
    }
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '')) {
      return EMPTY;
    }
    return load();
  }
}
