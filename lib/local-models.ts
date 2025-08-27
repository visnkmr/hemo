import type { LocalModel } from "./types"

/**
 * Fetch models from Ollama server
 * @param baseUrl - Base URL of the Ollama server (default: http://localhost:11434)
 * @returns Promise<LocalModel[]>
 */
export async function fetchOllamaModels(baseUrl: string = "http://localhost:11434"): Promise<LocalModel[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`)

    if (!response.ok) {
      throw new Error(`Failed to fetch Ollama models: ${response.statusText}`)
    }

    const data = await response.json()

    // Transform Ollama models to LocalModel format
    const models: LocalModel[] = data.models?.map((model: any) => ({
      id: model.name,
      name: model.name,
      size: model.size,
      modified_at: model.modified_at
    })) || []

    return models
  } catch (error) {
    console.error("Error fetching Ollama models:", error)
    throw error
  }
}

/**
 * Fetch models from LM Studio server
 * @param baseUrl - Base URL of the LM Studio server
 * @returns Promise<LocalModel[]>
 */
export async function fetchLMStudioModels(baseUrl: string): Promise<LocalModel[]> {
  try {
    // LM Studio typically provides models via /v1/models endpoint (OpenAI-compatible)
    const response = await fetch(`${baseUrl}/v1/models`)

    if (!response.ok) {
      throw new Error(`Failed to fetch LM Studio models: ${response.statusText}`)
    }

    const data = await response.json()

    // Transform LM Studio models to LocalModel format
    const models: LocalModel[] = data.data?.map((model: any) => ({
      id: model.id,
      name: model.id,
      // LM Studio doesn't typically provide size/modified_at info in this endpoint
    })) || []

    return models
  } catch (error) {
    console.error("Error fetching LM Studio models:", error)
    throw error
  }
}

/**
 * Fetch models from local providers (Ollama or LM Studio)
 * @param provider - Provider type: 'ollama' or 'lmstudio'
 * @param baseUrl - Base URL for the provider
 * @returns Promise<LocalModel[]>
 */
export async function fetchLocalModels(provider: 'ollama' | 'lmstudio', baseUrl?: string): Promise<LocalModel[]> {
  switch (provider) {
    case 'ollama':
      const ollamaUrl = baseUrl || "http://localhost:11434"
      return await fetchOllamaModels(ollamaUrl)

    case 'lmstudio':
      if (!baseUrl) {
        throw new Error("Base URL is required for LM Studio")
      }
      return await fetchLMStudioModels(baseUrl)

    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

/**
 * Fetch models based on ollamastate (matching the existing state system)
 * @param ollamastate - State number (1=Ollama, 2=LM Studio)
 * @param baseUrl - Base URL for LM Studio (optional, will use localStorage if not provided)
 * @returns Promise<LocalModel[]>
 */
export async function fetchModelsByState(ollamastate: number, baseUrl?: string): Promise<LocalModel[]> {
  switch (ollamastate) {
    case 1: // Ollama
      const ollamaUrl = "http://localhost:11434"
      return await fetchOllamaModels(ollamaUrl)

    case 2: // LM Studio
      const lmStudioUrl = baseUrl || localStorage.getItem("lmstudio_url") || "http://localhost:11434"
      return await fetchLMStudioModels(lmStudioUrl)

    default:
      throw new Error(`Unsupported state for local models: ${ollamastate}`)
  }
}