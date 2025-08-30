/**
 * Compression Statistics Dashboard Modal Component
 * Shows comprehensive analytics about image compression performance
 */

import React, { useState, useEffect } from 'react';
import { imageDBService } from '../lib/image-db-service';
import { compressionPresets } from '../lib/image-compression-service';

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
      originalSize?: number;
      compressionTime?: number;
      savingsPercent?: number;
    };
  };
}

interface CompressionStats {
  totalImages: number;
  compressedImages: number;
  uncompressedImages: number;
  totalSpaceSaved: number;
  totalOriginalSize: number;
  averageSavingsPercent: number;
  byPreset: Record<string, {
    count: number;
    totalSpaceSaved: number;
    averageSavingsPercent: number;
    averageTime: number;
    totalTime: number;
  }>;
  byLibrary: Record<string, {
    count: number;
    totalSpaceSaved: number;
    averageSavingsPercent: number;
  }>;
  recentCompressions: StoredImage[];
  oldestCompression?: Date;
  newestCompression?: Date;
}

interface CompressionDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompressionDashboardModal: React.FC<CompressionDashboardModalProps> = ({
  isOpen,
  onClose
}) => {
  const [stats, setStats] = useState<CompressionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [allImages, setAllImages] = useState<StoredImage[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadCompressionStats();
    }
  }, [isOpen]);

  const loadCompressionStats = async () => {
    setLoading(true);
    try {
      // Get all images from database
      const images = await imageDBService.getAllImages();
      setAllImages(images);

      // Calculate compression statistics
      const compressedImages = images.filter(img => img.metadata?.compression);
      const compressionStats: CompressionStats = {
        totalImages: images.length,
        compressedImages: compressedImages.length,
        uncompressedImages: images.length - compressedImages.length,
        totalSpaceSaved: 0,
        totalOriginalSize: 0,
        averageSavingsPercent: 0,
        byPreset: {},
        byLibrary: {},
        recentCompressions: [],
        oldestCompression: undefined,
        newestCompression: undefined
      };

      // Analyze compressed images
      compressedImages.forEach(image => {
        if (!image.metadata?.compression) return;

        const compression = image.metadata.compression;
        const originalSize = compression.originalSize || image.size;
        const savingsBytes = Math.round(originalSize * (compression.savingsPercent || 0) / 100);

        compressionStats.totalSpaceSaved += savingsBytes;
        compressionStats.totalOriginalSize += originalSize;

        // By preset
        const preset = compression.preset || 'unknown';
        if (!compressionStats.byPreset[preset]) {
          compressionStats.byPreset[preset] = {
            count: 0,
            totalSpaceSaved: 0,
            averageSavingsPercent: 0,
            averageTime: 0,
            totalTime: 0
          };
        }
        compressionStats.byPreset[preset].count++;
        compressionStats.byPreset[preset].totalSpaceSaved += savingsBytes;
        compressionStats.byPreset[preset].totalTime += compression.compressionTime || 0;

        // By library
        const library = compression.library || 'unknown';
        if (!compressionStats.byLibrary[library]) {
          compressionStats.byLibrary[library] = {
            count: 0,
            totalSpaceSaved: 0,
            averageSavingsPercent: 0
          };
        }
        compressionStats.byLibrary[library].count++;
        compressionStats.byLibrary[library].totalSpaceSaved += savingsBytes;

        // Track dates
        const compressionDate = image.createdAt; // Assuming compression time is same as created time for compressed images
        if (!compressionStats.oldestCompression || compressionDate < compressionStats.oldestCompression) {
          compressionStats.oldestCompression = compressionDate;
        }
        if (!compressionStats.newestCompression || compressionDate > compressionStats.newestCompression) {
          compressionStats.newestCompression = compressionDate;
        }
      });

      // Calculate averages
      const totalSavingsPercent = compressedImages.reduce((sum, img) =>
        sum + (img.metadata?.compression?.savingsPercent || 0), 0);
      compressionStats.averageSavingsPercent = compressedImages.length > 0
        ? totalSavingsPercent / compressedImages.length
        : 0;

      // Calculate by-preset averages
      Object.keys(compressionStats.byPreset).forEach(preset => {
        const presetData = compressionStats.byPreset[preset];
        if (presetData.count > 0) {
          presetData.averageSavingsPercent = presetData.totalSpaceSaved / presetData.count;
          presetData.averageTime = presetData.totalTime / presetData.count;
        }
      });

      // Calculate by-library averages
      Object.keys(compressionStats.byLibrary).forEach(library => {
        const libraryData = compressionStats.byLibrary[library];
        if (libraryData.count > 0) {
          libraryData.averageSavingsPercent = libraryData.totalSpaceSaved / libraryData.count;
        }
      });

      // Get recent compressions
      compressionStats.recentCompressions = compressedImages
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10);

      setStats(compressionStats);
    } catch (error) {
      console.error('Failed to load compression stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Compression Statistics Dashboard</h2>
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
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading compression statistics...</div>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalImages}</div>
                  <div className="text-sm text-blue-800">Total Images</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{stats.compressedImages}</div>
                  <div className="text-sm text-green-800">Compressed</div>
                  <div className="text-xs text-green-600 mt-1">
                    {stats.totalImages > 0 ? Math.round((stats.compressedImages / stats.totalImages) * 100) : 0}% of total
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600">{formatBytes(stats.totalSpaceSaved)}</div>
                  <div className="text-sm text-orange-800">Space Saved</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">{Math.round(stats.averageSavingsPercent)}%</div>
                  <div className="text-sm text-purple-800">Avg Savings</div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Preset */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">By Compression Preset</h3>
                  <div className="space-y-3">
                    {Object.entries(stats.byPreset).map(([preset, data]) => (
                      <div key={preset} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-gray-900">
                            {compressionPresets[preset]?.name || preset}
                          </div>
                          <div className="text-sm text-gray-600">
                            {data.count} images • {formatBytes(data.totalSpaceSaved)} saved
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            {Math.round(data.averageSavingsPercent)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round(data.averageTime)}ms avg
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Library */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">By Compression Library</h3>
                  <div className="space-y-3">
                    {Object.entries(stats.byLibrary).map(([library, data]) => (
                      <div key={library} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-gray-900">{library}</div>
                          <div className="text-sm text-gray-600">
                            {data.count} images • {formatBytes(data.totalSpaceSaved)} saved
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            {Math.round(data.averageSavingsPercent)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Compressions */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Compressions</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {stats.recentCompressions.map((image) => (
                    <div key={image.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-600">
                          IMG
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Image {image.id.slice(0, 8)}</div>
                          <div className="text-xs text-gray-600">
                            {formatBytes(image.metadata?.compression?.originalSize || image.size)} → {formatBytes(image.size)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          {Math.round(image.metadata?.compression?.savingsPercent || 0)}% saved
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(image.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {stats.recentCompressions.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No compressed images found
                    </div>
                  )}
                </div>
              </div>

              {/* Date Range */}
              {stats.oldestCompression && stats.newestCompression && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Compression Timeline</h4>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">From:</span> {formatDate(stats.oldestCompression)}
                    <span className="mx-4">•</span>
                    <span className="font-medium">To:</span> {formatDate(stats.newestCompression)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">No compression data available</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompressionDashboardModal;