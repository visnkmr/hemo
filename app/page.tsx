"use client"

import { useEffect, useState } from "react"
import ChatInterface from "@/components/chat-interface"
import ChatHistory from "@/components/chat-history"
import ApiKeyInput from "@/components/api-key-input"
import LMStudioURL from "@/components/lmstudio-url"
import LMStudioModelName from "@/components/localmodelname"
import type { Chat, BranchPoint } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { PlusIcon, MenuIcon, XIcon, Download, Bot } from "lucide-react"
import ModelSelectionDialog from "@/components/model-selection-dialog"
import ExportDialog from "@/components/export-dialog"
import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"

export default function Home() {
  const [apiKey, setApiKey] = useState<string>("")
  const [lmurl, setlmurl] = useState<string>("")
  const [model_name, set_model_name] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [selectedModelInfo, setSelectedModelInfo] = useState<any>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string>("")
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [ollamastate, setollamastate] = useState(0)
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [allModels, setAllModels] = useState<any[]>([])

  useEffect(()=>{
    setCollapsed(true)
  },[currentChatId])
  // Load API key and chats from localStorage on initial render
  useEffect(() => {
    const storedlmurl = localStorage.getItem("lmstudio_url")
    if (ollamastate!==0 && storedlmurl) {
      setlmurl(storedlmurl)
    }
    
    const stored_lm_model_name = localStorage.getItem("lmstudio_model_name")
    if (ollamastate!==0 && storedlmurl && stored_lm_model_name) {
      set_model_name(stored_lm_model_name)
      setSelectedModel(model_name)
    }
  },[ollamastate]);
  console.log(lmurl)
  console.log(model_name)
  useEffect(() => {
    const storedApiKey = localStorage.getItem("openrouter_api_key")
    if (storedApiKey) {
      setApiKey(storedApiKey)
    }

    

    const storedChats = localStorage.getItem("chat_history")
    if (storedChats) {
      try {
        const parsedChats = JSON.parse(storedChats)
        setChats(parsedChats)

        // Set current chat to the most recent one if it exists
        if (parsedChats.length > 0) {
          setCurrentChatId(parsedChats[0].id)
        } else {
          createNewChat()
        }
      } catch (error) {
        console.error("Failed to parse stored chats:", error)
        createNewChat()
      }
    } else {
      createNewChat()
    }
  }, [])

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem("chat_history", JSON.stringify(chats))
    }
  }, [chats])

  // Fetch models when API key is set
  useEffect(() => {
    if (!apiKey) return

    const fetchModels = async () => {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/models", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch models")
        }

        const data = await response.json()
        setAllModels(data.data)

        // // Filter for free models (where pricing is 0)
        // const freeModels = data.data.filter((model: any) => {
        //   return Number.parseFloat(model.pricing?.prompt) <= 0 && Number.parseFloat(model.pricing?.completion) <= 0
        // })

        // Set the first model as selected if none is selected
        // if (freeModels.length > 0 && !selectedModel) {
        //   setSelectedModel(freeModels[0].id)
        //   setSelectedModelInfo(freeModels[0])
        // }
      } catch (err) {
        console.error("Error fetching models:", err)
      }
    }

    fetchModels()
  }, [apiKey])

  const createNewChat = () => {
    const newChatId = Date.now().toString()
    const newChat: Chat = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
      lastModelUsed: selectedModel,
      branchedFrom: null,
    }

    setChats((prevChats) => [newChat, ...prevChats])
    setCurrentChatId(newChatId)
  }

  const updateChat = (updatedChat: Chat) => {
    setChats((prevChats) => prevChats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat)))
  }
 const renameChat = (id: string, newTitle: string) => {
    setChats(chats.map((chat) => (chat.id === id ? { ...chat, title: newTitle } : chat)))
  }
  const deleteChat = (chatId: string) => {
    setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId))

    if (currentChatId === chatId) {
      if (chats.length > 1) {
        // Set current chat to the next available one
        const nextChat = chats.find((chat) => chat.id !== chatId)
        if (nextChat) {
          setCurrentChatId(nextChat.id)
        } else {
          createNewChat()
        }
      } else {
        createNewChat()
      }
    }
  }

  const handleBranchConversation = (branchPoint: BranchPoint) => {
    const newChatId = Date.now().toString()
    const originalChat = chats.find((chat) => chat.id === branchPoint.originalChatId)

    if (!originalChat) return

    // Create a title based on the last user message in the branch
    const lastUserMessage = [...branchPoint.messages].reverse().find((msg) => msg.role === "user")
    const branchTitle = lastUserMessage ? `Branch: ${lastUserMessage.content.slice(0, 20)}...` : "New Branch"

    const newChat: Chat = {
      id: newChatId,
      title: branchTitle,
      messages: branchPoint.messages,
      createdAt: new Date().toISOString(),
      lastModelUsed: selectedModel,
      branchedFrom: {
        chatId: branchPoint.originalChatId,
        messageId: branchPoint.branchedFromMessageId,
        timestamp: branchPoint.timestamp,
      },
    }

    setChats((prevChats) => [newChat, ...prevChats])
    setCurrentChatId(newChatId)
  }

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId)
    const modelInfo = allModels.find((model: any) => model.id === modelId)
    setSelectedModelInfo(modelInfo || null)
    setIsModelDialogOpen(false)
  }
