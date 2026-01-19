import { Injectable, inject } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { ApiKeyService } from './api-key.service';
import { I18nService, Language } from '../i18n/i18n.service';
import { BlogGenerationRequest, GeneratedPost, MediaPlaceholder, URL_LIMITS } from '../models/blog.model';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiKeyService = inject(ApiKeyService);
  private i18n = inject(I18nService);

  private getClient(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: this.apiKeyService.getApiKey() });
  }

  async generateBlogPost(request: BlogGenerationRequest): Promise<GeneratedPost[]> {
    // Valida limite de URLs
    const totalUrls = request.referenceBlogs.length + request.contextUrls.length;
    if (totalUrls > URL_LIMITS.TOTAL) {
      throw new Error(`Limite de ${URL_LIMITS.TOTAL} URLs excedido. Total: ${totalUrls}`);
    }

    const client = this.getClient();
    const allUrls = [...request.referenceBlogs, ...request.contextUrls];
    const languagesText = this.i18n.getLanguagesForPrompt(request.targetLanguages);

    const prompt = this.buildPrompt(request, languagesText);

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 8192,
        tools: allUrls.length > 0 ? [{ urlContext: {} }] : undefined,
      },
    });

    const text = response.text || '';
    return this.parseResponse(text, request.targetLanguages);
  }

  private buildPrompt(request: BlogGenerationRequest, languagesText: string): string {
    const referenceBlogsSection = request.referenceBlogs.length > 0
      ? `
## BLOGS DE REFERÊNCIA (para extrair estilo de escrita)
${request.referenceBlogs.map((url, i) => `${i + 1}. ${url}`).join('\n')}

Analise esses blogs para entender:
- Tom de voz (formal, informal, técnico, humorístico)
- Estrutura típica dos posts
- Como código é formatado e explicado
- Como imagens são usadas e referenciadas
- Padrões de títulos e subtítulos
`
      : '';

    const contextSection = request.contextUrls.length > 0
      ? `
## CONTEXTO DO TEMA
${request.contextUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

Use essas URLs para extrair informações técnicas sobre o tema do post.
`
      : '';

    return `Você é um ghostwriter especializado em criar posts de blog técnicos.

${referenceBlogsSection}
${contextSection}

## DIRECIONAMENTO DO USUÁRIO
${request.direction}

## INSTRUÇÕES
1. Gere um post de blog completo para cada idioma: ${languagesText}
2. Mantenha o estilo de escrita dos blogs de referência
3. Use markdown formatado
4. Inclua blocos de código quando relevante
5. Sugira pontos onde imagens ou vídeos podem ser inseridos usando este formato:
   - Para imagem: <!-- IMAGE: [descrição detalhada para gerar com IA] -->
   - Para vídeo: <!-- VIDEO: [descrição detalhada para gerar com IA] -->

## FORMATO DE RESPOSTA
Responda em JSON válido com esta estrutura:
{
  "posts": [
    {
      "language": "pt-br",
      "title": "Título do Post",
      "markdown": "# Título\\n\\nConteúdo em markdown...",
      "mediaPlaceholders": [
        {
          "type": "image",
          "prompt": "Descrição detalhada para gerar a imagem"
        }
      ]
    }
  ]
}

IMPORTANTE: Retorne APENAS o JSON, sem texto antes ou depois.`;
  }

  private parseResponse(text: string, targetLanguages: Language[]): GeneratedPost[] {
    try {
      // Tenta extrair JSON da resposta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não contém JSON válido');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.posts || !Array.isArray(parsed.posts)) {
        throw new Error('Formato de resposta inválido');
      }

      return parsed.posts.map((post: any, index: number) => ({
        id: `post-${Date.now()}-${index}`,
        language: post.language || targetLanguages[index] || 'en',
        title: post.title || 'Untitled',
        markdown: post.markdown || '',
        mediaPlaceholders: (post.mediaPlaceholders || []).map((mp: any, mpIndex: number) => ({
          id: `media-${Date.now()}-${index}-${mpIndex}`,
          type: mp.type || 'image',
          prompt: mp.prompt || '',
          tool: mp.type === 'video' ? 'veo3' : 'nano-banana',
          generated: false,
        })),
        generatedAt: new Date(),
      }));
    } catch (error) {
      console.error('Error parsing response:', error);
      throw new Error('Falha ao processar resposta do Gemini');
    }
  }

  async generateImage(prompt: string): Promise<string> {
    const client = this.getClient();

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate an image with Nano Banana based on this prompt: ${prompt}`,
      config: {
        responseModalities: ['image', 'text'],
      },
    });

    // Extrai URL da imagem da resposta
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error('Nenhuma imagem gerada');
  }

  async generateVideo(prompt: string): Promise<string> {
    const client = this.getClient();

    const response = await client.models.generateContent({
      model: 'veo-3.1-generate',
      contents: prompt,
    });

    // Por enquanto, retorna placeholder - Veo 3 pode ter API diferente
    return 'video-placeholder';
  }
}
