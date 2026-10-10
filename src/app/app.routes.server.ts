import { RenderMode } from '@angular/ssr';
import type { ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // The page is prerendered at build time: best TTFB/SEO and trivially CDN-cacheable.
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'catalog', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  // Unknown URLs are rendered per request so they can return a real 404.
  { path: '**', renderMode: RenderMode.Server, status: 404 },
];
