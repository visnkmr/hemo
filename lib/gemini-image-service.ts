import type { ImageGenerationParameters, ImageGenerationRequest, ImageGenerationResponse, UploadedImageData } from "./types";
import type { StoredImage } from "./image-db-service";
import {
  ImageOptimizationService,
  ImageOptimizations,
  type SpaceSavings
} from "./image-optimization-service";
import { imageDBService } from "./image-db-service";
import { imagePipelineUtility } from "./image-pipeline-utility";

export class GeminiImageService {
  private readonly baseUrl = "https://generativelanguage.googleapis.com";
  private imageOptimizer: ImageOptimizationService;
  private imageDBService = imageDBService;

  constructor(private apiKey: string) {
    this.imageOptimizer = new ImageOptimizationService();
  }

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
          temperature: 0.9,
          topK: 1,
          topP: 1.0,
          maxOutputTokens: 2048,
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

        // Generate a unique chat/message ID for this image generation session
        const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        let imageIndex = 0;
        for (const part of parts) {
          if (part.inlineData) {
            // The new API format includes dimensions in the structValue
            const width = part.inlineData.structValue?.width || 0;
            const height = part.inlineData.structValue?.height || 0;

            const originalBase64 = `data:image/png;base64,${part.inlineData.data}`;

            // Optimize the generated image for better performance
            // const optimizationResult = await this.optimizeImageForGemini(originalBase64);
            // const optimizedUri = optimizationResult.optimizedBase64;

            // Create a unique ID for this image in IndexedDB
            const imageId = `gen_${generationId}_img_${imageIndex++}`;

            // Use the new image pipeline to store both original and optimized images
            const pipelineResult = await imagePipelineUtility.processImageThroughPipeline(
              imageId,
              'temp', // Will be updated when image is associated with chat/message
              generationId,
              originalBase64,
              {
                width: typeof width === 'number' ? width : parseInt(width) || 0,
                height: typeof height === 'number' ? height : parseInt(height) || 0,
                mimeType: "image/png",
                generationParams: parameters
              }
            );

            console.log(`[GeminiImageService] 🎉 Pipeline processed image ${imageId} with ${pipelineResult.savingsPercent}% savings`);

            // Store only the image IDs instead of duplicate metadata
            images.push({
              originalImageId: imageId, // ID from originalimage database
              optimizedImageId: pipelineResult.optimizedId, // ID from webuse database
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
   * Sends a message with uploaded images to Gemini API
   */
  async sendMessageWithImages(text: string, images: UploadedImageData[], model: string): Promise<string> {
    if (!this.apiKey.trim()) {
      throw new Error("Gemini API key is required");
    }

    if (!text.trim() && images.length === 0) {
      throw new Error("Either text or images are required");
    }

    try {
      const url = `${this.baseUrl}/v1beta/models/${model}:generateContent`;

      const headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      };

      // Build parts array for the request
      const parts: any[] = [];

      // Add text if provided
      if (text.trim()) {
        parts.push({ text: text.trim() });
      }

      // Add images if provided
      for (const image of images) {
        // Remove data URL prefix to get just the base64 data
        const base64Data = image.base64Data.split(',')[1];
        parts.push({
          inline_data: {
            mime_type: image.mimeType,
            data: base64Data
          }
        });
      }

      const requestBody = {
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 1,
          topP: 1.0,
          maxOutputTokens: 2048,
          responseModalities: ["TEXT", "IMAGE"],
        }
      };

      console.log('[GeminiImageService] 📤 Sending request with', images.length, 'images');

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
          if (errorData) {
            errorMessage += ` - ${errorData}`;
          }
        }

        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('[GeminiImageService] 📥 Raw API response:', responseData);

      // Extract text response from Gemini
      const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        console.error('[GeminiImageService] ❌ No text response found in:', responseData);
        throw new Error("No text response received from Gemini");
      }

      console.log('[GeminiImageService] ✅ Extracted text response:', textResponse);
      return textResponse;

    } catch (error) {
      console.error("Gemini message with images error:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred while sending message with images");
    }
  }

