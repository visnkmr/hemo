"use client"

import type React from "react"
import { useState, useRef, type KeyboardEvent, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { Chat, Message, BranchPoint } from "@/lib/types"
import { SendIcon, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import MessageItem from "@/components/message-item"
import { Progress } from "@/components/ui/progress"
// import { toast } from "@/components/ui/use-toast"

interface ChatInterfaceProps {
  chat: Chat
  updateChat: (chat: Chat) => void
  apiKey: string
  selectedModel: string
  selectedModelInfo: any
  onBranchConversation: (branchPoint: BranchPoint) => void
}

export default function ChatInterface({
  chat,
  updateChat,
  apiKey,
  selectedModel,
  selectedModelInfo,
  onBranchConversation,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [contextUsage, setContextUsage] = useState(0)

  // Calculate context usage based on message content
  useEffect(() => {
    // Simple estimation: 1 token ≈ 4 characters
    const totalChars = chat.messages.reduce((acc, msg) => acc + msg.content.length, 0) + input.length
    const estimatedTokens = Math.ceil(totalChars / 4)

    // Calculate percentage of context used
    const maxContext = selectedModelInfo?.context_length || 4096
    const usagePercentage = Math.min(100, Math.ceil((estimatedTokens / maxContext) * 100))

    setContextUsage(usagePercentage)
  }, [chat.messages, input, selectedModelInfo])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat.messages])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (but not when Ctrl/Cmd is pressed)
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }

    // Add new line on Ctrl+Enter
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      // Let the default behavior happen (new line)
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    // toast({
    //   title: "Copied to clipboard",
    //   description: "Message content has been copied to your clipboard",
    //   duration: 2000,
    // })
  }

  const handleBranchFromMessage = (messageId: string) => {
    const messageIndex = chat.messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex >= 0) {
      const branchPoint: BranchPoint = {
        originalChatId: chat.id,
        messages: chat.messages.slice(0, messageIndex + 1),
        branchedFromMessageId: messageId,
        timestamp: new Date().toISOString(),
      }
      onBranchConversation(branchPoint)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return
    if (!apiKey) {
      setError("Please enter your OpenRouter API key")
      return
    }
    if (!selectedModel) {
      setError("Please select a model")
      return
    }

    setError(null)
    setIsLoading(true)

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
      model: selectedModel,
    }

    // Create a placeholder for the assistant's response
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      model: selectedModel,
    }

    setStreamingMessageId(assistantMessageId)

    const updatedMessages = [...chat.messages, userMessage, assistantMessage]

    // Update chat with user message and empty assistant message
    const updatedChat = {
      ...chat,
      messages: updatedMessages,
      title: updatedMessages.length === 2 ? input.slice(0, 30) : chat.title,
      lastModelUsed: selectedModel,
    }

    updateChat(updatedChat)
    setInput("")

    try {
      // Call OpenRouter API with streaming enabled
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.href,
          "X-Title": "AI Chat Interface",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: updatedMessages
            .filter((msg) => msg.id !== assistantMessageId) // Don't include the empty assistant message
            .map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
          stream: true, // Enable streaming
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || "Failed to get response from OpenRouter")
      }

      if (!response.body) {
        throw new Error("Response body is null")
      }

      // Process the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder("utf-8")
      let accumulatedContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Decode the chunk
        const chunk = decoder.decode(value)

        // Process each line in the chunk
        const lines = chunk
          .split("\n")
          .filter((line) => line.trim() !== "")
          .filter((line) => !line.includes('"OPENROUTER PROCESSING"'))
          .map((line) => line.replace(/^data: /, "").trim())

        for (const line of lines) {
          if (line === "[DONE]") continue

          try {
            const parsedLine = JSON.parse(line)
            const content = parsedLine.choices[0]?.delta?.content || ""

            if (content) {
              // Accumulate content
              accumulatedContent += content

              // Update the assistant message with the accumulated content
              const updatedAssistantMessage = {
                ...assistantMessage,
                content: accumulatedContent,
              }

              // Update the chat with the new content
              const updatedChatWithStream = {
                ...chat,
                messages: [...chat.messages, userMessage, updatedAssistantMessage],
                lastModelUsed: selectedModel,
              }

              updateChat(updatedChatWithStream)
            }
          } catch (e) {
            // Skip invalid JSON lines
            console.warn("Failed to parse line:", line)
          }
        }
      }

      // Final update with complete message
      const finalUpdatedChat = {
        ...chat,
        messages: [
          ...chat.messages,
          userMessage,
          {
            ...assistantMessage,
            content: accumulatedContent,
          },
        ],
        lastModelUsed: selectedModel,
      }

      updateChat(finalUpdatedChat)
      setStreamingMessageId(null)
    } catch (err) {
      console.error("Error sending message:", err)
      setError(err instanceof Error ? err.message : "An error occurred")

      // Remove the assistant message if there was an error
      updateChat({
        ...chat,
        messages: [...chat.messages, userMessage],
      })
      setStreamingMessageId(null)
    } finally {
      setIsLoading(false)
      setStreamingMessageId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold truncate">{chat.title || "New Chat"}</h2>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {chat.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">Send a message to start the conversation</p>
            </div>
          ) : (
            chat.messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isStreaming={streamingMessageId === message.id}
                onCopy={() => handleCopyMessage(message.content)}
                onBranch={() => handleBranchFromMessage(message.id)}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {error && (
        <div className="p-2 mx-4 mb-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Context Usage</span>
            <span>{contextUsage}%</span>
          </div>
          <Progress value={contextUsage} className="h-1" />
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Ctrl+Enter for new line)"
            className="flex-1 min-h-[80px] max-h-[200px]"
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()} className="h-10">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
