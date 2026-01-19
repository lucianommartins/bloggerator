import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiKeyService {
  private apiKeySignal = signal<string | null>(null);
  
  readonly apiKey = this.apiKeySignal.asReadonly();
  readonly hasApiKey = signal(false);

  constructor() {
    // Recupera do localStorage (persiste entre sessões)
    const stored = localStorage.getItem('bloggerator-api-key');
    if (stored) {
      this.apiKeySignal.set(stored);
      this.hasApiKey.set(true);
    }
  }

  setApiKey(key: string): void {
    this.apiKeySignal.set(key);
    this.hasApiKey.set(true);
    // Armazena no localStorage (persiste entre sessões)
    localStorage.setItem('bloggerator-api-key', key);
  }

  clearApiKey(): void {
    this.apiKeySignal.set(null);
    this.hasApiKey.set(false);
    localStorage.removeItem('bloggerator-api-key');
  }

  getApiKey(): string {
    const key = this.apiKeySignal();
    if (!key) {
      throw new Error('Gemini API key não configurada');
    }
    return key;
  }
}
