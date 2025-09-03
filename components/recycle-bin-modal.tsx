/**
 * Recycle Bin Modal Component
 * Shows a Pinterest-like grid of deleted images that can be restored or permanently deleted
 */

import React, { useState, useEffect } from 'react';
import { recycleBinService } from '../lib/recycle-bin-db';
import { RecycledImage } from '../lib/recycle-bin-db';

interface RecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  isOpen,
  onClose
}) => {
  const [images, setImages] = useState<RecycledImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadImages();
    }
  }, [isOpen]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const recycledImages = await recycleBinService.getAllRecycledImages();
      setImages(recycledImages);
    } catch (error) {
      console.error('Failed to load recycled images:', error);
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

  const handleSelectImage = (imageId: string, selected: boolean) => {
    const newSelected = new Set(selectedImages);
    if (selected) {
      newSelected.add(imageId);
    } else {
      newSelected.delete(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedImages(new Set(images.map(img => img.id)));
    } else {
      setSelectedImages(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedImages.size === 0) return;

    setDeletingIds(selectedImages);

    try {
      for (const imageId of selectedImages) {
        await recycleBinService.deleteRecycledImage(imageId);
      }

      // Update local state
      setImages(images.filter(img => !selectedImages.has(img.id)));
      setSelectedImages(new Set());

      console.log(`✅ Permanently deleted ${selectedImages.size} images`);
    } catch (error) {
      console.error('Failed to delete selected images:', error);
    } finally {
      setDeletingIds(new Set());
    }
  };

  const handleDeleteSingle = async (imageId: string) => {
    setDeletingIds(new Set([imageId]));

    try {
      await recycleBinService.deleteRecycledImage(imageId);
      setImages(images.filter(img => img.id !== imageId));
      setSelectedImages(selected => {
        const newSelected = new Set(selected);
        newSelected.delete(imageId);
        return newSelected;
      });
    } catch (error) {
      console.error('Failed to delete image:', error);
    } finally {
      setDeletingIds(new Set());
    }
  };

  const handleClearAll = async () => {
    if (images.length === 0) return;

    setClearing(true);

    try {
      const deletedCount = await recycleBinService.clearAllRecycledImages();
      setImages([]);
      setSelectedImages(new Set());

      console.log(`🗑️ Cleared all ${deletedCount} images from recycle bin`);
    } catch (error) {
      console.error('Failed to clear recycle bin:', error);
    } finally {
      setClearing(false);
    }
  };

  if (!isOpen) return null;

  const totalSize = images.reduce((sum, img) => sum + img.size, 0);
  const unselectedImages = images.filter(img => !selectedImages.has(img.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full h-[90vh] mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recycle Bin</h2>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {images.length} images • {formatBytes(totalSize)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Action Bar */}
        {images.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedImages.size > 0 && selectedImages.size === images.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select All ({selectedImages.size} selected)
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              {selectedImages.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={deletingIds.size > 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {deletingIds.size > 0 ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Selected ({selectedImages.size})
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleClearAll}
                disabled={clearing || images.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {clearing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Clearing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear All
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading recycled images...</div>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <div className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">Recycle Bin is Empty</div>
              <div className="text-gray-500 dark:text-gray-500">Deleted images will appear here temporarily for 30 days</div>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={`relative group break-inside-avoid mb-4 rounded-lg overflow-hidden ${
                    deletingIds.has(image.id) ? 'opacity-50' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedImages.has(image.id)}
                      onChange={(e) => handleSelectImage(image.id, e.target.checked)}
                      disabled={deletingIds.has(image.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                    />
                  </div>

                  {/* Image */}
                  <img
                    src={image.uri}
                    alt="Recycled image"
                    className={`w-full h-auto rounded-lg shadow-md hover:shadow-xl transition-all duration-200 ${
                      selectedImages.has(image.id) ? 'ring-2 ring-blue-500' : ''
                    }`}
                  />

                  {/* Overlay with info and delete button */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 rounded-lg flex flex-col justify-between p-3">
                    {/* Delete button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleDeleteSingle(image.id)}
                        disabled={deletingIds.has(image.id)}
                        className="opacity-0 group-hover:opacity-100 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-700 transition-all duration-200 disabled:bg-red-400"
                        title="Permanently delete"
                      >
                        {deletingIds.has(image.id) ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Image info */}
                    <div className="opacity-0 group-hover:opacity-100 text-white text-sm space-y-1">
                      <div className="bg-black bg-opacity-50 rounded px-2 py-1">
                        <div>{formatBytes(image.size)}</div>
                        <div>{image.width}×{image.height}</div>
                        <div className="capitalize">{image.originalDeletionReason}</div>
                      </div>
                      <div className="bg-black bg-opacity-50 rounded px-2 py-1 text-xs">
                        {formatDate(image.deletedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecycleBinModal;