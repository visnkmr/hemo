/**
 * Compression Settings Modal Component
 * Provides UI for selecting compression presets and customizing settings
 */

import React, { useState, useEffect } from 'react';
import { compressionPresets, CompressionPreset } from '../lib/image-compression-service';
import { CompressionSettingsService } from '../lib/compression-settings-service';

interface CompressionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySettings: (settings: {
    preset: string;
    customSettings?: Partial<CompressionPreset>;
  }) => void;
  currentSettings?: {
    preset: string;
    customSettings?: Partial<CompressionPreset>;
  };
}

export const CompressionSettingsModal: React.FC<CompressionSettingsModalProps> = ({
  isOpen,
  onClose,
  onApplySettings,
  currentSettings
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(
    currentSettings?.preset || 'optimized'
  );
  const [showCustom, setShowCustom] = useState<boolean>(false);
  const [customSettings, setCustomSettings] = useState<Partial<CompressionPreset>>({
    maxWidth: 800,
    maxHeight: 600,
    quality: 0.75,
    format: 'jpeg',
    library: 'browser-image-compression',
    autoResize: true,
    ...currentSettings?.customSettings
  });

  // Reset to current settings when modal opens
  useEffect(() => {
    if (isOpen) {
      // Load settings from service or use current settings
      const settings = CompressionSettingsService.getSettings();

      if (currentSettings) {
        setSelectedPreset(currentSettings.preset);
        setCustomSettings(currentSettings.customSettings || {});
      } else {
        setSelectedPreset(settings.preset);
        setCustomSettings(settings.customSettings || {});
      }
      setShowCustom(false);
    }
  }, [isOpen, currentSettings]);

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    setShowCustom(false);
  };

  const handleCustomChange = (field: string, value: any) => {
    setCustomSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApply = () => {
    let settings: { preset: string; customSettings?: any };

    if (showCustom) {
      settings = {
        preset: 'custom',
        customSettings
      };
    } else {
      settings = {
        preset: selectedPreset
      };
    }

    // Save to compression settings service
    CompressionSettingsService.saveSettings(settings);

    // Call the callback to apply settings
    onApplySettings(settings);
    onClose();
  };

  const toggleCustom = () => {
    setShowCustom(!showCustom);
    if (!showCustom) {
      // Copy current preset settings to custom
      const preset = compressionPresets[selectedPreset];
      if (preset) {
        setCustomSettings({
          maxWidth: preset.maxWidth,
          maxHeight: preset.maxHeight,
          quality: preset.quality,
          format: preset.format,
          library: preset.library,
          autoResize: preset.autoResize
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Image Compression Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Preset Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Compression Preset</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(compressionPresets).map(([key, preset]) => (
                <div
                  key={key}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedPreset === key && !showCustom
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handlePresetChange(key)}
                >
                  <h4 className="font-medium text-gray-900">{preset.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Max: {preset.maxWidth}×{preset.maxHeight}</span>
                    <span>Quality: {Math.round(preset.quality * 100)}%</span>
                    <span>{preset.format.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Settings Toggle */}
          <div className="mb-6">
            <button
              onClick={toggleCustom}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <svg className={`w-4 h-4 transition-transform ${showCustom ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Custom Settings
            </button>
          </div>

          {/* Custom Settings Panel */}
          {showCustom && (
            <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-4">Custom Compression Settings</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dimensions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Width (px)
                  </label>
                  <input
                    type="number"
                    value={customSettings.maxWidth || 800}
                    onChange={(e) => handleCustomChange('maxWidth', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="4096"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Height (px)
                  </label>
                  <input
                    type="number"
                    value={customSettings.maxHeight || 600}
                    onChange={(e) => handleCustomChange('maxHeight', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="4096"
                  />
                </div>

                {/* Quality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quality ({Math.round((customSettings.quality || 0.75) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={customSettings.quality || 0.75}
                    onChange={(e) => handleCustomChange('quality', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Format
                  </label>
                  <select
                    value={customSettings.format || 'jpeg'}
                    onChange={(e) => handleCustomChange('format', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="jpeg">JPEG</option>
                    <option value="webp">WebP</option>
                    <option value="png">PNG</option>
                  </select>
                </div>

                {/* Library */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compression Library
                  </label>
                  <select
                    value={customSettings.library || 'browser-image-compression'}
                    onChange={(e) => handleCustomChange('library', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="browser-image-compression">Browser Image Compression</option>
                    <option value="jimp">Jimp</option>
                    <option value="pica">Pica</option>
                  </select>
                </div>

                {/* Auto Resize */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoResize"
                    checked={customSettings.autoResize ?? true}
                    onChange={(e) => handleCustomChange('autoResize', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoResize" className="ml-2 text-sm text-gray-700">
                    Auto-resize images
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Preview Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Settings Summary</h4>
            {showCustom ? (
              <div className="text-sm text-blue-800">
                <p>Custom settings: {customSettings.maxWidth}×{customSettings.maxHeight}px, {Math.round((customSettings.quality || 0.75) * 100)}% quality, {customSettings.format?.toUpperCase()}</p>
                <p>Library: {customSettings.library}</p>
              </div>
            ) : (
              <div className="text-sm text-blue-800">
                {compressionPresets[selectedPreset] ? (
                  <>
                    <p><strong>{compressionPresets[selectedPreset].name}</strong></p>
                    <p>Max dimensions: {compressionPresets[selectedPreset].maxWidth}×{compressionPresets[selectedPreset].maxHeight}px</p>
                    <p>Quality: {Math.round(compressionPresets[selectedPreset].quality * 100)}%, Format: {compressionPresets[selectedPreset].format.toUpperCase()}</p>
                    <p>Library: {compressionPresets[selectedPreset].library.replace('-', ' ')}</p>
                  </>
                ) : (
                  <p>Unknown preset selected</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompressionSettingsModal;