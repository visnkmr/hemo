"use client"

import React, { useState, useRef, type KeyboardEvent, useEffect, useCallback } from "react"
import { Textarea } from "../components/ui/textarea"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../components/ui/hover-card"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu"
import type { Chat, Message, BranchPoint, FileItem } from "../lib/types"
import { SendIcon, Loader2, MenuIcon, Bot, FileIcon, ArrowDownAZ, MoveDown, Scroll, FileCheck, FileMinus, FileClock, BookX, File, FileStack, FilePlus, MessageSquareIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronRightIcon as ChevronRightIconCollapse, CopyIcon, GitBranchIcon, RefreshCw } from "lucide-react"
import { ScrollArea } from "../components/ui/scroll-area"

import MessageItem from "../components/message-item"
import { Markdown } from "./markdown"
import { Progress } from "../components/ui/progress"
import LMStudioURL from "./lmstudio-url"
import QuestionsSidebar from "./questions-sidebar"
import { useIsMobile } from "../hooks/use-mobile"
// import axios from "axios"
// import { invoke } from "@tauri-apps/api/tauri";
import { Label } from "./ui/label"
import { cn } from "@/lib/utils"
// import { FileUploader } from "./fileupoader"
// --- Type Definitions ---
export let setcolorpertheme = "bg-white dark:bg-gray-800"

// Enhanced MessageItem with expand/collapse functionality
interface ExpandableMessageItemProps {
  message: Message
  isStreaming?: boolean
  onCopy: () => void
  onBranch: () => void
  setdsm: any
  setmts: any
  isExpanded: boolean
  onToggleExpand: () => void
}

