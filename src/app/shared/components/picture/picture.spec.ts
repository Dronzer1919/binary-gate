import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import { Icon } from '../icon/icon';
import { AppPicture } from './picture';

describe('AppPicture', () => {
  function create(priority: boolean): ComponentFixture<AppPicture> {
    const fixture = TestBed.createComponent(AppPicture);
    fixture.componentRef.setInput('name', 'hardware');
    fixture.componentRef.setInput('alt', 'A chip');
    fixture.componentRef.setInput('priority', priority);
    fixture.componentRef.setInput('lightVariant', true);
    return fixture;
  }

  it('serves AVIF, then WebP, then PNG with width/height and alt', async () => {
    const fixture = create(false);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const types = Array.from(el.querySelectorAll('.dark source')).map((s) => s.getAttribute('type'));
    expect(types).toEqual(['image/avif', 'image/webp']);
    expect(el.querySelector('.dark source')!.getAttribute('srcset')).toContain('/assets/img/hardware-800.avif 800w');
    const img = el.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe('A chip');
    expect(img.getAttribute('width')).toBe('400');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.hasAttribute('fetchpriority')).toBe(false);
  });

  it('also renders lazy light-theme variants', async () => {
    const fixture = create(true);
    await fixture.whenStable();
    const img = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>('.light img')!;
    expect(img.getAttribute('src')).toBe('/assets/img/hardware-light-800.png');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('loads the priority (LCP) image eagerly with high fetch priority', async () => {
    const fixture = create(true);
    await fixture.whenStable();
    const img = (fixture.nativeElement as HTMLElement).querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });
});

describe('Icon', () => {
  it('renders a decorative svg path', async () => {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', 'chip');
    await fixture.whenStable();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelector('path')!.getAttribute('d')).toContain('M8 6h8');
  });
});
