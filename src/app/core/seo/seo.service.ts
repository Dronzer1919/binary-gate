import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { filter } from 'rxjs';

import { SITE_CONFIG } from '../config/app-config';

export interface SeoData {
  readonly title: string;
  readonly description?: string;
  readonly image?: string;
  readonly noindex?: boolean;
  /** schema.org JSON-LD graph nodes, rendered into one <script type="application/ld+json">. */
  readonly jsonLd?: readonly Record<string, unknown>[];
}

const JSON_LD_ID = 'app-json-ld';

/** Keeps <title>, meta tags, canonical link and structured data in sync with the active route. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly config = inject(SITE_CONFIG);

  /** Called once at startup: applies `route.data.seo` after every navigation. */
  init(): void {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      const seo = this.deepestSeo(this.router.routerState.snapshot.root);
      if (seo) {
        this.update(seo, e.urlAfterRedirects);
      }
    });
  }

  update(data: SeoData, path: string): void {
    const { siteName, defaultDescription, defaultImage } = this.config;
    const fullTitle = data.title === siteName ? siteName : `${data.title} | ${siteName}`;
    const description = data.description ?? defaultDescription;
    const url = this.absolute(path.split(/[?#]/)[0] ?? '/');
    const image = this.absolute(data.image ?? defaultImage);

    this.title.setTitle(fullTitle);
    const tags: Record<string, string>[] = [
      { name: 'description', content: description },
      { name: 'robots', content: data.noindex ? 'noindex,nofollow' : 'index,follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: siteName },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: image },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
    ];
    tags.forEach((tag) => this.meta.updateTag(tag));

    this.setCanonical(url);
    this.setJsonLd(data.jsonLd);
  }

  private absolute(pathOrUrl: string): string {
    if (/^https?:\/\//.test(pathOrUrl)) {
      return pathOrUrl;
    }
    const origin = this.config.siteUrl.replace(/\/$/, '');
    const normalized = pathOrUrl === '/' ? '/' : pathOrUrl.replace(/\/$/, '');
    return origin + (normalized.startsWith('/') ? normalized : `/${normalized}`);
  }

  private setCanonical(url: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    link.href = url;
  }

  private setJsonLd(nodes: readonly Record<string, unknown>[] | undefined): void {
    this.doc.getElementById(JSON_LD_ID)?.remove();
    if (!nodes?.length) {
      return;
    }
    const script = this.doc.createElement('script');
    script.id = JSON_LD_ID;
    script.type = 'application/ld+json';
    // `<` is escaped so injected strings can never close the script element.
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(
      /</g,
      '\\u003c',
    );
    this.doc.head.appendChild(script);
  }

  private deepestSeo(route: ActivatedRouteSnapshot): SeoData | undefined {
    let current: ActivatedRouteSnapshot | null = route;
    let found: SeoData | undefined;
    while (current) {
      const seo = current.data['seo'] as SeoData | undefined;
      found = seo ?? found;
      current = current.firstChild;
    }
    return found;
  }
}
