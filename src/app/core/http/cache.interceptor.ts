import { HttpResponse } from '@angular/common/http';
import type { HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { of, tap } from 'rxjs';
import type { Observable } from 'rxjs';

interface Entry {
  readonly response: HttpResponse<unknown>;
  readonly expires: number;
}

const DEFAULT_TTL_MS = 60_000;
const MAX_ENTRIES = 100;
const cache = new Map<string, Entry>();

/**
 * Tiny in-memory GET cache. Opt out per request with header `x-no-cache`,
 * or change the TTL with `x-cache-ttl` (milliseconds). During SSR, Angular's
 * HttpTransferCache additionally avoids re-fetching the same data on hydration.
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  if (req.method !== 'GET' || req.headers.has('x-no-cache')) {
    return next(stripControlHeaders(req));
  }

  const key = req.urlWithParams;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) {
    return of(hit.response.clone());
  }

  const ttl = Number(req.headers.get('x-cache-ttl') ?? DEFAULT_TTL_MS);
  return next(stripControlHeaders(req)).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        if (cache.size >= MAX_ENTRIES) {
          const oldest = cache.keys().next();
          if (!oldest.done) {
            cache.delete(oldest.value);
          }
        }
        cache.set(key, { response: event, expires: Date.now() + ttl });
      }
    }),
  );
};

function stripControlHeaders(req: HttpRequest<unknown>): HttpRequest<unknown> {
  return req.clone({ headers: req.headers.delete('x-no-cache').delete('x-cache-ttl') });
}

/** Test helper. */
export function clearHttpCache(): void {
  cache.clear();
}
