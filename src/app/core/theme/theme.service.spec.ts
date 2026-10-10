import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to the dark theme', () => {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('applies and persists an explicit theme', () => {
    const service = TestBed.inject(ThemeService);
    service.set('high-contrast');
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
    expect(localStorage.getItem('app-theme')).toBe('high-contrast');
  });

  it('restores a stored theme and ignores invalid values', () => {
    localStorage.setItem('app-theme', 'light');
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
    TestBed.resetTestingModule();
    localStorage.setItem('app-theme', 'neon');
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });
});
