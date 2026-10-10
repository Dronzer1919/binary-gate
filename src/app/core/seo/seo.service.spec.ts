import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DEFAULT_SITE_CONFIG, SITE_CONFIG } from '../config/app-config';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SITE_CONFIG, useValue: { ...DEFAULT_SITE_CONFIG, siteUrl: 'https://site.test/' } },
      ],
    });
    service = TestBed.inject(SeoService);
    doc = TestBed.inject(DOCUMENT);
  });

  const meta = (selector: string): string | null =>
    doc.head.querySelector(selector)?.getAttribute('content') ?? null;

  it('sets title, description, Open Graph and canonical tags', () => {
    service.update({ title: 'About', description: 'About us' }, '/about?x=1#top');
    expect(doc.title).toBe('About | Node Network with Binary Gate');
    expect(meta('meta[name="description"]')).toBe('About us');
    expect(meta('meta[property="og:title"]')).toBe('About | Node Network with Binary Gate');
    expect(meta('meta[property="og:url"]')).toBe('https://site.test/about');
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(doc.head.querySelector<HTMLLinkElement>('link[rel=canonical]')!.href).toBe('https://site.test/about');
  });

  it('does not repeat the site name for the home title and supports noindex', () => {
    service.update({ title: 'Node Network with Binary Gate', noindex: true }, '/');
    expect(doc.title).toBe('Node Network with Binary Gate');
    expect(meta('meta[name="robots"]')).toBe('noindex,nofollow');
  });

  it('renders JSON-LD, escapes "<", and replaces it on the next update', () => {
    service.update({ title: 'A', jsonLd: [{ '@type': 'WebSite', name: '</script><b>' }] }, '/');
    const script = doc.getElementById('app-json-ld')!;
    expect(script.getAttribute('type')).toBe('application/ld+json');
    expect(script.textContent).not.toContain('</script>');
    const parsed = JSON.parse(script.textContent) as { '@context': string; '@graph': { name: string }[] };
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@graph'][0]!.name).toBe('</script><b>');

    service.update({ title: 'B' }, '/b');
    expect(doc.getElementById('app-json-ld')).toBeNull();
  });
});
