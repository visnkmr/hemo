"use client"

import React from "react"
import { Textarea } from "../components/ui/textarea"
import { Button } from "../components/ui/button"
import { Progress } from "../components/ui/progress"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../components/ui/hover-card"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu"
import { Input } from "../components/ui/input"
import { SendIcon, Loader2, Bot, FileIcon, ArrowDownAZ, MoveDown, Scroll, FileCheck, FileMinus, FileClock, BookX, File, FileStack, FilePlus, MessageSquareIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronRightIcon as ChevronRightIconCollapse, CopyIcon, GitBranchIcon, RefreshCw, Edit, Quote, GitCompare } from "lucide-react"
import { useRouter } from "next/navigation"
import LMStudioModelName from "./localmodelname"
import ModelSelectionDialog from "./model-selection-dialog"

interface ChatInputAreaProps {
  input: string
  setInput: (input: string) => void
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleSendMessage: (message?: string) => void
  isLoading: boolean
  isInputFocused: boolean
  setIsInputFocused: (focused: boolean) => void
  contextUsage: number
  ollamastate: number
  setollamastate: any
  vendor: string
  selectedModel: string
  handleSelectModel: (modelId: string) => void
  allModels: any[]
  isLoadingModels: boolean
  lmstudio_url: string
  lmstudio_model_name: string
  setlmmodel: any
  answerfromfile: boolean
  setanswerfromfile: any
  sendwithhistory: boolean
  setsendwithhistory: any
  fullfileascontext: boolean
  setfullfileascontext: any
  morethanonefile: boolean
  searchcurrent: boolean
  setsearchcurrent: any
  setcolorpertheme: string
}

function ChatInputArea({
  input,
  setInput,
  handleInputChange,
  handleKeyDown,
  handleSendMessage,
  isLoading,
  isInputFocused,
  setIsInputFocused,
  contextUsage,
  ollamastate,
  setollamastate,
  vendor,
  selectedModel,
  handleSelectModel,
  allModels,
  isLoadingModels,
  lmstudio_url,
  lmstudio_model_name,
  setlmmodel,
  answerfromfile,
  setanswerfromfile,
  sendwithhistory,
  setsendwithhistory,
  fullfileascontext,
  setfullfileascontext,
  morethanonefile,
  searchcurrent,
  setsearchcurrent,
  setcolorpertheme
}: ChatInputAreaProps) {
  const router = useRouter()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col pb-10 bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-grow items-center gap-2">
        <div className="flex flex-col flex-grow">
          <Textarea
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
              setollamastate(0);
            }}>
              Openrouter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setollamastate(1);
            }}>
              Ollama
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setollamastate(2);
            }}>
              LM Studio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setollamastate(4);
            }}>
              Groq
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {ollamastate == 0 ? (
          <ModelSelectionDialog
            models={allModels}
            selectedModel={selectedModel}
            onSelectModel={handleSelectModel}
            isLoading={isLoadingModels}
          />
        ) : null}
        {(ollamastate === 1 || ollamastate === 2) && (
          <LMStudioModelName
            model_name={ollamastate === 1 ? lmstudio_model_name : lmstudio_model_name}
            set_model_name={ollamastate === 1 ? setlmmodel : setlmmodel}
            ollamastate={ollamastate}
            lmstudio_url={lmstudio_url}
          />
        )}
        <Button variant={"outline"} onClick={() => handleSendMessage(input)} disabled={isLoading || !input.trim()} className="text-black dark:text-white ">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/multi-model')}
          className="rounded-full shadow-md bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
          title="Multi-Model Comparison"
        >
          <GitCompare className="h-4 w-4" />
        </Button>
        {answerfromfile ? (<HoverCard>
          <HoverCardTrigger>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setfullfileascontext(!fullfileascontext)}
              className="rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
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
              onClick={() => setsendwithhistory(!sendwithhistory)}
              className="rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
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
              onClick={() => setsearchcurrent(!searchcurrent)}
              className="rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
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
              onClick={() => setanswerfromfile(!answerfromfile)}
              className="rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
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
  )
}

export default ChatInputArea