  /**
   * Checks if a model supports image understanding/generation
   */
  static isModelImageCapable(modelName: string): boolean {
    return modelName.includes("image") || modelName.toLowerCase().includes("Banana");
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

  /**
   * Checks if a model supports image uploads (vision capabilities)
   */
  static isModelVisionCapable(modelName: string): boolean {
    return modelName.includes("image") || modelName.toLowerCase().includes("Banana");
    const visionCapableModels = [
      "models/gemini-1.5-pro-002",
      "models/gemini-1.5-pro",
      "models/gemini-1.5-flash-002",
      "models/gemini-1.5-flash",
      "models/gemini-pro-vision",
      "models/gemini-1.5-pro-latest",
      "models/gemini-1.5-flash-latest",
      "models/gemini-2.0-flash-exp",
      "models/gemini-2.0-flash-preview-image-generation",
    ];

    return visionCapableModels.some(capableModel =>
      modelName.includes(capableModel) || modelName === capableModel
    );
  }

  /**
   * Checks if a model is specifically for image generation
   */
  static isModelImageGenerationOnly(modelName: string): boolean {
    return false;
    const imageGenerationOnlyModels = [
      "models/gemini-2.0-flash-preview-image-generation",
    ];

    return imageGenerationOnlyModels.some(model =>
      modelName.includes(model) || modelName === model
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
   * Optimize an image for Gemini API submission (typically for quoted images)
   */
  async optimizeImageForGemini(base64Image: string): Promise<{ optimizedBase64: string; savings: SpaceSavings }> {
    console.log('[GeminiImageService] 📝 Optimizing image for Gemini API submission...');

    try {
      const result = await this.imageOptimizer.optimizeImage(base64Image, {
        maxWidth: 1536,
        maxHeight: 1536,
        quality: 0.85,
        format: 'jpeg',
        autoResize: true
      });

      // Display optimization results
      ImageOptimizations.showSpaceSavings(result.savings);

      return result;
    } catch (error) {
      console.error('[GeminiImageService] ❌ Image optimization failed:', error);
      // Return original if optimization fails
      return {
        optimizedBase64: base64Image,
        savings: {
          originalSize: this.getBase64Size(base64Image),
          optimizedSize: this.getBase64Size(base64Image),
          savingsBytes: 0,
          savingsPercent: 0
        }
      };
    }
  }

  /**
   * Calculate base64 string size (helper method)
   */
  private getBase64Size(base64String: string): number {
    const base64Data = base64String.split(',')[1] || base64String;
    const bytes = (base64Data.length * 3) / 4;
    return Math.ceil(bytes);
  }

 /**
  * Resolve IndexedDB image URL to actual base64 data
  */
 async resolveImageUrl(url: string, isOptimised: boolean = false): Promise<string | null> {
   try {
     if (!url.startsWith('indexeddb:')) {
       return url; // Return as-is if not an IndexedDB URL
     }

     const imageId = url.replace('indexeddb:', '');

     // If it's an optimized image ID (prefixed with 'opt_')
     if (imageId.startsWith('opt_')) {
       // Use image pipeline utility to get UI-optimized image
       const result = await imagePipelineUtility.getImageForUI(imageId.substring(4)); // Remove 'opt_' prefix
       return result.base64Data;
     } 
     // If we specifically want the optimized version
     else if (isOptimised) {
       // Use image pipeline utility to get UI-optimized image
       const result = await imagePipelineUtility.getImageForUI(imageId);
       return result.base64Data;
     } 
     // Otherwise get the original image
     else {
       // Get original image for modal viewing
       const result = await imagePipelineUtility.getOriginalImageForModal(imageId);
       if (result.base64Data) {
         return result.base64Data;
       }
       // Last resort fallback
       const storedImage = await this.imageDBService.getImage(imageId);
       return storedImage ? storedImage.uri : null;
     }
   } catch (error) {
     console.error('[GeminiImageService] ❌ Failed to resolve image URL:', error);
     return null;
   }
 }

 /**
  * Convert a real base64 image to IndexedDB reference if it's not already
  */
 async convertToIndexedDB(imageUri: string, chatId: string = 'unknown', messageId: string = 'unknown'): Promise<string> {
   try {
     if (imageUri.startsWith('indexeddb:')) {
       return imageUri; // Already a reference
     }

     if (!imageUri.startsWith('data:image/')) {
       return imageUri; // Not a base64 image
     }

     // Generate unique ID and store in IndexedDB
     const imageId = `converted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
     await this.imageDBService.storeImage(
       imageId,
       chatId,
       messageId,
       imageUri,
       {
         metadata: {
           source: 'converted'
         }
       }
     );

     return `indexeddb:${imageId}`;
   } catch (error) {
     console.error('[GeminiImageService] ❌ Failed to convert image to IndexedDB:', error);
     return imageUri; // Return original on failure
   }
 }

 /**
  * Update chat/message IDs for all images associated with a generation
  */
 async updateImageAssociations(generationId: string, chatId: string, messageId: string): Promise<void> {
   try {
     const images = await this.imageDBService.getMessageImages(generationId);

     // Update each image to associate with the correct chat/message
     await Promise.all(images.map(async (image: StoredImage) => {
       await this.imageDBService.storeImage(
         image.id, // Same ID
         chatId,
         messageId,
         image.uri,
         {
           width: image.width,
           height: image.height,
           mimeType: image.mimeType,
           metadata: image.metadata
         }
       );
     }));

     console.log(`[GeminiImageService] ✅ Updated associations for ${images.length} images`);
   } catch (error) {
     console.error('[GeminiImageService] ❌ Failed to update image associations:', error);
   }
 }

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