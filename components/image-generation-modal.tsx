"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Slider } from "../components/ui/slider"
import { Badge } from "../components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Image as ImageIcon, Loader2, Settings, Sparkles } from "lucide-react"
import { GeminiImageService } from "../lib/gemini-image-service"
import type { ImageGenerationParameters, ImageGenerationRequest, ImageGenerationResponse } from "../lib/types"

interface ImageGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  onImageGenerated?: (response: ImageGenerationResponse) => void
  selectedModel?: string
}

export default function ImageGenerationModal({
  isOpen,
  onClose,
  onImageGenerated,
  selectedModel = "models/gemini-2.0-flash-exp"
}: ImageGenerationModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedImages, setGeneratedImages] = useState<ImageGenerationResponse | null>(null)

  // Form state
  const [prompt, setPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [parameters, setParameters] = useState<ImageGenerationParameters>({
    aspectRatio: "1:1",
    quality: "standard",
    personGeneration: "block_some",
    style: "creative",
    safetyFilterLevel: "block_some",
  })

  const handleParameterChange = (key: keyof ImageGenerationParameters, value: any) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const resetForm = () => {
    setPrompt("")
    setNegativePrompt("")
    setParameters({
      aspectRatio: "1:1",
      quality: "standard",
      personGeneration: "block_some",
      style: "creative",
      safetyFilterLevel: "block_some",
    })
    setGeneratedImages(null)
    setError(null)
  }

  const handleClose = () => {
    if (!isGenerating) {
      resetForm()
      onClose()
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt for image generation")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const imageService = GeminiImageService.createGeminiImageService()

      if (!imageService) {
        throw new Error("Gemini API key not configured. Please set your API key in settings.")
      }

      const request: ImageGenerationRequest = {
        prompt: prompt.trim(),
        model: selectedModel,
        parameters: {
          ...parameters,
          negativePrompt: negativePrompt.trim() || undefined,
        }
      }

      const response = await imageService.generateImage(request)
      setGeneratedImages(response)

      // Call the callback if provided
      if (onImageGenerated) {
        onImageGenerated(response)
      }
    } catch (err) {
      console.error("Image generation failed:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = async () => {
    if (generatedImages) {
      await handleGenerate()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Generate Image with Gemini
            {!GeminiImageService.isModelImageCapable(selectedModel) && (
              <Badge variant="secondary" className="ml-auto">
                Model may not support image generation
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Create images using Gemini's advanced AI image generation capabilities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prompt Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Prompt & Style
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="prompt" className="text-sm font-medium">
                  Image Prompt *
                </Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to generate (e.g., 'A serene landscape with mountains at sunset, in photorealistic style')"
                  className="mt-1 min-h-[80px]"
                  disabled={isGenerating}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="style" className="text-sm font-medium">
                    Style
                  </Label>
                  <Select
                    value={parameters.style || "creative"}
                    onValueChange={(value: any) => handleParameterChange("style", value)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photorealistic">Photorealistic</SelectItem>
                      <SelectItem value="creative">Creative/Artistic</SelectItem>
                      <SelectItem value="abstract">Abstract</SelectItem>
                      <SelectItem value="cartoon">Cartoon/Illustrative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="aspectRatio" className="text-sm font-medium">
                    Aspect Ratio
                  </Label>
                  <Select
                    value={parameters.aspectRatio || "1:1"}
                    onValueChange={(value: any) => handleParameterChange("aspectRatio", value)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">Square (1:1)</SelectItem>
                      <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                      <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                      <SelectItem value="4:3">Classic (4:3)</SelectItem>
                      <SelectItem value="3:4">Book (3:4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="negativePrompt" className="text-sm font-medium">
                  Negative Prompt (Optional)
                </Label>
                <Input
                  id="negativePrompt"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="What to avoid in the image (e.g., 'blurry, distorted, low quality')"
                  disabled={isGenerating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quality" className="text-sm font-medium">
                    Quality
                  </Label>
                  <Select
                    value={parameters.quality || "standard"}
                    onValueChange={(value: any) => handleParameterChange("quality", value)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium (Higher quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="personGeneration" className="text-sm font-medium">
                    Person Generation
                  </Label>
                  <Select
                    value={parameters.personGeneration || "block_some"}
                    onValueChange={(value: any) => handleParameterChange("personGeneration", value)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow_adult">Allow All</SelectItem>
                      <SelectItem value="block_some">Block Some (Recommended)</SelectItem>
                      <SelectItem value="block_many">Block Most</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="safetyFilter" className="text-sm font-medium">
                  Safety Filter Level
                </Label>
                <Select
                  value={parameters.safetyFilterLevel || "block_some"}
                  onValueChange={(value: any) => handleParameterChange("safetyFilterLevel", value)}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block_most">Most Restrictive</SelectItem>
                    <SelectItem value="block_some">Moderate (Recommended)</SelectItem>
                    <SelectItem value="block_few">Less Restrictive</SelectItem>
                    <SelectItem value="block_fewest">Least Restrictive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Generated Images Preview */}
          {generatedImages && generatedImages.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Generated Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedImages.images.map((image, index) => (
                    <div key={index} className="space-y-2">
                      <img
                        src={image.uri}
                        alt={`Generated image ${index + 1}`}
                        className="w-full h-auto rounded-lg shadow-md border"
                      />
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>{image.width}×{image.height}</span>
                        <span>{image.mimeType}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Generate Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Image
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}