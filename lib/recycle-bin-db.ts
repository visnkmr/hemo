import Dexie, { Table } from 'dexie';

export interface RecycledImage {
  id: string; // Original image ID from main database
  chatId: string;
  messageId: string;
  uri: string; // Base64 data URL
  mimeType: string;
  width: number;
  height: number;
  size: number; // File size in bytes
  deletedAt: Date; // Timestamp when moved to recycle bin
  originalDeletionReason: 'dedupe' | 'unreferenced' | 'other'; // Reason for deletion
}

export class RecycleBinDatabase extends Dexie {
  recycledImages!: Table<RecycledImage>;
  private isInitialized = false;

  constructor() {
    super('RecycleBinDB');

    this.version(1).stores({
      recycledImages: 'id, deletedAt, originalDeletionReason'
    });
  }

  async ensureInitialized() {
    if (!this.isInitialized && typeof window !== 'undefined') {
      try {
        await this.open();
        this.isInitialized = true;
        console.log('[🗑️ RecycleBin] ✅ Database initialized successfully');
      } catch (err) {
        console.error('[🗑️ RecycleBin] ❌ Failed to open database:', err);
        throw err;
      }
    }
  }
}

// Lazy-initialized singleton instance
let recycleBinDbInstance: RecycleBinDatabase | null = null;

function getRecycleBinDb() {
  if (!recycleBinDbInstance) {
    recycleBinDbInstance = new RecycleBinDatabase();
  }
  return recycleBinDbInstance;
}

export { getRecycleBinDb };

export class RecycleBinService {
  private db = getRecycleBinDb();

