/**
 * Compression Settings Service
 * Manages user compression preferences with localStorage persistence
 */

interface CompressionSettings {
  preset: string;
  customSettings?: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    format: 'jpeg' | 'png' | 'webp';
    library: 'browser-image-compression' | 'jimp' | 'pica';
    autoResize: boolean;
  };
}

export interface CompressionSettingsResponse {
  settings: CompressionSettings;
  timestamp: number;
  version: string;
}

export class CompressionSettingsService {
  private static readonly STORAGE_KEY = 'compression_settings';
  private static readonly VERSION = '1.0.0';

  /**
   * Save compression settings to localStorage
   */
  static saveSettings(settings: CompressionSettings): void {
    if (!CompressionSettingsService.isBrowser()) {
      console.log('[CompressionSettings] ℹ️ Skipping settings save (server-side environment)');
      return;
    }

    try {
      const settingsResponse: CompressionSettingsResponse = {
        settings,
        timestamp: Date.now(),
        version: CompressionSettingsService.VERSION
      };

      localStorage.setItem(
        CompressionSettingsService.STORAGE_KEY,
        JSON.stringify(settingsResponse)
      );

      console.log('[CompressionSettings] ✅ Settings saved to localStorage:', settings);
    } catch (error) {
      console.error('[CompressionSettings] ❌ Failed to save settings:', error);
      throw new Error(`Failed to save compression settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if running in browser environment
   */
  private static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  /**
   * Load compression settings from localStorage
   */
  static loadSettings(): CompressionSettingsResponse | null {
    if (!CompressionSettingsService.isBrowser()) {
      console.log('[CompressionSettings] ℹ️ Skipping settings load (server-side environment)');
      return null;
    }

    try {
      const stored = localStorage.getItem(CompressionSettingsService.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored) as CompressionSettingsResponse;

      // Version compatibility check
      if (!parsed.version || !parsed.settings) {
        console.warn('[CompressionSettings] ⚠️ Invalid settings format, clearing storage');
        CompressionSettingsService.clearSettings();
        return null;
      }

      console.log('[CompressionSettings] ✅ Settings loaded from localStorage:', parsed.settings);
      return parsed;
    } catch (error) {
      console.error('[CompressionSettings] ❌ Failed to load settings:', error);
      // Clear corrupted data
      CompressionSettingsService.clearSettings();
      return null;
    }
  }

  /**
   * Get compression settings with fallback defaults
   */
  static getSettings(): CompressionSettings {
    const stored = CompressionSettingsService.loadSettings();
    if (!stored) {
      return CompressionSettingsService.getDefaultSettings();
    }
    return stored.settings;
  }

  /**
   * Get default compression settings
   */
  static getDefaultSettings(): CompressionSettings {
    return {
      preset: 'optimized',
      customSettings: undefined
    };
  }

  /**
   * Clear compression settings from localStorage
   */
  static clearSettings(): void {
    if (!CompressionSettingsService.isBrowser()) {
      console.log('[CompressionSettings] ℹ️ Skipping settings clear (server-side environment)');
      return;
    }

    try {
      localStorage.removeItem(CompressionSettingsService.STORAGE_KEY);
      console.log('[CompressionSettings] ✅ Settings cleared from localStorage');
    } catch (error) {
      console.error('[CompressionSettings] ❌ Failed to clear settings:', error);
    }
  }

  /**
   * Check if custom settings are configured
   */
  static hasCustomSettings(): boolean {
    const settings = CompressionSettingsService.getSettings();
    return settings.customSettings !== undefined;
  }

  /**
   * Get a summary of current settings for display
   */
  static getSettingsSummary(): string {
    if (!CompressionSettingsService.isBrowser()) {
      return 'Optimized (Default)';
    }

    const settings = CompressionSettingsService.getSettings();

    if (settings.preset === 'custom') {
      const custom = settings.customSettings;
      if (custom) {
        return `Custom: ${custom.maxWidth}×${custom.maxHeight}px, ${Math.round(custom.quality * 100)}% quality, ${custom.format.toUpperCase()}`;
      }
    }

    // For presets, use a simple mapping
    const presetNames: { [key: string]: string } = {
      'ultra-high': 'Ultra High Quality',
      'high-quality': 'High Quality',
      'optimized': 'Optimized',
      'balanced-webp': 'Balanced WebP',
      'balanced-jpeg': 'Balanced JPEG',
      'compact-high': 'Compact High',
      'compact-max': 'Compact Max',
      'png-lossless': 'PNG Lossless',
      'webp-strong': 'WebP Strong'
    };

    return presetNames[settings.preset] || settings.preset;
  }

  /**
   * Export settings for backup or debugging
   */
  static exportSettings(): string {
    const stored = CompressionSettingsService.loadSettings();
    if (!stored) {
      return JSON.stringify({
        error: 'No settings found',
        defaultSettings: CompressionSettingsService.getDefaultSettings()
      }, null, 2);
    }

    return JSON.stringify(stored, null, 2);
  }

  /**
   * Import settings from backup
   */
  static importSettings(settingsJson: string): boolean {
    try {
      const parsed = JSON.parse(settingsJson) as CompressionSettingsResponse;

      // Validate required fields
      if (!parsed.settings || !parsed.version) {
        throw new Error('Invalid settings format');
      }

      // Save the imported settings
      CompressionSettingsService.saveSettings(parsed.settings);
      console.log('[CompressionSettings] ✅ Settings imported successfully');
      return true;
    } catch (error) {
      console.error('[CompressionSettings] ❌ Failed to import settings:', error);
      return false;
    }
  }
}

// Export singleton instance
export const compressionSettingsService = new CompressionSettingsService();