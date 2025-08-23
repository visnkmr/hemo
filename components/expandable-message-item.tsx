"use client"

import React, { useState, useRef, type KeyboardEvent, useEffect } from "react"
import { Textarea } from "../components/ui/textarea"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../components/ui/hover-card"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu"
import type { Message } from "../lib/types"
import { SendIcon, Loader2, Bot, FileIcon, ArrowDownAZ, MoveDown, Scroll, FileCheck, FileMinus, FileClock, BookX, File, FileStack, FilePlus, MessageSquareIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronRightIcon as ChevronRightIconCollapse, CopyIcon, GitBranchIcon, RefreshCw, Edit, Quote } from "lucide-react"
import { ScrollArea } from "../components/ui/scroll-area"

import { Markdown } from "./markdown"
import { Progress } from "../components/ui/progress"
import { cn } from "../lib/utils"

// Enhanced MessageItem with expand/collapse functionality
interface ExpandableMessageItemProps {
    message: Message
    isStreaming?: boolean
    onCopy: () => void
    onBranch: (branchType: 'full' | 'single' | 'model') => void
    setdsm: any
    setmts: any
    isExpanded: boolean
    onToggleExpand: () => void
    onEdit?: (messageId: string, newContent: string, editOllamaState?: number, editSelectedModel?: string) => void
    onQuoteMessage?: (message: Message) => void
    isQuoted?: boolean
    // Props for EditDialog
    ollamastate: number
    selectedModel: string
    selectedModelInfo: any
    allModels: any[]
    handleSelectModel: (modelId: string) => void
    isLoadingModels: boolean
    vendor: string
    setollamastate: any
    getModelColor: any
    getModelDisplayName: any
    answerfromfile: boolean
    setanswerfromfile: any
    sendwithhistory: boolean
    setsendwithhistory: any
    fullfileascontext: boolean
    setfullfileascontext: any
    morethanonefile: boolean
    searchcurrent: boolean
    setsearchcurrent: any
    contextUsage: number
    setcolorpertheme: string
  }

