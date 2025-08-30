/**
 * Batch Compression Modal Component
 * Provides UI for compressing multiple images with progress tracking
 */

import React, { useState, useEffect } from 'react';
import { imageDBService } from '../lib/image-db-service';
import { compressionPresets } from '../lib/image-compression-service';
import { CompressionSettingsService } from '../lib/compression-settings-service';

interface StoredImage {
  id: string;
  chatId: string;
  messageId: string;
  uri: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  createdAt: Date;
  lastAccessed: Date;
  metadata?: {
    compression?: {
      preset?: string;
      library?: string;
      quality?: number;
      originalSize?: number;
      compressionTime?: number;
      savingsPercent?: number;
    };
  };
}

interface BatchCompressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  allImages?: StoredImage[];
}

interface BatchResult {
  successful: number;
  failed: number;
  totalSpaceSaved: number;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
    result?: any;
  }>;
}

export const BatchCompressionModal: React.FC<BatchCompressionModalProps> = ({
  isOpen,
  onClose,
  allImages
}) => {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('optimized');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ completed: number; total: number; currentItem?: string }>({
    completed: 0,
    total: 0
  });
  const [results, setResults] = useState<BatchResult | null>(null);
  const [concurrency, setConcurrency] = useState<number>(3);

  // Load all images when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAllImages();
    }
  }, [isOpen]);

  // Reset selected images when images change
  useEffect(() => {
    if (images.length > 0 && allImages === undefined) {
      setSelectedImages(new Set(images.map(img => img.id)));
    } else if (allImages) {
      setSelectedImages(new Set(allImages.map(img => img.id)));
    }
  }, [images, allImages]);

  const loadAllImages = async () => {
    try {
      let imageList: StoredImage[] = [];

      if (allImages) {
        imageList = allImages;
      } else {
        // Fetch all stored images from different chats
        imageList = await imageDBService.getChatImages('all' as any) || [];
        // If that doesn't work, we'll need to get from all chats individually
        // For now, let's assume we have a way to get all images
      }

      setImages(imageList);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const selectAllImages = () => {
    setSelectedImages(new Set(images.map(img => img.id)));
  };

  const selectNone = () => {
    setSelectedImages(new Set());
  };

  const startBatchCompression = async () => {
    if (selectedImages.size === 0) return;

    setIsProcessing(true);
    setResults(null);
    setProgress({ completed: 0, total: selectedImages.size });

    try {
      const imageIds = Array.from(selectedImages);

      const result = await imageDBService.compressImagesBatch(
        imageIds,
        selectedPreset,
        {
          concurrency,
          onProgress: (completed, total, result) => {
            setProgress({ completed, total, currentItem: imageIds[completed - 1] });
          }
        }
      );

      setResults(result);
      console.log('Batch compression completed:', result);

      // Refresh the image list to show updated sizes
      await loadAllImages();

    } catch (error) {
      console.error('Batch compression failed:', error);
      alert('Batch compression failed: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
      setProgress({ completed: 0, total: 0 });
    }
  };

  const resetResults = () => {
    setResults(null);
    setProgress({ completed: 0, total: 0 });
  };

  if (!isOpen) return null;

  const selectedImagesData = images.filter(img => selectedImages.has(img.id));
  const totalSelectedSize = selectedImagesData.reduce((sum, img) => sum + img.size, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Batch Image Compression</h2>
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
          {/* Settings Section */}
          {!results && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Compression Settings</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Preset Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compression Preset
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(compressionPresets).map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.name} - {Math.round(preset.quality * 100)}%
                      </option>
                    ))}
                  </select>
                </div>

                {/* Concurrency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Concurrent Operations (1-5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={concurrency}
                    onChange={(e) => setConcurrency(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={selectAllImages}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  Select All ({images.length})
                </button>
                <button
                  onClick={selectNone}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  Select None
                </button>
                <span className="text-sm text-gray-600">
                  {selectedImages.size} of {images.length} selected
                </span>
              </div>

              {/* Selection Summary */}
              {selectedImages.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span><strong>{selectedImages.size}</strong> images selected</span>
                    <span>Total size: <strong>{formatBytes(totalSelectedSize)}</strong></span>
                    <span>Using: <strong>{compressionPresets[selectedPreset]?.name}</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress Section (when processing) */}
          {isProcessing && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Compressing Images...</h4>
                <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-800">
                  {progress.completed} of {progress.total} completed
                </p>
                {progress.currentItem && (
                  <p className="text-sm text-blue-700 mt-1">
                    Processing: <code className="bg-blue-100 px-1 rounded">{progress.currentItem.substring(0, 20)}...</code>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Results Section */}
          {results && (
            <div className="mb-6">
              <div className={`rounded-lg p-4 ${results.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <h4 className="font-medium mb-2" style={{ color: results.failed === 0 ? '#065f46' : '#92400e' }}>
                  Compression Complete!
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-lg font-semibold" style={{ color: results.failed === 0 ? '#065f46' : '#92400e' }}>
                      {results.successful}
                    </div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">{results.failed}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">{formatBytes(results.totalSpaceSaved)}</div>
                    <div className="text-sm text-gray-600">Space Saved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">
                      {results.successful > 0 ? `${Math.round((results.totalSpaceSaved / selectedImagesData.reduce((sum, img) => sum + img.size, 0)) * 100)}%` : '0%'}
                    </div>
                    <div className="text-sm text-gray-600">Avg Savings</div>
                  </div>
                </div>

                {/* Show failures if any */}
                {results.failed > 0 && (
                  <div className="text-sm">
                    <strong className="text-red-600">Failed images:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {results.results.filter(r => !r.success).slice(0, 5).map((result, idx) => (
                        <li key={idx} className="text-red-700">
                          {result.id}: {result.error}
                        </li>
                      ))}
                      {results.results.filter(r => !r.success).length > 5 && (
                        <li className="text-gray-500">...and {results.results.filter(r => !r.success).length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={resetResults}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Compress Again
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Images List */}
          {!results && (
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-medium text-gray-900">Available Images ({images.length})</h4>
              </div>
              {images.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No images found in database
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {images.map((image) => (
                    <div key={image.id} className="p-3 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedImages.has(image.id)}
                        onChange={() => toggleImageSelection(image.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            Image {image.id.substring(0, 16)}...
                          </span>
                          <span className="text-xs text-gray-500">
                            {image.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>{formatBytes(image.size)}</span>
                          <span>{image.mimeType.split('/')[1].toUpperCase()}</span>
                          {image.metadata?.compression && (
                            <span className="text-green-600">✓ Compressed</span>
                          )}
                          {image.metadata?.compression && (
                            <span className="text-blue-600">
                              {Math.round(image.metadata.compression.savingsPercent || 0)}% saved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!results && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={startBatchCompression}
              disabled={selectedImages.size === 0 || isProcessing}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedImages.size > 0 && !isProcessing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? 'Compressing...' : `Compress ${selectedImages.size} images`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchCompressionModal;