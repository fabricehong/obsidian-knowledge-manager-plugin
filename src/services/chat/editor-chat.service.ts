export interface ChatResponse {
  role: 'user' | 'assistant';
  content: string;
}

export class EditorChatService {
  // Inject dependencies here if needed
  constructor(/* dependencies */) {}

  async postMessage(message: string): Promise<ChatResponse> {
    // TODO: Replace with real logic (API call, LLM, etc.)
    return {
      role: 'assistant',
      content: `Réponse simulée pour: ${message}`,
    };
  }

  // Additional methods (history, reset, etc.) can be added here
}