  /**
   * Check if running in browser environment
   */
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  /**
   * Move an image to recycle bin
   */
  async moveToRecycleBin(
    image: any, // From main StoredImage
    reason: RecycledImage['originalDeletionReason'] = 'other'
  ): Promise<void> {
    if (!this.isBrowser()) {
      console.warn('[🗑️ RecycleBin] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return;
    }

    try {
      await this.db.ensureInitialized();

      const recycledImage: RecycledImage = {
        id: image.id,
        chatId: image.chatId,
        messageId: image.messageId,
        uri: image.uri,
        mimeType: image.mimeType || 'image/jpeg',
        width: image.width,
        height: image.height,
        size: image.size,
        deletedAt: new Date(),
        originalDeletionReason: reason
      };

      await this.db.recycledImages.put(recycledImage);

      console.log(`[🗑️ RecycleBin] ✅ Moved image ${image.id} to recycle bin (${this.formatBytes(image.size)})`);

    } catch (error) {
      console.error('[🗑️ RecycleBin] ❌ Failed to move image to recycle bin:', error);
      throw error;
    }
  }

  /**
   * Move multiple images to recycle bin
   */
  async moveToRecycleBinBatch(
    images: any[],
    reason: RecycledImage['originalDeletionReason'] = 'other'
  ): Promise<void> {
    if (!this.isBrowser()) {
      console.warn('[🗑️ RecycleBin] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return;
    }

    if (images.length === 0) return;

    try {
      await this.db.ensureInitialized();

      const recycledImages: RecycledImage[] = images.map(image => ({
        id: image.id,
        chatId: image.chatId,
        messageId: image.messageId,
        uri: image.uri,
        mimeType: image.mimeType || 'image/jpeg',
        width: image.width,
        height: image.height,
        size: image.size,
        deletedAt: new Date(),
        originalDeletionReason: reason
      }));

      await this.db.recycledImages.bulkPut(recycledImages);

      const totalSize = recycledImages.reduce((sum, img) => sum + img.size, 0);
      console.log(`[🗑️ RecycleBin] ✅ Moved ${recycledImages.length} images to recycle bin (${this.formatBytes(totalSize)})`);

    } catch (error) {
      console.error('[🗑️ RecycleBin] ❌ Failed to move images to recycle bin:', error);
      throw error;
    }
  }

  /**
   * Get all images in recycle bin
   */
  async getAllRecycledImages(): Promise<RecycledImage[]> {
    if (!this.isBrowser()) {
      console.warn('[🗑️ RecycleBin] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return [];
    }

    try {
      await this.db.ensureInitialized();
      const images = await this.db.recycledImages.orderBy('deletedAt').reverse().toArray(); // Newest first

      console.log(`[🗑️ RecycleBin] 📋 Found ${images.length} images in recycle bin`);
      return images;

    } catch (error) {
      console.error('[🗑️ RecycleBin] ❌ Failed to get recycled images:', error);
      throw error;
    }
  }

  /**
   * Delete a specific image from recycle bin
   */
  async deleteRecycledImage(imageId: string): Promise<boolean> {
    if (!this.isBrowser()) {
      console.warn('[🗑️ RecycleBin] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return false;
    }

    try {
      await this.db.ensureInitialized();
      await this.db.recycledImages.delete(imageId);
      console.log(`[🗑️ RecycleBin] 🗑️ Permanently deleted recycled image ${imageId}`);
      return true;

    } catch (error) {
      console.error('[🗑️ RecycleBin] ❌ Failed to delete recycled image:', error);
      return false;
    }
  }

  /**
   * Clear all images from recycle bin
   */
  async clearAllRecycledImages(): Promise<number> {
    if (!this.isBrowser()) {
      console.warn('[🗑️ RecycleBin] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return 0;
    }

    try {
      await this.db.ensureInitialized();
      const count = await this.db.recycledImages.count();
      await this.db.recycledImages.clear();
      console.log(`[🗑️ RecycleBin] 🗑️ Cleared all ${count} images from recycle bin`);
      return count;

    } catch (error) {
      console.error('[🗑️ RecycleBin] ❌ Failed to clear recycle bin:', error);
      return 0;
    }
  }

  /**
   * Clean up images older than specified days
   */
  async cleanupOldImages(daysOld: number = 30): Promise<number> {
    if (!this.isBrowser()) {
      console.warn('[🗑️ RecycleBin] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return 0;
    }

    try {
      await this.db.ensureInitialized();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldImages = await this.db.recycledImages
        .where('deletedAt')
        .below(cutoffDate)
        .toArray();

      if (oldImages.length === 0) {
        console.log(`[🗑️ RecycleBin] 🧹 No images older than ${daysOld} days to cleanup`);
        return 0;
      }

      await this.db.recycledImages.bulkDelete(oldImages.map(img => img.id));

      const totalSize = oldImages.reduce((sum, img) => sum + img.size, 0);
      console.log(`[🗑️ RecycleBin] 🧹 Cleaned up ${oldImages.length} old images (${this.formatBytes(totalSize)})`);
      return oldImages.length;

    } catch (error) {
      console.error('[🗑️ RecycleBin] ❌ Failed to cleanup old images:', error);
      return 0;
    }
  }

  /**
   * Get recycle bin statistics
   */
  async getStats(): Promise<{
    totalImages: number;
    totalSize: number;
    oldestImage?: Date;
    newestImage?: Date;
    deletionsByReason: Record<string, number>;
  }> {
    if (!this.isBrowser()) {
      console.warn('[🗑️ RecycleBin] ⚠️ IndexedDB not available (server-side or unsupported browser)');
      return {
        totalImages: 0,
        totalSize: 0,
        deletionsByReason: {}
      };
    }

    try {
      await this.db.ensureInitialized();

      const images = await this.db.recycledImages.toArray();
      const totalImages = images.length;
      const totalSize = images.reduce((sum, img) => sum + img.size, 0);

      const dates = images.map(img => img.deletedAt).filter(date => date instanceof Date);
      const oldestImage = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : undefined;
      const newestImage = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : undefined;

      // Count by deletion reason
      const deletionsByReason: Record<string, number> = {};
      images.forEach(img => {
        deletionsByReason[img.originalDeletionReason] = (deletionsByReason[img.originalDeletionReason] || 0) + 1;
      });

      return {
        totalImages,
        totalSize,
        oldestImage,
        newestImage,
        deletionsByReason
      };

    } catch (error) {
      console.error('[🗑️ RecycleBin] ❌ Failed to get stats:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        deletionsByReason: {}
      };
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Auto-cleanup function for images older than 30 days (called on initialization)
   */
  async performAutoCleanup(): Promise<number> {
    const cleanedCount = await this.cleanupOldImages(30);
    if (cleanedCount > 0) {
      console.log(`[🗑️ Auto-Cleanup] Cleaned up ${cleanedCount} images older than 30 days from recycle bin`);
    }
    return cleanedCount;
  }
}

// Export singleton service instance
export const recycleBinService = new RecycleBinService();

// Perform auto-cleanup on module load
if (typeof window !== 'undefined') {
  recycleBinService.performAutoCleanup().catch(error =>
    console.warn('[🗑️ Auto-Cleanup] Startup cleanup failed:', error)
  );
}