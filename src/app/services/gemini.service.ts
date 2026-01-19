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

    // Build tools array: always include googleSearch for updated info
    // Include urlContext if URLs are provided
    const tools: any[] = [{ googleSearch: {} }];
    if (allUrls.length > 0) {
      tools.push({ urlContext: {} });
    }

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 8192,
        tools,
      },
    });

    const text = response.text || '';
    return this.parseResponse(text, request.targetLanguages);
  }

  private buildPrompt(request: BlogGenerationRequest, languagesText: string): string {
    const referenceBlogsSection = request.referenceBlogs.length > 0
      ? `
## BLOGS DE REFERÊNCIA (MANDATÓRIO)
ACESSE E LEIA O CONTEÚDO COMPLETO de cada URL abaixo:
${request.referenceBlogs.map((url, i) => `${i + 1}. ${url}`).join('\n')}

⚠️ É OBRIGATÓRIO:
- Replicar fielmente o estilo de escrita desses blogs
- Seguir a mesma estrutura e formatação
- Usar o mesmo tom de voz (formal, informal, técnico)
- Copiar o padrão de títulos e subtítulos
- Manter a mesma abordagem ao explicar código
`
      : '';

    const contextSection = request.contextUrls.length > 0
      ? `
## FONTE DE CONTEÚDO (MANDATÓRIO)
ACESSE E LEIA O CONTEÚDO COMPLETO de cada URL abaixo:
${request.contextUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

⚠️ É OBRIGATÓRIO:
- Usar APENAS informações factualmente corretas dessas URLs
- Copiar conceitos, definições e terminologia das fontes
- Basear-se nos code samples das fontes, adaptando ao contexto do blog
- Seguir as recomendações e boas práticas mencionadas nas fontes
- NÃO inventar informações que não estejam nessas URLs
- Citar as fontes no texto usando links markdown [texto](url)
`
      : '';

    return `Você é um ghostwriter especializado em criar posts de blog técnicos de alta qualidade, otimizados para SEO.

${referenceBlogsSection}
${contextSection}

## DIRECIONAMENTO DO USUÁRIO
${request.direction}

## BOAS PRÁTICAS DE BLOG (SEO 2025)
Siga estas diretrizes baseadas em pesquisas de SEO:

### Tamanho e Estrutura
- **Tamanho ideal**: 1500-2500 palavras (ajuste conforme a complexidade do tema)
- **Parágrafos curtos**: 2-4 linhas máximo para melhor legibilidade
- **Hierarquia clara**: Use H1 (título), H2 (seções principais), H3 (subseções)
- **Escaneabilidade**: Use listas, bullets e tabelas para quebrar texto denso

### Estrutura do Post
1. **Título (H1)**: Compelling, ~60 caracteres, com keyword principal
2. **Introdução**: Hook + contexto + o que o leitor vai aprender
3. **Corpo**: Seções lógicas com H2/H3, cada uma respondendo uma pergunta
4. **Key Takeaways**: Resumo em bullets dos pontos principais
5. **Conclusão**: Recapitulação + próximos passos
6. **Call-to-Action**: Convite para comentar, compartilhar ou ler posts relacionados

### Formatação
- Negrito para termos importantes
- Blocos de código com syntax highlighting
- Links internos e externos relevantes
- Imagens/vídeos em pontos estratégicos

## INSTRUÇÕES DE CONTEÚDO
1. Gere um post de blog completo para cada idioma: ${languagesText}
2. Mantenha o estilo de escrita dos blogs de referência
3. **LINKS INLINE**: Insira links relevantes no corpo do texto usando [texto](url)
4. **REFERÊNCIAS**: Adicione seção "## Referências" no final

## INSTRUÇÕES DE MÍDIA
Sugira imagens e vídeos nos pontos apropriados:
- Posts curtos (< 1000 palavras): 1-2 imagens
- Posts médios (1000-2000 palavras): 2-3 imagens + 0-1 vídeo
- Posts longos (> 2000 palavras): 3-5 imagens + 1 vídeo

Tipos de mídia:
- **Diagramas**: Para explicar sistemas e fluxos
- **Screenshots**: Para tutoriais
- **Ilustrações tech-art**: Para conceitos abstratos
- **Vídeos**: Para demonstrações passo-a-passo

Placeholders:
- Imagem: <!-- IMAGE: [descrição, estilo visual] -->
- Vídeo: <!-- VIDEO: [descrição da cena, estilo] -->

## FORMATO DE RESPOSTA
JSON válido:
{
  "posts": [
    {
      "language": "pt-br",
      "title": "Título do Post",
      "markdown": "# Título\\n\\nIntrodução...\\n\\n## Seção 1\\n\\n...\\n\\n## Key Takeaways\\n\\n- Ponto 1\\n- Ponto 2\\n\\n## Conclusão\\n\\n...\\n\\n## Referências\\n\\n- [Fonte](url)",
      "mediaPlaceholders": [
        { "type": "image", "prompt": "Descrição detalhada com estilo visual" }
      ]
    }
  ]
}

IMPORTANTE: Retorne APENAS o JSON.`;
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
