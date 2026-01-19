import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiKeyService } from '../../services/api-key.service';
import { GeminiService } from '../../services/gemini.service';
import { ThemeService } from '../../services/theme.service';
import { I18nService, Language } from '../../i18n/i18n.service';
import { BlogGenerationRequest, GeneratedPost, URL_LIMITS } from '../../models/blog.model';
import { OutputComponent } from '../output/output.component';
import { SettingsComponent } from '../settings/settings.component';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [FormsModule, OutputComponent, SettingsComponent],
  template: `
    <div class="main-container">
      <!-- Header -->
      <header class="header">
        <div class="header-left">
          <img src="bloggerator.png" alt="Bloggerator" class="logo-icon" />
          <h1 class="logo-text">{{ t().app.title }}</h1>
        </div>
        <div class="header-right">
          <!-- API Key Status -->
          <div class="api-key-status" [class.configured]="hasApiKey()">
            @if (hasApiKey()) {
              <span class="status-dot green"></span>
              <span>API Key ✓</span>
            } @else {
              <span class="status-dot red"></span>
              <span>API Key ✗</span>
            }
          </div>

          <button class="btn-ghost" (click)="toggleTheme()">
            @if (isDark()) {
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            } @else {
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            }
          </button>

          <button class="btn-ghost" (click)="openSettings()" title="Settings">
            ⚙️
          </button>
          
          <div class="user-menu">
            <img [src]="user()?.photoURL" [alt]="user()?.displayName" class="avatar" />
            <button class="btn-ghost" (click)="signOut()">{{ t().settings.close === 'Fechar' ? 'Sair' : 'Logout' }}</button>
          </div>
        </div>
      </header>

      <main class="two-column-layout">
        <!-- Left Column: Input Form -->
        <div class="input-column">
          <!-- API Key Banner -->
          @if (!hasApiKey()) {
            <div class="api-key-banner card animate-slide-up">
              <h3>{{ t().settings.apiKey }}</h3>
              <p class="text-muted">{{ t().settings.apiKeyPlaceholder }}</p>
              <div class="api-key-input">
                <input 
                  type="password" 
                  class="input" 
                  [(ngModel)]="apiKeyInput"
                  [placeholder]="t().settings.apiKeyPlaceholder"
                />
                <button class="btn btn-primary" (click)="saveApiKey()">
                  {{ t().settings.save }}
                </button>
              </div>
            </div>
          }

          <!-- Input Form -->
          <div class="form-grid">
            <!-- Reference Blogs -->
            <div class="card form-section">
              <h3>{{ t().main.referenceBlogs.title }}</h3>
              <p class="helper-text">{{ t().main.referenceBlogs.description }}</p>
              <div class="url-list">
                @for (url of referenceBlogs(); track $index) {
                  <div class="url-item">
                    <input 
                      type="url" 
                      class="input" 
                      [value]="url"
                      (input)="updateReferenceUrl($index, $event)"
                      [placeholder]="t().main.referenceBlogs.placeholder"
                    />
                    <button class="btn-ghost btn-remove" (click)="removeReferenceUrl($index)">×</button>
                  </div>
                }
                @if (referenceBlogs().length < URL_LIMITS.REFERENCE_BLOGS) {
                  <button class="btn btn-secondary btn-sm" (click)="addReferenceUrl()">+ Add URL</button>
                }
              </div>
              <p class="limit-text" [class.error]="referenceBlogs().length >= URL_LIMITS.REFERENCE_BLOGS">
                {{ referenceBlogs().length }}/{{ URL_LIMITS.REFERENCE_BLOGS }} {{ t().main.referenceBlogs.limit }}
              </p>
            </div>

            <!-- Context URLs -->
            <div class="card form-section">
              <h3>{{ t().main.contextUrls.title }}</h3>
              <p class="helper-text">{{ t().main.contextUrls.description }}</p>
              <div class="url-list">
                @for (url of contextUrls(); track $index) {
                  <div class="url-item">
                    <input 
                      type="url" 
                      class="input" 
                      [value]="url"
                      (input)="updateContextUrl($index, $event)"
                      [placeholder]="t().main.contextUrls.placeholder"
                    />
                    <button class="btn-ghost btn-remove" (click)="removeContextUrl($index)">×</button>
                  </div>
                }
                @if (contextUrls().length < URL_LIMITS.CONTEXT_URLS) {
                  <button class="btn btn-secondary btn-sm" (click)="addContextUrl()">+ Add URL</button>
                }
              </div>
              <p class="limit-text" [class.error]="contextUrls().length >= URL_LIMITS.CONTEXT_URLS">
                {{ contextUrls().length }}/{{ URL_LIMITS.CONTEXT_URLS }} {{ t().main.contextUrls.limit }}
              </p>
            </div>
          </div>

          <!-- Direction -->
          <div class="card form-section">
            <h3>{{ t().main.direction.title }}</h3>
            <p class="helper-text">{{ t().main.direction.description }}</p>
            <textarea 
              class="textarea" 
              rows="3"
              [value]="direction()"
              (input)="updateDirection($event)"
              [placeholder]="t().main.direction.placeholder"
            ></textarea>
          </div>

          <!-- Target Languages + Generate Button -->
          <div class="card form-section generate-row">
            <div class="language-section">
              <h3>{{ t().main.targetLanguages.title }}</h3>
              <div class="language-checkboxes">
                <label class="checkbox-label">
                  <input type="checkbox" [checked]="targetLanguages().includes('pt-br')" (change)="toggleLanguage('pt-br')">
                  <span>{{ t().main.targetLanguages.portuguese }}</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" [checked]="targetLanguages().includes('en')" (change)="toggleLanguage('en')">
                  <span>{{ t().main.targetLanguages.english }}</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" [checked]="targetLanguages().includes('es')" (change)="toggleLanguage('es')">
                  <span>{{ t().main.targetLanguages.spanish }}</span>
                </label>
              </div>
            </div>
            <button 
              class="btn btn-primary btn-lg generate-btn" 
              (click)="generate()"
              [disabled]="!canGenerate() || isGenerating()"
            >
              @if (isGenerating()) {
                <span class="spinner"></span>
                {{ t().main.generating }}
              } @else {
                {{ t().main.generate }}
              }
            </button>
          </div>

          <!-- Error -->
          @if (error()) {
            <div class="error-banner card">
              <p>{{ error() }}</p>
            </div>
          }
        </div>

        <!-- Right Column: Output -->
        <div class="output-column">
          <div class="output-wrapper card">
            @if (generatedPosts().length > 0) {
              <app-output [posts]="generatedPosts()" />
            } @else {
              <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>{{ t().output.title }}</h3>
                <p class="text-muted">O post gerado aparecerá aqui</p>
              </div>
            }
          </div>
        </div>
      </main>

      <!-- Settings Modal -->
      @if (showSettings()) {
        <app-settings (close)="closeSettings()" />
      }
    </div>
  `,
  styles: [`
    .main-container {
      min-height: 100vh;
      background: var(--bg-primary);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md) var(--spacing-xl);
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      object-fit: contain;
    }

    .logo-text {
      font-size: 1.5rem;
      background: linear-gradient(135deg, var(--accent-secondary), var(--accent-primary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
    }

    .api-key-status {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: 0.75rem;
      color: var(--text-muted);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-md);
      background: var(--bg-tertiary);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      
      &.green { background: var(--success); }
      &.red { background: var(--error); }
    }

    .two-column-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-xl);
      padding: var(--spacing-lg);
      min-height: calc(100vh - 60px);
      align-items: start;

      @media (max-width: 1200px) {
        grid-template-columns: 1fr;
      }
    }

    .input-column {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .output-column {
      position: sticky;
      top: 80px;
      max-height: calc(100vh - 100px);
      overflow: hidden;
    }

    .output-wrapper {
      height: 100%;
      min-height: 400px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-xl);
      text-align: center;
      min-height: 300px;
      color: var(--text-muted);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: var(--spacing-md);
      opacity: 0.5;
    }

    .api-key-banner {
      background: var(--bg-tertiary);
    }

    .api-key-input {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-md);
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-md);

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }

    .form-section {
      margin-bottom: var(--spacing-lg);

      h3 {
        margin-bottom: var(--spacing-xs);
      }
    }

    .url-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-md);
    }

    .url-item {
      display: flex;
      gap: var(--spacing-sm);
    }

    .btn-remove {
      font-size: 1.5rem;
      padding: 0 var(--spacing-sm);
      color: var(--error);
    }

    .limit-text {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: var(--spacing-sm);

      &.error {
        color: var(--warning);
      }
    }

    .language-checkboxes {
      display: flex;
      gap: var(--spacing-md);
      flex-wrap: wrap;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      cursor: pointer;
      font-size: 0.875rem;

      input {
        width: 16px;
        height: 16px;
        accent-color: var(--accent-primary);
      }
    }

    .generate-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-md);
      flex-wrap: wrap;
    }

    .language-section h3 {
      margin-bottom: var(--spacing-xs);
      font-size: 0.875rem;
    }

    .generate-btn {
      white-space: nowrap;
    }

    .generate-section {
      display: flex;
      justify-content: center;
      margin: var(--spacing-xl) 0;
    }

    .btn-lg {
      padding: var(--spacing-md) var(--spacing-2xl);
      font-size: 1.125rem;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid transparent;
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-banner {
      background: rgba(244, 67, 54, 0.1);
      border-color: var(--error);
      color: var(--error);
    }
  `]
})
export class MainComponent {
  private auth = inject(AuthService);
  private apiKeyService = inject(ApiKeyService);
  private gemini = inject(GeminiService);
  private themeService = inject(ThemeService);
  private i18n = inject(I18nService);
  private router = inject(Router);

