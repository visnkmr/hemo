"use client"

import React, { useState, useRef, type KeyboardEvent, useEffect, useCallback } from "react"
import { Textarea } from "../components/ui/textarea"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../components/ui/hover-card"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu"
import type { Chat, Message, BranchPoint, FileItem } from "../lib/types"
import { SendIcon, Loader2, MenuIcon, Bot, FileIcon, ArrowDownAZ, MoveDown, Scroll, FileCheck, FileMinus, FileClock, BookX, File, FileStack, FilePlus, MessageSquareIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronRightIcon as ChevronRightIconCollapse, CopyIcon, GitBranchIcon, RefreshCw, EditIcon, Download, MessageSquarePlus } from "lucide-react"
import { ScrollArea } from "../components/ui/scroll-area"

import MessageItem from "../components/message-item"
import { Markdown } from "./markdown"
import { Progress } from "../components/ui/progress"
import LMStudioURL from "./lmstudio-url"
import QuestionsSidebar from "./questions-sidebar"
import ModelSelectionDialog from "./model-selection-dialog"
import LocalModelSelectionDialog from "./local-model-selection-dialog"
import GeminiModelSelectionDialog from "./gemini-model-selection-dialog"
import EditMessageModal from "./edit-message-modal"
import ImageGenerationModal from "./image-generation-modal"
import { GeminiImageService } from "../lib/gemini-image-service"
import type { ImageGenerationResponse, ImageGenerationRequest } from "../lib/types"
import { imageDBService } from "../lib/image-db-service"
import { ResolvedImage } from "./resolved-image"
import { useIsMobile } from "../hooks/use-mobile"
// import axios from "axios"
// import { invoke } from "@tauri-apps/api/tauri";
import { Label } from "./ui/label"
import { cn } from "@/lib/utils"
import {checkProviderCredentials} from '@/lib/credentials-checker'
import { set } from "date-fns"
// import { FileUploader } from "./fileupoader"
// --- Type Definitions ---
export let setcolorpertheme = "bg-white dark:bg-gray-800"

// Enhanced MessageItem with expand/collapse functionality
interface ExpandableMessageItemProps {
  vendor:string
  setvendor:any
  ollamastate:number
  setollamastate: (state: number) => void
  allModels: any[]
  selectedModel: string
  handleSelectModel: (modelId: string) => void
  isLoadingModels: boolean
  setsendwithhistory:any
  sendwithhistory:any
  geminiModels: any[]
  message: Message
  isStreaming?: boolean
  onCopy: () => void
  onBranch: () => void
  onEdit: () => void
  onQuote: () => void
  onSaveEdit?: (newContent: string) => void
  setdsm?: any
  setmts?: any
  isExpanded: boolean
  onToggleExpand: () => void
  isEditing?: boolean
  isQuoted?: boolean
  hideQuoteButton?: boolean
}

