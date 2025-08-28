import type { ImageGenerationParameters, ImageGenerationRequest, ImageGenerationResponse } from "./types";

export class GeminiImageService {
  private readonly baseUrl = "https://generativelanguage.googleapis.com";

  constructor(private apiKey: string) {}

  /**
   * Generates images using Gemini API
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const { prompt, parameters, model = "models/gemini-2.0-flash-exp" } = request;

    if (!this.apiKey.trim()) {
      throw new Error("Gemini API key is required for image generation");
    }

    if (!prompt.trim()) {
      throw new Error("Prompt is required for image generation");
    }

    try {
      const url = `${this.baseUrl}/v1/${model}:generateImage?alt=sse`;

      const headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      };

      // Build prompt with parameters
      let enhancedPrompt = prompt;
      if (parameters?.negativePrompt) {
        enhancedPrompt += ` --no ${parameters.negativePrompt}`;
      }

      const requestBody: any = {
        prompt: {
          text: enhancedPrompt,
        },
        generationConfig: {},
      };

      // Add generation config if parameters are provided
      if (parameters) {
        if (parameters.aspectRatio) {
          requestBody.generationConfig.aspectRatio = parameters.aspectRatio;
        }
        if (parameters.quality) {
          requestBody.generationConfig.quality = parameters.quality;
        }
        if (parameters.personGeneration) {
          requestBody.generationConfig.personGeneration = parameters.personGeneration;
        }
        if (parameters.safetyFilterLevel) {
          requestBody.generationConfig.safetyFilterLevel = parameters.safetyFilterLevel;
        }
        if (parameters.seed !== undefined) {
          requestBody.generationConfig.seed = parameters.seed;
        }
        if (parameters.style) {
          // Add style information to the prompt
          requestBody.prompt.text = `Create an image in ${parameters.style} style: ${enhancedPrompt}`;
        }
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const jsonError = JSON.parse(errorData);
          errorMessage = jsonError.error?.message || jsonError.message || errorMessage;
        } catch {
          // If JSON parsing fails, use the raw text
          if (errorData) {
            errorMessage += ` - ${errorData}`;
          }
        }

        throw new Error(errorMessage);
      }

      // Parse the streaming response
      const images: ImageGenerationResponse['images'] = [];

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              const data = line.slice(6).trim();

              try {
                const parsedData = JSON.parse(data);

                // Extract image data from response
                if (parsedData.candidates?.[0]?.content?.parts) {
                  const parts = parsedData.candidates[0].content.parts;

                  for (const part of parts) {
                    if (part.inlineData) {
                      images.push({
                        uri: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                        mimeType: part.inlineData.mimeType,
                        width: part.inlineData.width || 0,
                        height: part.inlineData.height || 0,
                        generationParameters: parameters,
                      });
                    }
                  }
                }
              } catch (e) {
                console.warn("Failed to parse Gemini image response chunk:", e);
              }
            }
          }
        }
      }

      if (images.length === 0) {
        throw new Error("No images were generated. Please try again with a different prompt.");
      }

      const result: ImageGenerationResponse = {
        images,
        model,
        timestamp: new Date().toISOString(),
      };

      return result;
    } catch (error) {
      console.error("Gemini image generation error:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred during image generation");
    }
  }

  /**
   * Checks if a model supports image generation
   */
  static isModelImageCapable(modelName: string): boolean {
    const imageCapableModels = [
      "models/gemini-2.0-flash-exp",
      "models/gemini-1.5-pro-002",
      "models/gemini-1.5-pro",
      "models/gemini-1.5-flash-002",
      "models/gemini-1.5-flash",
      "models/gemini-pro-vision",
    ];

    return imageCapableModels.some(capableModel =>
      modelName.includes(capableModel) || modelName === capableModel
    );
  }

  /**
   * Gets default parameters for image generation
   */
  static getDefaultParameters(): ImageGenerationParameters {
    return {
      aspectRatio: "1:1",
      quality: "standard",
      personGeneration: "block_some",
      safetyFilterLevel: "block_some",
    };
  }
}

  /**
   * Factory function to create a Gemini image service instance
   */
  export function createGeminiImageService(): GeminiImageService | null {
    const apiKey = localStorage.getItem("gemini_api_key");

    if (!apiKey) {
      return null;
    }

    return new GeminiImageService(apiKey);
  }