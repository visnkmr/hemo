"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Textarea } from "../components/ui/textarea"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem } from "../components/ui/dropdown-menu"
import { ScrollArea } from "../components/ui/scroll-area"
import { Progress } from "../components/ui/progress"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../components/ui/hover-card"
import { FileCheck, FileMinus, FileClock, BookX, File, FileStack, FilePlus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Separator } from "../components/ui/separator"
import { Badge } from "../components/ui/badge"
import type { Message, FileItem } from "../lib/types"
import { SendIcon, Loader2, Bot, CopyIcon, RefreshCw, Quote, GitCompare, CheckCircle, XCircle, Clock, Zap, Plus, ChevronDown, Edit, GitBranchIcon, MessageSquareIcon, RotateCcw, GitBranch } from "lucide-react"
import { Markdown } from "./markdown"
import LMStudioURL from "./lmstudio-url"
import { cn } from "../lib/utils"
import { multiModelStorage, type MultiModelChat, type MultiModelMessage } from "../lib/multi-model-storage"
import { useConfigItem } from "../hooks/use-indexeddb"

// Local interface for model responses
interface ModelResponse {
  id: string
  model: string
  modelId: string
  response: string
  timestamp: string
  isLoading: boolean
  error?: string
  tokensUsed?: number
  responseTime?: number
}

interface MultiModelComparisonProps {
  setlmurl: any;
  setlmmodel: any;
  ollamastate: number;
  lmstudio_url: string;
  lmstudio_model_name: string;
  filegpt_url: string;
  message?: FileItem;
  selectedModel: string;
  selectedModelInfo: any;
  allModels: any[];
  handleSelectModel: (modelId: string) => void;
  isLoadingModels: boolean;
  getModelDisplayName: any;
  getModelColor: any;
}

// Model interface for type safety
interface AvailableModel {
  id: string
  name: string
  provider: string
  color?: string
  context_length?: number
  pricing?: { prompt: number; completion: number }
  created?: number
}

