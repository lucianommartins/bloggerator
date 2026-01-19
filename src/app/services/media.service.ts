import { Injectable, inject } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { ApiKeyService } from './api-key.service';
import { I18nService } from '../i18n/i18n.service';

export interface GeneratedMedia {
  type: 'image' | 'video';
  dataUrl?: string;
  mimeType?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private apiKeyService = inject(ApiKeyService);
  private i18n = inject(I18nService);

  private getClient(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: this.apiKeyService.getApiKey() });
  }

  /**
   * Generate an image using Nano Banana (gemini-3-pro-image-preview)
   */
  async generateImage(prompt: string): Promise<GeneratedMedia> {
    const lang = this.i18n.getLanguageForPrompt();
    const enhancedPrompt = `${prompt}. IMPORTANT: Any text in the image must be in ${lang}.`;

    const client = this.getClient();

    try {
      // Using the same model as DevPulse: gemini-3-pro-image-preview
      const response = await client.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: enhancedPrompt,
        config: {
          responseModalities: ['image'],
        },
      });

      // Extract image from response
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          return {
            type: 'image',
            dataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            mimeType: part.inlineData.mimeType
          };
        }
      }

      throw new Error('No image generated in response');
    } catch (error: any) {
      console.error('Image generation error:', error);
      throw new Error(error.message || 'Failed to generate image');
    }
  }

  /**
   * Generate a video using Veo 3.1
   * Uses async polling as per the official documentation
   */
  async generateVideo(
    prompt: string,
    onProgress?: (status: string, seconds?: number) => void
  ): Promise<GeneratedMedia> {
    const lang = this.i18n.getLanguageForPrompt();
    const enhancedPrompt = `${prompt}. IMPORTANT REQUIREMENTS: 1) Any on-screen text or graphics must be in ${lang}. 2) NO narration, NO dialogue, NO voices - only ambient sounds and music. 3) Keep visual style cinematic and professional.`;

    const client = this.getClient();

    try {
      onProgress?.('Starting video generation...', 0);

      // Start video generation operation
      let operation = await client.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: enhancedPrompt,
      });

      // Poll the operation status until the video is ready
      let elapsedSeconds = 0;
      while (!operation.done) {
        onProgress?.(`Generating video... (${elapsedSeconds}s)`, elapsedSeconds);
        await this.sleep(10000); // Wait 10 seconds between polls
        elapsedSeconds += 10;

        operation = await client.operations.getVideosOperation({
          operation: operation,
        });
      }

      onProgress?.('Downloading video...', elapsedSeconds);

      // Get the generated video
      const generatedVideo = operation.response?.generatedVideos?.[0];
      if (!generatedVideo?.video) {
        throw new Error('No video in response');
      }

      const videoUri = generatedVideo.video.uri;
      if (!videoUri) {
        throw new Error('No video URI in response');
      }

      // Download video using fetch with API key header
      const apiKey = this.apiKeyService.getApiKey();
      const response = await fetch(videoUri, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.status}`);
      }

      // Convert to blob URL for browser playback
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      return {
        type: 'video',
        dataUrl: blobUrl,
        mimeType: 'video/mp4'
      };
    } catch (error: any) {
      console.error('Video generation error:', error);
      throw new Error(error.message || 'Failed to generate video');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
