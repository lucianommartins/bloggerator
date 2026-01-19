import { Component, inject, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiKeyService } from '../../services/api-key.service';
import { I18nService, Language } from '../../i18n/i18n.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>⚙️ {{ t().settings.title }}</h2>
          <button class="btn-ghost btn-close" (click)="close.emit()">×</button>
        </div>

        <div class="modal-body">
          <!-- API Key Section -->
          <div class="settings-section">
            <h3>🔑 {{ t().settings.apiKey }}</h3>
            <p class="helper-text">{{ t().settings.apiKeyDescription }}</p>
            
            <div class="api-key-row">
              <input 
                [type]="showApiKey() ? 'text' : 'password'"
                class="input" 
                [(ngModel)]="apiKeyInput"
                [placeholder]="hasApiKey() ? '••••••••••••••••' : t().settings.apiKeyPlaceholder"
              />
              <button class="btn-ghost" (click)="toggleShowApiKey()">
                {{ showApiKey() ? '🙈' : '👁️' }}
              </button>
            </div>

            <div class="api-key-actions">
              <button class="btn btn-primary" (click)="saveApiKey()" [disabled]="!apiKeyInput.trim()">
                {{ t().settings.save }}
              </button>
              @if (hasApiKey()) {
                <button class="btn btn-secondary" (click)="clearApiKey()">
                  {{ t().settings.clear }}
                </button>
              }
            </div>

            @if (apiKeySaved()) {
              <p class="success-message">✅ {{ t().settings.apiKeySaved }}</p>
            }
          </div>

          <!-- Language Section -->
          <div class="settings-section">
            <h3>🌐 {{ t().settings.language }}</h3>
            <p class="helper-text">{{ t().settings.languageDescription }}</p>
            
            <div class="language-options">
              @for (lang of languages; track lang.code) {
                <label class="language-option" [class.active]="currentLang() === lang.code">
                  <input 
                    type="radio" 
                    name="language"
                    [value]="lang.code"
                    [checked]="currentLang() === lang.code"
                    (change)="setLanguage(lang.code)"
                  />
                  <span class="flag">{{ lang.flag }}</span>
                  <span class="name">{{ lang.name }}</span>
                </label>
              }
            </div>
          </div>

          <!-- Theme Section -->
          <div class="settings-section">
            <h3>🎨 {{ t().settings.theme }}</h3>
            <div class="theme-options">
              <button 
                class="theme-btn" 
                [class.active]="isDark()"
                (click)="setTheme('dark')"
              >
                🌙 Dark
              </button>
              <button 
                class="theme-btn" 
                [class.active]="!isDark()"
                (click)="setTheme('light')"
              >
                ☀️ Light
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">
            {{ t().settings.close }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);

      h2 {
        font-size: 1.25rem;
        margin: 0;
      }
    }

    .btn-close {
      font-size: 1.5rem;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-body {
      padding: var(--spacing-lg);
    }

    .settings-section {
      margin-bottom: var(--spacing-xl);

      &:last-child {
        margin-bottom: 0;
      }

      h3 {
        font-size: 1rem;
        margin-bottom: var(--spacing-xs);
      }
    }

    .helper-text {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-bottom: var(--spacing-md);
    }

    .api-key-row {
      display: flex;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);
    }

    .api-key-actions {
      display: flex;
      gap: var(--spacing-sm);
    }

    .success-message {
      color: var(--success);
      font-size: 0.875rem;
      margin-top: var(--spacing-sm);
    }

    .language-options {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .language-option {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      input {
        display: none;
      }

      &:hover, &.active {
        border-color: var(--accent-primary);
        background: var(--bg-tertiary);
      }

      .flag {
        font-size: 1.25rem;
      }

      .name {
        font-size: 0.875rem;
      }
    }

    .theme-options {
      display: flex;
      gap: var(--spacing-sm);
    }

    .theme-btn {
      flex: 1;
      padding: var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover, &.active {
        border-color: var(--accent-primary);
        background: var(--bg-tertiary);
      }
    }

    .modal-footer {
      padding: var(--spacing-lg);
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class SettingsComponent {
  private apiKeyService = inject(ApiKeyService);
  private i18n = inject(I18nService);
  private themeService = inject(ThemeService);

  close = output<void>();

  t = this.i18n.t;
  hasApiKey = this.apiKeyService.hasApiKey;
  currentLang = this.i18n.language;
  isDark = this.themeService.isDark;

  apiKeyInput = '';
  showApiKey = signal(false);
  apiKeySaved = signal(false);

  languages = [
    { code: 'pt-br' as Language, name: 'Português (Brasil)', flag: '🇧🇷' },
    { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
    { code: 'es' as Language, name: 'Español', flag: '🇪🇸' },
  ];

  toggleShowApiKey(): void {
    this.showApiKey.update(v => !v);
  }

  saveApiKey(): void {
    if (this.apiKeyInput.trim()) {
      this.apiKeyService.setApiKey(this.apiKeyInput.trim());
      this.apiKeyInput = '';
      this.apiKeySaved.set(true);
      setTimeout(() => this.apiKeySaved.set(false), 3000);
    }
  }

  clearApiKey(): void {
    this.apiKeyService.clearApiKey();
    this.apiKeyInput = '';
  }

  setLanguage(lang: Language): void {
    this.i18n.setLanguage(lang);
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.themeService.setTheme(theme);
  }
}
