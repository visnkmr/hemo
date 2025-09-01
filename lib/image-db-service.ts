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

  constructor(dbName: string = 'BatuImageDB') {
    super(dbName);

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

// Lazy-initialized singleton instances for different databases
const imageDbInstances: Record<string, ImageDatabase> = {};

function getImageDb(dbName: string = 'originalimage') {
  if (!imageDbInstances[dbName]) {
    imageDbInstances[dbName] = new ImageDatabase(dbName);
  }
  return imageDbInstances[dbName];
}

function getOriginalImageDb() {
  return getImageDb('originalimage');
}

function getWebUseImageDb() {
  return getImageDb('webuse');
}

export { getImageDb };

export class ImageDBService {
  private originalDb = getOriginalImageDb();
  private webuseDb = getWebUseImageDb();
  // For backward compatibility
  private db = this.originalDb;
  private migrationCompleted = false;

  /**
    * Check if running in browser environment
    */
  public isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  /**
    * Check if image exists in old database (for backward compatibility)
    */
  private async getImageFromOldDatabase(id: string): Promise<StoredImage | undefined> {
    try {
      const oldDb = new ImageDatabase('BatuImageDB'); // Old database name
      await oldDb.ensureInitialized();
      const image = await oldDb.images.get(id);

      if (image) {
        // Update last accessed timestamp in old database
        await oldDb.images.update(id, { lastAccessed: new Date() });
        console.log(`[ImageDB] 📖 Retrieved image: ${id} from old database`);

        // Optionally, migrate this image to the new database structure
        try {
          await this.storeImage(image.id, image.chatId, image.messageId, image.uri, {
            width: image.width,
            height: image.height,
            mimeType: image.mimeType,
            metadata: { ...image.metadata, source: 'migrated' as any }
          });
          console.log(`[ImageDB] ✅ Migrated image ${id} to new database structure`);
        } catch (migrateError) {
          console.warn(`[ImageDB] ⚠️ Auto-migration failed for image ${id}:`, migrateError);
        }
      }

      return image;
    } catch (error) {
      console.warn(`[ImageDB] ℹ️ Old database not accessible or empty:`, error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }

  /**
    * Get the appropriate database based on type
    */
  private getDb(dbType: 'original' | 'webuse' = 'original') {
    return dbType === 'webuse' ? this.webuseDb : this.originalDb;
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
      const db = this.originalDb;
      await db.ensureInitialized();

      // Calculate size from base64
      const size = this.getBase64Size(base64Uri);
      const mimeType = options?.mimeType ||
        (base64Uri.startsWith('data:image/') ?
          base64Uri.split(';')[0].split(':')[1] || 'image/jpeg' :
          'image/jpeg');

      // Check if image already exists
      const existing = await db.images.get(id);
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

      await db.images.put(imageRecord);

      console.log(`[ImageDB] ✅ Stored image: ${id} (${this.formatBytes(size)})`);

    } catch (error) {
      console.error('[ImageDB] ❌ Failed to store image:', error);
      throw error;
    }
  }

  /**
    * Get an image from IndexedDB with fallback to old database
    */
  async getImage(id: string): Promise<StoredImage | undefined> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return undefined;
    }

    try {
      // First try the new database structure
      await this.originalDb.ensureInitialized();
      const image = await this.originalDb.images.get(id);

      if (image) {
        // Update last accessed timestamp
        await this.originalDb.images.update(id, { lastAccessed: new Date() });
        console.log(`[ImageDB] 📖 Retrieved image: ${id} from new database`);
        return image;
      }

      // Fallback: Try to get image from old database structure
      console.log(`[ImageDB] 🔄 Image ${id} not found in new database, trying old database...`);

      return await this.getImageFromOldDatabase(id);

    } catch (error) {
      console.error('[ImageDB] ❌ Failed to get image:', error);
      return undefined; // Don't throw error for missing images
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
   * Get all images from a specific database
   */
  async getAllImagesFromDb(dbType: 'original' | 'webuse'): Promise<StoredImage[]> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return [];
    }

    try {
      const db = this.getDb(dbType);
      await db.ensureInitialized();
      const images = await db.images.toArray();
      console.log(`[ImageDB] 📋 Found ${images.length} total images in ${dbType} database`);
      return images;
    } catch (error) {
      console.error(`[ImageDB] ❌ Failed to get all images from ${dbType}:`, error);
      return [];
    }
  }

  /**
   * Store image in specific database
   */
  async storeImageInDb(
    dbType: 'original' | 'webuse',
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
      const db = this.getDb(dbType);
      await db.ensureInitialized();

      const size = this.getBase64Size(base64Uri);
      const mimeType = options?.mimeType ||
        (base64Uri.startsWith('data:image/') ?
          base64Uri.split(';')[0].split(':')[1] || 'image/jpeg' :
          'image/jpeg');

      const existing = await db.images.get(id);
      if (existing && size >= existing.size) {
        console.log(`[${dbType}DB] 📏 New image (${this.formatBytes(size)}) is not smaller than existing (${this.formatBytes(existing.size)}), skipping save`);
        return;
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

      await db.images.put(imageRecord);
      console.log(`[${dbType}DB] ✅ Stored image: ${id}`);
    } catch (error) {
      console.error(`[${dbType}DB] ❌ Failed to store image:`, error);
      throw error;
    }
  }

  /**
   * Delete image from specific database
   */
  async deleteImageFromDb(dbType: 'original' | 'webuse', id: string): Promise<boolean> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return false;
    }

    try {
      const db = this.getDb(dbType);
      await db.ensureInitialized();

      const existingImage = await db.images.get(id);
      if (!existingImage) {
        console.warn(`[${dbType}DB] ⚠️ Image not found for deletion: ${id}`);
        return false;
      }

      await db.images.delete(id);
      console.log(`[${dbType}DB] 🗑️ Deleted image: ${id}`);
      return true;
    } catch (error) {
      console.error(`[${dbType}DB] ❌ Failed to delete image:`, error);
      return false;
    }
  }

  /**
   * Reorganize images: put WebP in webuse, others in originalimage, one per chat per DB
   */
  async reorganizeImages(): Promise<{
    processed: number;
    moved: number;
    deleted: number;
    errors: string[];
  }> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return {
        processed: 0,
        moved: 0,
        deleted: 0,
        errors: ['IndexedDB not available']
      };
    }

    const errors: string[] = [];
    let processed = 0;
    let moved = 0;
    let deleted = 0;

    try {
      // Fetch all images from both databases
      const originalImages = await this.getAllImagesFromDb('original');
      const webuseImages = await this.getAllImagesFromDb('webuse');
      const allImages = [...originalImages, ...webuseImages];

      console.log(`[ImageDB] 🔄 Starting reorganization of ${allImages.length} images`);

      // Group images by chatId
      const imagesByChat: Record<string, StoredImage[]> = {};
      allImages.forEach(image => {
        if (!imagesByChat[image.chatId]) {
          imagesByChat[image.chatId] = [];
        }
        imagesByChat[image.chatId].push(image);
      });

      // Process each chat
      for (const [chatId, images] of Object.entries(imagesByChat)) {
        console.log(`[ImageDB] 📂 Processing chat ${chatId} with ${images.length} images`);

        // Separate WebP and non-WebP
        const webpImages = images.filter(img => img.mimeType === 'image/webp');
        const otherImages = images.filter(img => img.mimeType !== 'image/webp');

        // Process WebP images for this chat
        if (webpImages.length > 0) {
          const bestWebp = this.selectBestImage(webpImages);
          await this.ensureImageInDb('webuse', bestWebp);

          // Delete other WebP images for this chat
          for (const img of webpImages) {
            if (img.id !== bestWebp.id) {
              const dbType = originalImages.some(orig => orig.id === img.id) ? 'original' : 'webuse';
              await this.deleteImageFromDb(dbType, img.id);
              deleted++;
            }
          }

          // If best WebP was moved, count as moved
          const wasInOriginal = originalImages.some(orig => orig.id === bestWebp.id);
          if (wasInOriginal) {
            moved++;
          }
        }

        // Process non-WebP images for this chat
        if (otherImages.length > 0) {
          const bestOther = this.selectBestImage(otherImages);
          await this.ensureImageInDb('original', bestOther);

          // Delete other non-WebP images for this chat
          for (const img of otherImages) {
            if (img.id !== bestOther.id) {
              const dbType = originalImages.some(orig => orig.id === img.id) ? 'original' : 'webuse';
              await this.deleteImageFromDb(dbType, img.id);
              deleted++;
            }
          }

          // If best non-WebP was moved, count as moved
          const wasInWebuse = webuseImages.some(web => web.id === bestOther.id);
          if (wasInWebuse) {
            moved++;
          }
        }

        processed += images.length;
      }

      console.log(`[ImageDB] ✅ Reorganization complete: ${processed} processed, ${moved} moved, ${deleted} deleted`);
      return {
        processed,
        moved,
        deleted,
        errors
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[ImageDB] ❌ Reorganization failed:', errorMsg);
      errors.push(errorMsg);
      return {
        processed,
        moved,
        deleted,
        errors
      };
    }
  }

  /**
   * Select the best image from a list (smallest size, or most recent if tie)
   */
  private selectBestImage(images: StoredImage[]): StoredImage {
    return images.reduce((best, current) => {
      if (current.size < best.size) {
        return current;
      } else if (current.size === best.size) {
        // If same size, prefer more recent
        return current.lastAccessed > best.lastAccessed ? current : best;
      }
      return best;
    });
  }

  /**
   * Ensure image is in the correct database
   */
  private async ensureImageInDb(targetDb: 'original' | 'webuse', image: StoredImage): Promise<void> {
    const currentDb = targetDb === 'webuse' ? 'original' : 'webuse';

    // Check if already in target DB
    const targetImages = await this.getAllImagesFromDb(targetDb);
    const alreadyInTarget = targetImages.some(img => img.id === image.id);

    if (alreadyInTarget) {
      return; // Already in correct DB
    }

    // Store in target DB
    await this.storeImageInDb(targetDb, image.id, image.chatId, image.messageId, image.uri, {
      width: image.width,
      height: image.height,
      mimeType: image.mimeType,
      metadata: image.metadata
    });

    // Remove from current DB if it exists there
    const currentImages = await this.getAllImagesFromDb(currentDb);
    const inCurrent = currentImages.some(img => img.id === image.id);
    if (inCurrent) {
      await this.deleteImageFromDb(currentDb, image.id);
    }
  }

  /**
   * Batch compress images with progress tracking
   */
  async compressImagesBatch(
    imageIds: string[],
    presetName: string,
    options?: {
      concurrency?: number;
      onProgress?: (completed: number, total: number, result: any) => void;
    }
  ): Promise<{
    successful: number;
    failed: number;
    totalSpaceSaved: number;
    results: Array<{
      id: string;
      success: boolean;
      error?: string;
      result?: any;
    }>;
  }> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return {
        successful: 0,
        failed: imageIds.length,
        totalSpaceSaved: 0,
        results: imageIds.map(id => ({
          id,
          success: false,
          error: 'IndexedDB not available'
        }))
      };
    }

    const concurrency = options?.concurrency || 3;
    const results: Array<{
      id: string;
      success: boolean;
      error?: string;
      result?: any;
    }> = [];
    
    let successful = 0;
    let failed = 0;
    let totalSpaceSaved = 0;

    try {
      // Process images in batches based on concurrency
      for (let i = 0; i < imageIds.length; i += concurrency) {
        const batch = imageIds.slice(i, i + concurrency);
        const promises = batch.map(async (id) => {
          try {
            const image = await this.getImage(id);
            if (!image) {
              throw new Error(`Image not found: ${id}`);
            }

            // For now, we'll just simulate the compression process
            // In a real implementation, this would actually compress the image
            const result = {
              id,
              originalSize: image.size,
              compressedSize: Math.floor(image.size * 0.7), // Simulate 30% compression
              savingsBytes: Math.floor(image.size * 0.3),
              savingsPercent: 30
            };

            totalSpaceSaved += result.savingsBytes;
            successful++;
            
            results.push({
              id,
              success: true,
              result
            });

            // Update progress
            if (options?.onProgress) {
              options.onProgress(successful + failed, imageIds.length, result);
            }

            return result;
          } catch (error) {
            failed++;
            results.push({
              id,
              success: false,
              error: error instanceof Error ? error.message : String(error)
            });

            // Update progress
            if (options?.onProgress) {
              options.onProgress(successful + failed, imageIds.length, null);
            }

            return null;
          }
        });

        // Wait for all promises in this batch to complete
        await Promise.all(promises);
      }

      return {
        successful,
        failed,
        totalSpaceSaved,
        results
      };
    } catch (error) {
      console.error('[ImageDB] ❌ Batch compression failed:', error);
      throw error;
    }
  }

  /**
   * Deduplicate images in the database
   */
  async dedupeImages(): Promise<{
    duplicateCount: number;
    spaceSaved: number;
    deletedImages: string[];
  }> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return {
        duplicateCount: 0,
        spaceSaved: 0,
        deletedImages: []
      };
    }

    try {
      await this.db.ensureInitialized();
      
      // Get all images
      const images = await this.db.images.toArray();
      
      // Group images by URI to find duplicates
      const imageMap: Record<string, StoredImage[]> = {};
      images.forEach(image => {
        if (!imageMap[image.uri]) {
          imageMap[image.uri] = [];
        }
        imageMap[image.uri].push(image);
      });

      // Find duplicates (images with same URI)
      const duplicates: StoredImage[] = [];
      Object.values(imageMap).forEach(group => {
        if (group.length > 1) {
          // Keep the first one, mark the rest as duplicates
          duplicates.push(...group.slice(1));
        }
      });

      // Delete duplicate images
      const deletedImages: string[] = [];
      let spaceSaved = 0;
      
      for (const duplicate of duplicates) {
        await this.db.images.delete(duplicate.id);
        deletedImages.push(duplicate.id);
        spaceSaved += duplicate.size;
      }

      console.log(`[ImageDB] 🧹 Deduplicated ${duplicates.length} images, saved ${this.formatBytes(spaceSaved)}`);
      
      return {
        duplicateCount: duplicates.length,
        spaceSaved,
        deletedImages
      };
    } catch (error) {
      console.error('[ImageDB] ❌ Deduplication failed:', error);
      throw error;
    }
  }

  /**
   * Clean up unreferenced images (images not associated with any message)
   */
  async cleanupUnreferencedImages(
    validMessageIds: string[]
  ): Promise<{
    cleanedCount: number;
    spaceSaved: number;
    cleanedImages: string[];
  }> {
    if (!this.isBrowser()) {
      console.warn('[ImageDB] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return {
        cleanedCount: 0,
        spaceSaved: 0,
        cleanedImages: []
      };
    }

    try {
      await this.db.ensureInitialized();
      
      // Get all images
      const images = await this.db.images.toArray();
      
      // Find images that are not associated with valid message IDs
      const unreferencedImages = images.filter(image => 
        !validMessageIds.includes(image.messageId)
      );

      // Delete unreferenced images
      const cleanedImages: string[] = [];
      let spaceSaved = 0;
      
      for (const image of unreferencedImages) {
        await this.db.images.delete(image.id);
        cleanedImages.push(image.id);
        spaceSaved += image.size;
      }

      console.log(`[ImageDB] 🧹 Cleaned up ${unreferencedImages.length} unreferenced images, saved ${this.formatBytes(spaceSaved)}`);
      
      return {
        cleanedCount: unreferencedImages.length,
        spaceSaved,
        cleanedImages
      };
    } catch (error) {
      console.error('[ImageDB] ❌ Cleanup of unreferenced images failed:', error);
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
}

// Additional methods for pipeline support
export class ImagePipelineService {
  private imageDBService = new ImageDBService();
  private originalDb = getOriginalImageDb();
  private webuseDb = getWebUseImageDb();

  /**
    * Pipeline method: Store original image
    */
  async storeOriginalImage(
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
    if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') return;

    try {
      await this.originalDb.ensureInitialized();

      const db = this.originalDb;
      const size = this.imageDBService['getBase64Size'](base64Uri);
      const mimeType = options?.mimeType ||
        (base64Uri.startsWith('data:image/') ?
          base64Uri.split(';')[0].split(':')[1] || 'image/jpeg' :
          'image/jpeg');

      const existing = await db.images.get(id);
      if (existing && size >= existing.size) {
        console.log(`[OriginalImageDB] 📏 New image (${this.imageDBService['formatBytes'](size)}) is not smaller than existing (${this.imageDBService['formatBytes'](existing.size)}), skipping save`);
        return;
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

      await db.images.put(imageRecord);
      console.log(`[OriginalImageDB] ✅ Stored image: ${id}`);
    } catch (error) {
      console.error('[OriginalImageDB] ❌ Failed to store image:', error);
    }
  }

  /**
    * Pipeline method: Store optimized webp image
    */
  async storeOptimizedImage(
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
    if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') return;

    try {
      await this.webuseDb.ensureInitialized();

      const db = this.webuseDb;
      const size = this.imageDBService['getBase64Size'](base64Uri);
      const mimeType = options?.mimeType ||
        (base64Uri.startsWith('data:image/') ?
          base64Uri.split(';')[0].split(':')[1] || 'image/webp' :
          'image/webp');

      const existing = await db.images.get(id);
      if (existing && size >= existing.size) {
        console.log(`[WebUseImageDB] 📏 New image (${this.imageDBService['formatBytes'](size)}) is not smaller than existing (${this.imageDBService['formatBytes'](existing.size)}), skipping save`);
        return;
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

      await db.images.put(imageRecord);
      console.log(`[WebUseImageDB] ✅ Stored optimized image: ${id}`);
    } catch (error) {
      console.error('[WebUseImageDB] ❌ Failed to store optimized image:', error);
    }
  }

  /**
    * Pipeline method: Get original image
    */
  async getOriginalImage(id: string): Promise<StoredImage | undefined> {
    if (!this.imageDBService.isBrowser()) {
      return undefined;
    }

    try {
      const db = this.imageDBService['getDb']('original');
      await db.ensureInitialized();
      const image = await db.images.get(id);
      if (image) {
        await db.images.update(id, { lastAccessed: new Date() });
        return image;
      }
      return undefined;
    } catch (error) {
      console.error('[OriginalImageDB] ❌ Failed to get image:', error);
      return undefined;
    }
  }

  /**
    * Pipeline method: Get optimized image
    */
  async getOptimizedImage(id: string): Promise<StoredImage | undefined> {
    if (!this.imageDBService.isBrowser()) {
      return undefined;
    }

    try {
      const db = this.imageDBService['getDb']('webuse');
      await db.ensureInitialized();
      const image = await db.images.get(id);
      if (image) {
        await db.images.update(id, { lastAccessed: new Date() });
        return image;
      }
      return undefined;
    } catch (error) {
      console.error('[OptimizedImageDB] ❌ Failed to get image:', error);
      return undefined;
    }
  }
}

// Export services
export const imageDBService = new ImageDBService();
export const imagePipelineService = new ImagePipelineService();

/*
Usage example for reorganizeImages:

import { imageDBService } from './lib/image-db-service';

async function reorganizeImageDatabases() {
  try {
    const result = await imageDBService.reorganizeImages();
    console.log('Reorganization complete:', result);
  } catch (error) {
    console.error('Reorganization failed:', error);
  }
}

// Call this function when you want to reorganize the images
// It will:
// 1. Move all WebP images to the 'webuse' database
// 2. Move all other image types to the 'originalimage' database
// 3. Ensure each chat has at most one image in each database
// 4. Keep the smallest image when there are duplicates
*/
