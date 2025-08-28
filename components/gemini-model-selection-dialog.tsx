"use client"

import React, { useState, useEffect } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu"
import { Button } from "../components/ui/button"
import { Bot, BotIcon, Loader2, ChevronDown } from "lucide-react"
import { cn } from "../lib/utils"
import { ScrollArea } from "../components/ui/scroll-area"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import type { GeminiModel } from "../lib/types"
import { GeminiImageService } from "../lib/gemini-image-service"

interface GeminiModelSelectionDialogProps {
  models: GeminiModel[]
  selectedModel: string
  onSelectModel: (modelId: string) => void
  isLoading?: boolean
}

// Helper function to check if a model supports image generation
const shouldShowImageGenerationBadge = (model: GeminiModel): boolean => {
  const modelName = model.name || '';
  return GeminiImageService.isModelImageCapable(modelName.split('/').pop() || modelName);
};

export default function GeminiModelSelectionDialog({
  models,
  selectedModel,
  onSelectModel,
  isLoading = false,
}: GeminiModelSelectionDialogProps) {
  const [filteredModels, setFilteredModels] = useState<GeminiModel[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  // pagination for dropdown list
  const [visibleCount, setVisibleCount] = useState(5)

  // Filter models based on search query
  useEffect(() => {
    if (!models) {
      setFilteredModels([])
      return
    }
    // reset pagination when source or filters change
    setVisibleCount(5)

    let filtered = models

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((model: GeminiModel) => {
        const modelName = model.displayName?.toLowerCase() || ''
        const modelId = model.name?.toLowerCase() || ''
        const description = model.description?.toLowerCase() || ''
        return (
          modelName.includes(searchQuery.toLowerCase()) ||
          modelId.includes(searchQuery.toLowerCase()) ||
          description.includes(searchQuery.toLowerCase())
        )
      })
    }

    setFilteredModels(filtered)
  }, [models, searchQuery])

  // Get a random color for the model icon
  const getModelColor = (modelId: string): string => {
    const colors = [
      "bg-purple-500",
      "bg-pink-500",
      "bg-rose-500",
      "bg-red-500",
      "bg-orange-500",
      "bg-amber-500",
      "bg-yellow-500",
      "bg-lime-500",
      "bg-green-500",
      "bg-emerald-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-sky-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-violet-500",
    ]

    // Simple hash function to get consistent color
    let hash = 0
    for (let i = 0; i < modelId.length; i++) {
      hash = modelId.charCodeAt(i) + ((hash << 5) - hash)
    }

    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  // Get selected model display name
  const getSelectedModelDisplay = () => {
    if (isLoading) return "Loading models..."
    if (!selectedModel) return "Select a model"
    if (!models || models.length === 0) return "No models available"
    const model = models.find((m: GeminiModel) => m.name?.split('/').pop() === selectedModel)
    if (!model) return selectedModel
    return model.displayName || model.name?.split('/').pop() || selectedModel
  }

  // Format token limits
  const formatTokens = (tokens?: number): string => {
    if (!tokens) return "N/A"
    return tokens.toLocaleString()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between" disabled={isLoading}>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BotIcon className="h-4 w-4" />
            )}
            <span className="truncate">{getSelectedModelDisplay()}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96" style={{ maxHeight: '400px' }}>
        <div className="p-2 space-y-2 sticky top-0 bg-background border-b">
          <Input
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              // Prevent DropdownMenu from stealing focus/navigation when typing in the search box
              e.stopPropagation()
            }}
            className="w-full"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading models...</span>
          </div>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
            <div className="p-1">
              {filteredModels.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No models found
                </div>
              ) : (
                <>
                  {filteredModels.slice(0, visibleCount).map((model: GeminiModel) => (
                    <DropdownMenuItem
                      key={model.name || `model-${Math.random()}`}
                      // Prevent first-letter typeahead from auto-focusing items while typing in the search box
                      onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
                      className={cn(
                        "flex items-center justify-between p-3 cursor-pointer focus:bg-accent focus:text-accent-foreground",
                        selectedModel === model.name?.split('/').pop() && "bg-primary/10"
                      )}
                      onClick={() => onSelectModel(model.name?.split('/').pop() || model.name || '')}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            getModelColor(model.name || '')
                          )}
                        >
                          <BotIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {model.displayName || model.name?.split('/').pop() || 'Unknown Model'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {model.description || 'No description available'}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {formatTokens(model.inputTokenLimit)} in
                            </Badge>
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {formatTokens(model.outputTokenLimit)} out
                            </Badge>
                            <div className="flex items-center gap-1 flex-wrap">
                              {model.supportedGenerationMethods?.includes("generateContent") && (
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  Text
                                </Badge>
                              )}
                              {shouldShowImageGenerationBadge(model) && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  <Bot className="h-3 w-3 mr-1" />
                                  Image Gen
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {filteredModels.length > visibleCount && (
                    <div className="p-2">
                      <Button
                        variant="outline"
                        className="w-full text-sm"
                        onClick={() => setVisibleCount((c) => c + 5)}
                      >
                        Show 5 more
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}