function ExpandableMessageItem({ vendor,setvendor,ollamastate,setollamastate,allModels,selectedModel,handleSelectModel,isLoadingModels,setsendwithhistory,sendwithhistory,geminiModels,message, isStreaming = false, onCopy, onBranch, onEdit, onQuote, onSaveEdit, setdsm, setmts, isExpanded, onToggleExpand, isEditing = false, isQuoted = false, hideQuoteButton = false }: ExpandableMessageItemProps) {
  const isUser = message.role === "user"
  const [showCursor, setShowCursor] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)
  const [editingTextareaHeight, setEditingTextareaHeight] = useState("auto")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const _setdsm = setdsm || (() => {})
  const _setmts = setmts || (() => {})

  // Blinking cursor effect for streaming messages
  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 500)

    return () => clearInterval(interval)
  }, [isStreaming])

  const Resend = () => {
    if (_setdsm && _setmts) {
      _setdsm(true)
      _setmts(message.content)
    } else {
      console.warn('Resend functionality not available due to missing state setters')
    }
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const handleSaveEdit = () => {
    if (onSaveEdit && editedContent.trim()) {
      onSaveEdit(editedContent.trim())
    }
  }

  const handleCancelEdit = () => {
    setEditedContent(message.content)
    onEdit() // This should toggle off editing mode
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === "Escape") {
      handleCancelEdit()
    }
  }

  // Auto-focus the textarea when entering edit mode
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.setSelectionRange(editedContent.length, editedContent.length)
      }, 100)
    }
  }, [isEditing, editedContent.length])

  const shouldShowExpandButton = isUser && message.content.length > 100

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start", "max-w-[85vw] w-full")}>
        <div
          className={cn(
            "gap-3 p-4 rounded-lg relative overflow-hidden w-full transition-all duration-200",
            isUser ? "bg-blue-50 dark:bg-blue-900/20 max-w-[70vw]" : "bg-gray-50 dark:bg-gray-800/50 max-w-full",
            isQuoted ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 shadow-lg" : "",
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
                  <ResolvedImage src={message.imageUrl} alt="Generated image" className="rounded-lg max-w-full h-auto" />
                </div>
              )}

              {/* Display generated images from imageGenerations */}
              {message.imageGenerations && message.imageGenerations.length > 0 && (
                <div className="mt-2 space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {/* Show generation parameters if available */}
                    {/* {message.generationParameters && (
                      <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                        <div className="text-xs space-y-1">
                          {message.generationParameters.aspectRatio && (
                            <div>Aspect Ratio: {message.generationParameters.aspectRatio}</div>
                          )}
                          {message.generationParameters.style && (
                            <div>Style: {message.generationParameters.style}</div>
                          )}
                          {message.generationParameters.quality && (
                            <div>Quality: {message.generationParameters.quality}</div>
                          )}
                          {message.generationParameters.prompt && (
                            <div>Prompt: {message.generationParameters.prompt}</div>
                          )}
                        </div>
                      </div>
                    )} */}

                    {/* Generated Images */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {message.imageGenerations.flatMap((generation, genIndex) =>
                        generation.images.map((image, imgIndex) => (
                          <div key={`${genIndex}-${imgIndex}`} className="relative group">
                            <ResolvedImage
                              src={image.uri}
                              alt={`Generated image ${genIndex + 1}.${imgIndex + 1}`}
                              className="w-full h-auto rounded-lg shadow-md border"
                            />
                            <div className="mt-2 flex justify-between items-center">
                              {/* <div className="text-xs text-gray-500">
                                {image.width}×{image.height}
                              </div> */}
                              <div className="flex gap-1">
                                {/* Download button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={async () => {
                                    try {
                                      const imageService = GeminiImageService.createGeminiImageService();
                                      if (imageService) {
                                        const resolvedUri = await imageService.resolveImageUrl(image.uri,true);
                                        if (resolvedUri) {
                                          const link = document.createElement('a');
                                          link.href = resolvedUri;
                                          link.download = `gemini-generated-image-${Date.now()}.${image.mimeType.split('/')[1]}`;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }
                                      }
                                    } catch (error) {
                                      console.error('Failed to resolve image for download:', error);
                                    }
                                  }}
                                  title="Download image"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto break-words hyphens-auto">
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={editedContent}
                      onChange={handleTextareaChange}
                      onKeyDown={handleTextareaKeyDown}
                      className="w-full border rounded-md p-2 min-h-[60px] resize-none text-sm bg-white dark:bg-gray-700"
                      placeholder="Edit your message..."
                    />
                    <div className="flex justify-end gap-2">
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
                <DropdownMenuItem onClick={() => {
                  setvendor("Gemini")
                  setollamastate(5);
                }}>
                  Gemini
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
                {/* <Button variant="outline" size="icon" onClick={() => fileloader(setIsLoading,chat,updateChat,ollamastate,selectedModel,local_model,filegpt_url,selectedFilePath)}>
                <FileIcon className="h-4 w-4" />
                <Input  id="picture" type="file" />
              </Button> */}
              </div>
            )}

            <Button variant={"outline"} onClick={handleSaveEdit}
                        disabled={!editedContent.trim() || editedContent.trim() === message.content} className="text-black dark:text-white ">
               <SendIcon className="h-4 w-4" />
            </Button>
            {/* {answerfromfile ? (<HoverCard>
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
            </HoverCard>) : null} */}
            <HoverCard>
              <HoverCardTrigger>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setsendwithhistory((cv: boolean) => !cv)}
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
            {/* {(morethanonefile) ? (<HoverCard>
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
            </HoverCard>) : null} */}
            {/* {(true) ? (<HoverCard>
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
            </HoverCard>) : null} */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Markdown>
                      {shouldShowExpandButton && !isExpanded
                        ? truncateText(message.content)
                        : message.content
                      }
                    </Markdown>
                    <span className={`animate-pulse ${isStreaming ? (showCursor ? "" : "invisible") : "hidden"}`}>▌</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {!isStreaming && (
          <div className={cn("flex gap-1 mt-2", isHovered ? "visible" : "invisible")}>
            {isUser && (
              <>
                <Button variant="ghost" size="icon" onClick={Resend} title="Resend message">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {/* <Button variant="ghost" size="icon" onClick={onEdit} title="Edit message">
                  <EditIcon className="h-4 w-4" />
                </Button> */}
              </>
            )}
            {!hideQuoteButton && (
              <Button variant="ghost" size="icon" onClick={onQuote} title="Quote message">
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            )}
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

// Helper function to check if message content suggests image generation intent
function checkForImageGenerationIntent(userMessage: string, assistantMessage: string): boolean {
  // Keywords that suggest image generation intent
  const imageKeywords = [
    'generate image', 'create image', 'draw', 'show me', 'visualize', 'picture',
    'image of', 'photo of', 'artwork', 'illustration', 'design', 'render',
    'imagine', 'depict', 'illustrate', 'photograph', 'diagram'
  ];

  const combinedText = (userMessage + ' ' + assistantMessage).toLowerCase();

  return imageKeywords.some(keyword => combinedText.includes(keyword));
}

// Helper function to get a display name from model ID
function getModelDisplayName(modelId: string): string {
  // Extract the model name from the provider/model format
  const parts = modelId.split("/")
  return parts.length > 1 ? parts[1] : modelId
}

// Question Group Component for Grok-style scrollable answers
interface QuestionGroupProps {
  vendor:string
  setvendor:any
  ollamastate:number
  setollamastate:any
  allModels: any[]
  selectedModel: string
  handleSelectModel: (modelId: string) => void
  isLoadingModels: boolean
  setsendwithhistory: any
  sendwithhistory: boolean
  geminiModels: any[]
  question: Message
  answers: Message[]
  onCopy: (content: string) => void
  onBranch: (messageId: string) => void
  onQuote: (message: Message) => void
  onEdit: () => void
  onSaveEdit?: (newContent: string) => void
  setdsm?: any
  setmts?: any
  isStreaming?: boolean
  streamingMessageId?: string | null
  isQuestionExpanded: boolean
  onToggleQuestionExpand: () => void
  isQuestionEditing?: boolean
  currentAnswerIndex: number
  onAnswerIndexChange: (index: number) => void
  quotedMessage?: Message | null
  hasMessageImages?: (message: Message) => boolean
}

function QuestionGroup({ vendor,setvendor,ollamastate,setollamastate,allModels,selectedModel,handleSelectModel,isLoadingModels,setsendwithhistory,sendwithhistory,geminiModels,question, answers, onCopy, onBranch, onQuote, onEdit, onSaveEdit, setdsm, setmts, isStreaming, streamingMessageId, isQuestionExpanded, onToggleQuestionExpand, isQuestionEditing, currentAnswerIndex, onAnswerIndexChange, quotedMessage, hasMessageImages}: QuestionGroupProps) {
  const _setdsm = setdsm || (() => {})
  const _setmts = setmts || (() => {})
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
        vendor={vendor}
        setvendor={setvendor}
        ollamastate={ollamastate}
        setollamastate={setollamastate}
        allModels={allModels}
        selectedModel={selectedModel}
        handleSelectModel={handleSelectModel}
        isLoadingModels={isLoadingModels}
        setsendwithhistory={setsendwithhistory}
        sendwithhistory={sendwithhistory}
        geminiModels={geminiModels}

        message={question}
        onCopy={() => onCopy(question.content)}
        onBranch={() => onBranch(question.id)}
        onQuote={() => onQuote(question)}
        onEdit={onEdit}
        onSaveEdit={onSaveEdit}
        setdsm={setdsm}
        setmts={setmts}
        isExpanded={isQuestionExpanded}
        onToggleExpand={onToggleQuestionExpand}
        isEditing={isQuestionEditing}
        isQuoted={quotedMessage?.id === question.id}
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
            onQuote={() => onQuote(currentAnswer)}
            setdsm={setdsm}
            setmts={setmts}
            isQuoted={quotedMessage?.id === currentAnswer.id}
            hideQuoteButton={hasMessageImages!(currentAnswer)}
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
  // setlmmodel: any;
  ollamastate: number;
  chat: Chat;
  updateChat: (chat: Chat) => void;
  // apiKey: string;
  selectedModel: string; // Keep selectedModel for overall component state
  selectedModelInfo: any;
  onBranchConversation: (branchPoint: BranchPoint) => void;
  lmstudio_url: string;
  tempApiKey:any,
  setTempApiKey:any,
  // local_model: string;
  // filegpt_url: string;
  message?: FileItem;
  directsendmessage?: boolean;
  messagetosend?: string;
  sidebarVisible: any;
  setSidebarVisible: any;
  getModelColor: any;
  getModelDisplayName: any;
  setollamastate: any;
  allModels: any[];
  geminiModels: any[];
  handleSelectModel: (modelId: string) => void;
  isLoadingModels: boolean;
}

// async function fileloader(setIsLoading,chat: Chat,updateChat: (chat: Chat) => void,ollamastate: number,selectedModel: string,local_model: string,filegptendpoint:string,filePaths:string[]):Promise<boolean>{
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
//                 model:  ollamastate==0 ? selectedModel : local_model,
//               };


//               const initialMessages = chat.messages;
//               let currentChatState = {
//                   ...chat,
//                   messages: [...initialMessages, assistantMessage],
//                   title: initialMessages.length === 0 ? `FileGPT: ${filePaths} ` : chat.title,
//                   lastModelUsed:  ollamastate==0 ? selectedModel : local_model,
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
//                 model:  ollamastate==0 ? selectedModel : local_model,
//               };


//               const initialMessages = chat.messages;
//               let currentChatState = {
//                   ...chat,
//                   messages: [...initialMessages, assistantMessage],
//                   title: initialMessages.length === 0 ? `FileGPT: ${filePaths} ` : chat.title,
//                   lastModelUsed:  ollamastate==0 ? selectedModel : local_model,
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
  const storedApiKey = localStorage.getItem(notollama == 4 ? "groq_api_key" : notollama == 5 ? "gemini_api_key" : "openrouter_api_key")
  console.log(storedApiKey)
  console.log("========" + notollama)
  // const or_mi=localStorage.getItem("or_model_info")
  let modelname
  switch (notollama) {
    case 0:
      modelname = localStorage.getItem("or_model")
      break;
    case 1:
    case 2:
      modelname = localStorage.getItem("local_model")
      break;
    case 3:
      modelname = ""
      break;
    case 4:
      modelname = localStorage.getItem("groq_model_name")
      break;
    case 5:
      modelname = localStorage.getItem("gemini_model_name")
      break;
  }
  // const modelname = notollama==0?model:
  console.log(modelname)

  let prompt = context.trim() === "" ? `Given the following chathistory, answer the question accurately and concisely. \n\nChat History:\n${messages.slice(0, messages.length - 1).map(m => m.content).join('\n')}\n\nQuestion: ${messages[messages.length - 1].content}` : `Given the following chathistory, context, answer the question accurately and concisely. If the answer is not in the context, state that you cannot answer from the provided information.\n\nChat History:\n${messages.slice(0, messages.length - 1).map(m => m.content).join('\n')}\n\nContext: ${context}\n\nQuestion: ${messages[messages.length - 1].content}`;
  console.log(prompt)

  let response: Response;

  if (notollama === 5) {
    console.log("send to gemini")
    // Gemini API - use correct endpoint and format
    if (!storedApiKey) {
      throw new Error("Gemini API key is not available");
    }

    const headers_gemini = {
      "Content-Type": "application/json",
      "x-goog-api-key": storedApiKey,
    };

    response = await fetch(`${url}/v1beta/models/${modelname}:generateContent?alt=sse`, {
      method: "POST",
      headers: headers_gemini,
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
           temperature: 0.9,
           topK: 1,
           topP: 1.0,
           maxOutputTokens: 2048,
            responseModalities: ["TEXT"]
         }
      }),
    });
  } else {
    // OpenRouter, Grok, Ollama APIs
    let headers_openrouter = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${storedApiKey}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.href : "",
      "X-Title": "Batu",
    };
    let headers_ollama = { 'Content-Type': 'application/json' };

    const apiUrl = notollama !== 5 ? `${url}/v1/chat/completions` : `${url}/chat/completions`;

    response = await fetch(apiUrl, {
      method: "POST",
      headers: (notollama === 0 || notollama === 2 || notollama === 4) ? headers_openrouter : headers_ollama,
      body: JSON.stringify({
        model: modelname,
        messages: messages,
        stream: true,
      }),
    });
  }

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

  if (notollama === 5) {
    // Gemini streaming format
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        // console.log(line)
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsedData = JSON.parse(data);
            const content = parsedData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (content) {
              yield content;
            }
          } catch (e) {
            console.warn("Failed to parse Gemini stream line:", line, e);
          }
        }
      }
    }
  } else 
  {
    // OpenAI/Grok/Ollama streaming format
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
  // setlmmodel,
  setlmurl,
  // local_model,
  // filegpt_url,
  message,
  selectedModel,
  selectedModelInfo,
  onBranchConversation,
  directsendmessage = false,
  messagetosend = "",
  tempApiKey,
  setTempApiKey,
  sidebarVisible,
  setSidebarVisible,
  getModelDisplayName,
  getModelColor,
  setollamastate,
  allModels,
  geminiModels,
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
  //               model:  ollamastate==0 ? selectedModel : local_model,
  //             };


  //             const initialMessages = chat.messages;
  //             let currentChatState = {
  //                 ...chat,
  //                 messages: [...initialMessages, assistantMessage],
  //                 title: initialMessages.length === 0 ? `FileGPT: ${filePaths} ` : chat.title,
  //                 lastModelUsed:  ollamastate==0 ? selectedModel : local_model,
  //             };
  //             updateChat(currentChatState);
  //       })
  // },[])
  useEffect(() => {
    if (message?.path) {
      setSelectedFilePath([...message.path])
      // setFilePaths([message.path])
      // fileloader(setIsLoading,chat,updateChat,ollamastate,selectedModel,local_model,filegpt_url,selectedFilePath)
    }
  }, [message])

  // const [context,setcontext]=useState("")

  // State for dialogs
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  // const [tempUrl, setTempUrl] = useState("http://localhost:11434");

  // Main function to handle sending a message
  const handleSendMessage = async (messageContent: string = input) => {
    if (!messageContent.trim() || isLoading) return;

    setError(null);

    // Check if credentials are available
    if (!checkProviderCredentials(ollamastate)) {
        if (ollamastate === 0 || ollamastate === 4 || ollamastate === 5) {
            // Show API key dialog for cloud providers
            setTempApiKey("");
            setShowApiKeyDialog(true);
        } else if (ollamastate === 1 || ollamastate === 2) {
            // Show URL dialog for local providers
            setlmurl("http://localhost:11434");
            setShowUrlDialog(true);
        }
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    if (messageContent === input) {
      setInput(""); // Clear input only if sending from text area
    }

    // Prepare user and assistant messages
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      timestamp: new Date().toISOString(),
      model: selectedModel,
    };
    // If there is a leftover pending error message from a previous failure, flush it into the chat
    if (pendingErrorMessage) {
      const errorAsAssistant: Message = {
        id: (Date.now() + 0.5).toString(),
        role: "assistant",
        content: pendingErrorMessage,
        timestamp: new Date().toISOString(),
        model: selectedModel,
      }
      const flushed = {
        ...chat,
        messages: [...chat.messages, errorAsAssistant],
        lastModelUsed: selectedModel,
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
      model: selectedModel,
    };

    setStreamingMessageId(assistantMessageId);

    const initialMessages = chat.messages;
    // Update chat with user message & placeholder
    let currentChatState = {
      ...chat,
      messages: [...initialMessages, userMessage, assistantMessage],
      title: initialMessages.length === 0 ? messageContent.slice(0, 30) : chat.title,
      lastModelUsed: selectedModel,
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

        const modelToSend = selectedModel;
        const messagesToSend = [...initialMessages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        // If there's a quoted message, prepend context about what we're replying to
        if (quotedMessage) {
          const quotedContext = `You are replying to this message ${quotedMessage.role === 'user' ? 'from the user' : 'from your previous response'}:
"${quotedMessage.content}"

`;
          messagesToSend[messagesToSend.length - 1] = {
            ...messagesToSend[messagesToSend.length - 1],
            content: quotedContext + userMessage.content
          };
          // Clear the quoted message after sending
          setQuotedMessage(null);
        }
        //  const stored_lm_model_name = localStorage.getItem("local_model")
        let accumulatedContent = "";
        let context = ""
        // const context=answerfromfile?(await invoke("queryfile",{question:JSON.stringify(messagesToSend[messagesToSend.length-1].content),
        //  model:stored_lm_model_name?stored_lm_model_name:"qwen2.5:3b",
        //  embeddingmodelname:"nomic-embed-text",
        //  usecompletefile:fullfileascontext,
        //  pathstr: searchcurrent?(await(await import('@tauri-apps/api/window')).appWindow.title()).replace("FileGPT: ",""):"ALL"
        // }).catch(e=>console.log(e)) as string):""; 
        // console.log(`----------context: ${context}`)

        

        // Check if we should generate an image automatically for Gemini models
        if (ollamastate === 5 && GeminiImageService.isModelImageCapable(selectedModel)) {
          const shouldGenerateImage = checkForImageGenerationIntent(
            userMessage.content,
            accumulatedContent
          );

          if (shouldGenerateImage) {
            try {
              const imageService = GeminiImageService.createGeminiImageService();
              if (imageService) {
                const imageRequest: ImageGenerationRequest = {
                  prompt: userMessage.content,
                  model: selectedModel,
                };

                const imageResponse = await imageService.generateImage(imageRequest);

                // Update the assistant message to include the generated image
                const finalMessages = [...currentChatState.messages];
                finalMessages[finalMessages.length - 1] = {
                  ...finalMessages[finalMessages.length - 1],
                  content: accumulatedContent,
                  imageGenerations: [imageResponse],
                };

                currentChatState = {
                  ...currentChatState,
                  messages: finalMessages,
                };
                updateChat(currentChatState);
              }
            } catch (imageError) {
              console.warn("Automatic image generation failed:", imageError);
              // Don't fail the entire response if image generation fails
            }
          }
        }
        else{
          for await (const contentChunk of sendMessageStream({
            url: lmstudio_url,
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
          model: selectedModel,
        };
        updateChat({
          ...chat,
          messages: [...initialMessages, userMessage, errorAssistantMessage],
          lastModelUsed: selectedModel,
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
      // const stored_lm_model_name = localStorage.getItem("local_model")
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
      // If there's a quoted message, include it in the context for direct messages
      let contentToSend = mts;
      if (quotedMessage) {
        const quotedContext = `You are replying to this message ${quotedMessage.role === 'user' ? 'from the user' : 'from your previous response'}:
"${quotedMessage.content}"

`;
        contentToSend = quotedContext + mts;
        setQuotedMessage(null);
      }
      handleSendMessage(contentToSend);
      setdsm(false)
      setmts("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsm, mts, isLoading]); // Dependencies added

  // --- Other Handlers ---

  // Handle image generation
  const handleImageGenerated = async (response: ImageGenerationResponse) => {
    // Create a new assistant message with the generated images
    const userPrompt = `Generate image: ${response.images[0]?.generationParameters?.prompt || "AI generated image"}`;
    const assistantContent = `I've generated ${response.images.length} image${response.images.length > 1 ? 's' : ''} based on your prompt. Here ${response.images.length === 1 ? 'it is' : 'they are'}:`;

    // Generate unique message IDs
    const userMessageId = Date.now().toString();
    const assistantMessageId = (Date.now() + 1).toString();

    // Update IndexedDB associations for all generated images
    const imageIds = response.images.map(img => {
      if (img.uri.startsWith('indexeddb:')) {
        return img.uri.replace('indexeddb:', '');
      }
      return null;
    }).filter(Boolean) as string[];

    // Update chat/message associations for all images
    if (imageIds.length > 0) {
      try {
        const geminiService = GeminiImageService.createGeminiImageService();
        if (geminiService) {
          await geminiService.updateImageAssociations(`${chat.id}_${assistantMessageId}`, chat.id, assistantMessageId);
          console.log(`[Image Generation] ✅ Updated associations for ${imageIds.length} images`);
        }
      } catch (error) {
        console.warn('[Image Generation] Failed to update image associations:', error);
      }
    }

    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: userPrompt,
      timestamp: new Date(response.timestamp).toISOString(),
      model: response.model,
      generationParameters: response.images[0]?.generationParameters,
    };

    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: assistantContent,
      timestamp: new Date(response.timestamp).toISOString(),
      model: response.model,
      imageGenerations: [response], // Contains IndexedDB references, not base64
    };

    const updatedMessages = [...chat.messages, userMessage, assistantMessage];
    const updatedChat = {
      ...chat,
      messages: updatedMessages,
      title: chat.title,
      lastModelUsed: response.model,
    };

    updateChat(updatedChat);
    setIsImageGenerationOpen(false);

    console.log(`[Image Generation] 🎨 Generated ${response.images.length} images, saved to IndexedDB`);
  };

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
    setQuotedMessage(message);
  };

  // Helper function to check if message has images
  const hasMessageImages = (message: Message): boolean => {
    return !!((message.imageUrl && (message.imageUrl.startsWith('data:image/') || message.imageUrl.startsWith('indexeddb:'))) ||
              (message.imageGenerations && message.imageGenerations.length > 0 && message.imageGenerations.some(gen =>
                gen.images && gen.images.length > 0 && gen.images.some(img =>
                  img.uri && (img.uri.startsWith('data:image/') || img.uri.startsWith('indexeddb:'))
                )
              )));
  };

  const clearQuotedMessage = () => {
    setQuotedMessage(null);
  };

  const handleEditMessage = (messageId: string) => {
    if (editingMessageId === messageId) {
      // If already editing this message, cancel editing
      setEditingMessageId(null)
    } else {
      // Start editing this message
      setEditingMessageId(messageId)
    }
  };

  const handleEditSave = async (newContent: string) => {
    if (!editingMessageId) return;

    // Find the message index to replace it with edited content
    const messageIndex = chat.messages.findIndex(msg => msg.id === editingMessageId);
    if (messageIndex === -1) return;

    // Create updated message
    const updatedMessage: Message = {
      ...chat.messages[messageIndex],
      content: newContent
    };

    // Update chat messages
    const updatedMessages = [...chat.messages];
    updatedMessages[messageIndex] = updatedMessage;

    const updatedChat = {
      ...chat,
      messages: updatedMessages
    };

    // Update the chat state
    updateChat(updatedChat);

    // Now regenerate the answer by finding the corresponding assistant message
    const assistantMessageIndex = messageIndex + 1;
    if (assistantMessageIndex < chat.messages.length && chat.messages[assistantMessageIndex].role === 'assistant') {
      // Remove the old assistant message
      updatedMessages.splice(assistantMessageIndex, 1);
      updateChat({ ...chat, messages: updatedMessages });

      // Trigger a new message send with the edited content
      setmts(newContent);
      setdsm(true);
    }
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
  };


  // Function to handle API key dialog submission
  const handleApiKeyDialogSubmit = () => {
    if (tempApiKey.trim()) {
     setTempApiKey(tempApiKey)
      setShowApiKeyDialog(false);
      // Trigger model fetching and then send message
      setTimeout(() => handleSendMessage(), 100);
    }
  };

  // Function to handle URL dialog submission
  const handleUrlDialogSubmit = () => {
    if (lmstudio_url.trim()) {
      // Save the URL
      localStorage.setItem("lmstudio_url", lmstudio_url);
      setlmurl(lmstudio_url);
      setShowUrlDialog(false);
      // Trigger model fetching and then send message
      setTimeout(() => handleSendMessage(), 100);
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

  // Quoted message state
  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);

  // Image generation state
  const [isImageGenerationOpen, setIsImageGenerationOpen] = useState(false);

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
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
      case 5:
        setvendor("Gemini")
        break;

      default:
        break;
    }
    localStorage.setItem("laststate", ollamastate.toString())

  }, [ollamastate])
  return (
    <div className="">
      {/* API Key Dialog */}
      {showApiKeyDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-auto w-full max-w-md p-4">
            <div className="w-full border rounded-lg p-6 bg-white dark:bg-gray-800 shadow-xl">
              <h2 className="text-lg font-semibold mb-3">
                {ollamastate === 0 ? "OpenRouter" : ollamastate === 4 ? "Groq" : "Gemini"} API Configuration
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Enter your API key to continue.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="api-key" className="text-sm font-medium">
                    API Key
                  </Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full mt-1"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApiKeyDialogSubmit}
                  disabled={!tempApiKey.trim()}
                >
                  Save & Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* URL Dialog */}
      {showUrlDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-auto w-full max-w-md p-4">
            <div className="w-full border rounded-lg p-6 bg-white dark:bg-gray-800 shadow-xl">
              <h2 className="text-lg font-semibold mb-3">
                {ollamastate === 1 ? "Ollama" : "LM Studio"} Configuration
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Enter the server URL to connect to your local instance.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="server-url" className="text-sm font-medium">
                    Server URL
                  </Label>
                  <Input
                    id="server-url"
                    type="text"
                    value={lmstudio_url}
                    onChange={(e) => setlmurl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full mt-1"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowUrlDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUrlDialogSubmit}
                  disabled={!lmstudio_url.trim()}
                >
                  Connect & Continue
                </Button>
              </div>
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
                        vendor={vendor}
                        setvendor={setvendor}
                        ollamastate={ollamastate}
                        setollamastate={setollamastate}
                        allModels={allModels}
                        selectedModel={selectedModel}
                        handleSelectModel={handleSelectModel}
                        isLoadingModels={isLoadingModels}
                        setsendwithhistory={setsendwithhistory}
                        sendwithhistory={sendwithhistory}
                        geminiModels={geminiModels}
                        message={group.message}
                        isStreaming={streamingMessageId === group.message.id}
                        onCopy={() => handleCopyMessage(group.message!.content)}
                        onBranch={() => handleBranchFromMessage(group.message!.id)}
                        onQuote={() => handleQuoteMessage(group.message!)}
                        onEdit={() => handleEditMessage(group.message!.id)}
                        onSaveEdit={handleEditSave}
                        setdsm={setdsm}
                        setmts={setmts}
                        isExpanded={expandedMessages.has(group.message.id)}
                        onToggleExpand={() => toggleMessageExpansion(group.message!.id)}
                        isEditing={editingMessageId === group.message.id}
                        isQuoted={quotedMessage?.id === group.message.id}
                        hideQuoteButton={hasMessageImages(group.message!)}
                      />
                    ) : (
                      <MessageItem
                        message={group.message}
                        isStreaming={streamingMessageId === group.message.id}
                        onCopy={() => handleCopyMessage(group.message!.content)}
                        onBranch={() => handleBranchFromMessage(group.message!.id)}
                        onQuote={() => handleQuoteMessage(group.message!)}
                        setdsm={setdsm}
                        setmts={setmts}
                        isQuoted={quotedMessage?.id === group.message.id}
                      />
                    )
                  ) : group.type === 'question-group' && group.question && group.answers ? (
                    (() => {
                      const questionKey = getQuestionKey(group.question);
                      const currentIndex = questionGroupAnswerIndices.get(questionKey) ?? group.answers.length - 1; // Default to latest answer
                      return (
                        <QuestionGroup
                          vendor={vendor}
                          setvendor={setvendor}
                          ollamastate={ollamastate}
                          setollamastate={setollamastate}
                          allModels={allModels}
                          selectedModel={selectedModel}
                          handleSelectModel={handleSelectModel}
                          isLoadingModels={isLoadingModels}
                          setsendwithhistory={setsendwithhistory}
                          sendwithhistory={sendwithhistory}
                          geminiModels={geminiModels}
                          question={group.question}
                          answers={group.answers}
                          onCopy={handleCopyMessage}
                          onBranch={handleBranchFromMessage}
                          onQuote={handleQuoteMessage}
                          onEdit={() => handleEditMessage(group.question!.id)}
                          setmts={setmts}
                          setdsm={setdsm}
                          isStreaming={group.answers.some(answer => streamingMessageId === answer.id)}
                          streamingMessageId={streamingMessageId}
                          isQuestionExpanded={expandedMessages.has(group.question.id)}
                          onToggleQuestionExpand={() => toggleMessageExpansion(group.question!.id)}
                          currentAnswerIndex={currentIndex}
                          onAnswerIndexChange={(newIndex) => handleAnswerIndexChange(questionKey, newIndex)}
                          quotedMessage={quotedMessage}
                          hasMessageImages={hasMessageImages}
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

              {/* Quoted Message Display */}
              {quotedMessage && (
                <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-md relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Replying to {quotedMessage.role === 'user' ? 'your message' : 'AI response'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearQuotedMessage}
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                    >
                      ×
                    </Button>
                  </div>
                  <div className="text-sm text-blue-900 dark:text-blue-100 line-clamp-3">
                    {quotedMessage.content.length > 150
                      ? `${quotedMessage.content.substring(0, 150)}...`
                      : quotedMessage.content
                    }
                  </div>
                </div>
              )}

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
                <DropdownMenuItem onClick={() => {
                  setvendor("Gemini")
                  setollamastate(5);
                }}>
                  Gemini
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
                {/* <Button variant="outline" size="icon" onClick={() => fileloader(setIsLoading,chat,updateChat,ollamastate,selectedModel,local_model,filegpt_url,selectedFilePath)}>
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
            {/* Image Generation Button - Only show for Gemini models that support image generation */}
            {ollamastate === 5 && GeminiImageService.isModelImageCapable(selectedModel) && (
              <HoverCard>
                <HoverCardTrigger>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsImageGenerationOpen(true)}
                    className="rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
                    title="Generate image with Gemini"
                  >
                    <Bot className="h-4 w-4" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                  Generate AI images with Gemini
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
        </div>
      </div>

      {/* Image Generation Modal */}
      <ImageGenerationModal
        isOpen={isImageGenerationOpen}
        onClose={() => setIsImageGenerationOpen(false)}
        onImageGenerated={handleImageGenerated}
        selectedModel={selectedModel}
      />
    </div>
  );
}
