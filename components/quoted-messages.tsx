"use client"

import React from "react"
import { Button } from "../components/ui/button"
import type { Message } from "../lib/types"

interface QuotedMessagesProps {
  quotedMessages: Message[]
  setQuotedMessages: (messages: Message[]) => void
}

function QuotedMessages({ quotedMessages, setQuotedMessages }: QuotedMessagesProps) {
  if (quotedMessages.length === 0) return null

  return (
    <div className="mb-3 space-y-2">
      {quotedMessages.map((quotedMessage, index) => (
        <div
          key={quotedMessage.id}
          className="p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 rounded-r-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          onClick={() => {
            // Scroll to the original message
            const messageElement = document.querySelector(`[data-message-id="${quotedMessage.id}"]`) as HTMLElement
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
  )
}

export default QuotedMessages