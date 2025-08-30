// Type definitions for Pica operations
interface PicaResizeOptions {
  quality?: number;
  alpha?: boolean;
  unsharpAmount?: number;
  unsharpRadius?: number;
}

// @ts-ignore - Pica doesn't have official TypeScript definitions
import Pica from 'pica';

/**
 * Image optimization configuration
 */
export interface ImageOptimizationConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  autoResize?: boolean;
}

/**
 * Space savings report
 */
export interface SpaceSavings {
  originalSize: number;
  optimizedSize: number;
  savingsBytes: number;
  savingsPercent: number;
}

/**
 * Image Optimization Service using Pica library
 */
export class ImageOptimizationService {
  private pica: Pica;
  private defaultConfig: ImageOptimizationConfig = {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.85,
    format: 'jpeg',
    autoResize: true
  };

  constructor(config?: Partial<ImageOptimizationConfig>) {
    this.pica = new Pica();
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Calculates space savings and logs to console
   */
  calculateSpaceSavings(originalSize: number, optimizedSize: number): SpaceSavings {
    const savingsBytes = originalSize - optimizedSize;
    const savingsPercent = originalSize > 0 ? (savingsBytes / originalSize) * 100 : 0;

    const savings: SpaceSavings = {
      originalSize,
      optimizedSize,
      savingsBytes,
      savingsPercent
    };

    console.log(`[image-optimization] 📊 Space savings: ${savingsBytes} bytes (${savingsPercent.toFixed(1)}%)`);
    console.log(`[image-optimization] 📏 Original: ${this.formatBytes(originalSize)}, Optimized: ${this.formatBytes(optimizedSize)}`);

    return savings;
  }

  /**
   * Formats bytes into human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Loads an image from URL or base64 string
   */
  async loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));

      if (source.startsWith('data:')) {
        img.src = source;
      } else {
        img.src = source;
      }
    });
  }

  /**
   * Converts image to canvas for processing
   */
  imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx?.drawImage(img, 0, 0);
    return canvas;
  }

  /**
   * Creates a new canvas with optimized dimensions
   */
  createOptimizedCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');

    // Calculate optimized dimensions while maintaining aspect ratio
    let optimizedWidth = width;
    let optimizedHeight = height;

    const maxWidth = this.defaultConfig.maxWidth || 2048;
    const maxHeight = this.defaultConfig.maxHeight || 2048;

    if (this.defaultConfig.autoResize && (width > maxWidth || height > maxHeight)) {
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const ratio = Math.min(widthRatio, heightRatio);

      optimizedWidth = Math.round(width * ratio);
      optimizedHeight = Math.round(height * ratio);

      console.log(`[image-optimization] 🔄 Resized: ${width}x${height} → ${optimizedWidth}x${optimizedHeight}`);
    }

    canvas.width = optimizedWidth;
    canvas.height = optimizedHeight;
    return canvas;
  }

  /**
   * Converts canvas to blob
   */
  canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.85, format: string = 'image/jpeg'): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, format, quality);
    });
  }

  /**
   * Converts blob to base64 string
   */
  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Main optimization function
   */
  async optimizeImage(imageSource: string, config?: Partial<ImageOptimizationConfig>): Promise<{ optimizedBase64: string; savings: SpaceSavings }> {
    try {
      console.log('[image-optimization] 🚀 Starting image optimization...');

      // Merge configs
      const finalConfig = { ...this.defaultConfig, ...config };

      // Load image
      const img = await this.loadImage(imageSource);
      console.log(`[image-optimization] 📸 Loaded image: ${img.width}x${img.height}`);

      // Calculate original size
      const originalSize = this.getBase64Size(imageSource);
      let currentSize: number;

      // Create source canvas
      const sourceCanvas = this.imageToCanvas(img);

      // Check if resizing is needed
      const needsResize = finalConfig.autoResize &&
        (img.width > (finalConfig.maxWidth || 2048) || img.height > (finalConfig.maxHeight || 2048));

      if (!needsResize) {
        console.log('[image-optimization] ✅ Image already optimal, no resizing needed');
        return {
          optimizedBase64: imageSource,
          savings: { originalSize: originalSize, optimizedSize: originalSize, savingsBytes: 0, savingsPercent: 0 }
        };
      }

      // Create optimized target canvas
      const targetCanvas = this.createOptimizedCanvas(img.width, img.height);

      // Resize using Pica
      const optimizedCanvas = await this.pica.resize(sourceCanvas, targetCanvas, {
        quality: finalConfig.quality || 0.85,
        alpha: true,
        unsharpAmount: 0,
        unsharpRadius: 0.5
      });

      // Convert to blob
      const blob = await this.canvasToBlob(
        optimizedCanvas,
        finalConfig.quality,
        finalConfig.format === 'webp' ? 'image/webp' :
        finalConfig.format === 'png' ? 'image/png' : 'image/jpeg'
      );

      if (!blob) {
        throw new Error('Failed to convert optimized canvas to blob');
      }

      // Convert to base64
      const optimizedBase64 = await this.blobToBase64(blob);
      currentSize = blob.size;

      // Calculate and display space savings
      const savings = this.calculateSpaceSavings(originalSize, currentSize);

      console.log(`[image-optimization] ✅ Optimization complete. Quality: ${((finalConfig.quality || 0.85) * 100).toFixed(0)}%`);
      console.log(`[image-optimization] 🎯 Final format: ${finalConfig.format?.toUpperCase()}`);

      return {
        optimizedBase64,
        savings
      };

    } catch (error) {
      console.error('[image-optimization] ❌ Optimization failed:', error);
      // Return original if optimization fails
      return {
        optimizedBase64: imageSource,
        savings: {
          originalSize: this.getBase64Size(imageSource),
          optimizedSize: this.getBase64Size(imageSource),
          savingsBytes: 0,
          savingsPercent: 0
        }
      };
    }
  }

  /**
   * Quick optimization for display purposes
   */
  async optimizeForDisplay(base64Image: string, maxWidth: number = 800): Promise<string> {
    console.log(`[image-optimization] 🖼️ Optimizing image for display (max width: ${maxWidth}px)`);

    const result = await this.optimizeImage(base64Image, {
      maxWidth,
      maxHeight: 600,
      quality: 0.9,
      autoResize: true
    });

    return result.optimizedBase64;
  }

  /**
   * Optimize for Gemini API upload
   */
  async optimizeForGeminiAPI(base64Image: string): Promise<string> {
    console.log('[image-optimization] 🤖 Optimizing image for Gemini API');

    const result = await this.optimizeImage(base64Image, {
      maxWidth: 1536,
      maxHeight: 1536,
      quality: 0.85,
      format: 'jpeg',
      autoResize: true
    });

    return result.optimizedBase64;
  }

  /**
   * Calculate approximate size from base64 string
   */
  private getBase64Size(base64String: string): number {
    // Remove data URL prefix if present
    const base64Data = base64String.split(',')[1] || base64String;
    // Base64 formula: size = (string.length * 3) / 4 - padding
    const bytes = (base64Data.length * 3) / 4;
    return Math.ceil(bytes);
  }
}

// Export singleton instance
export const imageOptimizer = new ImageOptimizationService();

// Export default optimizations
export const ImageOptimizations = {
  optimizeForDisplay: (base64Image: string, maxWidth?: number) =>
    imageOptimizer.optimizeForDisplay(base64Image, maxWidth),

  optimizeForGeminiAPI: (base64Image: string) =>
    imageOptimizer.optimizeForGeminiAPI(base64Image),

  showSpaceSavings: (savings: SpaceSavings) => {
    console.log(`\n🧮 IMAGE OPTIMIZATION RESULTS:`)
    console.log(`├── Original Size: ${imageOptimizer['formatBytes'](savings.originalSize)}`)
    console.log(`├── Optimized Size: ${imageOptimizer['formatBytes'](savings.optimizedSize)}`)
    console.log(`├── Space Saved: ${imageOptimizer['formatBytes'](savings.savingsBytes)}`)
    console.log(`└── Compression: ${savings.savingsPercent.toFixed(1)}%`);
    console.log(`\n`);
  }
};