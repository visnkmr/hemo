"use client"

import type { Message } from "@/lib/types"
import { UserIcon, BotIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import ReactMarkdown from "react-markdown"
import { useEffect, useState } from "react"

interface MessageItemProps {
  message: Message
  isStreaming?: boolean
}

export default function MessageItem({ message, isStreaming = false }: MessageItemProps) {
  const isUser = message.role === "user"
  const [showCursor, setShowCursor] = useState(true)

  // Blinking cursor effect for streaming messages
  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 500)

    return () => clearInterval(interval)
  }, [isStreaming])

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg",
        isUser ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-50 dark:bg-gray-800/50",
      )}
    >
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
            <BotIcon className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{isUser ? "You" : "AI Assistant"}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(message.timestamp), "MMM d, h:mm a")}
          </span>
        </div>

        <div className="prose dark:prose-invert prose-sm max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
          {isStreaming && showCursor && <span className="animate-pulse">▌</span>}
        </div>
      </div>
    </div>
  )
}