  readonly URL_LIMITS = URL_LIMITS;

  t = this.i18n.t;
  user = this.auth.currentUser;
  hasApiKey = this.apiKeyService.hasApiKey;
  isDark = this.themeService.isDark;

  apiKeyInput = '';
  direction = signal('');

  referenceBlogs = signal<string[]>(['']);
  contextUrls = signal<string[]>(['']);
  targetLanguages = signal<Language[]>(['pt-br']);

  isGenerating = signal(false);
  generatedPosts = signal<GeneratedPost[]>([]);
  error = signal<string | null>(null);
  showSettings = signal(false);

  canGenerate = computed(() => {
    return this.hasApiKey() &&
      this.direction().trim().length > 0 &&
      this.targetLanguages().length > 0;
  });

  saveApiKey(): void {
    if (this.apiKeyInput.trim()) {
      this.apiKeyService.setApiKey(this.apiKeyInput.trim());
      this.apiKeyInput = '';
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  openSettings(): void {
    this.showSettings.set(true);
  }

  closeSettings(): void {
    this.showSettings.set(false);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }

  // Reference URLs management
  addReferenceUrl(): void {
    if (this.referenceBlogs().length < URL_LIMITS.REFERENCE_BLOGS) {
      this.referenceBlogs.update(urls => [...urls, '']);
    }
  }

  removeReferenceUrl(index: number): void {
    this.referenceBlogs.update(urls => urls.filter((_, i) => i !== index));
  }

  updateReferenceUrl(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.referenceBlogs.update(urls => {
      const newUrls = [...urls];
      newUrls[index] = input.value;
      return newUrls;
    });
  }

  // Context URLs management
  addContextUrl(): void {
    if (this.contextUrls().length < URL_LIMITS.CONTEXT_URLS) {
      this.contextUrls.update(urls => [...urls, '']);
    }
  }

  removeContextUrl(index: number): void {
    this.contextUrls.update(urls => urls.filter((_, i) => i !== index));
  }

  updateContextUrl(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.contextUrls.update(urls => {
      const newUrls = [...urls];
      newUrls[index] = input.value;
      return newUrls;
    });
  }

  // Target languages
  toggleLanguage(lang: Language): void {
    this.targetLanguages.update(langs => {
      if (langs.includes(lang)) {
        return langs.filter(l => l !== lang);
      }
      return [...langs, lang];
    });
  }

  // Direction update
  updateDirection(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.direction.set(textarea.value);
  }

  // Generate
  async generate(): Promise<void> {
    if (!this.canGenerate()) return;

    this.isGenerating.set(true);
    this.error.set(null);
    this.generatedPosts.set([]);

    try {
      const request: BlogGenerationRequest = {
        referenceBlogs: this.referenceBlogs().filter(u => u.trim()),
        contextUrls: this.contextUrls().filter(u => u.trim()),
        direction: this.direction().trim(),
        targetLanguages: this.targetLanguages(),
      };

      const posts = await this.gemini.generateBlogPost(request);
      this.generatedPosts.set(posts);
    } catch (err: any) {
      this.error.set(err.message || this.t().errors.generationFailed);
    } finally {
      this.isGenerating.set(false);
    }
  }
}
