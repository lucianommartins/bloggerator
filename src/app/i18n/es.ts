// Español
export const es = {
  app: {
    title: 'Bloggerator',
    subtitle: 'Genera posts de blog con tu estilo personal',
  },
  login: {
    title: 'Iniciar Sesión',
    googleButton: 'Continuar con Google',
    tagline: 'Transforma ideas en posts de blog profesionales',
  },
  main: {
    referenceBlogs: {
      title: 'Blogs de Referencia',
      description: 'Pega URLs de tus posts anteriores para extraer tu estilo de escritura',
      placeholder: 'https://tublog.com/mi-post',
      limit: 'Máximo 5 URLs',
    },
    contextUrls: {
      title: 'Contexto del Tema',
      description: 'Pega URLs de documentación, repos, videos o artículos sobre el tema',
      placeholder: 'https://docs.ejemplo.com/feature',
      limit: 'Máximo 15 URLs',
    },
    direction: {
      title: 'Dirección',
      description: 'Explica lo que quieres generar',
      placeholder: 'Quiero un post técnico sobre X, enfocándome en Y, con tono Z...',
    },
    targetLanguages: {
      title: 'Idiomas de Destino',
      portuguese: 'Português',
      english: 'English',
      spanish: 'Español',
    },
    generate: 'Generar Post',
    generating: 'Generando...',
  },
  output: {
    title: 'Post Generado',
    copyMarkdown: 'Copiar Markdown',
    copied: '¡Copiado!',
    regenerate: 'Regenerar',
  },
  media: {
    generateImage: 'Generar Imagen',
    generateVideo: 'Generar Video',
    editPrompt: 'Editar Prompt',
    generating: 'Generando media...',
  },
  settings: {
    title: 'Configuraciones',
    apiKey: 'Gemini API Key',
    apiKeyPlaceholder: 'Pega tu API key de Google AI Studio',
    apiKeyDescription: 'Tu clave se almacena solo en la sesión actual del navegador.',
    apiKeySaved: '¡API key guardada con éxito!',
    save: 'Guardar',
    clear: 'Limpiar',
    close: 'Cerrar',
    theme: 'Tema',
    dark: 'Oscuro',
    light: 'Claro',
    language: 'Idioma',
    languageDescription: 'Elige el idioma de la interfaz.',
  },
  errors: {
    urlLimit: 'Límite de URLs excedido',
    apiKeyRequired: 'API key de Gemini es obligatoria',
    generationFailed: 'Fallo al generar contenido',
  },
};