export default function MultiModelComparison({
  setlmurl,
  setlmmodel,
  ollamastate,
  lmstudio_url,
  lmstudio_model_name,
  filegpt_url,
  message,
  selectedModel,
  selectedModelInfo,
  allModels,
  handleSelectModel,
  isLoadingModels,
  getModelDisplayName,
  getModelColor
}: MultiModelComparisonProps) {
  const [input, setInput] = useState("")
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [chats, setChats] = useState<MultiModelChat[]>([])
  const [currentChat, setCurrentChat] = useState<MultiModelChat | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [contextUsage, setContextUsage] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [isLoadingAvailableModels, setIsLoadingAvailableModels] = useState(false)
  const [modelSelectionCards, setModelSelectionCards] = useState<Array<{id: string, provider: number, model: string}>>([{id: '1', provider: 0, model: ''}])

  // New state for message actions
  const [hoveredResponseId, setHoveredResponseId] = useState<string | null>(null)
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [editModel, setEditModel] = useState("")
  const [editProvider, setEditProvider] = useState(0)
  const [quotedResponses, setQuotedResponses] = useState<ModelResponse[]>([])
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set())

  // Additional state for enhanced functionality
  const [answerfromfile, setanswerfromfile] = useState(false)
  const [sendwithhistory, setsendwithhistory] = useState(false)
  const [fullfileascontext, setfullfileascontext] = useState(false)
  const [morethanonefile, setmorethanonefile] = useState(false)
  const [searchcurrent, setsearchcurrent] = useState(true)
  const [vendor, setvendor] = useState("Openrouter")
  const [selectedFilePath, setSelectedFilePath] = useState<string[]>([])

  // Branching functionality
  const [showBranchOptions, setShowBranchOptions] = useState<string | null>(null)
  const [branchingResponse, setBranchingResponse] = useState<ModelResponse | null>(null)

  // Get API keys from IndexedDB
  const { value: groqApiKey } = useConfigItem<string>("groq_api_key", "")

  // Function to fetch models from different providers
  const fetchAvailableModels = async () => {
    setIsLoadingAvailableModels(true)
    const allFetchedModels: any[] = []

    try {
      // Fetch OpenRouter models
      try {
        const openRouterResponse = await fetch("https://openrouter.ai/api/v1/models")
        if (openRouterResponse.ok) {
          const openRouterData = await openRouterResponse.json()
          const openRouterModels = openRouterData.data
            ?.filter((model: any) => model?.id && model?.pricing?.prompt !== undefined)
            .slice(0, 10) // Limit to top 10 models for performance
            .map((model: any) => ({
              ...model,
              provider: 'OpenRouter',
              color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
            })) || []
          allFetchedModels.push(...openRouterModels)
        }
      } catch (error) {
        console.error('Failed to fetch OpenRouter models:', error)
      }

      // Fetch Ollama models if URL is available
      if (lmstudio_url && ollamastate === 1) {
        try {
          const ollamaResponse = await fetch(`${lmstudio_url}/api/tags`)
          if (ollamaResponse.ok) {
            const ollamaData = await ollamaResponse.json()
            const ollamaModels = ollamaData.models?.map((model: any) => ({
              id: model.name,
              name: model.name,
              provider: 'Ollama',
              color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
              context_length: 4096,
              pricing: { prompt: 0, completion: 0 },
              created: Date.now()
            })) || []
            allFetchedModels.push(...ollamaModels)
          }
        } catch (error) {
          console.error('Failed to fetch Ollama models:', error)
        }
      }

      // Fetch LM Studio models if URL is available
      if (lmstudio_url && ollamastate === 2) {
        try {
          const lmStudioResponse = await fetch(`${lmstudio_url}/v1/models`)
          if (lmStudioResponse.ok) {
            const lmStudioData = await lmStudioResponse.json()
            const lmStudioModels = lmStudioData.data?.map((model: any) => ({
              id: model.id,
              name: model.id,
              provider: 'LM Studio',
              color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
              context_length: 4096,
              pricing: { prompt: 0, completion: 0 },
              created: Date.now()
            })) || []
            allFetchedModels.push(...lmStudioModels)
          }
        } catch (error) {
          console.error('Failed to fetch LM Studio models:', error)
        }
      }

      // Fetch Groq models if needed
      try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/models", {
          headers: {
            'Authorization': `Bearer ${groqApiKey || ''}`
          }
        })
        if (groqResponse.ok) {
          const groqData = await groqResponse.json()
          const groqModels = groqData.data
            ?.filter((model: any) => model.id.includes('llama'))
            .map((model: any) => ({
              id: model.id,
              name: model.id,
              provider: 'Groq',
              color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
              context_length: 8192,
              pricing: { prompt: 0, completion: 0 },
              created: Date.now()
            })) || []
          allFetchedModels.push(...groqModels)
        }
      } catch (error) {
        console.error('Failed to fetch Groq models:', error)
      }

      setAvailableModels(allFetchedModels)

      // Auto-select first few models if none selected
      if (selectedModels.length === 0 && allFetchedModels.length > 0) {
        const initialSelection = allFetchedModels.slice(0, Math.min(3, allFetchedModels.length)).map(m => m.id)
        setSelectedModels(initialSelection)
      }

    } catch (error) {
      console.error('Error fetching available models:', error)
      setAvailableModels([])
    } finally {
      setIsLoadingAvailableModels(false)
    }
  }

  // Initialize with stored chats or create default
  useEffect(() => {
    const loadChats = async () => {
      try {
        const storedChats = await multiModelStorage.getAllChats()
        if (storedChats.length > 0) {
          setChats(storedChats)
          setCurrentChat(storedChats[0])
        } else {
          // Create default chat if none exist
          const defaultChat = await multiModelStorage.createChat()
          setChats([defaultChat])
          setCurrentChat(defaultChat)
        }
      } catch (error) {
        console.error('Failed to load chats:', error)
        // Fallback to local state
        const defaultChat: MultiModelChat = {
          id: Date.now().toString(),
          title: "Multi-Model Comparison",
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setChats([defaultChat])
        setCurrentChat(defaultChat)
      }
    }
    loadChats()
  }, [])

  // Fetch available models when component mounts or dependencies change
  useEffect(() => {
    fetchAvailableModels()
  }, [lmstudio_url, ollamastate])

  // Calculate context usage effect
  useEffect(() => {
    const totalChars = input.length
    const estimatedTokens = Math.ceil(totalChars / 4)
    const maxContext = 4096 // Default context length
    const usagePercentage = Math.min(100, Math.ceil((estimatedTokens / maxContext) * 100))
    setContextUsage(usagePercentage)
  }, [input])

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
  }

  const addModelSelectionCard = () => {
    const newId = (modelSelectionCards.length + 1).toString()
    setModelSelectionCards(prev => [...prev, {id: newId, provider: 0, model: ''}])
  }

  const removeModelSelectionCard = (cardId: string) => {
    if (modelSelectionCards.length > 1) {
      setModelSelectionCards(prev => prev.filter(card => card.id !== cardId))
    }
  }

  const updateCardProvider = (cardId: string, provider: number) => {
    setModelSelectionCards(prev =>
      prev.map(card => card.id === cardId ? {...card, provider, model: ''} : card)
    )
  }

  const updateCardModel = (cardId: string, model: string) => {
    setModelSelectionCards(prev =>
      prev.map(card => card.id === cardId ? {...card, model} : card)
    )
  }

  const getProviderName = (provider: number) => {
    switch (provider) {
      case 0: return "Openrouter"
      case 1: return "Ollama"
      case 2: return "LM Studio"
      case 4: return "Groq"
      default: return "Openrouter"
    }
  }

  const generateResponse = async (query: string, model: AvailableModel): Promise<ModelResponse> => {
    const startTime = Date.now()
    const response: ModelResponse = {
      id: `${model.id}-${Date.now()}`,
      model: model.name,
      modelId: model.id,
      response: "",
      timestamp: new Date().toISOString(),
      isLoading: true
    }

    try {
      // Simulate API call - in real implementation, this would call the actual API
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 3000))

      // Mock response generation
      const mockResponses = [
        `**${model.name}** analysis of your query:\n\n${query}\n\nThis is a comprehensive response that demonstrates the capabilities of ${model.name}. The model provides detailed insights and maintains context throughout the conversation.`,
        `Based on your question "${query}", **${model.name}** offers this perspective:\n\nThe ${model.provider} model processes this type of query efficiently and provides contextually relevant information. Key points include market analysis, technical considerations, and practical applications.`,
        `**${model.name}** response to: ${query}\n\nFrom the ${model.provider} perspective, this query involves multiple aspects that require careful consideration. The model breaks down the complexity and provides actionable insights.`
      ]

      response.response = mockResponses[Math.floor(Math.random() * mockResponses.length)]
      response.responseTime = Date.now() - startTime
      response.tokensUsed = Math.floor(Math.random() * 500 + 100)
      response.isLoading = false

    } catch (error) {
      response.error = `Failed to generate response from ${model.name}`
      response.isLoading = false
    }

    return response
  }

  const handleSendMessage = async () => {
    if (!input.trim() || modelSelectionCards.length === 0 || isLoading) return

    setIsLoading(true)
    const query = input.trim()
    setInput("")

    const newMessage: MultiModelMessage = {
      id: Date.now().toString(),
      query,
      timestamp: new Date().toISOString(),
      responses: [] as ModelResponse[]
    }

    // Update current chat with the new message
    const updatedChat = {
      ...currentChat!,
      messages: [...currentChat!.messages, newMessage],
      updatedAt: new Date().toISOString()
    }

    setCurrentChat(updatedChat)
    setChats(prev => prev.map(chat =>
      chat.id === currentChat!.id ? updatedChat : chat
    ))

    // Save to storage in background
    multiModelStorage.updateChat(updatedChat).catch(console.error)

    // Generate responses from all selected models in cards
    const modelPromises = modelSelectionCards.map(card => {
      if (!card.model.trim()) return Promise.resolve(null)

      // Create a temporary model object for local providers
      let model: AvailableModel
      if (card.provider === 1 || card.provider === 2) {
        // Local providers - create a basic model object
        model = {
          id: card.model,
          name: card.model,
          provider: card.provider === 1 ? 'Ollama' : 'LM Studio',
          context_length: 4096,
          pricing: { prompt: 0, completion: 0 },
          created: Date.now()
        }
      } else {
        // Remote providers - find from available models
        const foundModel = availableModels.find(m => m.id === card.model)
        if (!foundModel) return Promise.resolve(null)
        model = foundModel
      }

      return generateResponse(query, model)
    }).filter(Boolean)

    const responses = await Promise.all(modelPromises)

    // Update the message with responses
    const finalMessage = {
      ...newMessage,
      responses: responses.filter(Boolean) as ModelResponse[]
    }

    const finalChat = {
      ...updatedChat,
      messages: updatedChat.messages.map(msg =>
        msg.id === newMessage.id ? finalMessage : msg
      )
    }

    setCurrentChat(finalChat)
    setChats(prev => prev.map(chat =>
      chat.id === currentChat!.id ? finalChat : chat
    ))

    // Save final result to storage
    multiModelStorage.updateChat(finalChat).catch(console.error)
    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Keyboard shortcuts for message actions
  const handleResponseKeyDown = (e: React.KeyboardEvent, response: ModelResponse) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'c':
        case 'C':
          e.preventDefault()
          handleCopyResponse(response)
          break
        case 'q':
        case 'Q':
          e.preventDefault()
          handleQuoteResponse(response)
          break
        case 'e':
        case 'E':
          e.preventDefault()
          handleEditResponse(response)
          break
      }
    }
  }

  const copyResponse = (response: string) => {
    navigator.clipboard.writeText(response)
  }

  const getModelById = (modelId: string) => {
    return availableModels.find(m => m.id === modelId)
  }

  // Message action handlers
  const handleCopyResponse = (response: ModelResponse) => {
    navigator.clipboard.writeText(response.response)
  }

  const handleQuoteResponse = (response: ModelResponse) => {
    const isAlreadyQuoted = quotedResponses.some(q => q.id === response.id)
    if (isAlreadyQuoted) {
      setQuotedResponses(quotedResponses.filter(q => q.id !== response.id))
    } else {
      setQuotedResponses([...quotedResponses, response])
    }
  }

  const handleEditResponse = (response: ModelResponse) => {
    setEditingResponseId(response.id)
    setEditContent(response.response)
    setEditModel(response.modelId)
    const model = getModelById(response.modelId)
    setEditProvider(model?.provider === 'OpenRouter' ? 0 : model?.provider === 'Ollama' ? 1 : model?.provider === 'LM Studio' ? 2 : 4)
  }

  const handleSaveEdit = () => {
    if (!editingResponseId || !editContent.trim()) return

    // Update the response in the current chat
    const updatedChat = {
      ...currentChat!,
      messages: currentChat!.messages.map(msg => ({
        ...msg,
        responses: msg.responses.map(resp =>
          resp.id === editingResponseId
            ? { ...resp, response: editContent.trim(), modelId: editModel }
            : resp
        )
      }))
    }

    setCurrentChat(updatedChat)
    setChats(prev => prev.map(chat =>
      chat.id === currentChat!.id ? updatedChat : chat
    ))

    // Save to storage
    multiModelStorage.updateChat(updatedChat).catch(console.error)

    // Reset edit state
    setEditingResponseId(null)
    setEditContent("")
  }

  const handleCancelEdit = () => {
    setEditingResponseId(null)
    setEditContent("")
  }

  const handleToggleExpand = (responseId: string) => {
    setExpandedResponses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(responseId)) {
        newSet.delete(responseId)
      } else {
        newSet.add(responseId)
      }
      return newSet
    })
  }

  const truncateText = (text: string, maxLength: number = 300) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const shouldShowExpandButton = (text: string) => text.length > 300

  // Branching functionality
  const handleBranchFromResponse = (response: ModelResponse, branchType: 'full' | 'single' | 'model') => {
    if (!currentChat) return

    // Find the message containing this response
    const messageIndex = currentChat.messages.findIndex(msg =>
      msg.responses.some(r => r.id === response.id)
    )

    if (messageIndex === -1) return

    const branchMessage = currentChat.messages[messageIndex]

    let newMessages: MultiModelMessage[]
    let title: string

    switch (branchType) {
      case 'full':
        // Copy all messages up to the branch point
        newMessages = currentChat.messages.slice(0, messageIndex + 1)
        title = `Branch from "${branchMessage.query.slice(0, 30)}..."`
        break

      case 'single':
        // Start with just the branched message
        newMessages = [branchMessage]
        title = `Single Branch: ${response.model}`
        break

      case 'model':
        // Start with a new query based on the specific model's response
        const newQuery = `Building on ${response.model}'s response: ${response.response.slice(0, 100)}...`
        newMessages = [{
          id: Date.now().toString(),
          query: newQuery,
          timestamp: new Date().toISOString(),
          responses: []
        }]
        title = `Branch from ${response.model}`
        break

      default:
        return
    }

    // Create new chat with the same model configuration
    const newChat: MultiModelChat = {
      id: Date.now().toString(),
      title,
      messages: newMessages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Save the new chat
    multiModelStorage.updateChat(newChat).catch(console.error)

    // Add to chats list and switch to it
    setChats(prev => [...prev, newChat])
    setCurrentChat(newChat)

    // Hide branch options
    setShowBranchOptions(null)
    setBranchingResponse(null)
  }

  // Resend functionality for failed responses
  const handleResendResponse = async (response: ModelResponse) => {
    if (!currentChat) return

    // Find the original query that generated this response
    const messageIndex = currentChat.messages.findIndex(msg =>
      msg.responses.some(r => r.id === response.id)
    )

    if (messageIndex === -1) return

    const message = currentChat.messages[messageIndex]
    const query = message.query

    // Update the response to loading state
    const updatedChat = {
      ...currentChat,
      messages: currentChat.messages.map(msg =>
        msg.id === message.id
          ? {
              ...msg,
              responses: msg.responses.map(r =>
                r.id === response.id
                  ? { ...r, isLoading: true, error: undefined, response: "" }
                  : r
              )
            }
          : msg
      )
    }

    setCurrentChat(updatedChat)
    setChats(prev => prev.map(chat =>
      chat.id === currentChat.id ? updatedChat : chat
    ))

    try {
      // Find the model and regenerate response
      const model = getModelById(response.modelId)
      if (!model) return

      const newResponse = await generateResponse(query, model)

      // Update with new response
      const finalChat = {
        ...updatedChat,
        messages: updatedChat.messages.map(msg =>
          msg.id === message.id
            ? {
                ...msg,
                responses: msg.responses.map(r =>
                  r.id === response.id ? newResponse : r
                )
              }
            : msg
        )
      }

      setCurrentChat(finalChat)
      setChats(prev => prev.map(chat =>
        chat.id === currentChat.id ? finalChat : chat
      ))

      // Save to storage
      multiModelStorage.updateChat(finalChat).catch(console.error)

    } catch (error) {
      console.error('Failed to resend response:', error)

      // Update with error state
      const errorChat = {
        ...updatedChat,
        messages: updatedChat.messages.map(msg =>
          msg.id === message.id
            ? {
                ...msg,
                responses: msg.responses.map(r =>
                  r.id === response.id
                    ? { ...r, isLoading: false, error: 'Failed to resend response' }
                    : r
                )
              }
            : msg
        )
      }

      setCurrentChat(errorChat)
      setChats(prev => prev.map(chat =>
        chat.id === currentChat.id ? errorChat : chat
      ))
    }
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar for model selection and chat history */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <GitCompare className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Multi-Model Comparison
            </h2>
          </div>

          {/* Model Selection Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Model Selection ({modelSelectionCards.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addModelSelectionCard}
                className="h-8 px-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {modelSelectionCards.map((card, index) => (
                <Card key={card.id} className="relative">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {/* Provider Selection */}
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Bot size={14} className="mr-1" />
                              {getProviderName(card.provider)}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => updateCardProvider(card.id, 0)}>
                              Openrouter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateCardProvider(card.id, 1)}>
                              Ollama
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateCardProvider(card.id, 2)}>
                              LM Studio
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateCardProvider(card.id, 4)}>
                              Groq
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Remove Card Button */}
                        {modelSelectionCards.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeModelSelectionCard(card.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            ×
                          </Button>
                        )}
                      </div>

                      {/* Model Selection */}
                      {card.provider === 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between text-left font-normal"
                              disabled={isLoadingAvailableModels}
                            >
                              <span className="truncate">
                                {isLoadingAvailableModels
                                  ? "Loading models..."
                                  : card.model || "Select Model"
                                }
                              </span>
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
                            {isLoadingAvailableModels ? (
                              <div className="p-4 text-center text-sm text-gray-500">
                                Loading models...
                              </div>
                            ) : availableModels.length === 0 ? (
                              <div className="p-4 text-center text-sm text-gray-500">
                                No models available
                              </div>
                            ) : (
                              availableModels.map((model) => (
                                <DropdownMenuItem
                                  key={model.id}
                                  onClick={() => updateCardModel(card.id, model.id)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{model.name}</span>
                                    {model.context_length && (
                                      <span className="text-xs text-gray-500">
                                        {model.context_length.toLocaleString()} ctx
                                      </span>
                                    )}
                                  </div>
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Local Model Selection for Ollama/LM Studio */}
                      {(card.provider === 1 || card.provider === 2) && (
                        <div className="flex-1">
                          <Input
                            type="text"
                            value={card.model}
                            onChange={(e) => updateCardModel(card.id, e.target.value)}
                            placeholder={`${getProviderName(card.provider)} model name`}
                            className="h-9"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Models Preview */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selected Models
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedModels.map(modelId => {
              const model = getModelById(modelId)
              return model ? (
                <Badge key={modelId} variant="secondary" className={cn("text-xs", model.color)}>
                  {model.name}
                </Badge>
              ) : null
            })}
          </div>
        </div>

        {/* Chat History */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setCurrentChat(chat)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-colors",
                  currentChat?.id === chat.id
                    ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {chat.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {chat.messages.length} queries
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {currentChat?.title || "Multi-Model Comparison"}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Compare responses from {selectedModels.length} AI models
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const newChat = await multiModelStorage.createChat(`Comparison ${chats.length + 1}`)
                  setChats(prev => [...prev, newChat])
                  setCurrentChat(newChat)
                } catch (error) {
                  console.error('Failed to create new chat:', error)
                }
              }}
            >
              New Comparison
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6 max-w-7xl mx-auto">
            {currentChat?.messages.map((message) => (
              <div key={message.id} className="space-y-4">
                {/* User Query */}
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Your Query
                        </div>
                        <div className="text-gray-900 dark:text-blue-50">
                          {message.query}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Model Responses */}
                {selectedModels.length <= 3 ? (
                  // Grid layout for 3 or fewer models
                  <div className="grid gap-4" style={{gridTemplateColumns: `repeat(${selectedModels.length}, 1fr)`}}>
                    {message.responses.map((response) => {
                      const model = getModelById(response.modelId)
                      return (
                        <Card key={response.id} className="relative" data-response-id={response.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-3 h-3 rounded-full", model?.color)} />
                                <CardTitle className="text-sm font-medium">
                                  {response.model}
                                </CardTitle>
                                {response.isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                ) : response.error ? (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {response.responseTime && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    {response.responseTime}ms
                                  </div>
                                )}
                                {response.tokensUsed && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Zap className="h-3 w-3" />
                                    {response.tokensUsed}t
                                  </div>
                                )}
                                {/* Action buttons - only show when not editing and not loading */}
                                {!response.isLoading && editingResponseId !== response.id && (
                                  <div className={cn("flex gap-1", hoveredResponseId === response.id ? "visible" : "invisible")}>
                                    {response.error && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleResendResponse(response)}
                                        title="Resend response"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleCopyResponse(response)}
                                      title="Copy response"
                                    >
                                      <CopyIcon className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleQuoteResponse(response)}
                                      title="Quote response"
                                    >
                                      <Quote className="h-3 w-3" />
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          title="Branch from this response"
                                        >
                                          <GitBranch className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuItem
                                          onClick={() => handleBranchFromResponse(response, 'full')}
                                          className="cursor-pointer"
                                        >
                                          <GitBranch className="h-4 w-4 mr-2" />
                                          Branch with full history
                                          <span className="text-xs text-gray-500 ml-auto">
                                            All previous messages
                                          </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleBranchFromResponse(response, 'single')}
                                          className="cursor-pointer"
                                        >
                                          <MessageSquareIcon className="h-4 w-4 mr-2" />
                                          Branch from this query only
                                          <span className="text-xs text-gray-500 ml-auto">
                                            Single message
                                          </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleBranchFromResponse(response, 'model')}
                                          className="cursor-pointer"
                                        >
                                          <Bot className="h-4 w-4 mr-2" />
                                          Branch from {response.model}
                                          <span className="text-xs text-gray-500 ml-auto">
                                            This model's response
                                          </span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          title="Branch from this response"
                                        >
                                          <GitBranch className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuItem
                                          onClick={() => handleBranchFromResponse(response, 'full')}
                                          className="cursor-pointer"
                                        >
                                          <GitBranch className="h-4 w-4 mr-2" />
                                          Branch with full history
                                          <span className="text-xs text-gray-500 ml-auto">
                                            All previous messages
                                          </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleBranchFromResponse(response, 'single')}
                                          className="cursor-pointer"
                                        >
                                          <MessageSquareIcon className="h-4 w-4 mr-2" />
                                          Branch from this query only
                                          <span className="text-xs text-gray-500 ml-auto">
                                            Single message
                                          </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleBranchFromResponse(response, 'model')}
                                          className="cursor-pointer"
                                        >
                                          <Bot className="h-4 w-4 mr-2" />
                                          Branch from {response.model}
                                          <span className="text-xs text-gray-500 ml-auto">
                                            This model's response
                                          </span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleEditResponse(response)}
                                      title="Edit response"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent
                            className="pt-0 relative"
                            onMouseEnter={() => setHoveredResponseId(response.id)}
                            onMouseLeave={() => setHoveredResponseId(null)}
                            onKeyDown={(e) => handleResponseKeyDown(e, response)}
                            tabIndex={0}
                          >
                            {editingResponseId === response.id ? (
                              /* Edit Form */
                              <div className="space-y-3 w-full">
                                <div className="flex items-center gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Bot size={14} className="mr-1" />
                                        {editProvider === 0 ? "Openrouter" :
                                         editProvider === 1 ? "Ollama" :
                                         editProvider === 2 ? "LM Studio" : "Groq"}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => setEditProvider(0)}>
                                        Openrouter
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setEditProvider(1)}>
                                        Ollama
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setEditProvider(2)}>
                                        LM Studio
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setEditProvider(4)}>
                                        Groq
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                  {editProvider === 0 && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="max-w-[200px]">
                                          <span className="truncate">{editModel || "Select Model"}</span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent className="max-w-[300px]">
                                        {availableModels.map((model) => (
                                          <DropdownMenuItem
                                            key={model.id}
                                            onClick={() => setEditModel(model.id)}
                                            className="text-sm"
                                          >
                                            {model.id}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>

                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  placeholder="Edit your response..."
                                  className="min-h-[80px] dark:bg-gray-900 border bg-gray-50 w-full"
                                />

                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    disabled={!editContent.trim()}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : response.isLoading ? (
                              <div className="space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                              </div>
                            ) : response.error ? (
                              <div className="text-red-600 dark:text-red-400 text-sm">
                                {response.error}
                              </div>
                            ) : (
                              <div className="prose dark:prose-invert prose-sm max-w-none overflow-hidden">
                                {shouldShowExpandButton(response.response) && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 flex-shrink-0"
                                      onClick={() => handleToggleExpand(response.id)}
                                    >
                                      {expandedResponses.has(response.id) ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <MessageSquareIcon className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                )}
                                <div className="overflow-x-auto break-words hyphens-auto">
                                  <Markdown>
                                    {shouldShowExpandButton(response.response) && !expandedResponses.has(response.id)
                                      ? truncateText(response.response)
                                      : response.response
                                    }
                                  </Markdown>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  // Horizontal scrolling for more than 3 models
                  <div className="w-full">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Model Responses ({selectedModels.length} models)
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Scroll horizontally to see all responses
                      </div>
                    </div>
                    <div className="overflow-x-auto pb-2">
                      <div className="flex gap-4 min-w-max px-1">
                        {message.responses.map((response) => {
                          const model = getModelById(response.modelId)
                          return (
                            <Card key={response.id} className="relative flex-shrink-0 w-80" data-response-id={response.id}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={cn("w-3 h-3 rounded-full", model?.color)} />
                                    <CardTitle className="text-sm font-medium">
                                      {response.model}
                                    </CardTitle>
                                    {response.isLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    ) : response.error ? (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {response.responseTime && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Clock className="h-3 w-3" />
                                        {response.responseTime}ms
                                      </div>
                                    )}
                                    {response.tokensUsed && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Zap className="h-3 w-3" />
                                        {response.tokensUsed}t
                                      </div>
                                    )}
                                    {/* Action buttons - only show when not editing and not loading */}
                                    {!response.isLoading && editingResponseId !== response.id && (
                                      <div className={cn("flex gap-1", hoveredResponseId === response.id ? "visible" : "invisible")}>
                                        {response.error && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => handleResendResponse(response)}
                                            title="Resend response"
                                          >
                                            <RotateCcw className="h-3 w-3" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleCopyResponse(response)}
                                          title="Copy response"
                                        >
                                          <CopyIcon className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleQuoteResponse(response)}
                                          title="Quote response"
                                        >
                                          <Quote className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleEditResponse(response)}
                                          title="Edit response"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent
                                className="pt-0 relative"
                                onMouseEnter={() => setHoveredResponseId(response.id)}
                                onMouseLeave={() => setHoveredResponseId(null)}
                                onKeyDown={(e) => handleResponseKeyDown(e, response)}
                                tabIndex={0}
                              >
                                {editingResponseId === response.id ? (
                                  /* Edit Form */
                                  <div className="space-y-3 w-full">
                                    <div className="flex items-center gap-2">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            <Bot size={14} className="mr-1" />
                                            {editProvider === 0 ? "Openrouter" :
                                             editProvider === 1 ? "Ollama" :
                                             editProvider === 2 ? "LM Studio" : "Groq"}
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                          <DropdownMenuItem onClick={() => setEditProvider(0)}>
                                            Openrouter
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => setEditProvider(1)}>
                                            Ollama
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => setEditProvider(2)}>
                                            LM Studio
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => setEditProvider(4)}>
                                            Groq
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
 
                                      {editProvider === 0 && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="max-w-[200px]">
                                              <span className="truncate">{editModel || "Select Model"}</span>
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent className="max-w-[300px]">
                                            {availableModels.map((model) => (
                                              <DropdownMenuItem
                                                key={model.id}
                                                onClick={() => setEditModel(model.id)}
                                                className="text-sm"
                                              >
                                                {model.id}
                                              </DropdownMenuItem>
                                            ))}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </div>
 
                                    <Textarea
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      placeholder="Edit your response..."
                                      className="min-h-[80px] dark:bg-gray-900 border bg-gray-50 w-full"
                                    />
 
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCancelEdit}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        disabled={!editContent.trim()}
                                      >
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : response.isLoading ? (
                                  <div className="space-y-2">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                                  </div>
                                ) : response.error ? (
                                  <div className="text-red-600 dark:text-red-400 text-sm">
                                    {response.error}
                                  </div>
                                ) : (
                                  <div className="prose dark:prose-invert prose-sm max-w-none overflow-hidden">
                                    {shouldShowExpandButton(response.response) && (
                                      <div className="flex items-center gap-2 mb-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 flex-shrink-0"
                                          onClick={() => handleToggleExpand(response.id)}
                                        >
                                          {expandedResponses.has(response.id) ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <MessageSquareIcon className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                    <div className="overflow-x-auto break-words hyphens-auto">
                                      <Markdown>
                                        {shouldShowExpandButton(response.response) && !expandedResponses.has(response.id)
                                          ? truncateText(response.response)
                                          : response.response
                                        }
                                      </Markdown>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col gap-3">
              {/* Quoted Responses Display */}
              {quotedResponses.length > 0 && (
                <div className="mb-3 space-y-2">
                  {quotedResponses.map((quotedResponse, index) => (
                    <div
                      key={quotedResponse.id}
                      className="p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 rounded-r-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      onClick={() => {
                        // Scroll to the original response
                        const responseElement = document.querySelector(`[data-response-id="${quotedResponse.id}"]`)
                        if (responseElement) {
                          responseElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                          })
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                            {quotedResponse.model} • Click to jump to response
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {quotedResponse.response.length > 150
                              ? quotedResponse.response.substring(0, 150) + "..."
                              : quotedResponse.response
                            }
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation() // Prevent triggering the scroll
                            setQuotedResponses(quotedResponses.filter(q => q.id !== quotedResponse.id))
                          }}
                          className="ml-2 h-6 w-6 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800"
                          title="Remove this quote"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                  {quotedResponses.length > 1 && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 text-center">
                      Replying to {quotedResponses.length} response{quotedResponses.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}

              {/* Context Usage Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Context Usage</span>
                  <span>{contextUsage}%</span>
                </div>
                <Progress value={contextUsage} className="h-1" />
              </div>

              <div className="flex items-center gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder="Enter your query to compare across all selected models..."
                  className={cn(
                    "flex-1 min-h-[80px] max-h-[200px] transition-all duration-200",
                    isInputFocused
                      ? "ring-2 ring-blue-400 dark:ring-blue-500 border-blue-400 dark:border-blue-500 shadow-lg"
                      : "hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim() || modelSelectionCards.filter(card => card.model.trim()).length === 0}
                  className="px-6"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <SendIcon className="h-4 w-4 mr-2" />
                      Compare
                    </>
                  )}
                </Button>
              </div>

              {/* Selected Models Summary */}
              <div className="mt-4 flex flex-row gap-4 w-full flex-wrap">
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
                      // Update all cards to OpenRouter
                      setModelSelectionCards(cards => cards.map(card => ({...card, provider: 0})))
                    }}>
                      Openrouter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setvendor("Ollama")
                      setModelSelectionCards(cards => cards.map(card => ({...card, provider: 1})))
                    }}>
                      Ollama
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setvendor("LM Studio")
                      setModelSelectionCards(cards => cards.map(card => ({...card, provider: 2})))
                    }}>
                      LM Studio
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setvendor("Groq")
                      setModelSelectionCards(cards => cards.map(card => ({...card, provider: 4})))
                    }}>
                      Groq
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

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
                    <HoverCardContent className="bg-white dark:bg-gray-800">
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
                  <HoverCardContent className="bg-white dark:bg-gray-800">
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
                    <HoverCardContent className="bg-white dark:bg-gray-800">
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
                  <HoverCardContent className="bg-white dark:bg-gray-800">
                    {answerfromfile ? "Answer from file" : "Answer without context"}
                  </HoverCardContent>
                </HoverCard>
              </div>

              <div className="flex items-center justify-between text-sm mt-2">
                <div className="text-gray-500 dark:text-gray-400">
                  Comparing across {modelSelectionCards.filter(card => card.model.trim()).length} model{modelSelectionCards.filter(card => card.model.trim()).length !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2">
                  {modelSelectionCards.filter(card => card.model.trim()).slice(0, 3).map(card => (
                    <Badge key={card.id} variant="secondary" className="text-xs">
                      {card.model}
                    </Badge>
                  ))}
                  {modelSelectionCards.filter(card => card.model.trim()).length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{modelSelectionCards.filter(card => card.model.trim()).length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}