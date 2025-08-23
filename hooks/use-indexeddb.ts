"use client";

import { useState, useEffect, useCallback } from 'react';
import { idb, type Chat, type ChatMessage } from '../lib/indexeddb-storage';

// Hook for configuration items (API keys, URLs, etc.)
export function useConfigItem<T>(key: string, defaultValue: T | null = null) {
  const [value, setValue] = useState<T | null>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load value from IndexedDB
  const loadValue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const storedValue = await idb.get(key);
      setValue(storedValue !== null ? storedValue : defaultValue);
    } catch (err) {
      setError(err as Error);
      console.error(`Error loading ${key}:`, err);
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue]);

  // Save value to IndexedDB
  const saveValue = useCallback(async (newValue: T) => {
    try {
      setError(null);
      await idb.set(key, newValue);
      setValue(newValue);
    } catch (err) {
      setError(err as Error);
      console.error(`Error saving ${key}:`, err);
      throw err;
    }
  }, [key]);

  // Remove value from IndexedDB
  const removeValue = useCallback(async () => {
    try {
      setError(null);
      await idb.remove(key);
      setValue(defaultValue);
    } catch (err) {
      setError(err as Error);
      console.error(`Error removing ${key}:`, err);
      throw err;
    }
  }, [key, defaultValue]);

  useEffect(() => {
    loadValue();
  }, [loadValue]);

  return {
    value,
    setValue: saveValue,
    removeValue,
    loading,
    error,
    reload: loadValue
  };
}

// Hook for managing all configuration items at once
export function useConfigItems(keys: string[]) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadValues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedValues: Record<string, any> = {};

      for (const key of keys) {
        const value = await idb.get(key);
        loadedValues[key] = value;
      }

      setValues(loadedValues);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading config items:', err);
    } finally {
      setLoading(false);
    }
  }, [keys]);

  const saveValue = useCallback(async (key: string, value: any) => {
    try {
      setError(null);
      await idb.set(key, value);
      setValues(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      setError(err as Error);
      console.error(`Error saving ${key}:`, err);
      throw err;
    }
  }, []);

  const removeValue = useCallback(async (key: string) => {
    try {
      setError(null);
      await idb.remove(key);
      setValues(prev => ({ ...prev, [key]: null }));
    } catch (err) {
      setError(err as Error);
      console.error(`Error removing ${key}:`, err);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadValues();
  }, [loadValues]);

  return {
    values,
    setValue: saveValue,
    removeValue,
    loading,
    error,
    reload: loadValues
  };
}

// Hook for chat management
export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading chats from IndexedDB...');
      const allChats = await idb.getAllChats();
      console.log('Loaded chats:', allChats);
      console.log('Number of chats loaded:', allChats.length);
      setChats(allChats);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading chats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveChat = useCallback(async (chat: Chat) => {
    try {
      setError(null);
      await idb.saveChat(chat);
      await loadChats(); // Reload to get updated data
    } catch (err) {
      setError(err as Error);
      console.error('Error saving chat:', err);
      throw err;
    }
  }, [loadChats]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      setError(null);
      await idb.deleteChat(chatId);
      setChats(prev => prev.filter(chat => chat.id !== chatId));
    } catch (err) {
      setError(err as Error);
      console.error('Error deleting chat:', err);
      throw err;
    }
  }, []);

  const getChat = useCallback(async (chatId: string): Promise<Chat | null> => {
    try {
      setError(null);
      return await idb.getChat(chatId);
    } catch (err) {
      setError(err as Error);
      console.error('Error getting chat:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  return {
    chats,
    loading,
    error,
    saveChat,
    deleteChat,
    getChat,
    reloadChats: loadChats
  };
}

// Hook for single chat management
export function useChat(chatId: string | null) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadChat = useCallback(async () => {
    if (!chatId) {
      setChat(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const loadedChat = await idb.getChat(chatId);
      setChat(loadedChat);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading chat:', err);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  const saveChat = useCallback(async (updatedChat: Chat) => {
    try {
      setError(null);
      await idb.saveChat(updatedChat);
      setChat(updatedChat);
    } catch (err) {
      setError(err as Error);
      console.error('Error saving chat:', err);
      throw err;
    }
  }, []);

  const addMessage = useCallback(async (message: ChatMessage) => {
    if (!chat) return;

    const updatedChat = {
      ...chat,
      messages: [...chat.messages, message],
      updatedAt: Date.now()
    };

    await saveChat(updatedChat);
  }, [chat, saveChat]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  return {
    chat,
    loading,
    error,
    saveChat,
    addMessage,
    reloadChat: loadChat
  };
}

// Hook for data migration
export function useMigration() {
  const [migrating, setMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [migrationStats, setMigrationStats] = useState<{
    configItems: number;
    chatHistory: number;
  } | null>(null);

  const migrateFromLocalStorage = useCallback(async (forceMigration = false) => {
    try {
      // If not forcing migration, check if it should run
      if (!forceMigration) {
        const existingChats = await idb.getAllChats();

        // Check if there's existing configuration in IndexedDB
        const configKeys = [
          'groq_api_key', 'openrouter_api_key', 'groq_model_name', 'lmstudio_model_name',
          'lmstudio_url', 'filegpt_url', 'laststate', 'or_model', 'or_model_info'
        ];
        const configPromises = configKeys.map(key => idb.get(key));
        const configValues = await Promise.all(configPromises);
        const hasIndexedDBConfig = configValues.some(value => value !== null);

        // Check if there's localStorage data to migrate
        const localStorageKeys = [
          'groq_api_key', 'openrouter_api_key', 'groq_model_name', 'lmstudio_model_name',
          'lmstudio_url', 'filegpt_url', 'laststate', 'or_model', 'or_model_info', 'chat_history'
        ];
        const hasLocalStorageData = localStorageKeys.some(key => localStorage.getItem(key) !== null);

        // Skip migration if conditions aren't met
        if (existingChats.length > 0 || hasIndexedDBConfig || !hasLocalStorageData) {
          console.log('Migration skipped - conditions not met');
          return;
        }
      }

      setMigrating(true);
      setError(null);
      setMigrationComplete(false);

      // Check what data exists in localStorage before migration
      const keys = [
        'groq_api_key', 'openrouter_api_key', 'groq_model_name', 'lmstudio_model_name',
        'lmstudio_url', 'filegpt_url', 'laststate', 'or_model', 'or_model_info'
      ];

      let configCount = 0;
      let hasChatHistory = false;

      for (const key of keys) {
        if (localStorage.getItem(key) !== null) {
          configCount++;
        }
      }

      if (localStorage.getItem('chat_history') !== null) {
        hasChatHistory = true;
      }

      // Perform migration
      await idb.migrateFromLocalStorage();

      setMigrationComplete(true);
      setMigrationStats({
        configItems: configCount,
        chatHistory: hasChatHistory ? 1 : 0
      });

      // Auto-clear migration status after 3 seconds
      setTimeout(() => {
        setMigrationComplete(false);
        setMigrationStats(null);
      }, 3000);

    } catch (err) {
      setError(err as Error);
      console.error('Error during migration:', err);
      throw err;
    } finally {
      setMigrating(false);
    }
  }, []);

  return {
    migrateFromLocalStorage,
    migrating,
    migrationComplete,
    migrationStats,
    error
  };
}

// Hook for storage initialization and health check
export function useStorageInit() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // Test basic IndexedDB functionality
        await idb.set('test_key', 'test_value');
        await idb.get('test_key');
        await idb.remove('test_key');

        setInitialized(true);
      } catch (err) {
        setError(err as Error);
        console.error('Storage initialization failed:', err);
      }
    };

    initializeStorage();
  }, []);

  return {
    initialized,
    error
  };
}

