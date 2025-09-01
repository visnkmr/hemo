"use client"

import React, { useState, useRef, useCallback } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { cn } from "../../lib/utils"
import { Download } from "lucide-react"

interface ImageData {
  file: File
  url: string
  width: number
  height: number
}

interface PlacedImage {
  id: string
  imageData: ImageData
  x: number
  y: number
  width: number
  height: number
  originalX: number
  originalY: number
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | null

export default function ImageOverlayPage() {
  const [draggableImages, setDraggableImages] = useState<ImageData[]>([])
  const [targetImage, setTargetImage] = useState<ImageData | null>(null)
  const [draggedImage, setDraggedImage] = useState<ImageData | null>(null)
  const [placedImages, setPlacedImages] = useState<PlacedImage[]>([])
  const [boundingBox, setBoundingBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null)
  const [moveOffset, setMoveOffset] = useState({ x: 0, y: 0 })
  const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 })
  const [initialImagePos, setInitialImagePos] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null)

  const image2Ref = useRef<HTMLDivElement>(null)
  const dragPreviewRef = useRef<HTMLDivElement>(null)

  const handleDraggableImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file)
          const img = new Image()
          img.onload = () => {
            const imageData: ImageData = {
              file,
              url,
              width: img.naturalWidth,
              height: img.naturalHeight
            }
            setDraggableImages(prev => [...prev, imageData])
          }
          img.src = url
        }
      })
    }
  }, [])

  const handleTargetImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        setTargetImage({
          file,
          url,
          width: img.naturalWidth,
          height: img.naturalHeight
        })
      }
      img.src = url
    }
  }, [])

  const removeDraggableImage = useCallback((index: number) => {
    setDraggableImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  const exportCompositeImage = useCallback(async () => {
    if (!targetImage || placedImages.length === 0) return

    // Create canvas with target image dimensions
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = targetImage.width
    canvas.height = targetImage.height

    // Load target image
    const targetImg = new Image()
    targetImg.crossOrigin = 'anonymous'

    return new Promise<void>((resolve) => {
      targetImg.onload = async () => {
        // Draw target image
        ctx.drawImage(targetImg, 0, 0, targetImage.width, targetImage.height)

        // Draw each placed image
        for (const placedImage of placedImages) {
          const overlayImg = new Image()
          overlayImg.crossOrigin = 'anonymous'

          await new Promise<void>((overlayResolve) => {
            overlayImg.onload = () => {
              ctx.drawImage(
                overlayImg,
                placedImage.x,
                placedImage.y,
                placedImage.width,
                placedImage.height
              )
              overlayResolve()
            }
            overlayImg.src = placedImage.imageData.url
          })
        }

        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `composite-image-${Date.now()}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
          }
          resolve()
        }, 'image/png')
      }
      targetImg.src = targetImage.url
    })
  }, [targetImage, placedImages])

  const handleDragStart = useCallback((event: React.DragEvent, imageData: ImageData) => {
    setDraggedImage(imageData)
    setIsDragging(true)

    // Calculate offset from mouse to image center
    const rect = event.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    setDragOffset({
      x: event.clientX - centerX,
      y: event.clientY - centerY
    })

    // Create drag preview
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.display = 'block'
      dragPreviewRef.current.style.left = `${event.clientX - dragOffset.x}px`
      dragPreviewRef.current.style.top = `${event.clientY - dragOffset.y}px`
    }
  }, [dragOffset])

  const handleDrag = useCallback((event: React.DragEvent) => {
    if (isDragging && dragPreviewRef.current) {
      dragPreviewRef.current.style.left = `${event.clientX - dragOffset.x}px`
      dragPreviewRef.current.style.top = `${event.clientY - dragOffset.y}px`
    }
  }, [isDragging, dragOffset])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    setDraggedImage(null)
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.display = 'none'
    }
  }, [])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()

    if (!draggedImage || !image2Ref.current) return

    const rect = image2Ref.current.getBoundingClientRect()
    const x = event.clientX - rect.left - dragOffset.x
    const y = event.clientY - rect.top - dragOffset.y

    // Calculate 0.3x size
    const previewWidth = draggedImage.width * 0.3
    const previewHeight = draggedImage.height * 0.3

    // Ensure the preview stays within bounds
    const clampedX = Math.max(0, Math.min(x, rect.width - previewWidth))
    const clampedY = Math.max(0, Math.min(y, rect.height - previewHeight))

    const newPlacedImage: PlacedImage = {
      id: Date.now().toString(),
      imageData: draggedImage,
      x: clampedX,
      y: clampedY,
      width: previewWidth,
      height: previewHeight,
      originalX: clampedX,
      originalY: clampedY
    }

    setPlacedImages(prev => [...prev, newPlacedImage])

    // Auto-select the newly placed image
    setSelectedImageId(newPlacedImage.id)

    // Calculate bounding box relative to the target image
    const relativeX = clampedX / rect.width
    const relativeY = clampedY / rect.height
    const relativeWidth = previewWidth / rect.width
    const relativeHeight = previewHeight / rect.height

    setBoundingBox({
      x: relativeX,
      y: relativeY,
      width: relativeWidth,
      height: relativeHeight
    })

    handleDragEnd()
  }, [draggedImage, dragOffset, handleDragEnd])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
  }, [])

  const clearPlacedImages = useCallback(() => {
    setPlacedImages([])
    setBoundingBox(null)
    setSelectedImageId(null)
    setHoveredImageId(null)
  }, [])

  const updateBoundingBox = useCallback((placedImage: PlacedImage) => {
    if (!image2Ref.current) return

    const rect = image2Ref.current.getBoundingClientRect()
    const relativeX = placedImage.x / rect.width
    const relativeY = placedImage.y / rect.height
    const relativeWidth = placedImage.width / rect.width
    const relativeHeight = placedImage.height / rect.height

    setBoundingBox({
      x: relativeX,
      y: relativeY,
      width: relativeWidth,
      height: relativeHeight
    })
  }, [])

  const handleImageMouseDown = useCallback((event: React.MouseEvent, imageId: string) => {
    event.preventDefault()
    event.stopPropagation()

    setSelectedImageId(imageId)
    setIsMoving(true)
    setInitialMousePos({ x: event.clientX, y: event.clientY })

    const image = placedImages.find(img => img.id === imageId)
    if (image) {
      setInitialImagePos({
        x: image.x,
        y: image.y,
        width: image.width,
        height: image.height
      })
      setMoveOffset({
        x: event.clientX - image.x,
        y: event.clientY - image.y
      })
      // Update bounding box for selected image
      updateBoundingBox(image)
    }
  }, [placedImages, updateBoundingBox])

  const handleResizeMouseDown = useCallback((event: React.MouseEvent, imageId: string, handle: ResizeHandle) => {
    event.preventDefault()
    event.stopPropagation()

    setSelectedImageId(imageId)
    setIsResizing(true)
    setResizeHandle(handle)
    setInitialMousePos({ x: event.clientX, y: event.clientY })

    const image = placedImages.find(img => img.id === imageId)
    if (image) {
      setInitialImagePos({
        x: image.x,
        y: image.y,
        width: image.width,
        height: image.height
      })
    }
  }, [placedImages])

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!image2Ref.current) return

    const rect = image2Ref.current.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    if (isMoving && selectedImageId) {
      const deltaX = event.clientX - initialMousePos.x
      const deltaY = event.clientY - initialMousePos.y

      let newX = initialImagePos.x + deltaX
      let newY = initialImagePos.y + deltaY

      // Keep within bounds
      newX = Math.max(0, Math.min(newX, rect.width - initialImagePos.width))
      newY = Math.max(0, Math.min(newY, rect.height - initialImagePos.height))

      setPlacedImages(prev => prev.map(img =>
        img.id === selectedImageId
          ? { ...img, x: newX, y: newY }
          : img
      ))

      const updatedImage = placedImages.find(img => img.id === selectedImageId)
      if (updatedImage) {
        updateBoundingBox({ ...updatedImage, x: newX, y: newY })
      }
    }

    if (isResizing && selectedImageId && resizeHandle) {
      const deltaX = event.clientX - initialMousePos.x
      const deltaY = event.clientY - initialMousePos.y

      let newX = initialImagePos.x
      let newY = initialImagePos.y
      let newWidth = initialImagePos.width
      let newHeight = initialImagePos.height

      switch (resizeHandle) {
        case 'nw':
          newX = initialImagePos.x + deltaX
          newY = initialImagePos.y + deltaY
          newWidth = initialImagePos.width - deltaX
          newHeight = initialImagePos.height - deltaY
          break
        case 'ne':
          newY = initialImagePos.y + deltaY
          newWidth = initialImagePos.width + deltaX
          newHeight = initialImagePos.height - deltaY
          break
        case 'sw':
          newX = initialImagePos.x + deltaX
          newWidth = initialImagePos.width - deltaX
          newHeight = initialImagePos.height + deltaY
          break
        case 'se':
          newWidth = initialImagePos.width + deltaX
          newHeight = initialImagePos.height + deltaY
          break
      }

      // Minimum size constraints
      newWidth = Math.max(20, newWidth)
      newHeight = Math.max(20, newHeight)

      // Keep within bounds
      if (newX < 0) {
        newWidth += newX
        newX = 0
      }
      if (newY < 0) {
        newHeight += newY
        newY = 0
      }
      if (newX + newWidth > rect.width) {
        newWidth = rect.width - newX
      }
      if (newY + newHeight > rect.height) {
        newHeight = rect.height - newY
      }

      setPlacedImages(prev => prev.map(img =>
        img.id === selectedImageId
          ? { ...img, x: newX, y: newY, width: newWidth, height: newHeight }
          : img
      ))

      const updatedImage = placedImages.find(img => img.id === selectedImageId)
      if (updatedImage) {
        updateBoundingBox({ ...updatedImage, x: newX, y: newY, width: newWidth, height: newHeight })
      }
    }
  }, [isMoving, isResizing, selectedImageId, resizeHandle, initialMousePos, initialImagePos, placedImages, updateBoundingBox])

  const handleMouseUp = useCallback(() => {
    setIsMoving(false)
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  const handleContainerClick = useCallback(() => {
    setSelectedImageId(null)
    setBoundingBox(null)
  }, [])

  const handleImageClick = useCallback((event: React.MouseEvent, imageId: string) => {
    event.stopPropagation()
    setSelectedImageId(imageId)

    const image = placedImages.find(img => img.id === imageId)
    if (image) {
      updateBoundingBox(image)
    }
  }, [placedImages, updateBoundingBox])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Image Overlay Tool
        </h1>

        {/* Main Layout */}
        <div className="flex gap-6">
          {/* Draggable Images Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Draggable Images</h2>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleDraggableImageUpload}
                className="mb-4"
              />

              {/* Draggable Images Grid */}
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {draggableImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.url}
                      alt={`Draggable ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg cursor-move border-2 border-blue-500 hover:border-blue-600 transition-colors"
                      draggable
                      onDragStart={(e) => handleDragStart(e, image)}
                      onDrag={handleDrag}
                      onDragEnd={handleDragEnd}
                    />
                    {/* Remove button */}
                    <button
                      onClick={() => removeDraggableImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {draggableImages.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No images uploaded yet
                </div>
              )}
            </div>
          </div>

          {/* Target Image Area */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Target Image</h2>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleTargetImageUpload}
                  className="w-auto"
                />
              </div>

              {targetImage ? (
                <div className="relative">
                  <div
                    ref={image2Ref}
                    className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden cursor-default bg-gray-50 dark:bg-gray-700"
                    style={{ minHeight: '600px' }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onClick={handleContainerClick}
                  >
                    <img
                      src={targetImage.url}
                      alt="Target"
                      className="w-full h-auto max-h-[600px] object-contain"
                    />
                    {/* Render placed images */}
                    {placedImages.map((placedImage) => (
                      <div
                        key={placedImage.id}
                        className={cn(
                          "absolute group",
                          selectedImageId === placedImage.id ? "ring-2 ring-blue-500 ring-offset-2" : ""
                        )}
                        style={{
                          left: `${placedImage.x}px`,
                          top: `${placedImage.y}px`,
                          width: `${placedImage.width}px`,
                          height: `${placedImage.height}px`,
                        }}
                        onMouseEnter={() => setHoveredImageId(placedImage.id)}
                        onMouseLeave={() => setHoveredImageId(null)}
                      >
                        <img
                          src={placedImage.imageData.url}
                          alt="Placed overlay"
                          className="w-full h-full object-cover border-2 border-red-500 opacity-80 cursor-move"
                          onMouseDown={(e) => handleImageMouseDown(e, placedImage.id)}
                          onClick={(e) => handleImageClick(e, placedImage.id)}
                        />

                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPlacedImages(prev => prev.filter(img => img.id !== placedImage.id))
                            if (selectedImageId === placedImage.id) {
                              setSelectedImageId(null)
                              setBoundingBox(null)
                            }
                          }}
                          className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                          title="Delete overlay"
                        >
                          ×
                        </button>

                        {/* Resize handles - show when selected or hovered */}
                        {(selectedImageId === placedImage.id || hoveredImageId === placedImage.id) && (
                          <>
                            {/* Corner handles */}
                            <div
                              className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-nw-resize opacity-100"
                              onMouseDown={(e) => handleResizeMouseDown(e, placedImage.id, 'nw')}
                            />
                            <div
                              className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-ne-resize opacity-100"
                              onMouseDown={(e) => handleResizeMouseDown(e, placedImage.id, 'ne')}
                            />
                            <div
                              className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-sw-resize opacity-100"
                              onMouseDown={(e) => handleResizeMouseDown(e, placedImage.id, 'sw')}
                            />
                            <div
                              className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-se-resize opacity-100"
                              onMouseDown={(e) => handleResizeMouseDown(e, placedImage.id, 'se')}
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {targetImage.width} × {targetImage.height} pixels • {placedImages.length} overlay{placedImages.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
                  <div className="text-gray-500 dark:text-gray-400">
                    <div className="text-lg mb-2">Upload a target image</div>
                    <div className="text-sm">Drag images from the sidebar to place overlays</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bounding Box Coordinates Display */}
        {boundingBox && selectedImageId && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Bounding Box Coordinates {selectedImageId ? `(Image ${placedImages.findIndex(img => img.id === selectedImageId) + 1})` : ''}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">X</label>
                <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                  {(boundingBox.x * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Y</label>
                <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                  {(boundingBox.y * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Width</label>
                <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                  {(boundingBox.width * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Height</label>
                <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                  {(boundingBox.height * 100).toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Click on an overlay to select it and see its coordinates. Drag to move, use corner handles to resize.
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <Button onClick={clearPlacedImages} variant="outline">
            Clear Overlays
          </Button>
          <Button
            onClick={exportCompositeImage}
            disabled={!targetImage || placedImages.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Composite Image
          </Button>
        </div>

        {/* Drag Preview */}
        <div
          ref={dragPreviewRef}
          className="fixed pointer-events-none z-50 opacity-50"
          style={{ display: 'none' }}
        >
          {draggedImage && (
            <img
              src={draggedImage.url}
              alt="Drag preview"
              className="border-2 border-blue-500 rounded max-w-32 max-h-32"
              style={{
                width: `${Math.min(draggedImage.width * 0.3, 128)}px`,
                height: `${Math.min(draggedImage.height * 0.3, 128)}px`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}