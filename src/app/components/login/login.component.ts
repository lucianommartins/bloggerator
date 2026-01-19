import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="login-container">
      <div class="login-card animate-slide-up">
        <!-- Header -->
        <div class="login-header">
          <div class="logo">
            <img src="bloggerator.png" alt="Bloggerator" class="logo-img" />
          </div>
          <h1>{{ t().app.title }}</h1>
          <p class="tagline">{{ t().login.tagline }}</p>
        </div>

        <!-- Login Button -->
        <button class="btn-google" (click)="signIn()" [disabled]="isLoading()">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{{ t().login.googleButton }}</span>
        </button>

        <!-- Theme & Language Toggle -->
        <div class="login-footer">
          <button class="btn-ghost" (click)="toggleTheme()">
            @if (isDark()) {
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            } @else {
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            }
          </button>
          
          <select class="language-select" [value]="currentLang()" (change)="changeLang($event)">
            @for (lang of languages; track lang.code) {
              <option [value]="lang.code">{{ lang.name }}</option>
            }
          </select>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--gradient-surface);
      padding: var(--spacing-lg);
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: var(--spacing-2xl);
      text-align: center;
      box-shadow: var(--shadow-lg);
    }

    .login-header {
      margin-bottom: var(--spacing-xl);
    }

    .logo {
      margin-bottom: 0;
    }

    .logo-img {
      width: 96px;
      height: 96px;
      object-fit: contain;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: var(--spacing-sm);
      background: linear-gradient(135deg, var(--accent-secondary), var(--accent-primary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .tagline {
      color: var(--text-muted);
      font-size: 0.9375rem;
    }

    .btn-google {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md) var(--spacing-lg);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-normal);

      &:hover:not(:disabled) {
        background: var(--bg-tertiary);
        border-color: var(--accent-primary);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .login-footer {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--spacing-md);
      margin-top: var(--spacing-xl);
      padding-top: var(--spacing-lg);
      border-top: 1px solid var(--border-color);
    }

    .language-select {
      background: var(--bg-surface);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: 0.875rem;
      cursor: pointer;

      &:focus {
        outline: none;
        border-color: var(--accent-primary);
      }
    }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private i18n = inject(I18nService);
  private themeService = inject(ThemeService);

  t = this.i18n.t;
  isLoading = this.auth.isLoading;
  isDark = this.themeService.isDark;
  currentLang = this.i18n.language;
  languages = this.i18n.availableLanguages;

  async signIn(): Promise<void> {
    try {
      await this.auth.signInWithGoogle();
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  changeLang(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.i18n.setLanguage(select.value as any);
  }
}
