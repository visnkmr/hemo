"use client"

import type { Chat } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { MessageSquareIcon, TrashIcon, GitBranchIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface ChatHistoryProps {
  chats: Chat[]
  currentChatId: string
  setCurrentChatId: (id: string) => void
  deleteChat: (id: string) => void
}

export default function ChatHistory({ chats, currentChatId, setCurrentChatId, deleteChat }: ChatHistoryProps) {
  if (chats.length === 0) {
    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">No chat history</div>
  }

  // Helper function to get a consistent color based on model name
  const getModelColor = (modelId: string): string => {
    if (!modelId) return "bg-gray-500"

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

  return (
    <div className="space-y-1 p-2">
      {chats.map((chat) => (
        <div
          key={chat.id}
          className={cn(
            "flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group",
            chat.id === currentChatId && "bg-gray-100 dark:bg-gray-700",
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => setCurrentChatId(chat.id)}>
            <div className="relative">
              <MessageSquareIcon className="h-4 w-4 flex-shrink-0" />
              {chat.lastModelUsed && (
                <div
                  className={cn("absolute -bottom-1 -right-1 w-2 h-2 rounded-full", getModelColor(chat.lastModelUsed))}
                ></div>
              )}
              {chat.branchedFrom && <GitBranchIcon className="absolute -top-1 -right-1 h-3 w-3 text-gray-500" />}
            </div>
            <div className="truncate">
              <div className="font-medium truncate">{chat.title || "New Chat"}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(chat.createdAt), "MMM d, yyyy")}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              deleteChat(chat.id)
            }}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
