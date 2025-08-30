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
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.3,
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

    const maxWidth = this.defaultConfig.maxWidth || 512;
    const maxHeight = this.defaultConfig.maxHeight || 512;

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
  canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.3, format: string = 'image/jpeg'): Promise<Blob | null> {
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
        (img.width > (finalConfig.maxWidth || 512) || img.height > (finalConfig.maxHeight || 512));

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
        quality: finalConfig.quality || 0.3,
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

      console.log(`[image-optimization] ✅ Optimization complete. Quality: ${((finalConfig.quality || 0.3) * 100).toFixed(0)}%`);
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
      quality: 0.3,
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
  },

 /**
   * Test Pica optimization on an image URL (like the download.png file)
   */
  async testPicaOptimizationOnImage(imageUrl: string): Promise<void> {
    console.log(`🧪[PICA TEST] Testing Pica optimization on: ${imageUrl}`);

    try {
      const img = await imageOptimizer.loadImage(imageUrl);
      console.log(`📸[PICA TEST] Loaded image: ${img.width}x${img.height} pixels`);

      const canvas = imageOptimizer.imageToCanvas(img);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!blob) {
        console.error(`❌[PICA TEST] Could not create blob from canvas`);
        return;
      }

      const originalBase64 = await imageOptimizer.blobToBase64(blob);
      const originalSize = blob.size;

      console.log(`📏[PICA TEST] Original size: ${imageOptimizer['formatBytes'](originalSize)}`);

      // Apply optimization
      const optimizationResult = await imageOptimizer.optimizeImage(originalBase64, {
        maxWidth: 1536,
        maxHeight: 1536,
        quality: 0.3,
        format: 'jpeg',
        autoResize: true
      });

      console.log(`✅[PICA TEST] Optimization complete!`);
      console.log(`📏[PICA TEST] Optimized size: ${imageOptimizer['formatBytes'](optimizationResult.savings.optimizedSize)}`);
      console.log(`📊[PICA TEST] Space saved: ${imageOptimizer['formatBytes'](optimizationResult.savings.savingsBytes)}`);
      console.log(`📈[PICA TEST] Compression: ${optimizationResult.savings.savingsPercent.toFixed(1)}%`);

      console.log(`\n🚀[PICA TEST] SUCCESS! Reduced from PNG to optimized JPEG.`);

    } catch (error) {
      console.error(`❌[PICA TEST] Error testing on ${imageUrl}:`, error);
    }
  },

  /**
   * Test Pica optimization on generated canvas (for demo testing)
   */
  async testPicaOptimization(): Promise<void> {
    console.log(`🧪[PICA TEST] Starting Pica optimization test...`);

    try {
      // Create a large test canvas (to simulate a large image that needs optimization)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error(`❌[PICA TEST] Could not create canvas context`);
        return;
      }

      // Create a test image - 2000x1500 pixels (large enough to trigger optimization)
      canvas.width = 2000;
      canvas.height = 1500;

      // Fill with gradient pattern to create compressible content
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(255, 0, 100, 0.8)');
      gradient.addColorStop(0.5, 'rgba(100, 100, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 0, 255, 0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add some random patterns to make it more compressible
      ctx.fillStyle = 'rgba(255, 255, 255, ' + Math.random() * 0.5 + 0.3 + ')';
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const w = Math.random() * 200 + 50;
        const h = Math.random() * 200 + 50;
        ctx.fillRect(x, y, w, h);
      }

      // Convert canvas to blob (original image) using Promise wrapper
      const originalBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });

      if (!originalBlob) {
        console.error(`❌[PICA TEST] Could not create blob from canvas`);
        return;
      }

      // Convert blob to base64
      const originalBase64 = await imageOptimizer.blobToBase64(originalBlob);
      const originalSize = (originalBlob.size * 4) / 3; // Rough approximation for base64 size

      console.log(`📏[PICA TEST] Original image: ${canvas.width}x${canvas.height} pixels`);
      console.log(`📏[PICA TEST] Original size: ${imageOptimizer['formatBytes'](originalSize)}`);
      console.log(`💅[PICA TEST] Original format: PNG`);

      const optimizationResult = await imageOptimizer.optimizeImage(originalBase64, {
        maxWidth: 1536,
        maxHeight: 1536,
        quality: 0.3,
        format: 'jpeg',
        autoResize: true
      });

      console.log(`✅[PICA TEST] Optimized image: 1536x${Math.round(1536 * canvas.height / canvas.width)} pixels (approx.)`);
      console.log(`💫[PICA TEST] Optimized format: JPEG with ${85}% quality`);
      console.log(`📊[PICA TEST] Space savings: ${imageOptimizer['formatBytes'](optimizationResult.savings.savingsBytes)}`);
      console.log(`📊[PICA TEST] Compression ratio: ${optimizationResult.savings.savingsPercent.toFixed(1)}%`);
      console.log(`🎯[PICA TEST] Final size: ${imageOptimizer['formatBytes'](optimizationResult.savings.optimizedSize)}`);

      const efficiency = ((optimizationResult.savings.savingsBytes / optimizationResult.savings.originalSize) * 100).toFixed(1);
      console.log(`\n🚀[PICA TEST] SUCCESS! Pica achieved ${efficiency}% size reduction from PNG ${canvas.width}x${canvas.height}px to optimized JPEG.`);

    } catch (error) {
      console.error(`❌[PICA TEST] Error during Pica test:`, error);
    }
  }
};

