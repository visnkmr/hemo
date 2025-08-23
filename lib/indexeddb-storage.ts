// IndexedDB Storage Utility for improved performance and data management
import type { Chat, Message } from './types';

interface DBConfig {
  name: string;
  version: number;
  stores: {
    [key: string]: {
      name: string;
      keyPath: string;
      indexes?: { name: string; keyPath: string; unique?: boolean }[];
    };
  };
}

interface StorageItem {
  id: string;
  value: any;
  timestamp: number;
}

interface ChatMessage extends Message {
  chatId: string;
}

class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private dbConfig: DBConfig = {
    name: 'ChatAppDB',
    version: 1,
    stores: {
      config: {
        name: 'config',
        keyPath: 'id',
        indexes: [{ name: 'timestamp', keyPath: 'timestamp' }]
      },
      chats: {
        name: 'chats',
        keyPath: 'id',
        indexes: [
          { name: 'createdAt', keyPath: 'createdAt' },
          { name: 'updatedAt', keyPath: 'updatedAt' }
        ]
      },
      messages: {
        name: 'messages',
        keyPath: 'id',
        indexes: [
          { name: 'chatId', keyPath: 'chatId' },
          { name: 'timestamp', keyPath: 'timestamp' }
        ]
      }
    }
  };

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Initializing IndexedDB...');
      const request = indexedDB.open(this.dbConfig.name, this.dbConfig.version);

      request.onerror = () => {
        console.error('IndexedDB initialization error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('IndexedDB upgrade needed, creating object stores...');
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };

      request.onblocked = () => {
        console.warn('IndexedDB initialization blocked');
      };
    });
  }

  private createObjectStores(db: IDBDatabase): void {
    // Config store for API keys, URLs, and other configuration
    if (!db.objectStoreNames.contains(this.dbConfig.stores.config.name)) {
      const configStore = db.createObjectStore(
        this.dbConfig.stores.config.name,
        { keyPath: this.dbConfig.stores.config.keyPath }
      );
      this.dbConfig.stores.config.indexes?.forEach(index => {
        configStore.createIndex(index.name, index.keyPath, { unique: index.unique });
      });
    }

    // Chats store for chat metadata
    if (!db.objectStoreNames.contains(this.dbConfig.stores.chats.name)) {
      const chatsStore = db.createObjectStore(
        this.dbConfig.stores.chats.name,
        { keyPath: this.dbConfig.stores.chats.keyPath }
      );
      this.dbConfig.stores.chats.indexes?.forEach(index => {
        chatsStore.createIndex(index.name, index.keyPath, { unique: index.unique });
      });
    }

    // Messages store for individual chat messages
    if (!db.objectStoreNames.contains(this.dbConfig.stores.messages.name)) {
      const messagesStore = db.createObjectStore(
        this.dbConfig.stores.messages.name,
        { keyPath: this.dbConfig.stores.messages.keyPath }
      );
      this.dbConfig.stores.messages.indexes?.forEach(index => {
        messagesStore.createIndex(index.name, index.keyPath, { unique: index.unique });
      });
    }
  }

  private ensureDB(): Promise<void> {
    return this.db ? Promise.resolve() : this.initDB();
  }

  // Generic CRUD operations for config items
  async setConfigItem(key: string, value: any): Promise<void> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction([this.dbConfig.stores.config.name], 'readwrite');
      const store = transaction.objectStore(this.dbConfig.stores.config.name);

      const item: StorageItem = {
        id: key,
        value,
        timestamp: Date.now()
      };

      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getConfigItem(key: string): Promise<any> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction([this.dbConfig.stores.config.name], 'readonly');
      const store = transaction.objectStore(this.dbConfig.stores.config.name);

      const request = store.get(key);

      request.onsuccess = () => {
        const item = request.result as StorageItem | undefined;
        resolve(item ? item.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeConfigItem(key: string): Promise<void> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction([this.dbConfig.stores.config.name], 'readwrite');
      const store = transaction.objectStore(this.dbConfig.stores.config.name);

      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Chat-specific operations
  async saveChat(chat: Chat): Promise<void> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(
        [this.dbConfig.stores.chats.name, this.dbConfig.stores.messages.name],
        'readwrite'
      );

      const chatStore = transaction.objectStore(this.dbConfig.stores.chats.name);
      const messageStore = transaction.objectStore(this.dbConfig.stores.messages.name);

      // Save chat metadata
      const chatRequest = chatStore.put(chat);

      // Save messages with proper ChatMessage structure
      const messagePromises = chat.messages.map(message => {
        return new Promise<void>((res, rej) => {
          // Ensure message has an id and chatId
          const chatMessage: ChatMessage = {
            ...message,
            id: message.id || `${chat.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            chatId: chat.id
          };

          const msgRequest = messageStore.put(chatMessage);
          msgRequest.onsuccess = () => res();
          msgRequest.onerror = () => rej(msgRequest.error);
        });
      });

      Promise.all([chatRequest, ...messagePromises])
        .then(() => resolve())
        .catch(reject);
    });
  }

  async getChat(chatId: string): Promise<Chat | null> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(
        [this.dbConfig.stores.chats.name, this.dbConfig.stores.messages.name],
        'readonly'
      );

      const chatStore = transaction.objectStore(this.dbConfig.stores.chats.name);
      const messageStore = transaction.objectStore(this.dbConfig.stores.messages.name);

      const chatRequest = chatStore.get(chatId);
      const messagesIndex = messageStore.index('chatId');
      const messagesRequest = messagesIndex.getAll(chatId);

      Promise.all([
        new Promise<Chat>((res, rej) => {
          chatRequest.onsuccess = () => res(chatRequest.result);
          chatRequest.onerror = () => rej(chatRequest.error);
        }),
        new Promise<ChatMessage[]>((res, rej) => {
          messagesRequest.onsuccess = () => res(messagesRequest.result);
          messagesRequest.onerror = () => rej(messagesRequest.error);
        })
      ])
      .then(([chat, messages]) => {
        if (chat) {
          chat.messages = messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          resolve(chat);
        } else {
          resolve(null);
        }
      })
      .catch(reject);
    });
  }

  async getAllChats(): Promise<Chat[]> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      console.log('Getting all chats from IndexedDB...');

      const transaction = this.db.transaction(
        [this.dbConfig.stores.chats.name, this.dbConfig.stores.messages.name],
        'readonly'
      );

      const chatStore = transaction.objectStore(this.dbConfig.stores.chats.name);
      const messageStore = transaction.objectStore(this.dbConfig.stores.messages.name);

      const chatsRequest = chatStore.getAll();
      const messagesRequest = messageStore.getAll();

      Promise.all([
        new Promise<Chat[]>((res, rej) => {
          chatsRequest.onsuccess = () => res(chatsRequest.result);
          chatsRequest.onerror = () => rej(chatsRequest.error);
        }),
        new Promise<ChatMessage[]>((res, rej) => {
          messagesRequest.onsuccess = () => res(messagesRequest.result);
          messagesRequest.onerror = () => rej(messagesRequest.error);
        })
      ])
      .then(([chats, allMessages]) => {
        console.log('Raw chats from DB:', chats);
        console.log('Raw messages from DB:', allMessages);

        // Group messages by chatId
        const messagesByChatId = allMessages.reduce((acc, message) => {
          if (!acc[message.chatId]) acc[message.chatId] = [];
          acc[message.chatId].push(message);
          return acc;
        }, {} as Record<string, ChatMessage[]>);

        console.log('Messages grouped by chatId:', messagesByChatId);

        // Attach messages to chats and sort
        const chatsWithMessages = chats.map(chat => ({
          ...chat,
          messages: (messagesByChatId[chat.id] || []).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        }));

        console.log('Final chats with messages:', chatsWithMessages);
        resolve(chatsWithMessages);
      })
      .catch(reject);
    });
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(
        [this.dbConfig.stores.chats.name, this.dbConfig.stores.messages.name],
        'readwrite'
      );

      const chatStore = transaction.objectStore(this.dbConfig.stores.chats.name);
      const messageStore = transaction.objectStore(this.dbConfig.stores.messages.name);
      const messagesIndex = messageStore.index('chatId');

      // Delete chat
      const deleteChatRequest = chatStore.delete(chatId);

      // Delete all messages for this chat
      const deleteMessagesRequest = messagesIndex.openCursor(IDBKeyRange.only(chatId));

      deleteMessagesRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Migration utilities
  async migrateFromLocalStorage(): Promise<void> {
    const keys = [
      'groq_api_key', 'openrouter_api_key', 'groq_model_name', 'lmstudio_model_name',
      'lmstudio_url', 'filegpt_url', 'laststate', 'or_model', 'or_model_info'
    ];

    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        await this.setConfigItem(key, key === 'laststate' ? parseInt(value, 10) : value);
      }
    }

    // Migrate chat history
    const chatHistory = localStorage.getItem('chat_history');
    if (chatHistory) {
      try {
        const chats = JSON.parse(chatHistory);
        for (const chat of chats) {
          // Ensure all messages have proper IDs for IndexedDB
          const messagesWithIds = (chat.messages || []).map((message: Message) => ({
            ...message,
            id: message.id || `${chat.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }));

          await this.saveChat({
            id: chat.id || `chat_${Date.now()}_${Math.random()}`,
            title: chat.title || 'Untitled Chat',
            messages: messagesWithIds,
            createdAt: chat.createdAt || new Date().toISOString(),
            lastModelUsed: chat.lastModelUsed || '',
            branchedFrom: chat.branchedFrom || null
          });
        }
      } catch (error) {
        console.error('Error migrating chat history:', error);
      }
    }
  }

  // Utility method to clear all data (for testing or reset)
  async clearAllData(): Promise<void> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      console.log('Clearing all IndexedDB data...');

      const transaction = this.db.transaction(
        [this.dbConfig.stores.config.name, this.dbConfig.stores.chats.name, this.dbConfig.stores.messages.name],
        'readwrite'
      );

      const configStore = transaction.objectStore(this.dbConfig.stores.config.name);
      const chatsStore = transaction.objectStore(this.dbConfig.stores.chats.name);
      const messagesStore = transaction.objectStore(this.dbConfig.stores.messages.name);

      const clearPromises = [
        new Promise<void>((res, rej) => {
          const request = configStore.clear();
          request.onsuccess = () => {
            console.log('Config store cleared');
            res();
          };
          request.onerror = () => rej(request.error);
        }),
        new Promise<void>((res, rej) => {
          const request = chatsStore.clear();
          request.onsuccess = () => {
            console.log('Chats store cleared');
            res();
          };
          request.onerror = () => rej(request.error);
        }),
        new Promise<void>((res, rej) => {
          const request = messagesStore.clear();
          request.onsuccess = () => {
            console.log('Messages store cleared');
            res();
          };
          request.onerror = () => rej(request.error);
        })
      ];

      Promise.all(clearPromises)
        .then(() => {
          console.log('All IndexedDB data cleared successfully');
          resolve();
        })
        .catch(reject);
    });
  }
}

// Singleton instance
export const indexedDBStorage = new IndexedDBStorage();

// Helper functions for easy access
export const idb = {
  // Config operations
  set: (key: string, value: any) => indexedDBStorage.setConfigItem(key, value),
  get: (key: string) => indexedDBStorage.getConfigItem(key),
  remove: (key: string) => indexedDBStorage.removeConfigItem(key),

  // Chat operations
  saveChat: (chat: Chat) => indexedDBStorage.saveChat(chat),
  getChat: (chatId: string) => indexedDBStorage.getChat(chatId),
  getAllChats: () => indexedDBStorage.getAllChats(),
  deleteChat: (chatId: string) => indexedDBStorage.deleteChat(chatId),

  // Migration
  migrateFromLocalStorage: () => indexedDBStorage.migrateFromLocalStorage(),
  clearAllData: () => indexedDBStorage.clearAllData()
};

export type { Chat, ChatMessage, StorageItem };