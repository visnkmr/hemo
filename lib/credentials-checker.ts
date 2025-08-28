/**
 * Checks if the required credentials/configuration are available for a given provider
 * @param ollamastate - The provider state (0=OpenRouter, 1=Ollama, 2=LM Studio, 4=Grok, 5=Gemini)
 * @returns boolean - true if credentials are available, false otherwise
 */
export function checkProviderCredentials(ollamastate: number): boolean {
  switch (ollamastate) {
    case 0: // OpenRouter
      const openrouterKey = localStorage.getItem("openrouter_api_key");
      return !!(openrouterKey && openrouterKey.trim().length > 0);

    case 1: // Ollama
    case 2: // LM Studio
      const lmstudioUrl = localStorage.getItem("lmstudio_url");
      if (!lmstudioUrl || lmstudioUrl.trim().length === 0) {
        return false;
      }

      // Validate URL format
      try {
        new URL(lmstudioUrl);
        return true;
      } catch {
        return false;
      }

    case 4: // Grok
      const groqKey = localStorage.getItem("groq_api_key");
      return !!(groqKey && groqKey.trim().length > 0);

    case 5: // Gemini
      const geminiKey = localStorage.getItem("gemini_api_key");
      return !!(geminiKey && geminiKey.trim().length > 0);

    default:
      return false;
  }
}

/**
 * Gets the missing credential message for a given provider
 * @param ollamastate - The provider state
 * @returns string - Message describing what's missing
 */
export function getMissingCredentialMessage(ollamastate: number): string {
  switch (ollamastate) {
    case 0: // OpenRouter
      return "OpenRouter API key is required";

    case 1: // Ollama
      return "Valid Ollama server URL is required (e.g., http://localhost:11434)";

    case 2: // LM Studio
      return "Valid LM Studio server URL is required (e.g., http://localhost:1234)";

    case 4: // Grok
      return "Grok API key is required";

    case 5: // Gemini
      return "Gemini API key is required";

    default:
      return "Credentials are required";
  }
}

/**
 * Gets the provider name for a given ollamastate
 * @param ollamastate - The provider state
 * @returns string - Provider name
 */
export function getProviderName(ollamastate: number): string {
  switch (ollamastate) {
    case 0:
      return "OpenRouter";
    case 1:
      return "Ollama";
    case 2:
      return "LM Studio";
    case 4:
      return "Grok";
    case 5:
      return "Gemini";
    default:
      return "Unknown Provider";
  }
}