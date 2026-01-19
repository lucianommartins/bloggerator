import { Injectable, signal } from '@angular/core';

type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentTheme = signal<Theme>(this.detectTheme());
  
  readonly theme = this.currentTheme.asReadonly();
  readonly isDark = signal(true);

  constructor() {
    this.applyTheme(this.currentTheme());
  }

  private detectTheme(): Theme {
    const stored = localStorage.getItem('bloggerator-theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    // Respeita preferência do sistema
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
    this.isDark.set(theme === 'dark');
  }

  toggleTheme(): void {
    const newTheme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    localStorage.setItem('bloggerator-theme', theme);
    this.applyTheme(theme);
  }
}
