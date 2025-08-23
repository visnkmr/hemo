// Initialize IndexedDB storage and migrate from localStorage
import { idb } from './indexeddb-storage'
import { useStorageInit } from '../hooks/use-indexeddb'

export const initializeStorage = async () => {
  try {
    console.log('Initializing IndexedDB storage...')

    // Test basic IndexedDB functionality
    await idb.set('storage_initialized', true)
    await idb.get('storage_initialized')

    // Run migration from localStorage to IndexedDB
    await idb.migrateFromLocalStorage()
    console.log('Storage initialization and migration completed successfully')

    return true
  } catch (error) {
    console.error('Storage initialization failed:', error)

    // Fallback: try to use localStorage if IndexedDB fails
    console.warn('Falling back to localStorage for critical data')

    return false
  }
}

// Hook to initialize storage on app startup
export const useInitializeStorage = () => {
  const { initialized, error } = useStorageInit()

  if (initialized) {
    // Run migration in background
    initializeStorage().catch(console.error)
  }

  return { initialized, error }
}