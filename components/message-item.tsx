"use client"

import type { Message } from "../lib/types"
import { CopyIcon, GitBranchIcon, RefreshCw, Quote } from "lucide-react"
import { cn } from "../lib/utils"

// import ReactMarkdown from "react-markdown"
import { Markdown } from "./markdown"
// import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
// import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useEffect, useState } from "react"
import { Button } from "../components/ui/button"

interface MessageItemProps {
   message: Message
   isStreaming?: boolean
   onCopy: () => void
   onBranch: () => void
   setdsm: any
   setmts: any
   onQuoteMessage?: (message: Message) => void
   isQuoted?: boolean
 }

export default function MessageItem({ message, isStreaming = false, onCopy, onBranch, setdsm, setmts, onQuoteMessage, isQuoted = false }: MessageItemProps) {
  const isUser = message.role === "user"
  const [showCursor, setShowCursor] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  // Blinking cursor effect for streaming messages
  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 500)

    return () => clearInterval(interval)
  }, [isStreaming])

  // Custom renderer for code blocks
  // const components = {
  //   code({ node, inline, className, children, ...props }: any) {
  //     const match = /language-(\w+)/.exec(className || "")
  //     return !inline && match ? (
  //       <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
  //         {String(children).replace(/\n$/, "")}
  //       </SyntaxHighlighter>
  //     ) : (
  //       <code className={className} {...props}>
  //         {children}
  //       </code>
  //     )
  //   },
  // }
  const Resend = () => {
    setdsm(true)
    setmts(message.content)
  }

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start", "max-w-[85vw] w-full")}>
        <div
          className={cn(
            "gap-3 p-4 rounded-lg relative overflow-hidden w-full",
            isUser ? "bg-blue-50 dark:bg-blue-900/20 max-w-[70vw]" : "bg-gray-50 dark:bg-gray-800/50 max-w-full",
            isQuoted ? "ring-2 ring-green-400 dark:ring-green-500 bg-green-50 dark:bg-green-900/20" : ""
          )}
        >
          {/* <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-white" />
          </div>
        ) : (
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              message.model ? `bg-${getModelColor(message.model)}` : "bg-purple-500",
            )}
          >
            <BotIcon className="h-5 w-5 text-white" />
          </div>
        )}
      </div> */}

          <div className="space-y-2">
            <div className="items-center gap-2">
              <span className="font-medium">
                {/* {isUser ? "You" : "AI Assistant"} */}
                {message.model && !isUser && (
                  <span className="text-xs ml-2 opacity-70">({getModelDisplayName(message.model)})</span>
                )}
              </span>
              {/* <span className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(message.timestamp), "MMM d, h:mm a")}
          </span> */}
            </div>

            <div className="prose dark:prose-invert prose-sm break-words w-full overflow-hidden">
              {message.imageUrl && (
                <div className="mt-2">
                  <img src={message.imageUrl} alt="Generated image" className="rounded-lg max-w-full h-auto" />
                </div>
              )}
              <div className="overflow-x-auto break-words hyphens-auto">
                <Markdown>
                  {message.content}
                </Markdown>
              </div>
              <span className={`animate-pulse ${isStreaming ? (showCursor ? "" : "invisible") : "hidden"}`}>▌</span>
            </div>
          </div>


        </div>
        {!isStreaming && (
          <div className={cn("flex gap-1 mt-2", isHovered ? "visible" : "invisible")}>
            {isUser && (
              <Button variant="ghost" size="icon" onClick={Resend} title="Resend message">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => {
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



// Helper function to get a display name from model ID
function getModelDisplayName(modelId: string): string {
  // Extract the model name from the provider/model format
  const parts = modelId.split("/")
  return parts.length > 1 ? parts[1] : modelId
}
