import type { ImageGenerationParameters, ImageGenerationRequest, ImageGenerationResponse, Message } from "./types";

export class GeminiImageService {
  private readonly baseUrl = "https://generativelanguage.googleapis.com";

  constructor(private apiKey: string) {}

  /**
   * Generates images using Gemini API
   */
  async generateImage(request: ImageGenerationRequest, quotedMessage?: Message): Promise<ImageGenerationResponse> {
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

      // Build parts array for the request
      const parts: any[] = [];

      // Add quoted images if they exist
      if (quotedMessage) {
        const quotedImages = await this.extractImagesFromMessage(quotedMessage);
        if (quotedImages.length > 0) {
          // Add the first image from the quoted message
          parts.push({
            inline_data: {
              mime_type: quotedImages[0].mimeType || "image/jpeg",
              data: quotedImages[0].data
            }
          });
        }
      }

      // Add the text prompt
      parts.push({
        text: enhancedPrompt
      });

      const requestBody: any = {
        contents: [{
          parts: parts
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          },
        };

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
   * Extracts images from a message object
   */
  private async extractImagesFromMessage(message: Message): Promise<Array<{data: string, mimeType: string}>> {
    const images: Array<{data: string, mimeType: string}> = [];

    // Handle single imageUrl
    if (message.imageUrl) {
      try {
        const imageData = await this.convertImageUrlToBase64(message.imageUrl);
        images.push(imageData);
      } catch (error) {
        console.warn("Failed to convert image URL to base64:", error);
      }
    }

    // Handle imageGenerations array
    if (message.imageGenerations && message.imageGenerations.length > 0) {
      for (const generation of message.imageGenerations) {
        if (generation.images && generation.images.length > 0) {
          // Take the first image from each generation
          const image = generation.images[0];
          if (image.uri && image.uri.startsWith('data:')) {
            // Already in base64 format
            const [mimeMatch] = image.uri.split(',');
            const mimeTypeMatch = mimeMatch?.match(/data:([^;]+)/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
            const base64Data = image.uri.split(',')[1];

            images.push({
              data: base64Data,
              mimeType: image.mimeType || mimeType
            });
          }
        }
      }
    }

    return images;
  }

  /**
   * Converts an image URL to base64 format
   */
  private async convertImageUrlToBase64(imageUrl: string): Promise<{data: string, mimeType: string}> {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (result && result.startsWith('data:')) {
            const base64Data = result.split(',')[1];
            resolve({
              data: base64Data,
              mimeType: blob.type || 'image/jpeg'
            });
          } else {
            reject(new Error('Failed to convert image to base64'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read image blob'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error(`Failed to fetch and convert image: ${error}`);
    }
  }

  /**
   * Checks if a model supports image generation
   */
  static isModelImageCapable(modelName: string): boolean {
    return modelName.includes("image-generation") || modelName.includes("Nano");
    
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