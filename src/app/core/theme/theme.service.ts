import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type ThemeName = 'dark' | 'light' | 'high-contrast';

export const THEMES: readonly { readonly value: ThemeName; readonly label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'high-contrast', label: 'High contrast' },
];

const STORAGE_KEY = 'app-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<ThemeName>(this.readStored());

  constructor() {
    effect(() => {
      const theme = this.theme();
      this.root.setAttribute('data-theme', theme);
      if (this.isBrowser) {
        try {
          localStorage.setItem(STORAGE_KEY, theme);
        } catch {
          /* storage may be blocked; the theme still applies for this session */
        }
      }
    });
  }

  set(theme: ThemeName): void {
    this.theme.set(theme);
  }

  private readStored(): ThemeName {
    if (!this.isBrowser) {
      return 'dark';
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return THEMES.find((t) => t.value === stored)?.value ?? 'dark';
    } catch {
      return 'dark';
    }
  }
}
