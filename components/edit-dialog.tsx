"use client"

import React, { useState, useRef, type KeyboardEvent } from "react"
import { Textarea } from "../components/ui/textarea"
import { Button } from "../components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../components/ui/hover-card"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu"
import type { Message } from "../lib/types"
import { SendIcon, Loader2, Bot, FileIcon, ArrowDownAZ, MoveDown, Scroll, FileCheck, FileMinus, FileClock, BookX, File, FileStack, FilePlus, MessageSquareIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronRightIcon as ChevronRightIconCollapse, CopyIcon, GitBranchIcon, RefreshCw, Edit, Quote } from "lucide-react"
import { Progress } from "../components/ui/progress"
import { cn } from "../lib/utils"

// Edit Dialog Component
interface EditDialogProps {
   isOpen: boolean
   onClose: () => void
   message: Message
   onSave: (messageId: string, newContent: string) => void
   ollamastate: number
   selectedModel: string
   selectedModelInfo: any
   allModels: any[]
   handleSelectModel: (modelId: string) => void
   isLoadingModels: boolean
   vendor: string
   setollamastate: any
   getModelColor: any
   getModelDisplayName: any
   answerfromfile: boolean
   setanswerfromfile: any
   sendwithhistory: boolean
   setsendwithhistory: any
   fullfileascontext: boolean
   setfullfileascontext: any
   morethanonefile: boolean
   searchcurrent: boolean
   setsearchcurrent: any
   contextUsage: number
   setcolorpertheme: string
 }

function EditDialog({
   isOpen,
   onClose,
   message,
   onSave,
   ollamastate,
   selectedModel,
   selectedModelInfo,
   allModels,
   handleSelectModel,
   isLoadingModels,
   vendor,
   setollamastate,
   getModelColor,
   getModelDisplayName,
   answerfromfile,
   setanswerfromfile,
   sendwithhistory,
   setsendwithhistory,
   fullfileascontext,
   setfullfileascontext,
   morethanonefile,
   searchcurrent,
   setsearchcurrent,
   contextUsage,
   setcolorpertheme
 }: EditDialogProps) {
   const [editContent, setEditContent] = useState(message.content)
   const [isLoading, setIsLoading] = useState(false)
   const textareaRef = useRef<HTMLTextAreaElement>(null)

   React.useEffect(() => {
     if (isOpen && textareaRef.current) {
       textareaRef.current.focus()
       textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length)
     }
   }, [isOpen])

   const handleSave = () => {
     if (editContent.trim()) {
       onSave(message.id, editContent.trim())
       onClose()
     }
   }

   const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
     if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
       e.preventDefault()
       handleSave()
     }
     if (e.key === "Escape") {
       onClose()
     }
   }

   if (!isOpen) return null

   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
         <div className="p-6">
           <h2 className="text-lg font-semibold mb-4 dark:text-white">Edit Message</h2>

           {/* Original Message Display */}
           <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
             <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Original message:</div>
             <div className="text-gray-700 dark:text-gray-300">{message.content}</div>
           </div>

           {/* Edit Input */}
           <div className="mb-4">
             <Textarea
               ref={textareaRef}
               value={editContent}
               onChange={(e) => setEditContent(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Edit your message... (Enter to save, Esc to cancel)"
               className="min-h-[120px] dark:bg-gray-900 border bg-gray-50"
               disabled={isLoading}
             />
             <Progress value={contextUsage} className="h-1 mt-2" />
           </div>

           {/* Options Row - Mimic the query box */}
           <div className="mb-4 flex flex-row gap-4 w-full flex-wrap">
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="outline">
                   <Bot size={16} className="mr-2" />
                   {vendor}
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent>
                 <DropdownMenuItem onClick={() => setollamastate(0)}>
                   Openrouter
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setollamastate(1)}>
                   Ollama
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setollamastate(2)}>
                   LM Studio
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setollamastate(4)}>
                   Groq
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>

             {ollamastate === 0 && (
               <div>Model Selection Component would go here</div>
             )}

             {answerfromfile && (
               <HoverCard>
                 <HoverCardTrigger>
                   <Button
                     variant="outline"
                     size="icon"
                     onClick={() => setfullfileascontext(!fullfileascontext)}
                   >
                     {fullfileascontext ? (<FileCheck className="h-4 w-4" />) : (<FileMinus className="h-4 w-4" />)}
                   </Button>
                 </HoverCardTrigger>
                 <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                   {fullfileascontext ? "Full file contents will be passed as context" : "Embeddings will be passed as context"}
                 </HoverCardContent>
               </HoverCard>
             )}

             <HoverCard>
               <HoverCardTrigger>
                 <Button
                   variant="outline"
                   size="icon"
                   onClick={() => setsendwithhistory(!sendwithhistory)}
                 >
                   {sendwithhistory ? (<FileClock className="h-4 w-4" />) : (<BookX className="h-4 w-4" />)}
                 </Button>
               </HoverCardTrigger>
               <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                 {sendwithhistory ? "Full chat history will be passed as context" : "Ignore chat history"}
               </HoverCardContent>
             </HoverCard>

             {morethanonefile && (
               <HoverCard>
                 <HoverCardTrigger>
                   <Button
                     variant="outline"
                     size="icon"
                     onClick={() => setsearchcurrent(!searchcurrent)}
                   >
                     {searchcurrent ? (<File className="h-4 w-4" />) : (<FileStack className="h-4 w-4" />)}
                   </Button>
                 </HoverCardTrigger>
                 <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                   {searchcurrent ? "Search current file" : "Search all the files"}
                 </HoverCardContent>
               </HoverCard>
             )}

             <HoverCard>
               <HoverCardTrigger>
                 <Button
                   variant="outline"
                   size="icon"
                   onClick={() => setanswerfromfile(!answerfromfile)}
                 >
                   {answerfromfile ? (<FilePlus className="h-4 w-4" />) : (<FileMinus className="h-4 w-4" />)}
                 </Button>
               </HoverCardTrigger>
               <HoverCardContent className={`flex flex-col ${setcolorpertheme}`}>
                 {answerfromfile ? "answer from file" : "Answer without context"}
               </HoverCardContent>
             </HoverCard>
           </div>

           {/* Action Buttons */}
           <div className="flex justify-end gap-2">
             <Button variant="outline" onClick={onClose}>
               Cancel
             </Button>
             <Button onClick={handleSave} disabled={isLoading || !editContent.trim()}>
               {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
               Save & Send
             </Button>
           </div>
         </div>
       </div>
     </div>
   )
 }

export default EditDialog