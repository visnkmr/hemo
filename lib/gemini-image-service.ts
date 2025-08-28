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
      const url = `${this.baseUrl}/v1beta/models/${model}:generateContent`;

      const headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      };

      // Build prompt with parameters
      let enhancedPrompt = prompt;
      if (parameters?.negativePrompt) {
        enhancedPrompt += ` --no ${parameters.negativePrompt}`;
      }

      if (parameters?.style) {
        // Add style information to the prompt
        enhancedPrompt = `Create an image in ${parameters.style} style: ${enhancedPrompt}`;
      }

      const requestBody: any = {
        contents: [{
          parts: [{
            text: enhancedPrompt
          }]
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
         },
       };

       // Add generation config parameters if provided
      //  if (parameters) {
      //    if (parameters.aspectRatio) {
      //      requestBody.generationConfig.aspect_ratio = parameters.aspectRatio;
      //    }
      //    if (parameters.quality) {
      //      requestBody.generationConfig.quality = parameters.quality;
      //    }
      //    if (parameters.personGeneration) {
      //      requestBody.generationConfig.person_generation = parameters.personGeneration;
      //    }
      //    if (parameters.safetyFilterLevel) {
      //      requestBody.generationConfig.safety_filter_level = parameters.safetyFilterLevel;
      //    }
      //   if (parameters.seed !== undefined) {
      //     requestBody.generationConfig.seed = parameters.seed;
      //   }
      // }

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

      // Parse the JSON response from the new API
      const responseData = await response.json();
      console.log(responseData)
      const images: ImageGenerationResponse['images'] = [];

      // Extract image data from the new response format
      if (responseData.candidates?.[0]?.content?.parts) {
        const parts = responseData.candidates[0].content.parts;

        for (const part of parts) {
          if (part.inlineData) {
            // The new API format includes dimensions in the structValue
            const width = part.inlineData.structValue?.width || 0;
            const height = part.inlineData.structValue?.height || 0;

            images.push({
              uri: `data:image/png;base64,${part.inlineData.data}`,
              mimeType: part.inlineData.mimeType,
              width: typeof width === 'number' ? width : parseInt(width) || 0,
              height: typeof height === 'number' ? height : parseInt(height) || 0,
              // generationParameters: parameters,
            });
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
    return modelName.includes("image-generation");
    const imageCapableModels = [
      "models/gemini-2.0-flash-exp",
      "models/gemini-2.0-flash-preview-image-generation",
      "models/gemini-1.5-pro-002",
      "models/gemini-1.5-pro",
      "models/gemini-1.5-flash-002",
      "models/gemini-1.5-flash",
      "models/gemini-pro-vision",
      "models/gemini-1.5-pro-latest",
      "models/gemini-1.5-flash-latest",
    ];

    return imageCapableModels.some(capableModel =>
      modelName.includes(capableModel) || modelName === capableModel
    );
  }

  // /**
  //  * Gets default parameters for image generation
  //  */
  // static getDefaultParameters(): ImageGenerationParameters {
  //   return {
  //     aspectRatio: "1:1",
  //     quality: "standard",
  //     personGeneration: "block_some",
  //     safetyFilterLevel: "block_some",
  //   };
  // }

  /**
   * Static factory method to create a Gemini image service instance
   */
  static createGeminiImageService(): GeminiImageService | null {
    const apiKey = localStorage.getItem("gemini_api_key");

    if (!apiKey) {
      return null;
    }

    return new GeminiImageService(apiKey);
  }
}