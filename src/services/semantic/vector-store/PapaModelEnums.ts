// Enums pour les modèles Papa (OpenAI/Ollama)
// À utiliser exclusivement dans le ServiceContainer pour initialiser Papa
export enum OpenAIEmbedModel {
  TEXT_EMBEDDING_3_LARGE = 'text-embedding-3-large',
  TEXT_EMBEDDING_3_SMALL = 'text-embedding-3-small',
  ADA_002 = 'text-embedding-ada-002',
}

export enum OllamaEmbedModel {
  NOMIC_EMBED_TEXT = 'nomic-embed-text',
  MXBAI_EMBED_LARGE = 'mxbai-embed-large',
}

export enum OpenAIGenModel {
  GPT_35_TURBO = 'gpt-3.5-turbo',
  GPT_4 = 'gpt-4',
  GPT_4_32K = 'gpt-4-32k',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4O = 'gpt-4o',
}

export enum OllamaGenModel {
  LLAMA2 = 'llama2',
  LLAMA2_UNCENSORED = 'llama2-uncensored',
  MISTRAL = 'mistral',
  MISTRAL_OPENORCA = 'mistral-openorca',
  GEMMA = 'gemma',
  MIXTRAL = 'mixtral',
  DOLPHIN_MIXTRAL = 'dolphin-mixtral',
  PHI = 'phi',
}