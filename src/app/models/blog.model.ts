import { Language } from '../i18n/i18n.service';

export interface BlogGenerationRequest {
  referenceBlogs: string[];      // max 5
  contextUrls: string[];         // max 15
  direction: string;
  targetLanguages: Language[];
}

export interface MediaPlaceholder {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  tool: 'nano-banana' | 'veo3';
  generated?: boolean;
  url?: string;
}

export interface GeneratedPost {
  id: string;
  language: Language;
  title: string;
  markdown: string;
  mediaPlaceholders: MediaPlaceholder[];
  generatedAt: Date;
}

export interface GenerationResult {
  posts: GeneratedPost[];
  rawMarkdown: string;
}

export const URL_LIMITS = {
  REFERENCE_BLOGS: 5,
  CONTEXT_URLS: 15,
  TOTAL: 20
} as const;
