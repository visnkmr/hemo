"use client"

import React, { useState, useRef, type KeyboardEvent, useEffect, useCallback } from "react"
import { Textarea } from "../components/ui/textarea"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../components/ui/hover-card"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu"
import type { Chat, Message, BranchPoint, FileItem } from "../lib/types"
import { SendIcon, Loader2, MenuIcon, Bot, FileIcon, ArrowDownAZ, MoveDown, Scroll, FileCheck, FileMinus, FileClock, BookX, File, FileStack, FilePlus, MessageSquareIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronRightIcon as ChevronRightIconCollapse, CopyIcon, GitBranchIcon, RefreshCw, Edit, Quote } from "lucide-react"
import { ScrollArea } from "../components/ui/scroll-area"

import MessageItem from "../components/message-item"
import { Markdown } from "./markdown"
import { Progress } from "../components/ui/progress"
import LMStudioURL from "./lmstudio-url"
import QuestionsSidebar from "./questions-sidebar"
import ModelSelectionDialog from "./model-selection-dialog"
import { useIsMobile } from "../hooks/use-mobile"
// import axios from "axios"
// import { invoke } from "@tauri-apps/api/tauri";
import { Label } from "./ui/label"
import { cn } from "@/lib/utils"
// import { FileUploader } from "./fileupoader"
// --- Type Definitions ---
export let setcolorpertheme = "bg-white dark:bg-gray-800"

// Enhanced MessageItem with expand/collapse functionality
interface ExpandableMessageItemProps {
    message: Message
    isStreaming?: boolean
    onCopy: () => void
    onBranch: () => void
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
            <Button variant="ghost" size="icon" onClick={onBranch} title="Branch from here">
              <GitBranchIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Edit Dialog Component
interface EditDialogProps {
   isOpen: boolean
   onClose: () => void
   message: Message
   onSave: (messageId: string, newContent: string) => void
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

function EditDialog({
   isOpen,
   onClose,
   message,
   onSave,
   ollamastate,
   selectedModel,
   selectedModelInfo,
   allModels,
   handleSelectModel,
   isLoadingModels,
   vendor,
   setollamastate,
   getModelColor,
   getModelDisplayName,
   answerfromfile,
   setanswerfromfile,
   sendwithhistory,
   setsendwithhistory,
   fullfileascontext,
   setfullfileascontext,
   morethanonefile,
   searchcurrent,
   setsearchcurrent,
   contextUsage,
   setcolorpertheme
}: EditDialogProps) {
   const [editContent, setEditContent] = useState(message.content)
   const [isLoading, setIsLoading] = useState(false)
   const textareaRef = useRef<HTMLTextAreaElement>(null)

   useEffect(() => {
     if (isOpen && textareaRef.current) {
       textareaRef.current.focus()
       textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length)
     }
   }, [isOpen])

   const handleSave = () => {
     if (editContent.trim()) {
       onSave(message.id, editContent.trim())
       onClose()
     }
   }

