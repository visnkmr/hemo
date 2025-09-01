"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { Trash2, Eye, Download, Info } from "lucide-react"
import { imageDBService } from "../lib/image-db-service"
import { StoredImage } from "../lib/image-db-service"

interface ImageManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ImageCardProps {
  image: StoredImage
  dbType: 'webuse' | 'original'
  onDelete: (imageId: string, dbType: 'webuse' | 'original') => void
}

function ImageCard({ image, dbType, onDelete }: ImageCardProps) {
  const [imageUrl, setImageUrl] = useState<string>("")

  useEffect(() => {
    // Convert base64 to blob URL for display
    if (image.uri.startsWith('data:image/')) {
      setImageUrl(image.uri)
    } else {
      // For blob storage or other formats, we'll use the base64 data
      setImageUrl(image.uri)
    }
  }, [image.uri])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Image ${image.id}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Eye size={48} />
          </div>
        )}

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(image.id, dbType)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 size={16} />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                // Download functionality
                const link = document.createElement('a')
                link.href = imageUrl
                link.download = `image-${image.id}.${image.mimeType.split('/')[1]}`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
            >
              <Download size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Image Info */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <Badge variant={dbType === 'webuse' ? 'default' : 'secondary'} className="text-xs">
            {dbType === 'webuse' ? 'WebP' : 'Original'}
          </Badge>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(image.size)}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
            ID: {image.id}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
            Chat: {image.chatId}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
            Message: {image.messageId}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(image.createdAt)}
          </p>
        </div>

        {/* Metadata */}
        {image.metadata && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100">
                <Info size={12} className="inline mr-1" />
                Metadata
              </summary>
              <div className="mt-1 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                {image.metadata?.source && (
                  <p>Source: {image.metadata.source}</p>
                )}
                {image.mimeType && (
                  <p>Type: {image.mimeType}</p>
                )}
                {image.width && image.height && (
                  <p>Dimensions: {image.width}×{image.height}</p>
                )}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ImageManagementModal({ isOpen, onClose }: ImageManagementModalProps) {
  const [webuseImages, setWebuseImages] = useState<StoredImage[]>([])
  const [originalImages, setOriginalImages] = useState<StoredImage[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'webuse' | 'original'>('webuse')

  const loadImages = async () => {
    setLoading(true)
    try {
      const [webuse, original] = await Promise.all([
        imageDBService.getAllImagesFromDb('webuse'),
        imageDBService.getAllImagesFromDb('original')
      ])

      // Sort by last accessed (most recent first)
      setWebuseImages(webuse.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()))
      setOriginalImages(original.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()))
    } catch (error) {
      console.error('Failed to load images:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadImages()
    }
  }, [isOpen])

  const handleDeleteImage = async (imageId: string, dbType: 'webuse' | 'original') => {
    if (!confirm(`Are you sure you want to delete this image from ${dbType} database?`)) {
      return
    }

    try {
      const success = await imageDBService.deleteImageFromDb(dbType, imageId)
      if (success) {
        console.log(`[ImageManagement] ✅ Deleted image ${imageId} from ${dbType}`)
        // Reload images
        await loadImages()
      } else {
        console.error(`[ImageManagement] ❌ Failed to delete image ${imageId} from ${dbType}`)
        alert('Failed to delete image')
      }
    } catch (error) {
      console.error(`[ImageManagement] ❌ Error deleting image ${imageId}:`, error)
      alert('Error deleting image')
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Image Database Management</span>
            <div className="flex gap-2 text-sm text-gray-500">
              <span>WebUse: {webuseImages.length} images ({formatBytes(webuseImages.reduce((sum, img) => sum + img.size, 0))})</span>
              <span>•</span>
              <span>Original: {originalImages.length} images ({formatBytes(originalImages.reduce((sum, img) => sum + img.size, 0))})</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'webuse' | 'original')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="webuse" className="flex items-center gap-2">
              WebP Images ({webuseImages.length})
            </TabsTrigger>
            <TabsTrigger value="original" className="flex items-center gap-2">
              Original Images ({originalImages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webuse" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading images...</div>
              </div>
            ) : webuseImages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">No images in WebUse database</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {webuseImages.map((image) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    dbType="webuse"
                    onDelete={handleDeleteImage}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="original" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading images...</div>
              </div>
            ) : originalImages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">No images in Original database</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {originalImages.map((image) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    dbType="original"
                    onDelete={handleDeleteImage}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}