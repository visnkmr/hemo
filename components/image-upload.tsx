"use client"

import React, { useRef, useState, useCallback } from "react"
import { Button } from "../components/ui/button"
import { X, Upload, Image as ImageIcon } from "lucide-react"
import { cn } from "../lib/utils"

interface ImageUploadProps {
  onImageSelect: (images: UploadedImage[]) => void
  maxImages?: number
  acceptedFileTypes?: string[]
  className?: string
}

export interface UploadedImage {
  file: File
  preview: string
  id: string
}

export default function ImageUpload({
  onImageSelect,
  maxImages = 5,
  acceptedFileTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"],
  className
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)

    // Filter valid image files
    const validFiles = fileArray.filter(file =>
      acceptedFileTypes.some(type => file.type.startsWith(type.split('/')[0]))
    )

    // Check if adding these files would exceed the limit
    if (uploadedImages.length + validFiles.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }

    // Convert files to uploaded images with previews
    const newImages: UploadedImage[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }))

    const updatedImages = [...uploadedImages, ...newImages]
    setUploadedImages(updatedImages)
    onImageSelect(updatedImages)
  }, [uploadedImages, maxImages, acceptedFileTypes, onImageSelect])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  const handleRemoveImage = (imageId: string) => {
    const updatedImages = uploadedImages.filter(img => img.id !== imageId)
    setUploadedImages(updatedImages)
    onImageSelect(updatedImages)

    // Clean up object URLs
    const removedImage = uploadedImages.find(img => img.id === imageId)
    if (removedImage) {
      URL.revokeObjectURL(removedImage.preview)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn("w-full", className)} data-image-upload>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Upload area */}
      {uploadedImages.length === 0 ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            isDragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500",
            "bg-gray-50 dark:bg-gray-800/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-gray-400" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Click to upload</span> or drag and drop
            </div>
            <div className="text-xs text-gray-500">
              PNG, JPG, WebP, GIF up to 10MB each
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image preview grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {uploadedImages.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img
                    src={image.preview}
                    alt="Upload preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveImage(image.id)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                  {image.file.name}
                </div>
              </div>
            ))}

            {/* Add more images button */}
            {uploadedImages.length < maxImages && (
              <div
                className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 transition-colors"
                onClick={openFileDialog}
              >
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                  <span className="text-xs text-gray-500">Add more</span>
                </div>
              </div>
            )}
          </div>

          {/* Upload info */}
          <div className="text-xs text-gray-500 flex justify-between">
            <span>{uploadedImages.length} of {maxImages} images</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Clear all images
                uploadedImages.forEach(img => URL.revokeObjectURL(img.preview))
                setUploadedImages([])
                onImageSelect([])
              }}
              className="h-auto p-1 text-xs"
            >
              Clear all
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}