   const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
     if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
       e.preventDefault()
       handleSave()
     }
     if (e.key === "Escape") {
       onClose()
     }
   }

   if (!isOpen) return null

   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
         <div className="p-6">
           <h2 className="text-lg font-semibold mb-4 dark:text-white">Edit Message</h2>

           {/* Original Message Display */}
           <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
             <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Original message:</div>
             <div className="text-gray-700 dark:text-gray-300">{message.content}</div>
           </div>

           {/* Edit Input */}
           <div className="mb-4">
             <Textarea
               ref={textareaRef}
               value={editContent}
               onChange={(e) => setEditContent(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Edit your message... (Enter to save, Esc to cancel)"
               className="min-h-[120px] dark:bg-gray-900 border bg-gray-50"
               disabled={isLoading}
             />
             <Progress value={contextUsage} className="h-1 mt-2" />
           </div>

           {/* Options Row - Mimic the query box */}
           <div className="mb-4 flex flex-row gap-4 w-full flex-wrap">
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
               </DropdownMenuContent>
             </DropdownMenu>

             {ollamastate === 0 && (
               <ModelSelectionDialog
                 models={allModels}
                 selectedModel={selectedModel}
                 onSelectModel={handleSelectModel}
                 isLoading={isLoadingModels}
               />
             )}

             {answerfromfile && (
               <HoverCard>
                 <HoverCardTrigger>
                   <Button
                     variant="outline"
                     size="icon"
                     onClick={() => setfullfileascontext(!fullfileascontext)}
                   >
                     {fullfileascontext ? (<FileCheck className="h-4 w-4" />) : (<FileMinus className="h-4 w-4" />)}
                   </Button>
                 </HoverCardTrigger>
                 <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                   {fullfileascontext ? "Full file contents will be passed as context" : "Embeddings will be passed as context"}
                 </HoverCardContent>
               </HoverCard>
             )}

             <HoverCard>
               <HoverCardTrigger>
                 <Button
                   variant="outline"
                   size="icon"
                   onClick={() => setsendwithhistory(!sendwithhistory)}
                 >
                   {sendwithhistory ? (<FileClock className="h-4 w-4" />) : (<BookX className="h-4 w-4" />)}
                 </Button>
               </HoverCardTrigger>
               <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                 {sendwithhistory ? "Full chat history will be passed as context" : "Ignore chat history"}
               </HoverCardContent>
             </HoverCard>

             {morethanonefile && (
               <HoverCard>
                 <HoverCardTrigger>
                   <Button
                     variant="outline"
                     size="icon"
                     onClick={() => setsearchcurrent(!searchcurrent)}
                   >
                     {searchcurrent ? (<File className="h-4 w-4" />) : (<FileStack className="h-4 w-4" />)}
                   </Button>
                 </HoverCardTrigger>
                 <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                   {searchcurrent ? "Search current file" : "Search all the files"}
                 </HoverCardContent>
               </HoverCard>
             )}

             <HoverCard>
               <HoverCardTrigger>
                 <Button
                   variant="outline"
                   size="icon"
                   onClick={() => setanswerfromfile(!answerfromfile)}
                 >
                   {answerfromfile ? (<FilePlus className="h-4 w-4" />) : (<FileMinus className="h-4 w-4" />)}
                 </Button>
               </HoverCardTrigger>
               <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                 {answerfromfile ? "answer from file" : "Answer without context"}
               </HoverCardContent>
             </HoverCard>
           </div>

           {/* Action Buttons */}
           <div className="flex justify-end gap-2">
             <Button variant="outline" onClick={onClose}>
               Cancel
             </Button>
             <Button onClick={handleSave} disabled={isLoading || !editContent.trim()}>
               {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
               Save & Send
             </Button>
           </div>
         </div>
       </div>
     </div>
   )
}

// Helper function to get a display name from model ID
function getModelDisplayName(modelId: string): string {
   // Extract the model name from the provider/model format
   const parts = modelId.split("/")
   return parts.length > 1 ? parts[1] : modelId
 }

// Question Group Component for Grok-style scrollable answers
interface QuestionGroupProps {
    question: Message
    answers: Message[]
    onCopy: (content: string) => void
    onBranch: (messageId: string) => void
    setdsm: any
    setmts: any
    isStreaming?: boolean
    streamingMessageId?: string | null
    isQuestionExpanded: boolean
    onToggleQuestionExpand: () => void
    currentAnswerIndex: number
    onAnswerIndexChange: (index: number) => void
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

function QuestionGroup({ question, answers, onCopy, onBranch, setdsm, setmts, isStreaming, streamingMessageId, isQuestionExpanded, onToggleQuestionExpand, currentAnswerIndex, onAnswerIndexChange, onEdit, onQuoteMessage, isQuoted = false, ollamastate, selectedModel, selectedModelInfo, allModels, handleSelectModel, isLoadingModels, vendor, setollamastate, getModelColor, getModelDisplayName, answerfromfile, setanswerfromfile, sendwithhistory, setsendwithhistory, fullfileascontext, setfullfileascontext, morethanonefile, searchcurrent, setsearchcurrent, contextUsage, setcolorpertheme }: QuestionGroupProps) {
  const handlePrevious = () => {
    const newIndex = Math.max(0, currentAnswerIndex - 1)
    onAnswerIndexChange(newIndex)
  }

  const handleNext = () => {
    const newIndex = Math.min(answers.length - 1, currentAnswerIndex + 1)
    onAnswerIndexChange(newIndex)
  }

  const handleDotClick = (index: number) => {
    onAnswerIndexChange(index)
  }

  const currentAnswer = answers[currentAnswerIndex]

  // Auto-switch to latest answer when streaming
  useEffect(() => {
    if (isStreaming && streamingMessageId) {
      const streamingAnswerIndex = answers.findIndex(answer => answer.id === streamingMessageId)
      if (streamingAnswerIndex !== -1 && streamingAnswerIndex !== currentAnswerIndex) {
        onAnswerIndexChange(streamingAnswerIndex)
      }
    }
  }, [isStreaming, streamingMessageId, answers, currentAnswerIndex, onAnswerIndexChange])

  return (
    <div className="w-full space-y-4">
      {/* Question with expand/collapse */}
      <ExpandableMessageItem
        message={question}
        onCopy={() => onCopy(question.content)}
        onBranch={() => onBranch(question.id)}
        setdsm={setdsm}
        setmts={setmts}
        isExpanded={isQuestionExpanded}
        onToggleExpand={onToggleQuestionExpand}
        onEdit={onEdit}
        onQuoteMessage={onQuoteMessage}
        isQuoted={isQuoted}
        ollamastate={ollamastate}
        selectedModel={selectedModel}
        selectedModelInfo={selectedModelInfo}
        allModels={allModels}
        handleSelectModel={handleSelectModel}
        isLoadingModels={isLoadingModels}
        vendor={vendor}
        setollamastate={setollamastate}
        getModelColor={getModelColor}
        getModelDisplayName={getModelDisplayName}
        answerfromfile={answerfromfile}
        setanswerfromfile={setanswerfromfile}
        sendwithhistory={sendwithhistory}
        setsendwithhistory={setsendwithhistory}
        fullfileascontext={fullfileascontext}
        setfullfileascontext={setfullfileascontext}
        morethanonefile={morethanonefile}
        searchcurrent={searchcurrent}
        setsearchcurrent={setsearchcurrent}
        contextUsage={contextUsage}
        setcolorpertheme={setcolorpertheme}
      />

      {/* Answer Group with Navigation */}
      <div className="w-full">
        {/* Answer Counter and Navigation */}
        <div className="flex items-center justify-between mb-2 px-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Answer {currentAnswerIndex + 1} of {answers.length}
          </div>

          {answers.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                disabled={currentAnswerIndex === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeftIcon size={16} />
              </Button>

              {/* Dot indicators */}
              <div className="flex gap-1">
                {answers.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleDotClick(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${index === currentAnswerIndex
                      ? 'bg-blue-500'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                      }`}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                disabled={currentAnswerIndex === answers.length - 1}
                className="h-8 w-8 p-0"
              >
                <ChevronRightIcon size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* Current Answer */}
        <div className="relative">
          <MessageItem
            message={currentAnswer}
            isStreaming={isStreaming && streamingMessageId === currentAnswer.id}
            onCopy={() => onCopy(currentAnswer.content)}
            onBranch={() => onBranch(currentAnswer.id)}
            setdsm={setdsm}
            setmts={setmts}
          />

          {/* Multiple answers indicator */}
          {answers.length > 1 && (
            <div className="absolute top-2 right-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
              {answers.length} answers
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
interface SendMessageStreamParams {
  notollama: number;
  url: string;
  // apiKey: number;
  model: string;
  messages: Array<{ role: string; content: string }>;
  lmstudio_url: string;
  context: string
}

interface ChatInterfaceProps {
  setlmurl: any;
  setlmmodel: any;
  ollamastate: number;
  chat: Chat;
  updateChat: (chat: Chat) => void;
  // apiKey: string;
  selectedModel: string; // Keep selectedModel for overall component state
  selectedModelInfo: any;
  onBranchConversation: (branchPoint: BranchPoint) => void;
  lmstudio_url: string;
  lmstudio_model_name: string;
  filegpt_url: string;
  message?: FileItem;
  directsendmessage?: boolean;
  messagetosend?: string;
  sidebarVisible: any;
  setSidebarVisible: any;
  getModelColor: any;
  getModelDisplayName: any;
  setollamastate: any;
  allModels: any[];
  handleSelectModel: (modelId: string) => void;
  isLoadingModels: boolean;
}

// async function fileloader(setIsLoading,chat: Chat,updateChat: (chat: Chat) => void,ollamastate: number,selectedModel: string,lmstudio_model_name: string,filegptendpoint:string,filePaths:string[]):Promise<boolean>{
//   // try{

//   //   const response = await axios.post(`${filegptendpoint}/embed`, { files: filePaths.map((r)=>r.replace("C:\\","\\mnt\\c\\")) });
//   //   if(response.status==200) return true
//   // }
//   // catch(e){
//   //   console.log(e)
//   // }
//   setIsLoading(true)
//   console.log(filePaths)
//   invoke("embedfile",{path:filePaths,embeddingmodelname:"nomic-embed-text"}).then((e)=>{
//             console.log(e)
//             // Prepare user and assistant messages
//               const assistantMessageId = (Date.now() + 1).toString();
//               const assistantMessage: Message = {
//                 id: assistantMessageId,
//                 role: "assistant",
//                 content:  `File: ${filePaths} added to context`,
//                 timestamp: new Date().toISOString(),
//                 model:  ollamastate==0 ? selectedModel : lmstudio_model_name,
//               };


//               const initialMessages = chat.messages;
//               let currentChatState = {
//                   ...chat,
//                   messages: [...initialMessages, assistantMessage],
//                   title: initialMessages.length === 0 ? `FileGPT: ${filePaths} ` : chat.title,
//                   lastModelUsed:  ollamastate==0 ? selectedModel : lmstudio_model_name,
//               };
//               updateChat(currentChatState);
//         })
//         .catch((e)=>{
//           const assistantMessageId = (Date.now() + 1).toString();
//               const assistantMessage: Message = {
//                 id: assistantMessageId,
//                 role: "assistant",
//                 content:  `Faled to add File: ${filePaths}`,
//                 timestamp: new Date().toISOString(),
//                 model:  ollamastate==0 ? selectedModel : lmstudio_model_name,
//               };


//               const initialMessages = chat.messages;
//               let currentChatState = {
//                   ...chat,
//                   messages: [...initialMessages, assistantMessage],
//                   title: initialMessages.length === 0 ? `FileGPT: ${filePaths} ` : chat.title,
//                   lastModelUsed:  ollamastate==0 ? selectedModel : lmstudio_model_name,
//               };
//               updateChat(currentChatState);
//               setIsLoading(false)
//         })

//         .finally(()=>{
//           setIsLoading(false)
//         })
//         setIsLoading(false)
//   return false      
// }

// --- Exported Send Message Stream Function ---

/**
 * Sends messages to a chat completion API and yields content chunks as an async generator.
 *
 * @param params - The parameters for the API call.
 * @returns An async generator yielding content chunks.
 * @throws An error if the API call fails or the response body is null.
 */
export async function* sendMessageStream({
  notollama,
  url,
  // apiKey,
  model,
  messages,
  lmstudio_url,
  context
}: SendMessageStreamParams): AsyncGenerator<string, void, unknown> {
  const storedApiKey = localStorage.getItem(notollama == 4 ? "groq_api_key" : "openrouter_api_key")
  console.log(storedApiKey)
  console.log("========" + notollama)
  // const or_mi=localStorage.getItem("or_model_info")
  let modelname
  switch (notollama) {
    case 0:
      modelname = localStorage.getItem("or_model")
      break;
    case 1:
      modelname = localStorage.getItem("lmstudio_model_name")
      break;
    case 2:
      modelname = localStorage.getItem("lmstudio_model_name")
      break;
    case 3:
      modelname = ""
      break;
    case 4:
      modelname = localStorage.getItem("groq_model_name")
      break;
  }
  // const modelname = notollama==0?model:
  console.log(modelname)

  let prompt = context.trim() === "" ? `Given the following chathistory, answer the question accurately and concisely. \n\nChat History:\n${messages.slice(0, messages.length - 1).map(m => m.content).join('\n')}\n\nQuestion: ${messages[messages.length - 1].content}` : `Given the following chathistory, context, answer the question accurately and concisely. If the answer is not in the context, state that you cannot answer from the provided information.\n\nChat History:\n${messages.slice(0, messages.length - 1).map(m => m.content).join('\n')}\n\nContext: ${context}\n\nQuestion: ${messages[messages.length - 1].content}`;
  console.log(prompt)
  let headers_openrouter = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${storedApiKey}`,
    "HTTP-Referer": typeof window !== "undefined" ? window.location.href : "",
    "X-Title": "Batu",
  };
  let headers_ollama = { 'Content-Type': 'application/json' };
  // if (notollama===0 || notollama===2) {
  const response = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: (notollama === 0 || notollama === 2 || notollama === 4) ? headers_openrouter : headers_ollama,
    body: JSON.stringify({
      model: modelname,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    let errorMessage = errorData || "Failed to get response";
    try {
      const jsonError = JSON.parse(errorData);
      errorMessage = jsonError.error?.message || errorMessage;
    } catch {
      // Ignore if parsing fails, use the raw text
    }
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => line.replace(/^data: /, "").trim());

    for (const line of lines) {
      if (line === "[DONE]") continue;

      try {
        const parsedLine = JSON.parse(line);
        const content = parsedLine.choices[0]?.delta?.content || "";
        if (content) {
          yield content; // Yield each content chunk
        }
      } catch (e) {
        console.warn("Failed to parse stream line:", line, e);
      }
    }
  }
  // }
  // else{
  //     const requestBody = {
  //         "model": model,
  //         "messages": messages,
  //         "stream": true // Ensure streaming is enabled
  //     };

  //     const response = await fetch(`${lmstudio_url}/v1/chat/completions`, {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify(requestBody)
  //     })
  //     if (!response.ok) {
  //       const errorData = await response.text();
  //       let errorMessage = errorData || "Failed to get response";
  //       try {
  //         const jsonError = JSON.parse(errorData);
  //         errorMessage = jsonError.error?.message || errorMessage;
  //       } catch {
  //         // Ignore if parsing fails, use the raw text
  //       }
  //       throw new Error(errorMessage);
  //     }

  //     if (!response.body) {
  //       throw new Error("Response body is null");
  //     }

  //     const reader = response.body.getReader();
  //     const decoder = new TextDecoder("utf-8");

  //     while (true) {
  //       const { done, value } = await reader.read();
  //       if (done) break;

  //       const chunk = decoder.decode(value);
  //       const lines = chunk
  //         .split("\n")
  //         .filter((line) => line.trim() !== "")
  //         .map((line) => line.replace(/^data: /, "").trim());

  //       for (const line of lines) {
  //         if (line === "[DONE]") continue;

  //         try {
  //           const parsedLine = JSON.parse(line);
  //           const content = parsedLine.choices[0]?.delta?.content || "";
  //           if (content) {
  //             yield content; // Yield each content chunk
  //           }
  //         } catch (e) {
  //           console.warn("Failed to parse stream line:", line, e);
  //         }
  //       }
  //     }

  // }

}


// --- Exported Chat Interface Component ---

export default function ChatInterface({
  ollamastate,
  chat,
  updateChat,
  // apiKey,
  lmstudio_url,
  setlmmodel,
  setlmurl,
  lmstudio_model_name,
  filegpt_url,
  message,
  selectedModel,
  selectedModelInfo,
  onBranchConversation,
  directsendmessage = false,
  messagetosend = "",

  sidebarVisible,
  setSidebarVisible,
  getModelDisplayName,
  getModelColor,
  setollamastate,
  allModels,
  handleSelectModel,
  isLoadingModels
}: ChatInterfaceProps) {
  // const [filePaths, setFilePaths] = useState([message?message.path:""]);

  const [input, setInput] = useState("")
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [dsm, setdsm] = useState(directsendmessage)
  const [mts, setmts] = useState(messagetosend)
  const [error, setError] = useState<string | null>(null)
  const [quotedMessages, setQuotedMessages] = useState<Message[]>([])
  // Inline error message to append to chat when API calls fail
  const [pendingErrorMessage, setPendingErrorMessage] = useState<string | null>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string[]>([message?.path ? message.path : ""])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [contextUsage, setContextUsage] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);
  const [answerfromfile, setanswerfromfile] = useState(false)

  // Calculate context usage effect
  useEffect(() => {
    const totalChars = chat.messages.reduce((acc, msg) => acc + msg.content.length, 0) + input.length
    const estimatedTokens = Math.ceil(totalChars / 4)
    const maxContext = selectedModelInfo?.context_length || 4096
    const usagePercentage = Math.min(100, Math.ceil((estimatedTokens / maxContext) * 100))
    setContextUsage(usagePercentage)
  }, [chat.messages, input, selectedModelInfo])

  // useEffect(()=>{
  //   invoke("fileslist",{}).then((filePaths)=>{
  //           console.log(filePaths)
  //           // Prepare user and assistant messages
  //             const assistantMessageId = (Date.now() + 1).toString();
  //             const assistantMessage: Message = {
  //               id: assistantMessageId,
  //               role: "assistant",
  //               content:  `File: ${filePaths} added to context`,
  //               timestamp: new Date().toISOString(),
  //               model:  ollamastate==0 ? selectedModel : lmstudio_model_name,
  //             };


  //             const initialMessages = chat.messages;
  //             let currentChatState = {
  //                 ...chat,
  //                 messages: [...initialMessages, assistantMessage],
  //                 title: initialMessages.length === 0 ? `FileGPT: ${filePaths} ` : chat.title,
  //                 lastModelUsed:  ollamastate==0 ? selectedModel : lmstudio_model_name,
  //             };
  //             updateChat(currentChatState);
  //       })
  // },[])
  useEffect(() => {
    if (message?.path) {
      setSelectedFilePath([...message.path])
      // setFilePaths([message.path])
      // fileloader(setIsLoading,chat,updateChat,ollamastate,selectedModel,lmstudio_model_name,filegpt_url,selectedFilePath)
    }
  }, [message])

  // const [context,setcontext]=useState("")

  // State for dialog to request URL and model name
  const [showDialog, setShowDialog] = useState(false);
  // const [tempUrl, setTempUrl] = useState(lmstudio_url);
  // const [tempModelName, setTempModelName] = useState(lmstudio_model_name);

  // Main function to handle sending a message
  const handleSendMessage = async (messageContent: string = input) => {
    if (!messageContent.trim() || isLoading) return;

    setError(null);

    // Check if using LM Studio or Ollama and if URL and model are provided
    if (ollamastate === 1 || ollamastate === 2) {
      if (!lmstudio_url || !lmstudio_model_name) {
        setShowDialog(true);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    if (messageContent === input) {
      setInput(""); // Clear input only if sending from text area
    }

    // Include quoted messages if they exist
    let finalMessageContent = messageContent
    if (quotedMessages.length > 0) {
      const quotes = quotedMessages.map(msg => {
        const quotePrefix = msg.role === 'user' ? 'User' : 'Assistant'
        const quotedText = msg.content.length > 100
          ? msg.content.substring(0, 100) + "..."
          : msg.content
        return `> ${quotePrefix}: ${quotedText}`
      }).join('\n')
      finalMessageContent = `${quotes}\n\n${messageContent}`
      setQuotedMessages([]) // Clear quoted messages after using them
    }

    // Prepare user and assistant messages
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: finalMessageContent,
      timestamp: new Date().toISOString(),
      model: ollamastate == 0 ? selectedModel : lmstudio_model_name,
    };
    // If there is a leftover pending error message from a previous failure, flush it into the chat
    if (pendingErrorMessage) {
      const errorAsAssistant: Message = {
        id: (Date.now() + 0.5).toString(),
        role: "assistant",
        content: pendingErrorMessage,
        timestamp: new Date().toISOString(),
        model: ollamastate == 0 ? selectedModel : lmstudio_model_name,
      }
      const flushed = {
        ...chat,
        messages: [...chat.messages, errorAsAssistant],
        lastModelUsed: ollamastate == 0 ? selectedModel : lmstudio_model_name,
      }
      updateChat(flushed)
      setPendingErrorMessage(null)
    }
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      model: ollamastate == 0 ? selectedModel : lmstudio_model_name,
    };

    setStreamingMessageId(assistantMessageId);

    const initialMessages = chat.messages;
    // Update chat with user message & placeholder
    let currentChatState = {
      ...chat,
      messages: [...initialMessages, userMessage, assistantMessage],
      title: initialMessages.length === 0 ? messageContent.slice(0, 30) : chat.title,
      lastModelUsed: ollamastate == 0 ? selectedModel : lmstudio_model_name,
    };
    updateChat(currentChatState);

    // Scroll to bottom if we were already at the bottom when starting to stream
    if (isAtBottom) {
      setTimeout(scrolltobottom, 100);
    }



    // Call the generator and process the stream
    if (ollamastate !== 3) {
      try {
        // Determine API URL and model
        let apiUrl = "";
        if (ollamastate === 0) {
          apiUrl = "https://openrouter.ai/api";
        } else if (ollamastate === 4) {
          apiUrl = "https://api.groq.com/openai";
        } else if (ollamastate === 1 || ollamastate === 2) {
          apiUrl = lmstudio_url;
        } else if (ollamastate === 3) {
          apiUrl = filegpt_url;
        }
        const modelToSend = ollamastate == 0 ? selectedModel : lmstudio_model_name;
        const messagesToSend = [...initialMessages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
        //  const stored_lm_model_name = localStorage.getItem("lmstudio_model_name")
        let accumulatedContent = "";
        let context = ""
        // const context=answerfromfile?(await invoke("queryfile",{question:JSON.stringify(messagesToSend[messagesToSend.length-1].content),
        //  model:stored_lm_model_name?stored_lm_model_name:"qwen2.5:3b",
        //  embeddingmodelname:"nomic-embed-text",
        //  usecompletefile:fullfileascontext,
        //  pathstr: searchcurrent?(await(await import('@tauri-apps/api/window')).appWindow.title()).replace("FileGPT: ",""):"ALL"
        // }).catch(e=>console.log(e)) as string):""; 
        // console.log(`----------context: ${context}`)

        for await (const contentChunk of sendMessageStream({
          url: apiUrl,
          notollama: ollamastate,
          // apiKey: ollamastate,
          model: modelToSend,
          messages: sendwithhistory ? messagesToSend : [messagesToSend[messagesToSend.length - 1]],
          lmstudio_url: lmstudio_url,
          context: answerfromfile ? context : ""
        })) {
          accumulatedContent += contentChunk;

          // Update the last message (assistant's) with new content
          const updatedMessages = [...currentChatState.messages];
          updatedMessages[updatedMessages.length - 1] = {
            ...updatedMessages[updatedMessages.length - 1],
            content: accumulatedContent,
          };

          currentChatState = {
            ...currentChatState,
            messages: updatedMessages,
          };
          updateChat(currentChatState); // Update UI
        }
      } catch (err) {
        console.error("Error sending message:", err);
        const errMsg = err instanceof Error ? err.message : "An error occurred";
        setError(errMsg);
        // Replace the assistant placeholder with an inline error message in the message stream
        const errorAssistantMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: `Error: ${errMsg}`,
          timestamp: new Date().toISOString(),
          model: ollamastate == 0 ? selectedModel : lmstudio_model_name,
        };
        updateChat({
          ...chat,
          messages: [...initialMessages, userMessage, errorAssistantMessage],
          lastModelUsed: ollamastate == 0 ? selectedModel : lmstudio_model_name,
        });
        // In case UI batching prevents immediate update, keep a pending copy to flush on next send
        setPendingErrorMessage(`Error: ${errMsg}`);
      } finally {
        setIsLoading(false);
        setStreamingMessageId(null);
      }
    }
    else {
      const messagesToSend = [...initialMessages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
      // const stored_lm_model_name = localStorage.getItem("lmstudio_model_name")
      //   invoke("queryfile",{question:JSON.stringify(messagesToSend[messagesToSend.length-1].content),
      //      model:stored_lm_model_name?stored_lm_model_name:"qwen2.5:3b",
      //      embeddingmodelname:"nomic-embed-text",
      //      usecompletefile:fullfileascontext,
      //      pathstr: searchcurrent?(await(await import('@tauri-apps/api/window')).appWindow.title()).replace("FileGPT: ",""):"ALL"
      //     }).then((e)=>{
      //     // console.log(e)
      //      // Update the last message (assistant's) with new content
      //       const updatedMessages = [...currentChatState.messages];
      //       updatedMessages[updatedMessages.length - 1] = {
      //           ...updatedMessages[updatedMessages.length - 1],
      //           content: e as string,
      //       };

      //       currentChatState = {
      //           ...currentChatState,
      //           messages: updatedMessages,
      //       };
      //       updateChat(currentChatState); // Update UI
      //       setIsLoading(false);
      //       setStreamingMessageId(null);
      // //     setlocalip(
      // //         <>
      // //             <p className="font-semibold">Ollama should be running @ http://{e}:11434.</p>
      // //             <p className="font-semibold"><Link target="_blank" href="https://github.com/visnkmr/filegpt-filedime">FiledimeGPT python server</Link> if installed should be running @ http://{e}:8694.</p>
      // //             <p className="font-semibold">FiledimeGPT LAN local instance is accessible @ http://{e}:8477 for any device on your connected network.</p>
      // //         </>
      // // );
      // }).catch((e)=>{
      //   const updatedMessages = [...currentChatState.messages];
      //       updatedMessages[updatedMessages.length - 1] = {
      //           ...updatedMessages[updatedMessages.length - 1],
      //           content: e as string,
      //       };

      //       currentChatState = {
      //           ...currentChatState,
      //           messages: updatedMessages,
      //       };
      //       updateChat(currentChatState); // Update UI
      // })
      setIsLoading(false);
      setStreamingMessageId(null);
    }


  };

  // Effect for direct message sending
  useEffect(() => {
    if (dsm && mts && !isLoading) {
      handleSendMessage(mts);
      setdsm(false)
      setmts("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsm, mts, isLoading]); // Dependencies added

  // --- Other Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // Add toast logic here if needed
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const getQuestionKey = (question: Message) => {
    return question.content.toLowerCase().trim();
  };

  const handleAnswerIndexChange = (questionKey: string, newIndex: number) => {
    setQuestionGroupAnswerIndices(prev => {
      const newMap = new Map(prev);
      newMap.set(questionKey, newIndex);
      return newMap;
    });
  };

  const handleBranchFromMessage = (messageId: string) => {
    const messageIndex = chat.messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex >= 0) {
      const branchPoint: BranchPoint = {
        originalChatId: chat.id,
        messages: chat.messages.slice(0, messageIndex + 1),
        branchedFromMessageId: messageId,
        timestamp: new Date().toISOString(),
      };
      onBranchConversation(branchPoint);
    }
  };

  const handleQuoteMessage = (message: Message) => {
    // Allow quoting all messages (both user and assistant)
    // Check if already quoted, if so remove it, otherwise add it
    const isAlreadyQuoted = quotedMessages.some(q => q.id === message.id)
    if (isAlreadyQuoted) {
      setQuotedMessages(quotedMessages.filter(q => q.id !== message.id))
    } else {
      setQuotedMessages([...quotedMessages, message])
    }

    // Focus the input when quoting
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder*="Type a message"]') as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
      }
    }, 100)
  }

  const handleEditMessage = async (messageId: string, newContent: string, editOllamaState?: number, editSelectedModel?: string) => {
    if (!newContent.trim()) return;

    // Use provided edit state or fall back to global state
    const currentOllamaState = editOllamaState ?? ollamastate;
    const currentSelectedModel = editSelectedModel ?? selectedModel;

    // Find the message to edit
    const messageIndex = chat.messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex === -1) return;

    const originalMessage = chat.messages[messageIndex];
    if (originalMessage.role !== 'user') return;

    // Find the next assistant message (the response to edit)
    const assistantMessageIndex = messageIndex + 1;
    const hasAssistantResponse = assistantMessageIndex < chat.messages.length &&
                                chat.messages[assistantMessageIndex].role === 'assistant';

    // Create updated messages array
    const updatedMessages = [...chat.messages];

    // Update the user message
    updatedMessages[messageIndex] = {
      ...originalMessage,
      content: newContent.trim(),
      timestamp: new Date().toISOString(),
    };

    // Remove the old assistant response if it exists
    if (hasAssistantResponse) {
      updatedMessages.splice(assistantMessageIndex, 1);
    }

    // Update the chat state
    let updatedChat = {
      ...chat,
      messages: updatedMessages,
      lastModelUsed: currentOllamaState == 0 ? currentSelectedModel : lmstudio_model_name,
    };

    updateChat(updatedChat);

    // Create a new assistant message for the response
    const newAssistantMessageId = (Date.now() + 1).toString();
    const newAssistantMessage: Message = {
      id: newAssistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      model: currentOllamaState == 0 ? currentSelectedModel : lmstudio_model_name,
    };

    // Add the new assistant message
    updatedChat = {
      ...updatedChat,
      messages: [...updatedMessages, newAssistantMessage],
    };

    updateChat(updatedChat);
    setStreamingMessageId(newAssistantMessageId);

    // Scroll to bottom if we were already at the bottom when starting to stream
    if (isAtBottom) {
      setTimeout(scrolltobottom, 100);
    }

    // Call the API with the edited message
    try {
      let apiUrl = "";
      if (currentOllamaState === 0) {
        apiUrl = "https://openrouter.ai/api";
      } else if (currentOllamaState === 4) {
        apiUrl = "https://api.groq.com/openai";
      } else if (currentOllamaState === 1 || currentOllamaState === 2) {
        apiUrl = lmstudio_url;
      }

      const modelToSend = currentOllamaState == 0 ? currentSelectedModel : lmstudio_model_name;
      const messagesToSend = updatedMessages.slice(0, -1).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      let accumulatedContent = "";
      let context = "";

      for await (const contentChunk of sendMessageStream({
        url: apiUrl,
        notollama: currentOllamaState,
        model: modelToSend,
        messages: sendwithhistory ? messagesToSend : [messagesToSend[messagesToSend.length - 1]],
        lmstudio_url: lmstudio_url,
        context: answerfromfile ? context : ""
      })) {
        accumulatedContent += contentChunk;

        // Update the last message (assistant's) with new content
        const currentMessages = [...updatedChat.messages];
        currentMessages[currentMessages.length - 1] = {
          ...currentMessages[currentMessages.length - 1],
          content: accumulatedContent,
        };

        updatedChat = {
          ...updatedChat,
          messages: currentMessages,
        };
        updateChat(updatedChat);
      }
    } catch (err) {
      console.error("Error sending edited message:", err);
      const errMsg = err instanceof Error ? err.message : "An error occurred";

      // Replace the assistant placeholder with an error message
      const currentMessages = [...updatedChat.messages];
      currentMessages[currentMessages.length - 1] = {
        ...currentMessages[currentMessages.length - 1],
        content: `Error: ${errMsg}`,
      };

      updateChat({
        ...updatedChat,
        messages: currentMessages,
      });
    } finally {
      setStreamingMessageId(null);
    }
  };

  const generateImage = async (prompt: string) => {
    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
      timestamp: new Date().toISOString(),
      model: selectedModel,
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      model: selectedModel,
    };

    setStreamingMessageId(assistantMessageId);

    const initialMessages = chat.messages;
    let currentChatState = {
      ...chat,
      messages: [...initialMessages, userMessage, assistantMessage],
      title: initialMessages.length === 0 ? prompt.slice(0, 30) : chat.title,
      lastModelUsed: selectedModel,
    };
    updateChat(currentChatState);

    // Scroll to bottom if we were already at the bottom when starting to stream
    if (isAtBottom) {
      setTimeout(scrolltobottom, 100);
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("openrouter_api_key")}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          n: 1,
          size: "512x512",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const data = await response.json();
      const imageUrl = data.data[0].url;

      const updatedMessages = [...currentChatState.messages];
      updatedMessages[updatedMessages.length - 1] = {
        ...updatedMessages[updatedMessages.length - 1],
        content: `Image generated for prompt: ${prompt}`,
        imageUrl: imageUrl,
      };

      currentChatState = {
        ...currentChatState,
        messages: updatedMessages,
      };
      updateChat(currentChatState);
    } catch (err) {
      console.error("Error generating image:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      updateChat({
        ...chat,
        messages: [...initialMessages, userMessage],
      });
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
    }
  };

  // Function to handle dialog submission
  const handleDialogSubmit = () => {
    if (lmstudio_model_name && lmstudio_url) {
      setShowDialog(false);
      // Trigger sending the message again with updated values
      handleSendMessage();
    } else {
      // Do not use a blocking dialog; surface inline among messages
      const errorAssistantMessage: Message = {
        id: (Date.now() + 3).toString(),
        role: "assistant",
        content: "Error: Both URL and model name are required.",
        timestamp: new Date().toISOString(),
        model: ollamastate == 0 ? selectedModel : lmstudio_model_name,
      };
      updateChat({
        ...chat,
        messages: [...chat.messages, errorAssistantMessage],
        lastModelUsed: ollamastate == 0 ? selectedModel : lmstudio_model_name,
      });
      setError("Both URL and model name are required.");
    }
  };
  const [autoscroll, setautoscroll] = useState(false);
  const [fullfileascontext, setfullfileascontext] = useState(false);
  const [sendwithhistory, setsendwithhistory] = useState(false);
  const [searchcurrent, setsearchcurrent] = useState(true);
  const [questionsSidebarCollapsed, setQuestionsSidebarCollapsed] = useState(true);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [questionGroupAnswerIndices, setQuestionGroupAnswerIndices] = useState<Map<string, number>>(new Map());
  const [messageToGroupMap, setMessageToGroupMap] = useState<Map<string, string>>(new Map());
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Group messages for Grok-style display
  const groupedMessages = React.useMemo(() => {
    const groups: Array<{
      type: 'single' | 'question-group'
      message?: Message
      question?: Message
      answers?: Message[]
      id: string
    }> = []

    const questionAnswerMap = new Map<string, Message[]>()
    const processedQuestions = new Set<string>()
    const newMessageToGroupMap = new Map<string, string>()

    // First pass: group questions with their answers
    for (let i = 0; i < chat.messages.length; i++) {
      const message = chat.messages[i]

      if (message.role === 'user') {
        const questionKey = message.content.toLowerCase().trim()
        const nextMessage = chat.messages[i + 1]

        if (nextMessage && nextMessage.role === 'assistant') {
          if (!questionAnswerMap.has(questionKey)) {
            questionAnswerMap.set(questionKey, [])
          }
          questionAnswerMap.get(questionKey)!.push(nextMessage)

          // Auto-set to latest answer when new answer is added
          const currentAnswers = questionAnswerMap.get(questionKey)!
          if (currentAnswers.length > 1) {
            setQuestionGroupAnswerIndices(prev => {
              const newMap = new Map(prev)
              newMap.set(questionKey, currentAnswers.length - 1) // Set to latest answer
              return newMap
            })
          }
        }
      }
    }

    // Second pass: create grouped structure
    for (let i = 0; i < chat.messages.length; i++) {
      const message = chat.messages[i]

      if (message.role === 'user') {
        const questionKey = message.content.toLowerCase().trim()
        const answers = questionAnswerMap.get(questionKey) || []

        if (answers.length > 1 && !processedQuestions.has(questionKey)) {
          // Multiple answers - create a question group
          const groupId = `group-${message.id}`
          groups.push({
            type: 'question-group',
            question: message,
            answers: answers,
            id: groupId
          })
          // Map the question message ID to the group ID
          newMessageToGroupMap.set(message.id, groupId)
          // Map all answer message IDs to the group ID
          answers.forEach(answer => {
            newMessageToGroupMap.set(answer.id, groupId)
          })
          processedQuestions.add(questionKey)
          i++ // Skip the next assistant message as it's included in the group
        } else if (answers.length === 1 && !processedQuestions.has(questionKey)) {
          // Single answer - add both question and answer as separate messages
          groups.push({
            type: 'single',
            message: message,
            id: message.id
          })
          // Map the message ID to itself for single messages
          newMessageToGroupMap.set(message.id, message.id)
          if (i + 1 < chat.messages.length && chat.messages[i + 1].role === 'assistant') {
            const assistantMessage = chat.messages[i + 1]
            groups.push({
              type: 'single',
              message: assistantMessage,
              id: assistantMessage.id
            })
            newMessageToGroupMap.set(assistantMessage.id, assistantMessage.id)
            i++ // Skip the next message as we've processed it
          }
          processedQuestions.add(questionKey)
        }
      } else if (message.role === 'assistant') {
        // Check if this assistant message is already processed as part of a group
        const isPartOfGroup = Array.from(questionAnswerMap.values()).some(answers =>
          answers.some(answer => answer.id === message.id)
        )

        if (!isPartOfGroup) {
          groups.push({
            type: 'single',
            message: message,
            id: message.id
          })
          newMessageToGroupMap.set(message.id, message.id)
        }
      }
    }

    // Update the message-to-group mapping
    setMessageToGroupMap(newMessageToGroupMap)

    return groups
  }, [chat.messages])
  const scrolltobottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setIsAtBottom(true);
      setShowScrollToBottom(false);
    }
  }, []);

  const checkIfAtBottom = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const threshold = 100; // pixels from bottom to consider "at bottom"
      const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
      setIsAtBottom(atBottom);
      setShowScrollToBottom(!atBottom && chat.messages.length > 0);
    }
  }, [chat.messages.length]);

  const scrollToMessage = useCallback((messageId: string) => {
    // Get the group ID that contains this message
    const groupId = messageToGroupMap.get(messageId) || messageId;
    const messageElement = messageRefs.current.get(groupId);
    if (messageElement && containerRef.current) {
      messageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [messageToGroupMap]);

  // Add scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkIfAtBottom);
      // Initial check
      checkIfAtBottom();

      return () => {
        container.removeEventListener('scroll', checkIfAtBottom);
      };
    }
    return undefined;
  }, [checkIfAtBottom]);

  // Auto-scroll behavior: only scroll when at bottom and streaming
  useEffect(() => {
    if (isAtBottom && (isLoading || streamingMessageId)) {
      scrolltobottom();
    }
  }, [chat.messages, isAtBottom, isLoading, streamingMessageId, scrolltobottom]);
  const [morethanonefile, setmtof] = useState(false)
  // useEffect(()=>{
  //   invoke("fileslist",{}).then((filePaths)=>{setmtof(filePaths!.length>1?true:false)})
  // },[])
  const [vendor, setvendor] = useState("Openrouter")
  // const [label,setlabel]=useState("")
  useEffect(() => {
    const lastState = localStorage.getItem("laststate");
    setollamastate(lastState ? parseInt(lastState, 10) : 0);
  }, [])
  useEffect(() => {

    switch (ollamastate) {
      case 0:
        setvendor("Openrouter")
        break;
      case 1:
        setvendor("Ollama")
        break;
      case 2:
        setvendor("LM studio")
        break;
      case 4:
        setvendor("Groq")
        break;

      default:
        break;
    }
    localStorage.setItem("laststate", ollamastate.toString())

  }, [ollamastate])
  return (
    <div className="">
      {/* Dialog for URL and Model Name */}
      {showDialog && (
        <div className="mx-auto flex w-full max-w-3xl mb-2 px-4">
          <div className="w-full border rounded-lg p-3 bg-white dark:bg-gray-800">
            <h2 className="text-sm font-semibold mb-2">LM Studio/Ollama Configuration</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Provide URL and model to proceed.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                type="text"
                value={lmstudio_url}
                onChange={(e) => setlmurl(e.target.value)}
                placeholder="Enter URL"
                className="w-full"
                autoFocus
              />
              <Input
                type="text"
                value={lmstudio_model_name}
                onChange={(e) => setlmmodel(e.target.value)}
                placeholder="Enter Model Name"
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleDialogSubmit}>Submit</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {/* <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold truncate">{chat.title || "New Chat"}</h2>
      </div> */}

      {/* Message Area */}
      <div className="flex absolute w-full bottom-0 top-0 pt-20 mb-[144px]">
        {/* Main Chat Area */}
        <div className="flex-1 overflow-y-scroll pl-8 pr-4" ref={containerRef}>
          <div className="mx-auto flex w-full max-w-3xl flex-col mb-10">
            {chat.messages.length === 0 ? (
              <div className="flex items-center justify-center h-full w-full">
                <p className="text-gray-500 dark:text-gray-400">Send a message to start the conversation</p>
              </div>
            ) : (
              groupedMessages.map((group) => (
                <div
                  key={group.id}
                  ref={(el) => {
                    if (el) {
                      messageRefs.current.set(group.id, el)
                    } else {
                      messageRefs.current.delete(group.id)
                    }
                  }}
                  className="mb-4"
                >
                  {group.type === 'single' && group.message ? (
                    group.message.role === 'user' ? (
                      <ExpandableMessageItem
                        message={group.message}
                        isStreaming={streamingMessageId === group.message.id}
                        onCopy={() => handleCopyMessage(group.message!.content)}
                        onBranch={() => handleBranchFromMessage(group.message!.id)}
                        setmts={setmts}
                        setdsm={setdsm}
                        isExpanded={expandedMessages.has(group.message.id)}
                        onToggleExpand={() => toggleMessageExpansion(group.message!.id)}
                        onEdit={handleEditMessage}
                        onQuoteMessage={handleQuoteMessage}
                        isQuoted={quotedMessages.some(q => q.id === group.message?.id)}
                        ollamastate={ollamastate}
                        selectedModel={selectedModel}
                        selectedModelInfo={selectedModelInfo}
                        allModels={allModels}
                        handleSelectModel={handleSelectModel}
                        isLoadingModels={isLoadingModels}
                        vendor={vendor}
                        setollamastate={setollamastate}
                        getModelColor={getModelColor}
                        getModelDisplayName={getModelDisplayName}
                        answerfromfile={answerfromfile}
                        setanswerfromfile={setanswerfromfile}
                        sendwithhistory={sendwithhistory}
                        setsendwithhistory={setsendwithhistory}
                        fullfileascontext={fullfileascontext}
                        setfullfileascontext={setfullfileascontext}
                        morethanonefile={morethanonefile}
                        searchcurrent={searchcurrent}
                        setsearchcurrent={setsearchcurrent}
                        contextUsage={contextUsage}
                        setcolorpertheme={setcolorpertheme}
                      />
                    ) : (
                      <MessageItem
                        message={group.message}
                        isStreaming={streamingMessageId === group.message.id}
                        onCopy={() => handleCopyMessage(group.message!.content)}
                        onBranch={() => handleBranchFromMessage(group.message!.id)}
                        setmts={setmts}
                        setdsm={setdsm}
                      />
                    )
                  ) : group.type === 'question-group' && group.question && group.answers ? (
                    (() => {
                      const questionKey = getQuestionKey(group.question);
                      const currentIndex = questionGroupAnswerIndices.get(questionKey) ?? group.answers.length - 1; // Default to latest answer
                      return (
                        <QuestionGroup
                          question={group.question}
                          answers={group.answers}
                          onCopy={handleCopyMessage}
                          onBranch={handleBranchFromMessage}
                          setmts={setmts}
                          setdsm={setdsm}
                          isStreaming={group.answers.some(answer => streamingMessageId === answer.id)}
                          streamingMessageId={streamingMessageId}
                          isQuestionExpanded={expandedMessages.has(group.question.id)}
                          onToggleQuestionExpand={() => toggleMessageExpansion(group.question!.id)}
                          currentAnswerIndex={currentIndex}
                          onAnswerIndexChange={(newIndex) => handleAnswerIndexChange(questionKey, newIndex)}
                          onEdit={handleEditMessage}
                          onQuoteMessage={handleQuoteMessage}
                          isQuoted={quotedMessages.some(q => q.id === group.question?.id)}
                          ollamastate={ollamastate}
                          selectedModel={selectedModel}
                          selectedModelInfo={selectedModelInfo}
                          allModels={allModels}
                          handleSelectModel={handleSelectModel}
                          isLoadingModels={isLoadingModels}
                          vendor={vendor}
                          setollamastate={setollamastate}
                          getModelColor={getModelColor}
                          getModelDisplayName={getModelDisplayName}
                          answerfromfile={answerfromfile}
                          setanswerfromfile={setanswerfromfile}
                          sendwithhistory={sendwithhistory}
                          setsendwithhistory={setsendwithhistory}
                          fullfileascontext={fullfileascontext}
                          setfullfileascontext={setfullfileascontext}
                          morethanonefile={morethanonefile}
                          searchcurrent={searchcurrent}
                          setsearchcurrent={setsearchcurrent}
                          contextUsage={contextUsage}
                          setcolorpertheme={setcolorpertheme}
                        />
                      );
                    })()
                  ) : null}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Questions Sidebar */}
        <QuestionsSidebar
          messages={chat.messages}
          onQuestionClick={scrollToMessage}
          collapsed={questionsSidebarCollapsed}
          onToggleCollapsed={() => setQuestionsSidebarCollapsed(!questionsSidebarCollapsed)}
          className="flex-shrink-0"
          isMobile={isMobile}
        />
      </div>



      {/* Error Display (kept minimal for accessibility) */}
      {error && (
        <div className="sr-only" aria-live="polite">{error}</div>
      )}

      {/* Input Area */}
      <div className={`absolute bottom-0 left-0 right-0 pl-4 pr-4 ${isInputFocused ? '' : ''}`} >
      {showScrollToBottom && (
                <div className="flex justify-center md:justify-end md:mr-32 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={scrolltobottom}
                    className="rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
                    title="Scroll to bottom"
                  >
                    <MoveDown className="h-4 w-4 mr-1" />
                    Scroll to bottom
                  </Button>
                </div>
              )}
        <div className="mx-auto flex w-full max-w-3xl flex-col pb-10 bg-gray-50 dark:bg-gray-900">
          {/* Quoted Messages Display */}
          {quotedMessages.length > 0 && (
            <div className="mb-3 space-y-2">
              {quotedMessages.map((quotedMessage, index) => (
                <div
                  key={quotedMessage.id}
                  className="p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 rounded-r-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  onClick={() => {
                    // Scroll to the original message
                    const messageElement = messageRefs.current.get(quotedMessage.id)
                    if (messageElement) {
                      messageElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                      })
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                        {quotedMessage.role === 'user' ? 'User' : 'Assistant'} • Click to jump to message
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {quotedMessage.content.length > 150
                          ? quotedMessage.content.substring(0, 150) + "..."
                          : quotedMessage.content
                        }
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation() // Prevent triggering the scroll
                        setQuotedMessages(quotedMessages.filter(q => q.id !== quotedMessage.id))
                      }}
                      className="ml-2 h-6 w-6 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800"
                      title="Remove this quote"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
              {quotedMessages.length > 1 && (
                <div className="text-xs text-blue-600 dark:text-blue-400 text-center">
                  Replying to {quotedMessages.length} messages
                </div>
              )}
            </div>
          )}

          {/* <div className="max-w-3xl justify-center p-4 absolute bottom-0 w-full bg-gray-50 dark:bg-gray-900"> */}
          {/* Context Usage Bar */}
          {/* <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Context Usage</span>
            <span>{contextUsage}%</span>
          </div>
          <Progress value={contextUsage} className="h-1" />
        </div> */}

          {/* Text Input & Send Button */}

          <div className="flex flex-grow items-center gap-2">
            <div className="flex flex-col flex-grow">
              

              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="Type a message... (Enter to send, Ctrl+Enter for new line)"
                className={`flex-1 dark:bg-gray-900 border bg-gray-50 min-h-[80px] max-h-[200px] ${isInputFocused ? '' : ''}`}
                disabled={isLoading}
              />
              <Progress value={contextUsage} className="h-1" />
            </div>

          </div>
          <div className="mt-4 flex flex-row gap-4 w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Bot size={16} className="mr-2" />
                  {vendor}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => {
                  setvendor("Openrouter")
                  setollamastate(0);
                }}>
                  Openrouter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setvendor("Ollama")
                  setollamastate(1);
                }}>
                  Ollama
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setvendor("LM Studio")
                  setollamastate(2);
                }}>
                  LM Studio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setvendor("Groq")
                  setollamastate(4);
                }}>
                  Groq
                </DropdownMenuItem>
                {/* <DropdownMenuItem onClick={() => { setcobi(true); setollamastate(3); }}>
                FileGPT
              </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
            {ollamastate == 0 ? (
              <ModelSelectionDialog
                models={allModels}
                selectedModel={selectedModel}
                onSelectModel={handleSelectModel}
                isLoading={isLoadingModels}
              />
            ) : null}
            {ollamastate === 3 && (
              <div className="flex items-center gap-2">
                {/* <FileUploader/> */}
                {/* <Label htmlFor="picture">Picture</Label>
            <Input id="picture" type="file" />
              <Input
                type="text"
                value={selectedFilePath[(selectedFilePath.length-1)]}
                onChange={(e) => setSelectedFilePath([...e.target.value])}
                placeholder="Enter file path or choose file"
                className="flex-grow"
              /> */}
                {/* <Button variant="outline" size="icon" onClick={() => fileloader(setIsLoading,chat,updateChat,ollamastate,selectedModel,lmstudio_model_name,filegpt_url,selectedFilePath)}>
                <FileIcon className="h-4 w-4" />
                <Input  id="picture" type="file" />
              </Button> */}
              </div>
            )}

            <Button variant={"outline"} onClick={() => handleSendMessage(input)} disabled={isLoading || !input.trim()} className="text-black dark:text-white ">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
            </Button>
            {answerfromfile ? (<HoverCard>
              <HoverCardTrigger>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setfullfileascontext(cv => !cv)}
                  className="rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
                // title="Include file history"
                >
                  {fullfileascontext ? (<FileCheck className="h-4 w-4" />) : (<FileMinus className="h-4 w-4" />)}
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                {fullfileascontext ? "Full file contents will be passed as context" : "Embeddings will be passed as context"}
              </HoverCardContent>
            </HoverCard>) : null}
            <HoverCard>
              <HoverCardTrigger>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setsendwithhistory(cv => !cv)}
                  className="rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
                // title="Include chat history"
                >
                  {sendwithhistory ? (<FileClock className="h-4 w-4" />) : (<BookX className="h-4 w-4" />)}
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                {sendwithhistory ? "Full chat history will be passed as context" : "Ignore chat history"}
              </HoverCardContent>
            </HoverCard>
            {(morethanonefile) ? (<HoverCard>
              <HoverCardTrigger>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setsearchcurrent(cv => !cv)}
                  className="rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
                // title="Search which files"
                >
                  {searchcurrent ? (<File className="h-4 w-4" />) : (<FileStack className="h-4 w-4" />)}
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                {searchcurrent ? "Search current file" : "Search all the files"}
              </HoverCardContent>
            </HoverCard>) : null}
            {(true) ? (<HoverCard>
              <HoverCardTrigger>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setanswerfromfile(cv => !cv)}
                  className="rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
                // title="Search which files"
                >
                  {answerfromfile ? (<FilePlus className="h-4 w-4" />) : (<FileMinus className="h-4 w-4" />)}
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                {answerfromfile ? "answer from file" : "Answer without context"}
              </HoverCardContent>
            </HoverCard>) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
