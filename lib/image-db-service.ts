import Dexie, { Table } from 'dexie';
import { recycleBinService } from './recycle-bin-db';

export interface StoredImage {
  id: string; // Primary key (will be the key stored in message.imageUrl)
  chatId: string; // Which chat this image belongs to
  messageId: string; // Which message this image belongs to
  uri: string; // Base64 data URL or IndexedDB key for blob storage
  mimeType: string; // e.g., "image/png", "image/jpeg"
  width: number;
  height: number;
  size: number; // File size in bytes
  createdAt: Date;
  lastAccessed: Date;
  metadata?: {
    originalFileName?: string;
    source?: 'generated' | 'uploaded' | 'quoted' | 'migrated' | 'converted' | 'compressed';
    // Compression metadata
    compression?: {
      preset?: string;
      library?: 'browser-image-compression' | 'jimp' | 'pica';
      quality?: number;
      originalSize?: number;
      compressionTime?: number;
      savingsPercent?: number;
    };
    // Blob storage metadata
    storageType?: 'base64' | 'blob';
    blobId?: string; // For blob storage, this references the blob in separate table
    // Existing metadata
    generationParams?: any;
    imageIndex?: number;
  };
}

export interface StoredBlob {
  id: string; // Primary key for blob reference
  blob: Blob; // The actual blob data
  createdAt: Date;
}

export class ImageDatabase extends Dexie {
  images!: Table<StoredImage>;
  blobs!: Table<StoredBlob>;
  private isInitialized = false;

  constructor() {
    super('BatuImageDB');

    this.version(1).stores({
      images: 'id, chatId, messageId, mimeType, createdAt, lastAccessed, size'
    });

    // Handle database upgrades gracefully
    this.version(2).stores({
      images: 'id, chatId, messageId, mimeType, createdAt, lastAccessed, size, width, height',
    });

    this.version(3).stores({
      images: 'id, chatId, messageId, mimeType, createdAt, lastAccessed, size, width, height, *metadata',
    });

    // Add blob support and compression metadata
    this.version(4).stores({
      images: 'id, chatId, messageId, mimeType, createdAt, lastAccessed, size, width, height, *metadata',
      blobs: '++id, createdAt' // Separate table for blob storage
    });
  }

  async ensureInitialized() {
    if (!this.isInitialized && typeof window !== 'undefined') {
      try {
        await this.open();
        this.isInitialized = true;
        console.log('[ImageDB] ✅ Database initialized successfully');
      } catch (err) {
        console.error('[ImageDB] ❌ Failed to open database:', err);
        throw err;
      }
    }
  }
}

// Lazy-initialized singleton instance
let imageDbInstance: ImageDatabase | null = null;

function getImageDb() {
  if (!imageDbInstance) {
    imageDbInstance = new ImageDatabase();
  }
  return imageDbInstance;
}

export { getImageDb };

export class ImageDBService {
  private db = getImageDb();