// Fallback hook that tries IndexedDB first, then falls back to localStorage
export function useStorageWithFallback<T>(key: string, defaultValue: T | null = null) {
  const [value, setValue] = useState<T | null>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [usingLocalStorage, setUsingLocalStorage] = useState(false);

  const loadValue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try IndexedDB first
      let storedValue = await idb.get(key);

      if (storedValue !== null) {
        setValue(storedValue);
        setUsingLocalStorage(false);
        return;
      }

      // Fall back to localStorage
      const localStorageValue = localStorage.getItem(key);
      if (localStorageValue !== null) {
        storedValue = JSON.parse(localStorageValue);
        setValue(storedValue);
        setUsingLocalStorage(true);

        // Optionally migrate to IndexedDB in the background
        try {
          await idb.set(key, storedValue);
        } catch (migrateError) {
          console.warn('Failed to migrate to IndexedDB:', migrateError);
        }
      } else {
        setValue(defaultValue);
      }
    } catch (err) {
      setError(err as Error);
      console.error(`Error loading ${key}:`, err);

      // Try localStorage as final fallback
      try {
        const localStorageValue = localStorage.getItem(key);
        if (localStorageValue !== null) {
          setValue(JSON.parse(localStorageValue));
          setUsingLocalStorage(true);
        } else {
          setValue(defaultValue);
        }
      } catch (localStorageError) {
        setValue(defaultValue);
        console.error('Both IndexedDB and localStorage failed:', localStorageError);
      }
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue]);

  const saveValue = useCallback(async (newValue: T) => {
    try {
      setError(null);

      // Always try to save to IndexedDB first
      await idb.set(key, newValue);
      setValue(newValue);
      setUsingLocalStorage(false);

      // If using localStorage, update it too for backward compatibility
      if (usingLocalStorage) {
        localStorage.setItem(key, JSON.stringify(newValue));
      }
    } catch (err) {
      setError(err as Error);
      console.error(`Error saving ${key} to IndexedDB:`, err);

      // Fall back to localStorage
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
        setValue(newValue);
        setUsingLocalStorage(true);
      } catch (localStorageError) {
        console.error('Failed to save to both IndexedDB and localStorage:', localStorageError);
        throw localStorageError;
      }
    }
  }, [key, usingLocalStorage]);

  useEffect(() => {
    loadValue();
  }, [loadValue]);

  return {
    value,
    setValue: saveValue,
    loading,
    error,
    usingLocalStorage,
    reload: loadValue
  };
}

export { idb };
export type { Chat, ChatMessage };