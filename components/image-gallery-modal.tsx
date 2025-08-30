"use client"

import React, { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../components/ui/dialog"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Trash2, Calendar, Eye, X } from "lucide-react"
import type { Chat } from "../lib/types"
import { cn } from "../lib/utils"

interface ImageData {
  uri: string
  mimeType: string
  width: number
  height: number
  chatTitle: string
  chatId: string
  messageId: string
  timestamp: string
  isSingleImage: boolean // true if this is a single imageUrl, false if part of imageGenerations
  generationIndex?: number // for imageGenerations array
  imageIndex?: number // for specific image in generation
  generationData?: any // full generation object for context
}

interface ImageGalleryModalProps {
  isOpen: boolean
  onClose: () => void
  chats: Chat[]
  onDeleteImage: (imageData: ImageData) => Promise<void>
}

export default function ImageGalleryModal({
  isOpen,
  onClose,
  chats,
  onDeleteImage
}: ImageGalleryModalProps) {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null)

  // Extract all images from chat history
  const allImages = useMemo(() => {
    const images: ImageData[] = []

    const formatTimestamp = (timestamp: string) => {
      try {
        return new Date(timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch {
        return 'Unknown date'
      }
    }

    chats.forEach(chat => {
      chat.messages.forEach(message => {
        // Single image from imageUrl
        if (message.imageUrl && message.imageUrl.startsWith('data:image/')) {
          // Extract dimensions from base64 data if possible
          let width = 0, height = 0
          try {
            // Try to get dimensions from image data, fallback to 400x300
            const img = new Image()
            img.onload = () => {
              width = img.width
              height = img.height
            }
            img.src = message.imageUrl
            width = width || 400
            height = height || 300
          } catch {
            width = 400
            height = 300
          }

          images.push({
            uri: message.imageUrl,
            mimeType: 'image', // generic
            width,
            height,
            chatTitle: chat.title,
            chatId: chat.id,
            messageId: message.id,
            timestamp: formatTimestamp(message.timestamp),
            isSingleImage: true
          })
        }

        // Images from imageGenerations
        if (message.imageGenerations) {
          message.imageGenerations.forEach((generation, genIndex) => {
            if (generation.images && generation.images.length > 0) {
              generation.images.forEach((image, imageIndex) => {
                if (image.uri && image.uri.startsWith('data:image/')) {
                  images.push({
                    uri: image.uri,
                    mimeType: image.mimeType,
                    width: image.width || 1024,
                    height: image.height || 1024,
                    chatTitle: chat.title,
                    chatId: chat.id,
                    messageId: message.id,
                    timestamp: formatTimestamp(message.timestamp),
                    isSingleImage: false,
                    generationIndex: genIndex,
                    imageIndex,
                    generationData: generation
                  })
                }
              })
            }
          })
        }
      })
    })

    // Sort by timestamp (newest first)
    return images.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [chats])

  const handleDeleteImage = async (image: ImageData) => {
    const deleteId = `${image.messageId}-${image.generationIndex || 0}-${image.imageIndex || 0}`
    setDeletingIds(prev => new Set(prev).add(deleteId))

    try {
      await onDeleteImage(image)
    } catch (error) {
      console.error('Failed to delete image:', error)
      // Could show an error toast here
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(deleteId)
        return newSet
      })
    }
  }

  const handleImageClick = (image: ImageData) => {
    setSelectedImage(image)
  }

  const closeImageView = () => {
    setSelectedImage(null)
  }

  // Pinterest-style masonry grid calculation
  const gridColumns = window.innerWidth < 768 ? 2 : window.innerWidth < 1200 ? 3 : 4

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Chat Image Gallery
                <Badge variant="secondary">{allImages.length} images</Badge>
              </div>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {allImages.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No images found in chat history</p>
                  <p className="text-sm">Generate some images to see them here!</p>
                </div>
              </div>
            ) : (
              <div
                className="grid gap-4 p-4"
                style={{
                  gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
                  gap: '1rem'
                }}
              >
                {allImages.map((image, index) => (
                  <div
                    key={`${image.messageId}-${image.generationIndex || 0}-${image.imageIndex || 0}-${index}`}
                    className="relative group cursor-pointer overflow-hidden rounded-lg border bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105"
                    style={{
                      aspectRatio: 'auto',
                      minHeight: '200px'
                    }}
                    onClick={() => handleImageClick(image)}
                  >
                    <img
                      src={image.uri}
                      alt={`${image.chatTitle} - ${image.width}x${image.height}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      style={{ aspectRatio: `${image.width}/${image.height}` }}
                    />

                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteImage(image)
                        }}
                        disabled={deletingIds.has(`${image.messageId}-${image.generationIndex || 0}-${image.imageIndex || 0}`)}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingIds.has(`${image.messageId}-${image.generationIndex || 0}-${image.imageIndex || 0}`) ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="text-white text-xs space-y-1">
                        <div className="font-medium truncate">{image.chatTitle}</div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {image.timestamp}
                          </span>
                          <span>{image.width}×{image.height}</span>
                        </div>
                        {!image.isSingleImage && (
                          <Badge variant="outline" className="text-xs bg-white bg-opacity-20">
                            Generated
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Badge variant="secondary" className="text-xs">
                        {image.mimeType.split('/')[1]?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-screen image viewer modal */}
      {selectedImage && (
        <Dialog open={selectedImage !== null} onOpenChange={closeImageView}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden">
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedImage.chatTitle}</div>
                    <div className="text-sm text-gray-500">
                      {selectedImage.timestamp} • {selectedImage.width}×{selectedImage.height}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteImage(selectedImage)}
                      disabled={deletingIds.has(`${selectedImage.messageId}-${selectedImage.generationIndex || 0}-${selectedImage.imageIndex || 0}`)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deletingIds.has(`${selectedImage.messageId}-${selectedImage.generationIndex || 0}-${selectedImage.imageIndex || 0}`) ? 'Deleting...' : 'Delete Image'}
                    </Button>
                    <DialogClose asChild>
                      <Button variant="ghost" size="icon">
                        <X className="h-4 w-4" />
                      </Button>
                    </DialogClose>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <img
                  src={selectedImage.uri}
                  alt={`${selectedImage.chatTitle} - ${selectedImage.width}x${selectedImage.height}`}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}