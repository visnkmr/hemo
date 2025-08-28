"use client"

import React, { useState, useRef, type KeyboardEvent, useEffect } from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu"
import { Bot, SendIcon, XIcon, Loader2 } from "lucide-react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../components/ui/hover-card"
import ModelSelectionDialog from "./model-selection-dialog"
import LocalModelSelectionDialog from "./local-model-selection-dialog"
import GeminiModelSelectionDialog from "./gemini-model-selection-dialog"
import LMStudioURL from "./lmstudio-url"
import { cn } from "../lib/utils"

interface EditMessageModalProps {
  isOpen: boolean
  onClose: () => void
  messageContent: string
  onSave: (newContent: string) => void
  ollamastate: number
  setollamastate: (state: number) => void
  selectedModel: string
  handleSelectModel: (modelId: string) => void
  allModels: any[]
  geminiModels: any[]
  isLoadingModels: boolean
}

export default function EditMessageModal({
  isOpen,
  onClose,
  messageContent,
  onSave,
  ollamastate,
  setollamastate,
  selectedModel,
  handleSelectModel,
  allModels,
  geminiModels,
  isLoadingModels
}: EditMessageModalProps) {
  const [input, setInput] = useState(messageContent)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [vendor, setvendor] = useState("Openrouter")
  const [isLoading, setIsLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Update vendor name based on ollamastate
  useEffect(() => {
    switch (ollamastate) {
      case 0:
        setvendor("Openrouter")
        break
      case 1:
        setvendor("Ollama")
        break
      case 2:
        setvendor("LM Studio")
        break
      case 3:
        setvendor("FileGPT")
        break
      case 4:
        setvendor("Groq")
        break
      case 5:
        setvendor("Gemini")
        break
      default:
        break
    }
  }, [ollamastate])

  // Update input when messageContent changes (for initial load)
  useEffect(() => {
    setInput(messageContent)
  }, [messageContent])

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  const handleSave = async () => {
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    try {
      await onSave(input.trim())
      onClose()
    } catch (error) {
      console.error("Error updating message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setInput(messageContent) // Reset to original content
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-4xl max-h-[90vh] mx-4 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Edit Message
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4">
          {/* Provider Selection */}
          <div className="flex flex-row gap-4 w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Bot size={16} className="mr-2" />
                  {vendor}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setollamastate(0)}>
                  Openrouter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setollamastate(1)}>
                  Ollama
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setollamastate(2)}>
                  LM Studio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setollamastate(4)}>
                  Groq
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setollamastate(5)}>
                  Gemini
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Model Selection */}
            {ollamastate === 0 ? (
              <ModelSelectionDialog
                models={allModels}
                selectedModel={selectedModel}
                onSelectModel={handleSelectModel}
                isLoading={isLoadingModels}
              />
            ) : (ollamastate === 1 || ollamastate === 2) ? (
              <LocalModelSelectionDialog
                models={allModels}
                selectedModel={selectedModel}
                onSelectModel={handleSelectModel}
                isLoading={isLoadingModels}
              />
            ) : ollamastate === 4 ? (
              <LocalModelSelectionDialog
                models={allModels}
                selectedModel={selectedModel}
                onSelectModel={handleSelectModel}
                isLoading={isLoadingModels}
              />
            ) : ollamastate === 5 ? (
              <GeminiModelSelectionDialog
                models={geminiModels}
                selectedModel={selectedModel}
                onSelectModel={handleSelectModel}
                isLoading={isLoadingModels}
              />
            ) : null}
          </div>

          {/* Text Input Area */}
          <div className="flex flex-col flex-grow">
            <div className="flex flex-grow items-center gap-2">
              <div className="flex flex-col flex-grow">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder="Type your edited message..."
                  className={cn(
                    "flex-1 dark:bg-gray-800 border bg-gray-50 dark:bg-gray-800 min-h-[120px] max-h-[300px] resize-none",
                    isInputFocused ? "ring-2 ring-blue-500" : ""
                  )}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Hint Text */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Press Enter to save or Ctrl+Enter for new line
          </p>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!input.trim() || isLoading || input.trim() === messageContent}
            className="text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <SendIcon className="h-4 w-4 mr-2" />
                Save & Resend
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}