/**
 * Advanced Image Compression Service
 * Integrates multiple popular image compression libraries
 */

import { ImageOptimizationService } from './image-optimization-service';

// Import browser-side compression libraries
import imageCompression from 'browser-image-compression';
// @ts-ignore
// import Jimp from 'jimp';

export interface CompressionPreset {
  name: string;
  description: string;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  library: 'browser-image-compression' | 'jimp' | 'pica';
  autoResize: boolean;
}

export interface CompressionResult {
  originalBase64: string;
  compressedBase64: string;
  originalSize: number;
  compressedSize: number;
  savingsBytes: number;
  savingsPercent: number;
  format: string;
  library: string;
  quality: number;
  dimensions: { width: number; height: number };
  processingTime: number;
}

export interface BatchCompressionResult {
  totalImages: number;
  processedImages: number;
  totalSpaceSaved: number;
  totalSavingsPercent: number;
  results: CompressionResult[];
  failures: Array<{ id: string; error: string }>;
}

/**
 * Compression presets for different use cases
 */
export const compressionPresets: Record<string, CompressionPreset> = {
  // High quality presets
  'ultra-high': {
    name: 'Ultra High Quality',
    description: 'Minimal compression, preserves maximum quality',
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.95,
    format: 'webp',
    library: 'browser-image-compression',
    autoResize: true
  },
  'high-quality': {
    name: 'High Quality',
    description: 'Good balance between quality and size',
    maxWidth: 1536,
    maxHeight: 1536,
    quality: 0.85,
    format: 'webp',
    library: 'browser-image-compression',
    autoResize: true
  },
  'optimized': {
    name: 'Optimized',
    description: 'Best for most use cases',
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.75,
    format: 'jpeg',
    library: 'browser-image-compression',
    autoResize: true
  },

  // Balanced presets
  'balanced-webp': {
    name: 'Balanced WebP',
    description: 'Balanced compression using WebP format',
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.7,
    format: 'webp',
    library: 'browser-image-compression',
    autoResize: true
  },
  'balanced-jpeg': {
    name: 'Balanced JPEG',
    description: 'Balanced compression using JPEG format',
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.75,
    format: 'jpeg',
    library: 'browser-image-compression',
    autoResize: true
  },

  // Aggressive compression
  'compact-high': {
    name: 'Compact High',
    description: 'Significant size reduction with good quality',
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.6,
    format: 'jpeg',
    library: 'browser-image-compression',
    autoResize: true
  },
  'compact-max': {
    name: 'Compact Max',
    description: 'Maximum space saving',
    maxWidth: 256,
    maxHeight: 256,
    quality: 0.5,
    format: 'jpeg',
    library: 'browser-image-compression',
    autoResize: true
  },

  // Special formats
  'png-lossless': {
    name: 'PNG Lossless',
    description: 'Lossless PNG compression (large files)',
    maxWidth: 512,
    maxHeight: 512,
    quality: 1.0,
    format: 'png',
    library: 'jimp',
    autoResize: true
  },
  'webp-strong': {
    name: 'WebP Strong',
    description: 'Strong compression with WebP format',
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.4,
    format: 'webp',
    library: 'browser-image-compression',
    autoResize: true
  }
};

/**
 * Main Image Compression Service
 */
export class ImageCompressionService {
  private isBrowser: boolean;