function ExpandableMessageItem({ message, isStreaming = false, onCopy, onBranch, setdsm, setmts, isExpanded, onToggleExpand, onEdit, onQuoteMessage, isQuoted = false, ollamastate, selectedModel, selectedModelInfo, allModels, handleSelectModel, isLoadingModels, vendor, setollamastate, getModelColor, getModelDisplayName, answerfromfile, setanswerfromfile, sendwithhistory, setsendwithhistory, fullfileascontext, setfullfileascontext, morethanonefile, searchcurrent, setsearchcurrent, contextUsage, setcolorpertheme }: ExpandableMessageItemProps) {
    const isUser = message.role === "user"
    const [showCursor, setShowCursor] = useState(true)
    const [isHovered, setIsHovered] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(message.content)
    const [editOllamaState, setEditOllamaState] = useState(ollamastate)
    const [editSelectedModel, setEditSelectedModel] = useState(selectedModel)
    const [isLoading, setIsLoading] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Handle keyboard shortcuts for editing
    const handleEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault()
        if (editContent.trim() && !isLoading) {
          const saveButton = document.querySelector(`[data-message-id="${message.id}"] .edit-save-btn`) as HTMLButtonElement
          if (saveButton) saveButton.click()
        }
      }
      if (e.key === "Escape") {
        setIsEditing(false)
      }
    }

  // Blinking cursor effect for streaming messages
  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 500)

    return () => clearInterval(interval)
  }, [isStreaming])

  const Resend = () => {
    setdsm(true)
    setmts(message.content)
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const shouldShowExpandButton = isUser && message.content.length > 100

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start", "max-w-[85vw] w-full")}>
        {/* Message Content OR Edit Form - Never both */}
        {isEditing ? (
          /* Edit Form - Completely replaces message bubble */
          <div
            className={cn(
              "gap-3 p-4 rounded-lg relative overflow-hidden w-full border-2 border-blue-300 dark:border-blue-600",
              isUser ? "bg-blue-50 dark:bg-blue-900/20 max-w-[70vw]" : "bg-gray-50 dark:bg-gray-800/50 max-w-full",
            )}
          >
            <div className="space-y-3 w-full">
              {/* Model Selection */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Bot size={14} className="mr-1" />
                      {editOllamaState === 0 ? "Openrouter" :
                       editOllamaState === 1 ? "Ollama" :
                       editOllamaState === 2 ? "LM Studio" :
                       editOllamaState === 4 ? "Groq" : "Openrouter"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setEditOllamaState(0)}>
                      Openrouter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditOllamaState(1)}>
                      Ollama
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditOllamaState(2)}>
                      LM Studio
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditOllamaState(4)}>
                      Groq
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {editOllamaState === 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="max-w-[200px]">
                        <span className="truncate">{editSelectedModel || "Select Model"}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-w-[300px]">
                      {allModels.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => setEditSelectedModel(model.id)}
                          className="text-sm"
                        >
                          {model.id}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Edit Textarea */}
              <div className="space-y-2">
                <Textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  placeholder="Edit your message... (Enter to save, Esc to cancel)"
                  className="min-h-[80px] dark:bg-gray-900 border bg-gray-50 w-full"
                  disabled={isLoading}
                />
                <Progress value={contextUsage} className="h-1" />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="edit-save-btn"
                  data-message-id={message.id}
                  onClick={async () => {
                    if (editContent.trim()) {
                      setIsLoading(true)
                      try {
                        if (onEdit) {
                          await onEdit(message.id, editContent.trim(), editOllamaState, editSelectedModel)
                        }
                        setIsEditing(false)
                      } catch (error) {
                        console.error('Edit error:', error)
                      } finally {
                        setIsLoading(false)
                      }
                    }
                  }}
                  disabled={isLoading || !editContent.trim()}
                >
                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <SendIcon className="h-3 w-3 mr-1" />}
                  Save & Send
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Message Content */
          <div
            className={cn(
              "gap-3 p-4 rounded-lg relative overflow-hidden w-full transition-all duration-200",
              isUser ? "bg-blue-50 dark:bg-blue-900/20 max-w-[70vw]" : "bg-gray-50 dark:bg-gray-800/50 max-w-full",
              isQuoted ? "ring-2 ring-green-400 dark:ring-green-500 bg-green-50 dark:bg-green-900/20" : ""
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {/* Expand/Collapse button for user messages */}
                {shouldShowExpandButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={onToggleExpand}
                  >
                    {isExpanded ? (
                      <ChevronDownIcon size={14} />
                    ) : (
                      <ChevronRightIconCollapse size={14} />
                    )}
                  </Button>
                )}

                <span className="font-medium">
                  {message.model && !isUser && (
                    <span className="text-xs ml-2 opacity-70">({getModelDisplayName(message.model)})</span>
                  )}
                </span>
              </div>

              <div className="prose dark:prose-invert prose-sm break-words w-full overflow-hidden">
                {message.imageUrl && (
                  <div className="mt-2">
                    <img src={message.imageUrl} alt="Generated image" className="rounded-lg max-w-full h-auto" />
                  </div>
                )}
                <div className="overflow-x-auto break-words hyphens-auto">
                  <Markdown>
                    {shouldShowExpandButton && !isExpanded
                      ? truncateText(message.content)
                      : message.content
                    }
                  </Markdown>
                </div>
                <span className={`animate-pulse ${isStreaming ? (showCursor ? "" : "invisible") : "hidden"}`}>▌</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Only show when not editing and not streaming */}
        {!isEditing && !isStreaming && (
          <div className={cn("flex gap-1 mt-2", isHovered ? "visible" : "invisible")}>
            {isUser && (
              <>
                <Button variant="ghost" size="icon" onClick={Resend} title="Resend message">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => {
                  setIsEditing(true)
                  setEditContent(message.content)
                  setEditOllamaState(ollamastate)
                  setEditSelectedModel(selectedModel)
                  // Focus textarea after state update
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.focus()
                      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length)
                    }
                  }, 100)
                }} title="Edit message">
                  <Edit className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={() => {
              // Set quoted message - this will be passed to parent
              if (onQuoteMessage) {
                onQuoteMessage(message)
              }
            }} title="Quote message">
              <Quote className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onCopy} title="Copy message">
              <CopyIcon className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Branch from here">
                  <GitBranchIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onBranch('full')}>
                  <GitBranchIcon className="h-4 w-4 mr-2" />
                  Full History Branch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBranch('single')}>
                  <MessageSquareIcon className="h-4 w-4 mr-2" />
                  Single Message Branch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBranch('model')}>
                  <Bot className="h-4 w-4 mr-2" />
                  New Query Branch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpandableMessageItem