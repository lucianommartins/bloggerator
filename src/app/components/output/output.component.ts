import { Component, inject, input, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe, NgClass } from '@angular/common';
import { GoogleGenAI } from '@google/genai';
import { I18nService } from '../../i18n/i18n.service';
import { GeneratedPost, MediaPlaceholder } from '../../models/blog.model';
import { MediaService } from '../../services/media.service';
import { ApiKeyService } from '../../services/api-key.service';

// Track individual media generation state
interface MediaState {
  isGenerating: boolean;
  elapsedSeconds: number;
  error?: string;
}

@Component({
  selector: 'app-output',
  standalone: true,
  template: `
    <div class="output-container animate-slide-up">
      <!-- Tab Navigation -->
      <div class="tabs">
        @for (post of posts(); track post.id) {
          <button 
            class="tab" 
            [class.active]="activeTab() === post.id"
            (click)="setActiveTab(post.id)"
          >
            {{ getLanguageFlag(post.language) }} {{ post.title | slice:0:30 }}...
          </button>
        }
      </div>

      <!-- Content -->
      @for (post of posts(); track post.id) {
        @if (activeTab() === post.id) {
          <div class="output-content card">
            <div class="output-header">
              <div class="title-section">
                <h2>{{ post.title }}</h2>
                <div class="post-metrics">
                  <span class="metric">📝 {{ getWordCount(post.markdown) }} palavras</span>
                  <span class="metric">⏱️ {{ getReadingTime(post.markdown) }} min leitura</span>
                </div>
              </div>
              <div class="output-actions">
                @if (isUserLanguage(post.language)) {
                  <button class="btn btn-ghost" (click)="toggleEditMode(post.id)" [title]="isEditing(post.id) ? 'Visualizar' : 'Editar'">
                    {{ isEditing(post.id) ? '👁️' : '✏️' }}
                  </button>
                  @if (hasEdits() && !isEditing(post.id)) {
                    <button class="btn btn-primary btn-sm" (click)="syncToOtherLanguages()" [disabled]="isSyncing()">
                      @if (isSyncing()) {
                        <span class="spinner"></span> Sincronizando...
                      } @else {
                        🔄 Sync Idiomas
                      }
                    </button>
                  }
                }
                <button class="btn btn-secondary" (click)="copyMarkdown(post)">
                  @if (copied()) {
                    {{ t().output.copied }}
                  } @else {
                    {{ t().output.copyMarkdown }}
                  }
                </button>
              </div>
            </div>

            <!-- Markdown Edit/Preview -->
            @if (isUserLanguage(post.language) && isEditing(post.id)) {
              <textarea
                class="textarea markdown-editor"
                [(ngModel)]="post.markdown"
                (ngModelChange)="onMarkdownChange()"
                rows="15"
              ></textarea>
            } @else {
              <div class="markdown-preview">
                <pre><code>{{ post.markdown }}</code></pre>
              </div>
            }

            <!-- SEO Section -->
            @if (post.seo) {
              <details class="seo-section" [open]="seoExpanded()">
                <summary class="seo-header" (click)="toggleSeoSection()">
                  <span>📊 SEO Metadata</span>
                  <span class="seo-status">{{ getSeoScore(post.seo) }}</span>
                </summary>
                <div class="seo-content">
                  <!-- SERP Preview -->
                  <div class="serp-preview">
                    <div class="serp-title">{{ post.seo.metaTitle | slice:0:60 }}{{ post.seo.metaTitle.length > 60 ? '...' : '' }}</div>
                    <div class="serp-url">https://bloggerator.lmm.ai/blog/{{ post.seo.slug }}</div>
                    <div class="serp-description">{{ post.seo.metaDescription | slice:0:160 }}{{ post.seo.metaDescription.length > 160 ? '...' : '' }}</div>
                  </div>

                  <!-- SEO Fields -->
                  <div class="seo-fields">
                    <div class="seo-field">
                      <label>Meta Title <span class="char-count" [class.warning]="post.seo.metaTitle.length > 60" [class.ok]="post.seo.metaTitle.length <= 60 && post.seo.metaTitle.length >= 50">({{ post.seo.metaTitle.length }}/60)</span></label>
                      <input type="text" [(ngModel)]="post.seo.metaTitle" class="input" />
                    </div>
                    <div class="seo-field">
                      <label>Meta Description <span class="char-count" [class.warning]="post.seo.metaDescription.length > 158" [class.ok]="post.seo.metaDescription.length >= 120 && post.seo.metaDescription.length <= 158">({{ post.seo.metaDescription.length }}/158)</span></label>
                      <textarea [(ngModel)]="post.seo.metaDescription" class="textarea" rows="2"></textarea>
                    </div>
                    <div class="seo-field">
                      <label>Slug</label>
                      <input type="text" [(ngModel)]="post.seo.slug" class="input" />
                    </div>
                    <div class="seo-field">
                      <label>Tags</label>
                      <div class="tags-container">
                        @for (tag of post.seo.tags; track tag) {
                          <span class="tag">{{ tag }}</span>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            }

            <!-- Media Placeholders -->
            <div class="media-section">
              <div class="media-section-header">
                <h3>Media</h3>
                <div class="media-actions">
                  <button class="btn btn-secondary btn-sm" (click)="addMediaPlaceholder(post, 'image')">+ 🖼️</button>
                  <button class="btn btn-secondary btn-sm" (click)="addMediaPlaceholder(post, 'video')">+ 🎬</button>
                </div>
              </div>
              @if (post.mediaPlaceholders.length > 0) {
                <div class="media-grid">
                  @for (media of post.mediaPlaceholders; track media.id) {
                    <div class="media-card">
                      <div class="media-header">
                        <span class="media-type">{{ media.type === 'image' ? '🖼️' : '🎬' }}</span>
                        <span class="media-tool">{{ media.tool }}</span>
                        <button class="btn-ghost btn-remove-media" (click)="removeMediaPlaceholder(post, media.id)" title="Remover">×</button>
                      </div>
                      
                      <textarea 
                        class="textarea media-prompt" 
                        rows="3"
                        [(ngModel)]="media.prompt"
                        [placeholder]="t().media.editPrompt"
                      ></textarea>

                      @if (media.generated && media.url) {
                        <div class="media-preview">
                          @if (media.type === 'image') {
                            <img [src]="media.url" alt="Generated image" />
                          } @else {
                            <video [src]="media.url" controls></video>
                          }
                        </div>
                      }

                      <!-- Error message -->
                      @if (getMediaState(media.id).error) {
                        <div class="media-error">
                          {{ getMediaState(media.id).error }}
                        </div>
                      }

                      <button 
                        class="btn btn-primary w-full" 
                        (click)="generateMedia(media)"
                        [disabled]="getMediaState(media.id).isGenerating"
                      >
                        @if (getMediaState(media.id).isGenerating) {
                          <span class="generating-indicator">
                            <span class="spinner"></span>
                            <span class="timer">{{ getMediaState(media.id).elapsedSeconds }}s</span>
                          </span>
                        } @else {
                          {{ media.type === 'image' ? t().media.generateImage : t().media.generateVideo }}
                        }
                      </button>
                    </div>
                  }
                </div>
              } @else {
                <p class="empty-media-text">Adicione imagens ou vídeos usando os botões acima</p>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .output-container {
      margin-top: var(--spacing-xl);
    }

    .tabs {
      display: flex;
      gap: var(--spacing-sm);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: var(--spacing-sm);
      margin-bottom: var(--spacing-lg);
      overflow-x: auto;
    }

    .tab {
      padding: var(--spacing-sm) var(--spacing-md);
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      white-space: nowrap;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      &:hover {
        background: var(--bg-tertiary);
        color: var(--text-primary);
      }

      &.active {
        background: var(--accent-primary);
        color: white;
      }
    }

    .output-content {
      background: var(--bg-secondary);
    }

    .output-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-lg);
      padding-bottom: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
      gap: var(--spacing-md);
      flex-wrap: wrap;
    }

    .title-section {
      flex: 1;
      min-width: 200px;

      h2 {
        font-size: 1.25rem;
        margin-bottom: var(--spacing-xs);
      }
    }

    .post-metrics {
      display: flex;
      gap: var(--spacing-md);
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .metric {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .markdown-preview {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: var(--spacing-md);
      max-height: 400px;
      overflow: auto;

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 0.875rem;
        font-family: 'Fira Code', 'Monaco', monospace;
        color: var(--text-secondary);
      }
    }

    .markdown-editor {
      width: 100%;
      font-family: 'Fira Code', 'Monaco', monospace;
      font-size: 0.875rem;
      min-height: 350px;
      resize: vertical;
    }

    .media-section {
      margin-top: var(--spacing-xl);
      padding-top: var(--spacing-lg);
      border-top: 1px solid var(--border-color);

      h3 {
        margin: 0;
      }
    }

    .media-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);
    }

    .media-actions {
      display: flex;
      gap: var(--spacing-xs);
    }

    .empty-media-text {
      color: var(--text-muted);
      text-align: center;
      padding: var(--spacing-lg);
      font-style: italic;
    }

    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--spacing-md);
    }

    .media-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: var(--spacing-md);
    }

    .media-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);
    }

    .media-type {
      font-size: 1.5rem;
    }

    .media-tool {
      font-size: 0.75rem;
      color: var(--text-muted);
      background: var(--bg-tertiary);
      padding: 2px 8px;
      border-radius: var(--radius-full);
      flex: 1;
    }

    .btn-remove-media {
      font-size: 1.25rem;
      color: var(--error);
      padding: 0 var(--spacing-xs);
      margin-left: auto;
    }

    .media-prompt {
      margin-bottom: var(--spacing-sm);
      font-size: 0.875rem;
    }

    .media-preview {
      margin-bottom: var(--spacing-sm);
      border-radius: var(--radius-md);
      overflow: hidden;

      img, video {
        width: 100%;
        display: block;
      }
    }

    .media-error {
      background: rgba(244, 67, 54, 0.1);
      border: 1px solid var(--error);
      color: var(--error);
      padding: var(--spacing-sm);
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-sm);
      font-size: 0.75rem;
    }

    .generating-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .timer {
      font-family: 'Fira Code', monospace;
      font-size: 0.875rem;
    }

    /* SEO Section Styles */
    .seo-section {
      margin-top: var(--spacing-lg);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
    }

    .seo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      cursor: pointer;
      font-weight: 500;
    }

    .seo-status {
      font-size: 0.875rem;
    }

    .seo-content {
      padding: var(--spacing-md);
      border-top: 1px solid var(--border-color);
    }

    .serp-preview {
      background: white;
      color: #202124;
      padding: var(--spacing-md);
      border-radius: var(--radius-sm);
      margin-bottom: var(--spacing-md);
      font-family: Arial, sans-serif;
    }

    .serp-title {
      color: #1a0dab;
      font-size: 1.125rem;
      margin-bottom: 4px;
      cursor: pointer;
    }

    .serp-title:hover {
      text-decoration: underline;
    }

    .serp-url {
      color: #006621;
      font-size: 0.875rem;
      margin-bottom: 4px;
    }

    .serp-description {
      color: #545454;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .seo-fields {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .seo-field label {
      display: block;
      margin-bottom: var(--spacing-xs);
      font-weight: 500;
      font-size: 0.875rem;
    }

    .char-count {
      font-weight: 400;
      color: var(--text-muted);
    }

    .char-count.ok {
      color: var(--color-success);
    }

    .char-count.warning {
      color: var(--color-warning);
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .tag {
      background: var(--accent-primary);
      color: white;
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
  imports: [FormsModule, SlicePipe]
})
export class OutputComponent {
  private i18n = inject(I18nService);
  private mediaService = inject(MediaService);
  private apiKeyService = inject(ApiKeyService);

  posts = input.required<GeneratedPost[]>();

  t = this.i18n.t;
  activeTab = signal<string>('');
  copied = signal(false);
  editingPosts = signal<Set<string>>(new Set());
  hasEdits = signal(false);
  isSyncing = signal(false);
  seoExpanded = signal(true);
  private originalMarkdown = '';

  // Track state per media item for parallel generation using signal for reactivity
  mediaStates = signal<Record<string, MediaState>>({});
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  toggleSeoSection(): void {
    this.seoExpanded.update(v => !v);
  }

  getSeoScore(seo: { metaTitle: string; metaDescription: string; slug: string; tags: string[] }): string {
    let score = 0;
    // Title check (50-60 chars)
    if (seo.metaTitle.length >= 50 && seo.metaTitle.length <= 60) score++;
    // Description check (120-158 chars)
    if (seo.metaDescription.length >= 120 && seo.metaDescription.length <= 158) score++;
    // Slug check (has value, lowercase, no spaces)
    if (seo.slug && seo.slug === seo.slug.toLowerCase() && !seo.slug.includes(' ')) score++;
    // Tags check (3-5 tags)
    if (seo.tags.length >= 3 && seo.tags.length <= 5) score++;

    if (score === 4) return '✅ Ótimo';
    if (score >= 2) return '⚠️ Bom';
    return '❌ Melhorar';
  }

  isUserLanguage(postLanguage: string): boolean {
    return postLanguage === this.i18n.language();
  }

  isEditing(postId: string): boolean {
    return this.editingPosts().has(postId);
  }

  toggleEditMode(postId: string): void {
    const current = this.editingPosts();
    const newSet = new Set(current);
    if (newSet.has(postId)) {
      newSet.delete(postId);
    } else {
      // Save original markdown when entering edit mode
      const post = this.posts().find(p => p.id === postId);
      if (post) {
        this.originalMarkdown = post.markdown;
      }
      newSet.add(postId);
    }
    this.editingPosts.set(newSet);
  }

  onMarkdownChange(): void {
    const userPost = this.posts().find(p => p.language === this.i18n.language());
    if (userPost && userPost.markdown !== this.originalMarkdown) {
      this.hasEdits.set(true);
    }
  }

  async syncToOtherLanguages(): Promise<void> {
    const userPost = this.posts().find(p => p.language === this.i18n.language());
    if (!userPost) return;

    const otherPosts = this.posts().filter(p => p.language !== this.i18n.language());
    if (otherPosts.length === 0) return;

    this.isSyncing.set(true);

    try {
      const client = new GoogleGenAI({ apiKey: this.apiKeyService.getApiKey() });

      for (const targetPost of otherPosts) {
        const prompt = `Você é um tradutor especializado em blogs técnicos.

O usuário editou um post no idioma ${this.i18n.getLanguageForPrompt()}.
Adapte as mudanças para ${targetPost.language === 'en' ? 'English' : targetPost.language === 'es' ? 'Spanish' : 'Brazilian Portuguese'}.

POST ORIGINAL (antes das edições):
${this.originalMarkdown}

POST EDITADO:
${userPost.markdown}

POST ATUAL NO IDIOMA DESTINO:
${targetPost.markdown}

INSTRUÇÕES:
1. Identifique as diferenças entre o post original e o editado
2. Aplique as mesmas mudanças no post do idioma destino
3. Mantenha o estilo e formatação markdown
4. Retorne APENAS o markdown atualizado, sem explicações`;

        const response = await client.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });

        const newMarkdown = response.text || targetPost.markdown;
        targetPost.markdown = newMarkdown;
      }

      this.hasEdits.set(false);
      this.originalMarkdown = userPost.markdown;
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing.set(false);
    }
  }


  ngOnChanges(): void {
    const postsValue = this.posts();
    if (postsValue.length > 0 && !this.activeTab()) {
      this.activeTab.set(postsValue[0].id);
    }
  }

  ngOnDestroy(): void {
    // Clear all timers
    this.timers.forEach(timer => clearInterval(timer));
  }

  setActiveTab(id: string): void {
    this.activeTab.set(id);
  }

  getLanguageFlag(lang: string): string {
    const flags: Record<string, string> = {
      'pt-br': '🇧🇷',
      'en': '🇬🇧',
      'es': '🇪🇸'
    };
    return flags[lang] || '🌐';
  }

  getMediaState(mediaId: string): MediaState {
    const states = this.mediaStates();
    return states[mediaId] || { isGenerating: false, elapsedSeconds: 0 };
  }

  private updateMediaState(mediaId: string, updates: Partial<MediaState>): void {
    this.mediaStates.update(states => ({
      ...states,
      [mediaId]: { ...this.getMediaState(mediaId), ...updates }
    }));
  }

  async copyMarkdown(post: GeneratedPost): Promise<void> {
    try {
      await navigator.clipboard.writeText(post.markdown);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  async generateMedia(media: MediaPlaceholder): Promise<void> {
    // Reset state
    this.updateMediaState(media.id, {
      isGenerating: true,
      elapsedSeconds: 0,
      error: undefined
    });

    // Start timer for this specific media
    const timer = setInterval(() => {
      const current = this.getMediaState(media.id);
      this.updateMediaState(media.id, {
        elapsedSeconds: current.elapsedSeconds + 1
      });
    }, 1000);
    this.timers.set(media.id, timer);

    try {
      if (media.type === 'image') {
        const result = await this.mediaService.generateImage(media.prompt);
        media.url = result.dataUrl;
        media.generated = true;
      } else {
        const result = await this.mediaService.generateVideo(media.prompt, (status, seconds) => {
          if (seconds !== undefined) {
            this.updateMediaState(media.id, { elapsedSeconds: seconds });
          }
        });
        media.url = result.dataUrl;
        media.generated = true;
      }
    } catch (err: any) {
      this.updateMediaState(media.id, { error: err.message || 'Failed to generate media' });
      console.error('Failed to generate media:', err);
    } finally {
      // Stop timer
      const mediaTimer = this.timers.get(media.id);
      if (mediaTimer) {
        clearInterval(mediaTimer);
        this.timers.delete(media.id);
      }
      this.updateMediaState(media.id, { isGenerating: false });
    }
  }

  addMediaPlaceholder(post: GeneratedPost, type: 'image' | 'video'): void {
    const newPlaceholder: MediaPlaceholder = {
      id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      prompt: '',
      tool: type === 'video' ? 'veo3' as const : 'nano-banana' as const,
      generated: false
    };
    post.mediaPlaceholders.push(newPlaceholder);
  }

  removeMediaPlaceholder(post: GeneratedPost, mediaId: string): void {
    const index = post.mediaPlaceholders.findIndex(m => m.id === mediaId);
    if (index !== -1) {
      post.mediaPlaceholders.splice(index, 1);
    }
  }

  getWordCount(markdown: string): number {
    // Remove markdown syntax and count words
    const text = markdown
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
      .replace(/[#*`_~]/g, '') // Remove markdown formatting
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    return text ? text.split(' ').length : 0;
  }

  getReadingTime(markdown: string): number {
    const words = this.getWordCount(markdown);
    const wordsPerMinute = 200; // Average reading speed
    return Math.max(1, Math.round(words / wordsPerMinute));
  }
}