  /**
   * Check if running in browser environment
   */
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  /**
   * Store an image in IndexedDB
   */
  async storeImage(
    id: string,
    chatId: string,
    messageId: string,
    base64Uri: string,
    options?: {
      width?: number;
      height?: number;
      mimeType?: string;
      metadata?: StoredImage['metadata'];
    }
  ): Promise<void> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return;
    }

    try {
      await this.db.ensureInitialized();

      // Calculate size from base64
      const size = this.getBase64Size(base64Uri);
      const mimeType = options?.mimeType ||
        (base64Uri.startsWith('data:image/') ?
          base64Uri.split(';')[0].split(':')[1] || 'image/jpeg' :
          'image/jpeg');

      // Check if image already exists
      const existing = await this.db.images.get(id);
      if (existing) {
        if (size >= existing.size) {
          console.log(`[ImageDB] 📏 New image (${this.formatBytes(size)}) is not smaller than existing (${this.formatBytes(existing.size)}), skipping save to prevent duplicate`);
          return;
        } else {
          console.log(`[ImageDB] 📏 Replacing existing image with smaller version`);
        }
      } else {
        console.log(`[ImageDB] 📏 Storing new image`);
      }

      const imageRecord: StoredImage = {
        id,
        chatId,
        messageId,
        uri: base64Uri,
        mimeType,
        width: options?.width || 0,
        height: options?.height || 0,
        size,
        createdAt: existing ? existing.createdAt : new Date(),
        lastAccessed: new Date(),
        metadata: options?.metadata
      };

      await this.db.images.put(imageRecord);

      console.log(`[ImageDB] ✅ Stored image: ${id} (${this.formatBytes(size)})`);

    } catch (error) {
      console.error('[ImageDB] ❌ Failed to store image:', error);
      throw error;
    }
  }

  /**
   * Get an image from IndexedDB
   */
  async getImage(id: string): Promise<StoredImage | undefined> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return undefined;
    }

    try {
      await this.db.ensureInitialized();

      const image = await this.db.images.get(id);

      if (image) {
        // Update last accessed timestamp
        await this.db.images.update(id, { lastAccessed: new Date() });
        console.log(`[ImageDB] 📖 Retrieved image: ${id}`);

        return image;
      }

      console.warn(`[ImageDB] ⚠️ Image not found: ${id}`);
      return undefined;

    } catch (error) {
      console.error('[ImageDB] ❌ Failed to get image:', error);
      throw error;
    }
  }

  /**
   * Delete an image from IndexedDB
   */
  async deleteImage(id: string): Promise<boolean> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return false;
    }

    try {
      await this.db.ensureInitialized();

      // Check if image exists before deletion
      const existingImage = await this.db.images.get(id);
      if (!existingImage) {
        console.warn(`[ImageDB] ⚠️ Image not found for deletion: ${id}`);
        return false;
      }

      await this.db.images.delete(id);
      console.log(`[ImageDB] 🗑️ Deleted image: ${id}`);
      return true;

    } catch (error) {
      console.error('[ImageDB] ❌ Failed to delete image:', error);
      return false;
    }
  }

  /**
   * Get all images for a specific chat
   */
  async getChatImages(chatId: string): Promise<StoredImage[]> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return [];
    }

    try {
      await this.db.ensureInitialized();

      const images = await this.db.images
        .where('chatId')
        .equals(chatId)
        .toArray();

      console.log(`[ImageDB] 📋 Found ${images.length} images for chat: ${chatId}`);
      return images;

    } catch (error) {
      console.error('[ImageDB] ❌ Failed to get chat images:', error);
      return [];
    }
  }

  /**
   * Get all images for a specific message
   */
  async getMessageImages(messageId: string): Promise<StoredImage[]> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return [];
    }

    try {
      await this.db.ensureInitialized();

      const images = await this.db.images
        .where('messageId')
        .equals(messageId)
        .toArray();

      console.log(`[ImageDB] 📋 Found ${images.length} images for message: ${messageId}`);
      return images;

    } catch (error) {
      console.error('[ImageDB] ❌ Failed to get message images:', error);
      return [];
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalImages: number;
    totalSize: number;
    oldestImage?: Date;
    newestImage?: Date;
    imagesByType: Record<string, number>;
  }> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return {
        totalImages: 0,
        totalSize: 0,
        imagesByType: {}
      };
    }

    try {
      await this.db.ensureInitialized();

      const images = await this.db.images.toArray();
      const totalImages = images.length;
      const totalSize = images.reduce((sum: number, img: StoredImage) => sum + img.size, 0);

      const dates = images.map((img: StoredImage) => img.createdAt).filter((date: Date | undefined) => date instanceof Date) as Date[];
      const oldestImage = dates.length > 0 ? new Date(Math.min(...dates.map((d: Date) => d.getTime()))) : undefined;
      const newestImage = dates.length > 0 ? new Date(Math.max(...dates.map((d: Date) => d.getTime()))) : undefined;

      // Count by image type
      const imagesByType: Record<string, number> = {};
      images.forEach((img: StoredImage) => {
        imagesByType[img.mimeType] = (imagesByType[img.mimeType] || 0) + 1;
      });

      const stats = {
        totalImages,
        totalSize,
        oldestImage,
        newestImage,
        imagesByType
      };

      console.log('[ImageDB] 📊 Database Stats:');
      console.log(`├── Total Images: ${totalImages}`);
      console.log(`├── Total Size: ${this.formatBytes(totalSize)}`);
      console.log(`├── Image Types:`, imagesByType);
      if (oldestImage && newestImage) {
        console.log(`├── Date Range: ${oldestImage.toLocaleDateString()} - ${newestImage.toLocaleDateString()}`);
      }

      return stats;

    } catch (error) {
      console.error('[ImageDB] ❌ Failed to get stats:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        imagesByType: {}
      };
    }
  }

  /**
   * Clean up old images (older than specified days)
   */
  async cleanupOldImages(daysOld: number = 30): Promise<number> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return 0;
    }

    try {
      await this.db.ensureInitialized();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldImages = await this.db.images
        .where('createdAt')
        .below(cutoffDate)
        .toArray();

      if (oldImages.length === 0) {
        console.log(`[ImageDB] 🧹 No images older than ${daysOld} days to clean up`);
        return 0;
      }

      await Promise.all(oldImages.map((img: StoredImage) => this.db.images.delete(img.id)));

      console.log(`[ImageDB] 🧹 Cleaned up ${oldImages.length} images older than ${daysOld} days`);
      return oldImages.length;

    } catch (error) {
      console.error('[ImageDB] ❌ Failed to clean up old images:', error);
      return 0;
    }
  }

  /**
   * Clear all images from database
   */
  async clearAll(): Promise<void> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return;
    }

    try {
      await this.db.ensureInitialized();
      await this.db.images.clear();
      console.log('[ImageDB] 🗑️ Cleared all images from database');
    } catch (error) {
      console.error('[ImageDB] ❌ Failed to clear database:', error);
      throw error;
    }
  }

  /**
   * Deduplicate images by keeping only the lowest size image for each (chatId, messageId) group
   */
  async dedupeImages(): Promise<{ totalDeleted: number; spaceSaved: number }> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return { totalDeleted: 0, spaceSaved: 0 };
    }

    try {
      await this.db.ensureInitialized();

      const allImages = await this.db.images.toArray();
      const groupedImages: Record<string, StoredImage[]> = {};

      // Group images by messageId to ensure at least one image per message
      for (const image of allImages) {
        const key = image.messageId;
        if (!groupedImages[key]) {
          groupedImages[key] = [];
        }
        groupedImages[key].push(image);
      }

      let totalDeleted = 0;
      let spaceSaved = 0;

      for (const [groupKey, images] of Object.entries(groupedImages)) {
        if (images.length <= 1) continue; // No duplicates in this group

        // Sort images by size (smallest first)
        images.sort((a, b) => a.size - b.size);

        // Keep the smallest image
        const keepImage = images[0];

        // Move the rest to recycle bin instead of deleting directly
        if (images.length > 1) {
          const imagesToRecycle = images.slice(1); // All except the first (smallest)
          await recycleBinService.moveToRecycleBinBatch(imagesToRecycle, 'dedupe');
          totalDeleted += imagesToRecycle.length;
          spaceSaved += imagesToRecycle.reduce((sum, img) => sum + img.size, 0);

          // Now delete from main database
          for (const deleteImage of imagesToRecycle) {
            await this.db.images.delete(deleteImage.id);
            console.log(`[ImageDB] 🗃️ Moved duplicate image to recycle bin: ${deleteImage.id} (${this.formatBytes(deleteImage.size)}), kept smaller: ${keepImage.id} (${this.formatBytes(keepImage.size)})`);
          }
        }
      }

      console.log(`[ImageDB] ✅ Deduplication complete:`);
      console.log(`├── Total duplicates deleted: ${totalDeleted}`);
      console.log(`└── Total space saved: ${this.formatBytes(spaceSaved)}`);

      return { totalDeleted, spaceSaved };

    } catch (error) {
      console.error('[ImageDB] ❌ Failed to dedupe images:', error);
      return { totalDeleted: 0, spaceSaved: 0 };
    }
  }

  /**
   * Migrate chat history images to IndexedDB
   */
  async migrateFromChatHistory(chats: any[]): Promise<number> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return 0;
    }

    if (!chats || chats.length === 0) return 0;

    let migratedCount = 0;

    try {
      await this.db.ensureInitialized();

      for (const chat of chats) {
        if (!chat.messages) continue;

        for (const message of chat.messages) {
          // Handle single imageUrl
          if (message.imageUrl && message.imageUrl.startsWith('data:image/')) {
            try {
              const imageId = `msg_${message.id}_single`;
              await this.storeImage(
                imageId,
                chat.id,
                message.id,
                message.imageUrl,
                {
                  metadata: {
                    source: 'migrated',
                    originalFileName: `Message ${message.id} image`
                  }
                }
              );
              message.imageUrl = `indexeddb:${imageId}`; // Mark as migrated
              migratedCount++;
            } catch (error) {
              console.warn(`[ImageDB] Migration failed for single image in message ${message.id}:`, error);
            }
          }

          // Handle imageGenerations
          if (message.imageGenerations && Array.isArray(message.imageGenerations)) {
            for (let genIdx = 0; genIdx < message.imageGenerations.length; genIdx++) {
              const generation = message.imageGenerations[genIdx];

              if (generation.images && Array.isArray(generation.images)) {
                for (let imgIdx = 0; imgIdx < generation.images.length; imgIdx++) {
                  const image = generation.images[imgIdx];

                  if (image.uri && image.uri.startsWith('data:image/')) {
                    try {
                      const imageId = `msg_${message.id}_gen_${genIdx}_img_${imgIdx}`;
                      await this.storeImage(
                        imageId,
                        chat.id,
                        message.id,
                        image.uri,
                        {
                          width: image.width,
                          height: image.height,
                          mimeType: image.mimeType,
                          metadata: {
                            source: 'migrated',
                            generationParams: generation,
                            imageIndex: imgIdx
                          }
                        }
                      );
                      image.uri = `indexeddb:${imageId}`; // Mark as migrated
                      migratedCount++;
                    } catch (error) {
                      console.warn(`[ImageDB] Migration failed for generation image ${imgIdx}:`, error);
                    }
                  }
                }
              }
            }
          }
        }
      }

      console.log(`[ImageDB] ✅ Migrated ${migratedCount} images from chat history`);
      return migratedCount;

    } catch (error) {
      console.error('[ImageDB] ❌ Migration failed:', error);
      throw error;
    }
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


  /**
   * Compress an existing image in the database using a preset
   */
  async compressImage(
    imageId: string,
    presetName: string,
    options?: {
      updateOriginal?: boolean; // Whether to replace original or create new
      newPrefix?: string; // Prefix for new compressed images
    }
  ): Promise<{ originalImage?: StoredImage; compressedImage: StoredImage; result: any }> {
    if (!this.isBrowser()) {
      throw new Error('Image compression requires browser environment');
    }

    // Import compression service here to avoid circular dependencies
    const { ImageCompressionService } = await import('./image-compression-service');
    const compressionService = new ImageCompressionService();

    try {
      await this.db.ensureInitialized();

      // Get the original image
      const originalImage = await this.db.images.get(imageId);
      if (!originalImage) {
        throw new Error(`Image not found: ${imageId}`);
      }

      if (!originalImage.uri || !originalImage.uri.startsWith('data:image/')) {
        // Try to resolve IndexedDB reference
        if (originalImage.uri.startsWith('indexeddb:')) {
          const resolvedUri = await this.db.images.get(originalImage.uri.replace('indexeddb:', ''));
          if (resolvedUri?.uri) {
            originalImage.uri = resolvedUri.uri;
          } else {
            throw new Error('Cannot resolve IndexedDB image URI');
          }
        } else {
          throw new Error('Image URI is not in supported format for compression');
        }
      }

      console.log(`[ImageDBService] 🗜️ Compressing image: ${imageId} (${this.formatBytes(originalImage.size)})`);

      // Compress the image
      const compressionResult = await compressionService.compressImageWithPreset(
        originalImage.uri,
        presetName
      );

      // Determine the ID for the compressed image
      const { updateOriginal = false, newPrefix = 'compressed' } = options || {};
      const compressedImageId = updateOriginal ? imageId : `${newPrefix}_${imageId}_${Date.now()}`;

      // Store the compressed image
      await this.db.images.put({
        ...originalImage,
        id: compressedImageId,
        uri: compressionResult.compressedBase64,
        size: compressionResult.compressedSize,
        createdAt: updateOriginal ? originalImage.createdAt : new Date(),
        lastAccessed: updateOriginal ? originalImage.lastAccessed : new Date(),
        metadata: {
          ...originalImage.metadata,
          source: updateOriginal ? originalImage.metadata?.source : 'compressed',
          compression: {
            preset: presetName,
            library: compressionResult.library,
            quality: compressionResult.quality,
            originalSize: compressionResult.originalSize,
            compressionTime: compressionResult.processingTime,
            savingsPercent: compressionResult.savingsPercent
          }
        }
      } as StoredImage);

      console.log(`[ImageDBService] ✅ Compressed image: ${compressedImageId}`);
      console.log(`[ImageDBService] 📊 Savings: ${Math.round(compressionResult.savingsPercent)}%`);

      return {
        originalImage: updateOriginal ? undefined : originalImage,
        compressedImage: await this.db.images.get(compressedImageId) as StoredImage,
        result: compressionResult
      };

    } catch (error) {
      console.error('[ImageDBService] ❌ Compression failed:', error);
      throw error;
    }
  }

  /**
   * Get all images from database
   */
  async getAllImages(): Promise<StoredImage[]> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return [];
    }

    try {
      await this.db.ensureInitialized();
      const images = await this.db.images.toArray();
      console.log(`[ImageDB] 📋 Found ${images.length} total images in database`);
      return images;
    } catch (error) {
      console.error('[ImageDB] ❌ Failed to get all images:', error);
      return [];
    }
  }

  /**
   * Compress multiple images in batch
   */
  async compressImagesBatch(
    imageIds: string[],
    presetName: string,
    options?: {
      updateOriginal?: boolean;
      newPrefix?: string;
      concurrency?: number; // Max concurrent compressions
      onProgress?: (completed: number, total: number, result?: any) => void;
    }
  ): Promise<{
    successful: number;
    failed: number;
    totalSpaceSaved: number;
    results: Array<{ id: string; success: boolean; error?: string; result?: any }>;
  }> {
    if (!this.isBrowser()) {
      throw new Error('Image compression requires browser environment');
    }

    const { concurrency = 3, onProgress } = options || {};
    const results: Array<{ id: string; success: boolean; error?: string; result?: any }> = [];
    let successful = 0;
    let failed = 0;
    let totalSpaceSaved = 0;

    console.log(`[ImageDBService] 🗜️ Batch compressing ${imageIds.length} images...`);

    // Process in batches to avoid overwhelming the browser
    for (let i = 0; i < imageIds.length; i += concurrency) {
      const batch = imageIds.slice(i, i + concurrency);
      const batchPromises = batch.map(async (imageId, index) => {
        try {
          const compressionResult = await this.compressImage(imageId, presetName, options);
          successful++;
          totalSpaceSaved += compressionResult.result.savingsBytes;
          results.push({
            id: imageId,
            success: true,
            result: compressionResult.result
          });
          return compressionResult.result;
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            id: imageId,
            success: false,
            error: errorMessage
          });
          console.warn(`[ImageDBService] ⚠️ Failed to compress ${imageId}:`, error);
          return null;
        }
      });

      await Promise.all(batchPromises);

      // Report progress
      const completed = i + batch.length;
      onProgress?.(completed, imageIds.length, results[results.length - 1]);
    }

    console.log(`[ImageDBService] ✅ Batch compression complete:`);
    console.log(`[ImageDBService] ├── Successful: ${successful}`);
    console.log(`[ImageDBService] ├── Failed: ${failed}`);
    console.log(`[ImageDBService] └── Total space saved: ${this.formatBytes(totalSpaceSaved)}`);

    return {
      successful,
      failed,
      totalSpaceSaved,
      results
    };
  }

  /**
   * Clean up unreferenced images - move to recycle bin
   */
  async cleanupUnreferencedImages(): Promise<{ totalDeleted: number; spaceSaved: number }> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return { totalDeleted: 0, spaceSaved: 0 };
    }

    try {
      await this.db.ensureInitialized();

      // Get all stored chats from localStorage to find referenced image IDs
      const chatHistory = localStorage.getItem("chat_history");
      if (!chatHistory) {
        console.log('[ImageDB] 📋 No chat history found, cannot determine referenced images');
        return { totalDeleted: 0, spaceSaved: 0 };
      }

      const chats = JSON.parse(chatHistory);
      const referencedImageIds = new Set<string>();

      // Collect all image IDs that are referenced in chat messages
      for (const chat of chats) {
        for (const message of chat.messages || []) {
          // Single imageUrl
          if (message.imageUrl && message.imageUrl.startsWith('indexeddb:')) {
            const imageId = message.imageUrl.replace('indexeddb:', '');
            referencedImageIds.add(imageId);
          }

          // Images in imageGenerations
          if (message.imageGenerations && Array.isArray(message.imageGenerations)) {
            for (const generation of message.imageGenerations) {
              if (generation.images && Array.isArray(generation.images)) {
                for (const image of generation.images) {
                  if (image.uri && image.uri.startsWith('indexeddb:')) {
                    const imageId = image.uri.replace('indexeddb:', '');
                    referencedImageIds.add(imageId);
                  }
                }
              }
            }
          }
        }
      }

      // Get all images in the database
      const allImages = await this.db.images.toArray();
      const unreferencedImages = allImages.filter(img => !referencedImageIds.has(img.id));

      if (unreferencedImages.length === 0) {
        console.log('[ImageDB] ✅ No unreferenced images found');
        return { totalDeleted: 0, spaceSaved: 0 };
      }

      // Move unreferenced images to recycle bin
      await recycleBinService.moveToRecycleBinBatch(unreferencedImages, 'unreferenced');

      // Remove from main database
      const imageIdsToDelete = unreferencedImages.map(img => img.id);
      await this.db.images.bulkDelete(imageIdsToDelete);

      const spaceSaved = unreferencedImages.reduce((sum, img) => sum + img.size, 0);

      console.log('[ImageDB] 🗃️ Moved unreferenced images to recycle bin:');
      console.log(`├── Total moved: ${unreferencedImages.length}`);
      console.log(`└── Space saved: ${this.formatBytes(spaceSaved)}`);

      return { totalDeleted: unreferencedImages.length, spaceSaved };

    } catch (error) {
      console.error('[ImageDB] ❌ Failed to cleanup unreferenced images:', error);
      return { totalDeleted: 0, spaceSaved: 0 };
    }
  }
}

// Export singleton service instance
export const imageDBService = new ImageDBService();