  constructor() {
    this.isBrowser = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  /**
   * Compress image using browser-image-compression library
   */
  private async compressWithBrowserImageCompression(
    base64Image: string,
    preset: CompressionPreset
  ): Promise<CompressionResult> {
    const startTime = Date.now();

    // Convert base64 to file
    const imageFile = this.base64ToFile(base64Image, `temp.${preset.format}`);

    // Configure compression options
    const options = {
      maxSizeMB: 10, // Set a large limit, we'll control size via quality
      maxWidthOrHeight: Math.max(preset.maxWidth, preset.maxHeight),
      useWebWorker: true,
      quality: preset.quality,
      fileType: `image/${preset.format}`,
      onProgress: (progress: number) => {
        console.log(`[browser-image-compression] Progress: ${Math.round(progress)}%`);
      }
    };

    try {
      // Compress using browser-image-compression
      const compressedFile = await imageCompression(imageFile, options);

      // Convert back to base64
      const compressedBase64 = await this.fileToBase64(compressedFile);

      // Calculate metrics
      const originalSize = this.getBase64Size(base64Image);
      const compressedSize = compressedFile.size;
      const savingsBytes = Math.max(0, originalSize - compressedSize);
      const savingsPercent = originalSize > 0 ? (savingsBytes / originalSize) * 100 : 0;

      const processingTime = Date.now() - startTime;

      console.log(`[${options.fileType}] Original: ${this.formatBytes(originalSize)}, Compressed: ${this.formatBytes(compressedSize)}, Saved: ${Math.round(savingsPercent)}%`);

      return {
        originalBase64: base64Image,
        compressedBase64,
        originalSize,
        compressedSize,
        savingsBytes,
        savingsPercent,
        format: preset.format,
        library: 'browser-image-compression',
        quality: preset.quality,
        dimensions: { width: 0, height: 0 }, // Will be updated below
        processingTime
      };
    } catch (error) {
      console.error('[browser-image-compression] Compression failed:', error);
      throw new Error(`browser-image-compression failed: ${error.message}`);
    }
  }

  /**
   * Compress image using Jimp library for PNG/GIF/legacy format support
   */
  private async compressWithJimp(
    base64Image: string,
    preset: CompressionPreset
  ): Promise<CompressionResult> {
    const startTime = Date.now();

    if (!this.isBrowser) {
      throw new Error('Jimp compression requires browser environment');
    }

    try {
      // Convert base64 to Jimp image
      const image = await Jimp.read(this.base64ToBuffer(base64Image));

      // Apply transformations
      let processedImage = image;

      // Resize if needed and autoResize is enabled
      if (preset.autoResize && (image.bitmap.width > preset.maxWidth || image.bitmap.height > preset.maxHeight)) {
        const aspectRatio = image.bitmap.width / image.bitmap.height;
        let newWidth = preset.maxWidth;
        let newHeight = preset.maxHeight;

        if (aspectRatio > 1) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }

        processedImage = processedImage.resize(newWidth, newHeight);
      }

      // Apply quality reduction for JPEG/WebP
      if (preset.format === 'jpeg') {
        processedImage = processedImage.quality(preset.quality * 100);
      }

      // Convert to requested format
      let mimeType = 'image/jpeg';
      switch (preset.format) {
        case 'png':
          mimeType = 'image/png';
          break;
        case 'webp':
          mimeType = 'image/webp';
          break;
        default:
          mimeType = 'image/jpeg';
      }

      // Get result as base64
      const result = await processedImage.getBase64Async(mimeType);

      // Calculate metrics
      const originalSize = this.getBase64Size(base64Image);
      const compressedSize = this.getBase64Size(result);
      const savingsBytes = Math.max(0, originalSize - compressedSize);
      const savingsPercent = originalSize > 0 ? (savingsBytes / originalSize) * 100 : 0;

      const processingTime = Date.now() - startTime;

      console.log(`[Jimp] Original: ${this.formatBytes(originalSize)}, Compressed: ${this.formatBytes(compressedSize)}, Saved: ${Math.round(savingsPercent)}%`);

      return {
        originalBase64: base64Image,
        compressedBase64: result,
        originalSize,
        compressedSize,
        savingsBytes,
        savingsPercent,
        format: preset.format,
        library: 'jimp',
        quality: preset.quality,
        dimensions: {
          width: processedImage.bitmap.width,
          height: processedImage.bitmap.height
        },
        processingTime
      };

    } catch (error) {
      console.error('[Jimp] Compression failed:', error);
      throw new Error(`Jimp compression failed: ${error.message}`);
    }
  }

  /**
   * Compress image using existing Pica library
   */
  private async compressWithPica(
    base64Image: string,
    preset: CompressionPreset
  ): Promise<CompressionResult> {
    const startTime = Date.now();

    // Use existing ImageOptimizationService
    const picaService = new ImageOptimizationService();

    try {
      const result = await picaService.optimizeImage(base64Image, {
        maxWidth: preset.maxWidth,
        maxHeight: preset.maxHeight,
        quality: preset.quality,
        format: preset.format,
        autoResize: preset.autoResize
      });

      const processingTime = Date.now() - startTime;

      return {
        originalBase64: base64Image,
        compressedBase64: result.optimizedBase64,
        originalSize: result.savings.originalSize,
        compressedSize: result.savings.optimizedSize,
        savingsBytes: result.savings.savingsBytes,
        savingsPercent: result.savings.savingsPercent,
        format: preset.format,
        library: 'pica',
        quality: preset.quality,
        dimensions: { width: 0, height: 0 }, // Pica doesn't provide dimension info easily
        processingTime
      };

    } catch (error) {
      console.error('[Pica] Compression failed:', error);
      throw new Error(`Pica compression failed: ${error.message}`);
    }
  }

