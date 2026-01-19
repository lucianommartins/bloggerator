import { Injectable, signal, computed } from '@angular/core';
import { ptBr } from './pt-br';
import { en } from './en';
import { es } from './es';

export type Language = 'pt-br' | 'en' | 'es';

const translations: Record<Language, typeof ptBr> = {
  'pt-br': ptBr,
  'en': en,
  'es': es,
};

const languageNames: Record<Language, string> = {
  'pt-br': 'Português',
  'en': 'English',
  'es': 'Español',
};

const languageForPrompt: Record<Language, string> = {
  'pt-br': 'Brazilian Portuguese',
  'en': 'English',
  'es': 'Spanish',
};

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private currentLanguage = signal<Language>(this.detectLanguage());

  readonly language = this.currentLanguage.asReadonly();
  readonly t = computed(() => translations[this.currentLanguage()]);
  readonly availableLanguages = Object.entries(languageNames).map(([code, name]) => ({
    code: code as Language,
    name
  }));

  private detectLanguage(): Language {
    const stored = localStorage.getItem('bloggerator-language');
    if (stored && stored in translations) {
      return stored as Language;
    }
    
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('pt')) return 'pt-br';
    if (browserLang.startsWith('es')) return 'es';
    return 'en';
  }

  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
    localStorage.setItem('bloggerator-language', lang);
  }

  getLanguageForPrompt(): string {
    return languageForPrompt[this.currentLanguage()];
  }

  getLanguagesForPrompt(languages: Language[]): string {
    return languages.map(l => languageForPrompt[l]).join(', ');
  }
}
