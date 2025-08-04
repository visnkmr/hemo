"use client"

import { useState, useEffect } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu"
import { Button } from "../components/ui/button"
import { BotIcon, CloudIcon, EyeIcon, FileIcon, Loader2, ChevronDown } from "lucide-react"
import { cn } from "../lib/utils"
import { ScrollArea } from "../components/ui/scroll-area"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Switch } from "../components/ui/switch"
import { Label } from "../components/ui/label"
import bigDecimal from "js-big-decimal"
import type { OpenRouterModel } from "../lib/types"

interface ModelSelectionDialogProps {
  models: OpenRouterModel[]
  selectedModel: string
  onSelectModel: (modelId: string) => void
  isLoading?: boolean
}

export default function ModelSelectionDialog({
  models,
  selectedModel,
  onSelectModel,
  isLoading = false,
}: ModelSelectionDialogProps) {
  const [filteredModels, setFilteredModels] = useState<OpenRouterModel[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showFreeOnly, setShowFreeOnly] = useState(true)
  // pagination for dropdown list
  const [visibleCount, setVisibleCount] = useState(5)

  // Filter models based on search query and free models toggle
  useEffect(() => {
    if (!models) {
      setFilteredModels([])
      return
    }
    // reset pagination when source or filters change
    setVisibleCount(5)

    let filtered = models

    // Filter by free models if toggle is enabled
    if (showFreeOnly) {
      filtered = filtered.filter((model: OpenRouterModel) => {
        try {
          // Use bigDecimal for accurate pricing comparison like in the original code
          const promptPrice = parseFloat(new bigDecimal(model.pricing?.prompt || "0").getValue())
          const completionPrice = parseFloat(new bigDecimal(model.pricing?.completion || "0").getValue())
          
          return promptPrice <= 0 && completionPrice <= 0
        } catch (error) {
          // Fallback to regular parsing if bigDecimal fails
          const promptPrice = parseFloat(model.pricing?.prompt || "0")
          const completionPrice = parseFloat(model.pricing?.completion || "0")
          return promptPrice <= 0 && completionPrice <= 0
        }
      })
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((model: OpenRouterModel) => {
        const modelName = model.id.toLowerCase()
        const provider = model.id.split("/")[0].toLowerCase()
        const modelId = model.id.split("/").pop()?.toLowerCase() || ""
        return (
          modelName.includes(searchQuery.toLowerCase()) ||
          provider.includes(searchQuery.toLowerCase()) ||
          modelId.includes(searchQuery.toLowerCase())
        )
      })
    }

    setFilteredModels(filtered)
  }, [models, searchQuery, showFreeOnly])

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
    const model = models.find((m: OpenRouterModel) => m.id === selectedModel)
    if (!model) return selectedModel
    return model.id.split("/").pop() || model.id
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
            className="w-full"
          />
          <div className="flex items-center space-x-2">
            <Switch
              id="free-only"
              checked={showFreeOnly}
              onCheckedChange={setShowFreeOnly}
            />
            <Label htmlFor="free-only" className="text-sm">
              Show free models only
            </Label>
          </div>
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
                  {showFreeOnly ? "No free models found" : "No models found"}
                </div>
              ) : (
                <>
                  {filteredModels.slice(0, visibleCount).map((model: OpenRouterModel) => (
                    <DropdownMenuItem
                      key={model.id}
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
                            {model.id.split("/").pop()}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {model.id.split("/")[0]}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {model.context_length?.toLocaleString() || "N/A"}
                            </Badge>
                            {(() => {
                              try {
                                // Use bigDecimal for accurate pricing comparison
                                const promptPrice = parseFloat(new bigDecimal(model.pricing?.prompt || "0").getValue())
                                const completionPrice = parseFloat(new bigDecimal(model.pricing?.completion || "0").getValue())
                                
                                return promptPrice <= 0 && completionPrice <= 0 && (
                                  <Badge variant="secondary" className="text-xs px-1 py-0">
                                    Free
                                  </Badge>
                                )
                              } catch (error) {
                                // Fallback to regular parsing
                                const promptPrice = parseFloat(model.pricing?.prompt || "0")
                                const completionPrice = parseFloat(model.pricing?.completion || "0")
                                return promptPrice <= 0 && completionPrice <= 0 && (
                                  <Badge variant="secondary" className="text-xs px-1 py-0">
                                    Free
                                  </Badge>
                                )
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                      {(model.supported_parameters?.includes("include_reasoning") || 
                        model.supported_parameters?.includes("reasoning")) && (
                        <CloudIcon className="h-3 w-3 text-gray-400" aria-label="Supports reasoning" />
                      )}
                      {model.architecture?.input_modalities?.includes("image") && (
                        <EyeIcon className="h-3 w-3 text-gray-400" aria-label="Supports images" />
                      )}
                      {model.architecture?.input_modalities?.includes("file") && (
                        <FileIcon className="h-3 w-3 text-gray-400" aria-label="Supports files" />
                      )}
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
