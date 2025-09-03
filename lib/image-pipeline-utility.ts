/**
 * Image Pipeline Utility
 * Handles image optimization and processing for the dual-database pipeline
 */

import { imagePipelineService } from './image-db-service';
import { ImageCompressionService } from './image-compression-service';

export interface ImagePipelineResult {
  originalId: string;
  optimizedId: string;
  originalSize: number;
  optimizedSize: number;
  savingsPercent: number;
  processingTime: number;
  success: boolean;
  error?: string;
}

export class ImagePipelineUtility {
  private compressionService = new ImageCompressionService();

  /**
   * Process image through pipeline: store original and optimized versions
   */
  async processImageThroughPipeline(
    imageId: string,
    chatId: string,
    messageId: string,
    base64Uri: string,
    options?: {
      width?: number;
      height?: number;
      mimeType?: string;
      generationParams?: any;
    }
  ): Promise<ImagePipelineResult> {
    const startTime = Date.now();

    try {
      console.log(`[ImagePipeline] 🖼️ Processing image ${imageId} through pipeline...`);

      // Store original image
      await imagePipelineService.storeOriginalImage(
        imageId,
        chatId,
        messageId,
        base64Uri,
        {
          width: options?.width,
          height: options?.height,
          mimeType: options?.mimeType,
          metadata: {
            source: 'generated',
            generationParams: options?.generationParams
          }
        }
      );

      console.log(`[ImagePipeline] ✅ Original image stored: ${imageId}`);

      // Optimize image to WebP using high-quality preset for UI display
      const compressionResult = await this.compressionService.compressImageWithPreset(
        base64Uri,
        'webp-strong' // Use high-quality WebP preset
      );

      // Store optimized image
      const optimizedId = `opt_${imageId}`;
      await imagePipelineService.storeOptimizedImage(
        optimizedId,
        chatId,
        messageId,
        compressionResult.compressedBase64,
        {
          width: compressionResult.dimensions.width || options?.width || 0,
          height: compressionResult.dimensions.height || options?.height || 0,
          mimeType: 'image/webp',
          metadata: {
            source: 'generated',
            generationParams: options?.generationParams,
            compression: {
              preset: 'webp-strong',
              library: compressionResult.library as 'browser-image-compression' | 'jimp' | 'pica' | undefined,
              quality: compressionResult.quality,
              originalSize: compressionResult.originalSize,
              compressionTime: compressionResult.processingTime,
              savingsPercent: compressionResult.savingsPercent
            }
          }
        }
      );

      console.log(`[ImagePipeline] ✅ Optimized image stored: ${optimizedId} as WebP`);

      const processingTime = Date.now() - startTime;
      const result: ImagePipelineResult = {
        originalId: imageId,
        optimizedId: optimizedId,
        originalSize: compressionResult.originalSize,
        optimizedSize: compressionResult.compressedSize,
        savingsPercent: compressionResult.savingsPercent,
        processingTime,
        success: true
      };

      console.log(`[ImagePipeline] 🎉 Pipeline complete in ${processingTime}ms with ${Math.round(compressionResult.savingsPercent)}% savings`);

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[ImagePipeline] ❌ Pipeline failed:`, error);

      return {
        originalId: imageId,
        optimizedId: '',
        originalSize: 0,
        optimizedSize: 0,
        savingsPercent: 0,
        processingTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get image for UI display (optimized WebP)
   */
  async getImageForUI(imageId: string): Promise<{ base64Data: string | null; mimeType: string }> {
    if (!imageId) return { base64Data: null, mimeType: 'image/webp' };

    const optimizedId = `opt_${imageId}`;

    try {
      const optimizedImage = await imagePipelineService.getOptimizedImage(optimizedId);
      if (optimizedImage) {
        return {
          base64Data: optimizedImage.uri,
          mimeType: optimizedImage.mimeType
        };
      }
    } catch (error) {
      console.warn(`[ImagePipeline] ❌ Failed to get optimized image ${optimizedId}:`, error);
    }

    // Fallback to original if optimized not available
    // try {
    //   const originalImage = await imagePipelineService.getOriginalImage(imageId);
    //   if (originalImage) {
    //     return {
    //       base64Data: originalImage.uri,
    //       mimeType: originalImage.mimeType
    //     };
    //   }
    // } catch (error) {
    //   console.error(`[ImagePipeline] ❌ Failed to get original image ${imageId}:`, error);
    // }

    return { base64Data: null, mimeType: 'image/webp' };
  }

  /**
   * Get original image for modal viewing
   */
  async getOriginalImageForModal(imageId: string): Promise<{ base64Data: string | null; mimeType: string }> {
    if (!imageId) return { base64Data: null, mimeType: 'image/jpeg' };

    try {
      const originalImage = await imagePipelineService.getOriginalImage(imageId);
      if (originalImage) {
        return {
          base64Data: originalImage.uri,
          mimeType: originalImage.mimeType
        };
      }
    } catch (error) {
      console.error(`[ImagePipeline] ❌ Failed to get original image ${imageId}:`, error);
    }

    return { base64Data: null, mimeType: 'image/jpeg' };
  }

  /**
   * Transform image generation response to UI-compatible format
   * Converts image IDs to IndexedDB URIs and adds metadata
   */
  transformImageGenerationResponse(images: Array<{
    originalImageId: string;
    optimizedImageId: string;
  }>): Array<{
    uri: string;
    mimeType: string;
    width: number;
    height: number;
  }> {
    return images.map(image => ({
      uri: `indexeddb:${image.optimizedImageId || image.originalImageId}`,
      mimeType: 'image/webp', // Gemini images are WebP
      width: 1024, // Default width for Gemini images
      height: 1024, // Default height for Gemini images
    }));
  }

  /**
   * Compress image on-demand for download with user-selected options
   */
  async compressImageForDownload(
    imageId: string,
    compressionPreset: string
  ): Promise<{ compressedBase64: string | null; mimeType: string; size: number; savingsPercent: number } | null> {
    if (!imageId) return null;

    try {
      const originalImage = await imagePipelineService.getOriginalImage(imageId);
      if (!originalImage) {
        console.error(`[ImagePipeline] ❌ Original image not found for compression: ${imageId}`);
        return null;
      }

      const compressionResult = await this.compressionService.compressImageWithPreset(
        originalImage.uri,
        compressionPreset
      );

      return {
        compressedBase64: compressionResult.compressedBase64,
        mimeType: compressionResult.format,
        size: compressionResult.compressedSize,
        savingsPercent: compressionResult.savingsPercent
      };

    } catch (error) {
      console.error(`[ImagePipeline] ❌ Failed to compress image for download:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const imagePipelineUtility = new ImagePipelineUtility();