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
import LMStudioURL from "./lmstudio-url"

// --- Type Definitions ---

interface SendMessageStreamParams {
  notollama: number;
  url: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  lmstudio_url:string;
}

interface ChatInterfaceProps {
  ollamastate: number;
  chat: Chat;
  updateChat: (chat: Chat) => void;
  apiKey: string;
  selectedModel: string; // Keep selectedModel for overall component state
  selectedModelInfo: any;
  onBranchConversation: (branchPoint: BranchPoint) => void;
  lmstudio_url: string;
  lmstudio_model_name: string;
  directsendmessage?: boolean;
  messagetosend?: string;
}

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
  apiKey,
  model,
  messages,
  lmstudio_url
}: SendMessageStreamParams): AsyncGenerator<string, void, unknown> {
  let headers_openrouter = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": typeof window !== "undefined" ? window.location.href : "",
        "X-Title": "Batu",
      };
    let headers_ollama={ 'Content-Type': 'application/json' };
  // if (notollama===0 || notollama===2) {
    const response = await fetch(`${url}/v1/chat/completions`, {
      method: "POST",
      headers: (notollama===0 || notollama===2)?headers_openrouter:headers_ollama,
      body: JSON.stringify({
        model: model,
        messages: messages,
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
  apiKey,
  lmstudio_url,
  lmstudio_model_name,
  selectedModel,
  selectedModelInfo,
  onBranchConversation,
  directsendmessage = false,
  messagetosend = "",
}: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [contextUsage, setContextUsage] = useState(0)

  // Calculate context usage effect
  useEffect(() => {
    const totalChars = chat.messages.reduce((acc, msg) => acc + msg.content.length, 0) + input.length
    const estimatedTokens = Math.ceil(totalChars / 4)
    const maxContext = selectedModelInfo?.context_length || 4096
    const usagePercentage = Math.min(100, Math.ceil((estimatedTokens / maxContext) * 100))
    setContextUsage(usagePercentage)
  }, [chat.messages, input, selectedModelInfo])


  // Main function to handle sending a message
  const handleSendMessage = async (messageContent: string = input) => {
    if (!messageContent.trim() || isLoading) return;

    setError(null);
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

    try {
        // Determine API URL and model
        const apiUrl = ollamastate==0 ? "https://openrouter.ai/api" : lmstudio_url;
        const modelToSend = ollamastate==0 ? selectedModel : lmstudio_model_name;
        const messagesToSend = [...initialMessages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));

        let accumulatedContent = "";

        // Call the generator and process the stream
        for await (const contentChunk of sendMessageStream({
            url: apiUrl,
            notollama: ollamastate,
            apiKey: apiKey,
            model: modelToSend,
            messages: messagesToSend,
            lmstudio_url:lmstudio_url,
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
        setError(err instanceof Error ? err.message : "An error occurred");
        // On error, remove the assistant placeholder message
        updateChat({
            ...chat,
            messages: [...initialMessages, userMessage],
        });
    } finally {
        setIsLoading(false);
        setStreamingMessageId(null);
    }
  };

    // Effect for direct message sending
  useEffect(() => {
    if (directsendmessage && messagetosend && !isLoading) {
        handleSendMessage(messagetosend);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directsendmessage, messagetosend, isLoading]); // Dependencies added

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

  // --- JSX Rendering ---

  return (
    <div className="flex flex-col h-[95%]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold truncate">{chat.title || "New Chat"}</h2>
      </div>

      {/* Message Area */}
      {/* <ScrollArea className="flex-1 p-4"> */}
      <div className="flex-grow overflow-hidden"> {/* Make chat history grow and handle overflow */}
      <div className="overflow-auto grid gap-4 p-4 h-[100%] mb-5" >
        <div className="flex items-start gap-4 flex-col flex-grow ">
          {chat.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full w-full">
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
        </div>
        </div>
      {/* </ScrollArea> */}

      {/* Error Display */}
      {error && (
        <div className="p-2 mx-4 mb-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {/* Context Usage Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Context Usage</span>
            <span>{contextUsage}%</span>
          </div>
          <Progress value={contextUsage} className="h-1" />
        </div>

        {/* Text Input & Send Button */}
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
          <Button onClick={() => handleSendMessage()} disabled={isLoading || !input.trim()} className="h-10">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}