function ExpandableMessageItem({ message, isStreaming = false, onCopy, onBranch, setdsm, setmts, isExpanded, onToggleExpand }: ExpandableMessageItemProps) {
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

  const Resend = () => {
    setdsm(true)
    setmts(message.content)
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const shouldShowExpandButton = isUser && message.content.length > 100

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start", "max-w-[85vw] w-full")}>
        <div
          className={cn(
            "gap-3 p-4 rounded-lg relative overflow-hidden w-full",
            isUser ? "bg-blue-50 dark:bg-blue-900/20 max-w-[70vw]" : "bg-gray-50 dark:bg-gray-800/50 max-w-full",
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
                  <img src={message.imageUrl} alt="Generated image" className="rounded-lg max-w-full h-auto" />
                </div>
              )}
              <div className="overflow-x-auto break-words hyphens-auto">
                <Markdown>
                  {shouldShowExpandButton && !isExpanded
                    ? truncateText(message.content)
                    : message.content
                  }
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

// Question Group Component for Grok-style scrollable answers
interface QuestionGroupProps {
  question: Message
  answers: Message[]
  onCopy: (content: string) => void
  onBranch: (messageId: string) => void
  setdsm: any
  setmts: any
  isStreaming?: boolean
  streamingMessageId?: string | null
  isQuestionExpanded: boolean
  onToggleQuestionExpand: () => void
}

function QuestionGroup({ question, answers, onCopy, onBranch, setdsm, setmts, isStreaming, streamingMessageId, isQuestionExpanded, onToggleQuestionExpand }: QuestionGroupProps) {
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(0)

  const handlePrevious = () => {
    setCurrentAnswerIndex(prev => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentAnswerIndex(prev => Math.min(answers.length - 1, prev + 1))
  }

  const currentAnswer = answers[currentAnswerIndex]

  return (
    <div className="w-full space-y-4">
      {/* Question with expand/collapse */}
      <ExpandableMessageItem
        message={question}
        onCopy={() => onCopy(question.content)}
        onBranch={() => onBranch(question.id)}
        setdsm={setdsm}
        setmts={setmts}
        isExpanded={isQuestionExpanded}
        onToggleExpand={onToggleQuestionExpand}
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
                    onClick={() => setCurrentAnswerIndex(index)}
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
            setdsm={setdsm}
            setmts={setmts}
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
  setlmmodel: any;
  ollamastate: number;
  chat: Chat;
  updateChat: (chat: Chat) => void;
  // apiKey: string;
  selectedModel: string; // Keep selectedModel for overall component state
  selectedModelInfo: any;
  onBranchConversation: (branchPoint: BranchPoint) => void;
  lmstudio_url: string;
  lmstudio_model_name: string;
  filegpt_url: string;
  message?: FileItem;
  directsendmessage?: boolean;
  messagetosend?: string;
  sidebarVisible: any;
  setSidebarVisible: any;
  setIsModelDialogOpen: any;
  getModelColor: any;
  getModelDisplayName: any;
  setollamastate: any;
}

// async function fileloader(setIsLoading,chat: Chat,updateChat: (chat: Chat) => void,ollamastate: number,selectedModel: string,lmstudio_model_name: string,filegptendpoint:string,filePaths:string[]):Promise<boolean>{
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
//                 model:  ollamastate==0 ? selectedModel : lmstudio_model_name,
//               };


//               const initialMessages = chat.messages;
//               let currentChatState = {
//                   ...chat,
//                   messages: [...initialMessages, assistantMessage],
//                   title: initialMessages.length === 0 ? `FileGPT: ${filePaths} ` : chat.title,
//                   lastModelUsed:  ollamastate==0 ? selectedModel : lmstudio_model_name,
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
//                 model:  ollamastate==0 ? selectedModel : lmstudio_model_name,
//               };


//               const initialMessages = chat.messages;
//               let currentChatState = {
//                   ...chat,
//                   messages: [...initialMessages, assistantMessage],
//                   title: initialMessages.length === 0 ? `FileGPT: ${filePaths} ` : chat.title,
//                   lastModelUsed:  ollamastate==0 ? selectedModel : lmstudio_model_name,
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
  const storedApiKey = localStorage.getItem(notollama == 4 ? "groq_api_key" : "openrouter_api_key")
  console.log(storedApiKey)
  console.log("========" + notollama)
  // const or_mi=localStorage.getItem("or_model_info")
  let modelname
  switch (notollama) {
    case 0:
      modelname = localStorage.getItem("or_model")
      break;
    case 1:
      modelname = localStorage.getItem("lmstudio_model_name")
      break;
    case 2:
      modelname = localStorage.getItem("lmstudio_model_name")
      break;
    case 3:
      modelname = ""
      break;
    case 4:
      modelname = localStorage.getItem("groq_model_name")
      break;
  }
  // const modelname = notollama==0?model:
  console.log(modelname)

  let prompt = context.trim() === "" ? `Given the following chathistory, answer the question accurately and concisely. \n\nChat History:\n${messages.slice(0, messages.length - 1).map(m => m.content).join('\n')}\n\nQuestion: ${messages[messages.length - 1].content}` : `Given the following chathistory, context, answer the question accurately and concisely. If the answer is not in the context, state that you cannot answer from the provided information.\n\nChat History:\n${messages.slice(0, messages.length - 1).map(m => m.content).join('\n')}\n\nContext: ${context}\n\nQuestion: ${messages[messages.length - 1].content}`;
  console.log(prompt)
  let headers_openrouter = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${storedApiKey}`,
    "HTTP-Referer": typeof window !== "undefined" ? window.location.href : "",
    "X-Title": "Batu",
  };
  let headers_ollama = { 'Content-Type': 'application/json' };
  // if (notollama===0 || notollama===2) {
  const response = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: (notollama === 0 || notollama === 2 || notollama === 4) ? headers_openrouter : headers_ollama,
    body: JSON.stringify({
      model: modelname,
      messages: [{ role: 'user', content: prompt }],
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
  // apiKey,
  lmstudio_url,
  setlmmodel,
  setlmurl,
  lmstudio_model_name,
  filegpt_url,
  message,
  selectedModel,
  selectedModelInfo,
  onBranchConversation,
  directsendmessage = false,
  messagetosend = "",

  sidebarVisible,
  setSidebarVisible,
  setIsModelDialogOpen,
  getModelDisplayName,
  getModelColor,
  setollamastate
}: ChatInterfaceProps) {
  // const [filePaths, setFilePaths] = useState([message?message.path:""]);

  const [input, setInput] = useState("")
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [dsm, setdsm] = useState(directsendmessage)
  const [mts, setmts] = useState(messagetosend)
  const [error, setError] = useState<string | null>(null)
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
  //               model:  ollamastate==0 ? selectedModel : lmstudio_model_name,
  //             };


  //             const initialMessages = chat.messages;
  //             let currentChatState = {
  //                 ...chat,
  //                 messages: [...initialMessages, assistantMessage],
  //                 title: initialMessages.length === 0 ? `FileGPT: ${filePaths} ` : chat.title,
  //                 lastModelUsed:  ollamastate==0 ? selectedModel : lmstudio_model_name,
  //             };
  //             updateChat(currentChatState);
  //       })
  // },[])
  useEffect(() => {
    if (message?.path) {
      setSelectedFilePath([...message.path])
      // setFilePaths([message.path])
      // fileloader(setIsLoading,chat,updateChat,ollamastate,selectedModel,lmstudio_model_name,filegpt_url,selectedFilePath)
    }
  }, [message])

  // const [context,setcontext]=useState("")

  // State for dialog to request URL and model name
  const [showDialog, setShowDialog] = useState(false);
  // const [tempUrl, setTempUrl] = useState(lmstudio_url);
  // const [tempModelName, setTempModelName] = useState(lmstudio_model_name);

  // Main function to handle sending a message
  const handleSendMessage = async (messageContent: string = input) => {
    if (!messageContent.trim() || isLoading) return;

    setError(null);

    // Check if using LM Studio or Ollama and if URL and model are provided
    if (ollamastate === 1 || ollamastate === 2) {
      if (!lmstudio_url || !lmstudio_model_name) {
        setShowDialog(true);
        setIsLoading(false);
        return;
      }
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
      model: ollamastate == 0 ? selectedModel : lmstudio_model_name,
    };
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      model: ollamastate == 0 ? selectedModel : lmstudio_model_name,
    };

    setStreamingMessageId(assistantMessageId);

    const initialMessages = chat.messages;
    // Update chat with user message & placeholder
    let currentChatState = {
      ...chat,
      messages: [...initialMessages, userMessage, assistantMessage],
      title: initialMessages.length === 0 ? messageContent.slice(0, 30) : chat.title,
      lastModelUsed: ollamastate == 0 ? selectedModel : lmstudio_model_name,
    };
    updateChat(currentChatState);



    // Call the generator and process the stream
    if (ollamastate !== 3) {
      try {
        // Determine API URL and model
        let apiUrl = "";
        if (ollamastate === 0) {
          apiUrl = "https://openrouter.ai/api";
        } else if (ollamastate === 4) {
          apiUrl = "https://api.groq.com/openai";
        } else if (ollamastate === 1 || ollamastate === 2) {
          apiUrl = lmstudio_url;
        } else if (ollamastate === 3) {
          apiUrl = filegpt_url;
        }
        const modelToSend = ollamastate == 0 ? selectedModel : lmstudio_model_name;
        const messagesToSend = [...initialMessages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
        //  const stored_lm_model_name = localStorage.getItem("lmstudio_model_name")
        let accumulatedContent = "";
        let context = ""
        // const context=answerfromfile?(await invoke("queryfile",{question:JSON.stringify(messagesToSend[messagesToSend.length-1].content),
        //  model:stored_lm_model_name?stored_lm_model_name:"qwen2.5:3b",
        //  embeddingmodelname:"nomic-embed-text",
        //  usecompletefile:fullfileascontext,
        //  pathstr: searchcurrent?(await(await import('@tauri-apps/api/window')).appWindow.title()).replace("FileGPT: ",""):"ALL"
        // }).catch(e=>console.log(e)) as string):""; 
        // console.log(`----------context: ${context}`)

        for await (const contentChunk of sendMessageStream({
          url: apiUrl,
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
    }
    else {
      const messagesToSend = [...initialMessages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
      // const stored_lm_model_name = localStorage.getItem("lmstudio_model_name")
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
      handleSendMessage(mts);
      setdsm(false)
      setmts("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsm, mts, isLoading]); // Dependencies added

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

  const generateImage = async (prompt: string) => {
    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
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
    let currentChatState = {
      ...chat,
      messages: [...initialMessages, userMessage, assistantMessage],
      title: initialMessages.length === 0 ? prompt.slice(0, 30) : chat.title,
      lastModelUsed: selectedModel,
    };
    updateChat(currentChatState);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("openrouter_api_key")}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          n: 1,
          size: "512x512",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const data = await response.json();
      const imageUrl = data.data[0].url;

      const updatedMessages = [...currentChatState.messages];
      updatedMessages[updatedMessages.length - 1] = {
        ...updatedMessages[updatedMessages.length - 1],
        content: `Image generated for prompt: ${prompt}`,
        imageUrl: imageUrl,
      };

      currentChatState = {
        ...currentChatState,
        messages: updatedMessages,
      };
      updateChat(currentChatState);
    } catch (err) {
      console.error("Error generating image:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      updateChat({
        ...chat,
        messages: [...initialMessages, userMessage],
      });
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
    }
  };

  // Function to handle dialog submission
  const handleDialogSubmit = () => {
    if (lmstudio_model_name && lmstudio_url) {
      // localStorage.setItem("lmstudio_url", tempUrl)
      // localStorage.setItem("lmstudio_model_name", tempModelName)
      // Assuming there is a way to update these values in the parent component or context
      // For now, we'll just log a message since updating parent state requires additional props
      // console.log("Updated LM Studio/Ollama URL and Model:", tempUrl, tempModelName);
      setShowDialog(false);
      // Trigger sending the message again with updated values
      handleSendMessage();
    } else {
      setError("Both URL and model name are required.");
    }
  };
  const [autoscroll, setautoscroll] = useState(false);
  const [fullfileascontext, setfullfileascontext] = useState(false);
  const [sendwithhistory, setsendwithhistory] = useState(false);
  const [searchcurrent, setsearchcurrent] = useState(true);
  const [questionsSidebarCollapsed, setQuestionsSidebarCollapsed] = useState(true);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);

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
          groups.push({
            type: 'question-group',
            question: message,
            answers: answers,
            id: `group-${message.id}`
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
          if (i + 1 < chat.messages.length && chat.messages[i + 1].role === 'assistant') {
            groups.push({
              type: 'single',
              message: chat.messages[i + 1],
              id: chat.messages[i + 1].id
            })
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
        }
      }
    }

    return groups
  }, [chat.messages])
  const scrolltobottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement && containerRef.current) {
      messageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, []);

  useEffect(() => {
    if (autoscroll) {
      setTimeout(scrolltobottom, 2); // run the function every 2ms
    }
  }, [chat, autoscroll, scrolltobottom]);
  const [morethanonefile, setmtof] = useState(false)
  // useEffect(()=>{
  //   invoke("fileslist",{}).then((filePaths)=>{setmtof(filePaths!.length>1?true:false)})
  // },[])
  const [vendor, setvendor] = useState("Openrouter")
  // const [label,setlabel]=useState("")
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

      default:
        break;
    }
    localStorage.setItem("laststate", ollamastate.toString())

  }, [ollamastate])
  return (
    <div className="">
      {/* Dialog for URL and Model Name */}
      {showDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96 focus:outline-none" tabIndex={-1} onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleDialogSubmit();
            }
          }}>
            <h2 className="text-xl font-semibold mb-4">LM Studio/Ollama Configuration</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Please provide the URL and model name to proceed.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">URL</label>
              <Input
                type="text"
                value={lmstudio_url}
                onChange={(e) => setlmurl(e.target.value)}
                placeholder="Enter URL"
                className="w-full"
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Model Name</label>
              <Input
                type="text"
                value={lmstudio_model_name}
                onChange={(e) => setlmmodel(e.target.value)}
                placeholder="Enter Model Name"
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleDialogSubmit}>Submit</Button>
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
                        message={group.message}
                        isStreaming={streamingMessageId === group.message.id}
                        onCopy={() => handleCopyMessage(group.message!.content)}
                        onBranch={() => handleBranchFromMessage(group.message!.id)}
                        setmts={setmts}
                        setdsm={setdsm}
                        isExpanded={expandedMessages.has(group.message.id)}
                        onToggleExpand={() => toggleMessageExpansion(group.message!.id)}
                      />
                    ) : (
                      <MessageItem
                        message={group.message}
                        isStreaming={streamingMessageId === group.message.id}
                        onCopy={() => handleCopyMessage(group.message!.content)}
                        onBranch={() => handleBranchFromMessage(group.message!.id)}
                        setmts={setmts}
                        setdsm={setdsm}
                      />
                    )
                  ) : group.type === 'question-group' && group.question && group.answers ? (
                    <QuestionGroup
                      question={group.question}
                      answers={group.answers}
                      onCopy={handleCopyMessage}
                      onBranch={handleBranchFromMessage}
                      setmts={setmts}
                      setdsm={setdsm}
                      isStreaming={group.answers.some(answer => streamingMessageId === answer.id)}
                      streamingMessageId={streamingMessageId}
                      isQuestionExpanded={expandedMessages.has(group.question.id)}
                      onToggleQuestionExpand={() => toggleMessageExpansion(group.question!.id)}
                    />
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



      {/* Error Display */}
      {error && (
        <div className="p-2 mx-4 mb-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className={`absolute bottom-0 left-0 right-64 pl-8 pr-4 ${isInputFocused ? '' : ''}`} >
        <div className="mx-auto flex w-full max-w-4xl flex-col pb-10  bg-gray-50 dark:bg-gray-900">
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

          <div className="flex flex-grow items-end gap-2">
            <div className="flex flex-col flex-grow">

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
                {/* <DropdownMenuItem onClick={() => { setcobi(true); setollamastate(3); }}>
                FileGPT
              </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
            {ollamastate == 0 ? (<Button variant="outline" onClick={() => setIsModelDialogOpen(true)} className="flex items-center gap-2">
              {selectedModelInfo ? (
                <>
                  <div className={`w-4 h-4 rounded-full bg-${getModelColor(selectedModel)}`}></div>
                  <span className="truncate max-w-[150px]">{getModelDisplayName(selectedModel)}</span>
                </>
              ) : (
                "Select Model"
              )}
            </Button>) : null}
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
                {/* <Button variant="outline" size="icon" onClick={() => fileloader(setIsLoading,chat,updateChat,ollamastate,selectedModel,lmstudio_model_name,filegpt_url,selectedFilePath)}>
                <FileIcon className="h-4 w-4" />
                <Input  id="picture" type="file" />
              </Button> */}
              </div>
            )}

            <Button variant={"outline"} onClick={() => handleSendMessage(input)} disabled={isLoading || !input.trim()} className="text-black dark:text-white ">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrolltobottom}
              className="rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
              title="Scroll to bottom"
            >
              <MoveDown className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setautoscroll(cv => !cv)}
              className="rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
              title="Autoscroll"
            >
              <Scroll className="h-4 w-4" />
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
          </div>
        </div>
      </div>
    </div>
  );
}
