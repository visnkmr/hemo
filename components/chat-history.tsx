"use client"

import type { Chat } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { MessageSquareIcon, TrashIcon } from "lucide-react"
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
            <MessageSquareIcon className="h-4 w-4 flex-shrink-0" />
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
