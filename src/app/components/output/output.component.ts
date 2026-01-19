import { Component, inject, input, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe, NgClass } from '@angular/common';
import { I18nService } from '../../i18n/i18n.service';
import { GeneratedPost, MediaPlaceholder } from '../../models/blog.model';
import { MediaService } from '../../services/media.service';

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
              <h2>{{ post.title }}</h2>
              <div class="output-actions">
                <button class="btn btn-secondary" (click)="copyMarkdown(post)">
                  @if (copied()) {
                    {{ t().output.copied }}
                  } @else {
                    {{ t().output.copyMarkdown }}
                  }
                </button>
              </div>
            </div>

            <!-- Markdown Preview -->
            <div class="markdown-preview">
              <pre><code>{{ post.markdown }}</code></pre>
            </div>

            <!-- Media Placeholders -->
            @if (post.mediaPlaceholders.length > 0) {
              <div class="media-section">
                <h3>Media</h3>
                <div class="media-grid">
                  @for (media of post.mediaPlaceholders; track media.id) {
                    <div class="media-card">
                      <div class="media-header">
                        <span class="media-type">{{ media.type === 'image' ? '🖼️' : '🎬' }}</span>
                        <span class="media-tool">{{ media.tool }}</span>
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
              </div>
            }
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
      align-items: center;
      margin-bottom: var(--spacing-lg);
      padding-bottom: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);

      h2 {
        font-size: 1.25rem;
      }
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

    .media-section {
      margin-top: var(--spacing-xl);
      padding-top: var(--spacing-lg);
      border-top: 1px solid var(--border-color);

      h3 {
        margin-bottom: var(--spacing-md);
      }
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
      justify-content: space-between;
      align-items: center;
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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
  imports: [FormsModule, SlicePipe]
})
export class OutputComponent {
  private i18n = inject(I18nService);
  private mediaService = inject(MediaService);

  posts = input.required<GeneratedPost[]>();

  t = this.i18n.t;
  activeTab = signal<string>('');
  copied = signal(false);

  // Track state per media item for parallel generation using signal for reactivity
  mediaStates = signal<Record<string, MediaState>>({});
  private timers = new Map<string, ReturnType<typeof setInterval>>();

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
}
