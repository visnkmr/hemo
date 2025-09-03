"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter
} from "../components/ui/dialog"
import { Button } from "../components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Label } from "../components/ui/label"
import { Progress } from "../components/ui/progress"
import { Download, Zap, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { imagePipelineUtility } from "../lib/image-pipeline-utility"
import { compressionPresets } from "../lib/image-compression-service"

interface ImageDownloadModalProps {
  isOpen: boolean
  onClose: () => void
  imageId: string
  originalImageUri: string | null
}

export default function ImageDownloadModal({
  isOpen,
  onClose,
  imageId,
  originalImageUri
}: ImageDownloadModalProps) {
  const [selectedPreset, setSelectedPreset] = useState('optimized')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<{
    base64Data: string | null
    mimeType: string
    size: number
    savingsPercent: number
    fileName: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Get available compression presets
  const presets = Object.entries(compressionPresets).map(([key, preset]) => ({
    value: key,
    label: preset.name,
    description: preset.description
  }))

  const handleGenerate = async () => {
    if (!originalImageUri || isGenerating) return

    setIsGenerating(true)
    setError(null)
    setGeneratedImage(null)

    try {
      console.log(`[ImageDownloadModal] Generating compressed image with preset: ${selectedPreset}`)

      const result = await imagePipelineUtility.compressImageForDownload(imageId, selectedPreset)

      if (result) {
        const fileName = `compressed-image-${selectedPreset}-${Date.now()}.${result.mimeType.split('/')[1]}`

        setGeneratedImage({
          base64Data: result.compressedBase64,
          mimeType: result.mimeType,
          size: result.size,
          savingsPercent: result.savingsPercent,
          fileName
        })

        console.log(`[ImageDownloadModal] ✅ Generated compressed image: ${fileName}`)
      } else {
        setError('Failed to generate compressed image')
      }
    } catch (err) {
      console.error('[ImageDownloadModal] ❌ Error generating compressed image:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!generatedImage?.base64Data) return

    try {
      const link = document.createElement('a')
      link.href = `data:${generatedImage.mimeType};base64,${generatedImage.base64Data}`
      link.download = generatedImage.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log(`[ImageDownloadModal] 📥 Downloaded: ${generatedImage.fileName}`)
    } catch (err) {
      console.error('[ImageDownloadModal] ❌ Error downloading image:', err)
      setError('Failed to download image')
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Optimized Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Compression Preset Selection */}
          <div className="space-y-2">
            <Label htmlFor="compression-preset">Choose Optimization Method</Label>
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Select optimization method" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{preset.label}</span>
                      <span className="text-sm text-gray-500">{preset.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Preset Info */}
          {selectedPreset && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <h4 className="font-medium text-sm mb-1">Selected: {compressionPresets[selectedPreset].name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {compressionPresets[selectedPreset].description}
              </p>
              <div className="text-xs text-gray-500 mt-2">
                Format: {compressionPresets[selectedPreset].format.toUpperCase()} •
                Quality: {compressionPresets[selectedPreset].quality} •
                Max Size: {compressionPresets[selectedPreset].maxWidth}x{compressionPresets[selectedPreset].maxHeight}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !originalImageUri}
            className="w-full flex items-center gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Optimized Image'}
          </Button>

          {/* Progress */}
          {isGenerating && (
            <Progress value={undefined} className="w-full" />
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Generated Image Preview */}
          {generatedImage && (
            <div className="space-y-3 p-3 border rounded-md">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Compression Complete!</span>
              </div>

              <div className="text-sm space-y-1">
                <div><strong>File:</strong> {generatedImage.fileName}</div>
                <div><strong>Size:</strong> {formatBytes(generatedImage.size)}</div>
                <div><strong>Savings:</strong> {Math.round(generatedImage.savingsPercent)}%</div>
                <div><strong>Format:</strong> {generatedImage.mimeType.split('/')[1]?.toUpperCase()}</div>
              </div>

              {generatedImage.base64Data && (
                <img
                  src={`data:${generatedImage.mimeType};base64,${generatedImage.base64Data}`}
                  alt="Compressed preview"
                  className="w-full h-32 object-contain bg-gray-50 dark:bg-gray-800 rounded border"
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </DialogClose>

          {generatedImage && (
            <Button onClick={handleDownload} className="w-full flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Optimized Image
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}