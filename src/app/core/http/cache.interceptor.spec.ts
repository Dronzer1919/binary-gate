import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { cacheInterceptor, clearHttpCache } from './cache.interceptor';

describe('cacheInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    clearHttpCache();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([cacheInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
  });

  it('serves repeated GETs from memory', () => {
    const results: unknown[] = [];
    http.get('/api/a').subscribe((r) => results.push(r));
    backend.expectOne('/api/a').flush({ n: 1 });
    http.get('/api/a').subscribe((r) => results.push(r));
    backend.expectNone('/api/a');
    expect(results).toEqual([{ n: 1 }, { n: 1 }]);
  });

  it('does not cache non-GET requests', () => {
    http.post('/api/a', {}).subscribe();
    backend.expectOne('/api/a').flush({});
    http.post('/api/a', {}).subscribe();
    backend.expectOne('/api/a').flush({});
  });

  it('bypasses the cache with x-no-cache and strips the control header', () => {
    http.get('/api/b', { headers: { 'x-no-cache': '1' } }).subscribe();
    const req = backend.expectOne('/api/b');
    expect(req.request.headers.has('x-no-cache')).toBe(false);
    req.flush({});
    http.get('/api/b', { headers: { 'x-no-cache': '1' } }).subscribe();
    backend.expectOne('/api/b').flush({});
  });

  it('expires entries after the TTL', () => {
    vi.useFakeTimers();
    try {
      http.get('/api/c', { headers: { 'x-cache-ttl': '1000' } }).subscribe();
      backend.expectOne('/api/c').flush({});
      vi.advanceTimersByTime(1500);
      http.get('/api/c', { headers: { 'x-cache-ttl': '1000' } }).subscribe();
      backend.expectOne('/api/c').flush({});
    } finally {
      vi.useRealTimers();
    }
  });
});