const [collapsed, setCollapsed] = useState(true);

  const toggleMenu = () => {
    setCollapsed(prev => !prev);
  };

  const currentChat = chats.find((chat) => chat.id === currentChatId)
  const [viewportHeight, setViewportHeight] = useState((typeof window === 'undefined')? "h-full" :window.innerHeight);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setViewportHeight(window.visualViewport?.height || window.innerHeight);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);

    // Initial call
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="absolute w-screen bg-gray-50 dark:bg-gray-900 overflow-hidden" style={{ height: viewportHeight }}>
      {(
        <div className="relative h-full overflow-hidden">
          <div className="absolute top-4 left-4 z-50 p-2 rounded-md  text-white bg-gray-900 ">
            <div className="flex flex-row gap-4 ">
          <Button className="bg-gray-50 dark:bg-gray-900" variant="ghost" size="icon" onClick={() => toggleMenu()}>
            {<MenuIcon size={20} />}
          </Button>
         <Button onClick={createNewChat} variant={"outline"} className=" w-full flex items-center justify-center gap-2">
              <PlusIcon size={16} />
              New Chat
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(true)}
              disabled={!currentChat || currentChat.messages.length === 0}
            >
              <Download size={16} className="" />
              <span className="hidden lg:inline lg:ml-2">Export</span>
            </Button>
             
            </div>
          </div>
          <div className={cn(`absolute top-0 left-0 h-full bg-gray-900 text-white transition-transform duration-300 ease-in-out z-40 ${
          collapsed ? '-translate-x-full' : 'translate-x-0'}`,"pt-20 border-r border-r-gray-950")}>
          {ollamastate==0?(<div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
          </div>):null}
          {ollamastate!==0? (<><div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <LMStudioURL lmurl={lmurl} setlmurl={setlmurl} />
          </div>
          
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <LMStudioModelName model_name={model_name} set_model_name={set_model_name} />
          </div></>):<></>}
          

          <div className="flex-1 overflow-y-auto">
            <ChatHistory
            chats={chats}
            currentChatId={currentChatId}
            setCurrentChatId={setCurrentChatId}
            deleteChat={deleteChat}
            renameChat={renameChat}
      />
          </div>
            <div className="flex items-end gap-2 p-4">
          <Button onClick={createNewChat} className="w-full flex items-center justify-center gap-2">
              <PlusIcon size={16} />
              New Chat
            </Button>
            </div>
            </div>
        </div>
      )}
                {/* <SidebarMenu/> */}
      

      {/* Main content */}
      <div className={cn("flex flex-col h-full")} onClick={()=>{setCollapsed(true)}} >
        {/* <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!sidebarVisible?(<Button variant="ghost" size="icon" onClick={() => setSidebarVisible(!sidebarVisible)}>
            {<MenuIcon size={20} />}
          </Button>):null}
        </div> */}

        {currentChat && (
          <ChatInterface
          setollamastate={setollamastate}
            ollamastate={ollamastate}
            lmstudio_model_name={model_name}
            lmstudio_url={lmurl}
            chat={currentChat}
            updateChat={updateChat}
            apiKey={apiKey}
            selectedModel={selectedModel}
            selectedModelInfo={selectedModelInfo}
            onBranchConversation={handleBranchConversation}
            directsendmessage={false}
            messagetosend=""
            sidebarVisible={sidebarVisible}
            setSidebarVisible={setSidebarVisible}
            getModelColor={getModelColor}
            getModelDisplayName={getModelDisplayName}
            setIsModelDialogOpen={setIsModelDialogOpen}
          />
        )}
      </div>

      {/* Model Selection Dialog */}
      <ModelSelectionDialog
        isOpen={isModelDialogOpen}
        onClose={() => setIsModelDialogOpen(false)}
        models={allModels}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        apiKey={apiKey}
      />

      {/* Export Dialog */}
      <ExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} chat={currentChat} />

      <Toaster />
    </div>
  )
}

// Helper function to get a consistent color based on model name
function getModelColor(modelId: string): string {
  const colors = [
    "purple-500",
    "pink-500",
    "rose-500",
    "red-500",
    "orange-500",
    "amber-500",
    "yellow-500",
    "lime-500",
    "green-500",
    "emerald-500",
    "teal-500",
    "cyan-500",
    "sky-500",
    "blue-500",
    "indigo-500",
    "violet-500",
  ]

  // Simple hash function to get consistent color
  let hash = 0
  for (let i = 0; i < modelId.length; i++) {
    hash = modelId.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % colors.length
  return colors[index]
}

// Helper function to get a display name from model ID
function getModelDisplayName(modelId: string): string {
  // Extract the model name from the provider/model format
  const parts = modelId.split("/")
  return parts.length > 1 ? parts[1] : modelId
}