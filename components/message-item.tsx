"use client"

import type { Message } from "../lib/types"
import { CopyIcon, GitBranchIcon, RefreshCw, FileIcon, Download, MessageSquarePlus } from "lucide-react"
import { cn } from "../lib/utils"

// import ReactMarkdown from "react-markdown"
import { Markdown } from "./markdown"
// import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
// import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useEffect, useState } from "react"
import { Button } from "../components/ui/button"
import { ResolvedImage } from "./resolved-image"
import { GeminiImageService } from "../lib/gemini-image-service"
import { imagePipelineUtility } from "../lib/image-pipeline-utility"

interface MessageItemProps {
  message: Message
  isStreaming?: boolean
  onCopy: () => void
  onBranch: () => void
  onQuote: () => void
  setdsm?: any
  setmts?: any
  isQuoted?: boolean
  hideQuoteButton?: boolean
}

export default function MessageItem({ message, isStreaming = false, onCopy, onBranch, onQuote, setdsm, setmts, isQuoted = false, hideQuoteButton = false }: MessageItemProps) {
  const _setdsm = setdsm || (() => {})
  const _setmts = setmts || (() => {})
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
    _setdsm(true)
    _setmts(message.content)
  }

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
                        imagePipelineUtility.transformImageGenerationResponse(generation.images).map((image, imgIndex) => (
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
                                  className="h-6 w-6"
                                  onClick={async () => {
                                    try {
                                      const imageService = GeminiImageService.createGeminiImageService();
                                      if (imageService) {
                                        const resolvedUri = await imageService.resolveImageUrl(image.uri,false);
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



// Helper function to get a display name from model ID
function getModelDisplayName(modelId: string): string {
  // Extract the model name from the provider/model format
  const parts = modelId.split("/")
  return parts.length > 1 ? parts[1] : modelId
}
