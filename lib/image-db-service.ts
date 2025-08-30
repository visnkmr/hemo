import Dexie, { Table } from 'dexie';

export interface StoredImage {
  id: string; // Primary key (will be the key stored in message.imageUrl)
  chatId: string; // Which chat this image belongs to
  messageId: string; // Which message this image belongs to
  uri: string; // Base64 data URL
  mimeType: string; // e.g., "image/png", "image/jpeg"
  width: number;
  height: number;
  size: number; // File size in bytes
  createdAt: Date;
  lastAccessed: Date;
  metadata?: {
    originalFileName?: string;
    source?: 'generated' | 'uploaded' | 'quoted' | 'migrated' | 'converted';
    quality?: number; // Compression quality if optimized
    generationParams?: any; // Gemini generation parameters
    imageIndex?: number; // Index in generation array
  };
}

export class ImageDatabase extends Dexie {
  images!: Table<StoredImage>;
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

      const imageRecord: StoredImage = {
        id,
        chatId,
        messageId,
        uri: base64Uri,
        mimeType,
        width: options?.width || 0,
        height: options?.height || 0,
        size,
        createdAt: new Date(),
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
}

// Export singleton service instance
export const imageDBService = new ImageDBService();
