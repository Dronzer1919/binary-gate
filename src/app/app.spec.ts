import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { DEFAULT_SITE_CONFIG, SITE_CONFIG } from './core/config/app-config';

describe('App shell', () => {
  async function setup() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: SITE_CONFIG, useValue: DEFAULT_SITE_CONFIG }],
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('provides a skip link, landmarks and a labelled primary nav with all sections', async () => {
    const el = await setup();
    expect(el.querySelector('a.skip-link')!.getAttribute('href')).toBe('#main');
    expect(el.querySelector('main#main')).not.toBeNull();
    expect(el.querySelector('header')).not.toBeNull();
    expect(el.querySelector('footer')).not.toBeNull();
    expect(el.querySelector('nav')!.getAttribute('aria-label')).toBe('Primary');
    expect(el.querySelectorAll('nav a')).toHaveLength(6); // 5 home sections + Catalog
  });

  it('offers a labelled theme selector with all themes', async () => {
    const el = await setup();
    const select = el.querySelector<HTMLSelectElement>('#theme-select')!;
    expect(select.getAttribute('aria-label')).toBe('Theme');
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['', 'dark', 'light', 'high-contrast']);
  });

  it('has a hamburger button that toggles the nav on small screens', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: SITE_CONFIG, useValue: DEFAULT_SITE_CONFIG }],
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector<HTMLButtonElement>('.menu-toggle')!;
    const nav = el.querySelector('nav')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(nav.classList).not.toContain('nav--open');
    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(nav.classList).toContain('nav--open');
    button.click();
    await fixture.whenStable();
    expect(nav.classList).not.toContain('nav--open');
  });
});
