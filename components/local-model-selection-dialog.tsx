"use client"

import React, { useState, useEffect } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu"
import { Button } from "../components/ui/button"
import { BotIcon, Loader2, ChevronDown } from "lucide-react"
import { cn } from "../lib/utils"
import { ScrollArea } from "../components/ui/scroll-area"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import type { LocalModel } from "../lib/types"

interface LocalModelSelectionDialogProps {
  models: LocalModel[]
  selectedModel: string
  onSelectModel: (modelId: string) => void
  isLoading?: boolean
}

export default function LocalModelSelectionDialog({
  models,
  selectedModel,
  onSelectModel,
  isLoading = false,
}: LocalModelSelectionDialogProps) {
  const [filteredModels, setFilteredModels] = useState<LocalModel[]>([])
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
      filtered = filtered.filter((model: LocalModel) => {
        const modelName = model.name.toLowerCase()
        const modelId = model.id.toLowerCase()
        return (
          modelName.includes(searchQuery.toLowerCase()) ||
          modelId.includes(searchQuery.toLowerCase())
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
    const model = models.find((m: LocalModel) => m.id === selectedModel)
    if (!model) return selectedModel
    return model.name || model.id
  }

  // Format file size
  const formatSize = (bytes?: number): string => {
    if (!bytes) return ""
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return ""
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
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
      <DropdownMenuContent className="w-80" style={{ maxHeight: '400px' }}>
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
                  {filteredModels.slice(0, visibleCount).map((model: LocalModel) => (
                    <DropdownMenuItem
                      key={model.id}
                      // Prevent first-letter typeahead from auto-focusing items while typing in the search box
                      onKeyDown={(e) => e.stopPropagation()}
                      className={cn(
                        "flex items-center justify-between p-3 cursor-pointer focus:bg-accent focus:text-accent-foreground",
                        selectedModel === model.id && "bg-primary/10"
                      )}
                      onClick={() => onSelectModel(model.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            getModelColor(model.id)
                          )}
                        >
                          <BotIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {model.name || model.id}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {model.size && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {formatSize(model.size)}
                              </Badge>
                            )}
                            {model.modified_at && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {formatDate(model.modified_at)}
                              </Badge>
                            )}
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