  /**
   * Main compression method that routes to appropriate library
   */
  async compressImage(
    base64Image: string,
    preset: CompressionPreset
  ): Promise<CompressionResult> {
    if (!this.isBrowser) {
      throw new Error('Image compression requires browser environment');
    }

    console.log(`[ImageCompression] Starting compression with ${preset.library} - ${preset.name}`);

    switch (preset.library) {
      case 'browser-image-compression':
        return await this.compressWithBrowserImageCompression(base64Image, preset);
      case 'jimp':
        return await this.compressWithJimp(base64Image, preset);
      case 'pica':
        return await this.compressWithPica(base64Image, preset);
      default:
        throw new Error(`Unknown compression library: ${preset.library}`);
    }
  }

  /**
   * Compress image using preset by name
   */
  async compressImageWithPreset(
    base64Image: string,
    presetName: string
  ): Promise<CompressionResult> {
    const preset = compressionPresets[presetName];
    if (!preset) {
      throw new Error(`Unknown compression preset: ${presetName}`);
    }
    return this.compressImage(base64Image, preset);
  }

  /**
   * Compress image with custom settings
   */
  async compressImageCustom(
    base64Image: string,
    options: {
      library: 'browser-image-compression' | 'jimp' | 'pica';
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
      autoResize?: boolean;
    }
  ): Promise<CompressionResult> {
    const customPreset: CompressionPreset = {
      name: 'Custom',
      description: 'Custom compression settings',
      maxWidth: options.maxWidth || 800,
      maxHeight: options.maxHeight || 600,
      quality: options.quality || 0.7,
      format: options.format || 'jpeg',
      library: options.library,
      autoResize: options.autoResize ?? true
    };

    return this.compressImage(base64Image, customPreset);
  }

  /**
   * Test all compression methods on an image and return results
   */
  async compareCompressionMethods(base64Image: string): Promise<Record<string, CompressionResult>> {
    const results: Record<string, CompressionResult> = {};

    console.log('[ImageCompression] Testing all compression methods...');

    for (const [presetName, preset] of Object.entries(compressionPresets)) {
      try {
        console.log(`Testing ${presetName}...`);
        const result = await this.compressImage(base64Image, preset);
        results[presetName] = result;
      } catch (error) {
        console.warn(`Failed ${presetName}:`, error.message);
        // Skip failed methods
      }
    }

    console.log('[ImageCompression] Comparison complete');
    console.table(Object.entries(results).map(([name, result]) => ({
      Method: name,
      Size: this.formatBytes(result.compressedSize),
      Savings: `${Math.round(result.savingsPercent)}%`,
      Library: result.library,
      Format: result.format,
      Time: `${result.processingTime}ms`
    })));

    return results;
  }

  /**
   * Utility functions
   */

  private base64ToFile(base64String: string, filename: string): File {
    const arr = base64String.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    // Get MIME type from base64 string
    const mimeMatch = base64String.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.]+).*,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    return new File([u8arr], filename, { type: mimeType });
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private base64ToBuffer(base64String: string): Buffer {
    const base64Data = base64String.split(',')[1] || base64String;
    return Buffer.from(base64Data, 'base64');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getBase64Size(base64String: string): number {
    const base64Data = base64String.split(',')[1] || base64String;
    const bytes = (base64Data.length * 3) / 4;
    return Math.ceil(bytes);
  }
}

// Export singleton instance
export const imageCompressionService = new ImageCompressionService();

// Export utility functions
export const ImageCompression = {
  compressWithPreset: (base64Image: string, presetName: string) =>
    imageCompressionService.compressImageWithPreset(base64Image, presetName),

  compressCustom: (base64Image: string, options: any) =>
    imageCompressionService.compressImageCustom(base64Image, options),

  compareMethods: (base64Image: string) =>
    imageCompressionService.compareCompressionMethods(base64Image),

  getPresets: () => compressionPresets,
};