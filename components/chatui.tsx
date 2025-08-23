"use client"

import { useEffect, useState } from "react"
import ChatInterface from "../components/chat-interface"
import ChatHistory from "../components/chat-history"
import { useIsMobile } from "../hooks/use-mobile"
import ApiKeyInput from "../components/api-key-input"
import LMStudioURL from "../components/lmstudio-url"
import LMStudioModelName from "../components/localmodelname"
import FileGPTUrl from "../components/filegpt-url"
import type { Chat, BranchPoint, ModelRow } from "../lib/types"
import { Button } from "../components/ui/button"
import { PlusIcon, MenuIcon, XIcon, Download, Bot } from "lucide-react"

import ExportDialog from "../components/export-dialog"
import { Toaster } from "../components/ui/toaster"
import { cn } from "../lib/utils"
import DarkButton from './dark-button'
import { useChats, useConfigItem, useMigration, idb } from "../hooks/use-indexeddb"
import MigrationStatus from "./migration-status"
// import axios from "axios"
// import { fetchEventSource } from "@microsoft/fetch-event-source"
import bigDecimal from "js-big-decimal"
interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  rawfs: number;
  lmdate: number;
  timestamp: number;
  foldercon: number;
  ftype: string;
  parent: string;
}
interface gptargs {
  message?: FileItem,
  fgptendpoint?: string,
  setasollama: boolean,
  whichgpt: number
  // localorremote:boolean
}

// let fgtest=async (filegptendpoint):Promise<boolean> => {
//       try {
//         await axios.get(`${filegptendpoint}/`);
//         return true
//       } catch (error) {
//         return false
//       }
//     };
// let oir=async (fgptendpoint):Promise<boolean> => {
//       try {
//         await axios.head(`http://${fgptendpoint}:11434/`); //endpoint to check for ollama
//         return true
//       } catch (error) {
//         return false
//       }
//     };

// async function sendtofilegpt(filegptendpoint,question,isollama,setcbs,setmessage,setchathistory){
//    const abortController = new AbortController();
//   const signal = abortController.signal;

//   await fetchEventSource(`${filegptendpoint}/query-stream`, {
//     signal:signal,

//     method: "POST",
//     body: JSON.stringify({
//       query:question,
//       where:question.toLocaleLowerCase().startsWith("generally")||isollama?"ollama":""
//     }),
//     headers: { 'Content-Type': 'application/json', Accept: "text/event-stream" },
//     onopen: async (res)=> {
//       if (res.ok && res.status === 200) {
//         setcbs(true)
//         console.log("Connection made ", res);
//         // setmessage("")
//       } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
//         setcbs(false)
//         console.log("Client-side error ", res);
//       }
//     },
//     onmessage: async (event)=> {
//       {
//     // if(typeof event.data === "string"){
//       try{
//         let jp=JSON.parse(event.data);
//         setmessage((old)=>{
//           // console.log("-----------"+old)
//           console.log(event.data);
//             let dm=old+jp.token;
//           return dm});
//       }
//       catch(e){

//       }

//         }
//           // (divRef.current! as HTMLDivElement).scrollIntoView({ behavior: "smooth", block: "end" })
//       // }
//     },
//     onclose:async ()=> {
//       setcbs(false)
//       console.log("Connection closed by the server");

//     },
//     onerror (err) {
//       setchathistory((old)=>[...old,{
//         from:"bot",
//         message:`Issue finding Filegpt endpoint ${filegptendpoint} endpoint, maybe its not be running.`,
//         time:getchattime(),
//         timestamp:getchattimestamp()
//       }])
//       throw "There was some issue with your filedimegpt instance. Is it not running?"
//       // abortController.abort()
//       // console.log("There was an error from server", err);
//     },
//   });
// }
export default function ChatUI({ message, fgptendpoint = "localhost", setasollama = false, whichgpt = 0 }: gptargs) {
   // const [apiKey, setApiKey] = useState<string>("")
   const [lmurl, setlmurl] = useState<string>("")
   const [model_name, set_model_name] = useState<string>("")
   const [filegpturl, setFilegpturl] = useState<string>("")
   const [selectedModel, setSelectedModel] = useState<string>("")
   const [selectedModelInfo, setSelectedModelInfo] = useState<any>("")
   const [currentChatId, setCurrentChatId] = useState<string>("")
   const [sidebarVisible, setSidebarVisible] = useState(true)

   // Use IndexedDB hooks
   const { value: ollamastateValue, setValue: setollamastate } = useConfigItem<number>("laststate", whichgpt)
   const { chats, loading: chatsLoading, error: chatsError, saveChat, deleteChat: deleteChatFromDB, reloadChats } = useChats()

   // Debug logging for chat data
   useEffect(() => {
     console.log('ChatUI - chats state:', chats);
     console.log('ChatUI - chatsLoading:', chatsLoading);
     console.log('ChatUI - chatsError:', chatsError);
   }, [chats, chatsLoading, chatsError]);
   const { migrateFromLocalStorage, migrating, migrationComplete, migrationStats, error: migrationError } = useMigration()
 
   // Ensure ollamastate is always a number
   const ollamastate = ollamastateValue ?? whichgpt

   const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
   const [allModels, setAllModels] = useState<any[]>([])
   const [isLoadingModels, setIsLoadingModels] = useState(false)
  //Collapse sidebar on chat select
  const [collapsed, setCollapsed] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    setCollapsed(true)
  }, [currentChatId])
  // useEffect(()=>{const storedApiKey = localStorage.getItem("openrouter_api_key")
  //     if (storedApiKey) {
  //       setApiKey(storedApiKey)
  //     }},[collapsed])
  // useEffect(()=>{
  //   if (message && message.path && filePaths && whichgpt!==0  && whichgpt!==1 && whichgpt!==2){

  //     fileloader(filegpturl,filePaths as string[])
  //   }},[filePaths])
  // Load configuration from IndexedDB on initial render
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [storedlmurl, storedFilegpturl, selmodel, selmodelinfo] = await Promise.all([
          idb.get("lmstudio_url"),
          idb.get("filegpt_url"),
          idb.get("or_model"),
          idb.get("or_model_info")
        ])

        if (storedlmurl) {
          setlmurl(storedlmurl)
        }

        if (storedFilegpturl) {
          setFilegpturl(storedFilegpturl)
        }

        if (selmodel) {
          setSelectedModel(selmodel)
        }

        if (selmodelinfo) {
          setSelectedModelInfo(selmodelinfo)
        }

        console.log("checking here for ollamastate val")
      } catch (error) {
        console.error("Error loading config:", error)
      }
    }

    loadConfig()
  }, [])
  // console.log("ollamastatae val "+ollamastate)
  // console.log(lmurl)
  // console.log(model_name)

  //Chat history loader and migration
  useEffect(() => {
    console.log("checking here for ollamastate val 1")

    // Run migration check - the hook will decide if migration is actually needed
    migrateFromLocalStorage()
  }, [migrateFromLocalStorage])

  // Reload configuration data after migration completes
  useEffect(() => {
    if (migrationComplete) {
      console.log("Migration completed, reloading configuration data")

      // Reload all configuration items
      const reloadConfig = async () => {
        try {
          const [storedlmurl, storedFilegpturl, selmodel, selmodelinfo] = await Promise.all([
            idb.get("lmstudio_url"),
            idb.get("filegpt_url"),
            idb.get("or_model"),
            idb.get("or_model_info")
          ])

          if (storedlmurl && storedlmurl !== lmurl) {
            setlmurl(storedlmurl)
          }

          if (storedFilegpturl && storedFilegpturl !== filegpturl) {
            setFilegpturl(storedFilegpturl)
          }

          if (selmodel && selmodel !== selectedModel) {
            setSelectedModel(selmodel)
          }

          if (selmodelinfo && selmodelinfo !== selectedModelInfo) {
            setSelectedModelInfo(selmodelinfo)
          }

          // Reload chats to ensure any migrated chat history is displayed
          reloadChats()
        } catch (error) {
          console.error("Error reloading config after migration:", error)
        }
      }

      // Small delay to ensure migration is fully committed
      setTimeout(reloadConfig, 100)
    }
  }, [migrationComplete, migrationStats])

  // Set initial chat when chats are loaded
  useEffect(() => {
    if (!chatsLoading && chats.length > 0 && !currentChatId) {
      setCurrentChatId(chats[0].id)
    } else if (!chatsLoading && chats.length === 0) {
      createNewChat()
    }
  }, [chats, chatsLoading, currentChatId])


  // Function to fetch local models from LM Studio/Ollama
  const fetchLocalModels = async (url: string, provider: 'lmstudio' | 'ollama') => {
    try {
      const modelsEndpoint = provider === 'ollama' ? `${url}/api/tags` : `${url}/v1/models`

      const response = await fetch(modelsEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch ${provider} models`)
      }

      const data = await response.json()
      let models: any[] = []

      if (provider === 'ollama') {
        // Ollama format: { models: [{ name: "llama2", size: 123, ... }] }
        models = data.models?.map((model: any) => ({
          id: model.name,
          name: model.name,
          provider: 'Ollama',
          context_length: model.details?.parameter_size ? parseInt(model.details.parameter_size) * 1000 : 4096,
          pricing: { prompt: 0, completion: 0 },
          created: Date.now(),
          description: `${model.size ? (model.size / 1e9).toFixed(1) + 'GB' : 'Unknown size'}`
        })) || []
      } else if (provider === 'lmstudio') {
        // LM Studio format: { data: [{ id: "model-name", object: "model", ... }] }
        models = data.data?.map((model: any) => ({
          id: model.id,
          name: model.id,
          provider: 'LM Studio',
          context_length: 4096, // Default for LM Studio
          pricing: { prompt: 0, completion: 0 },
          created: Date.now(),
          description: 'Local model'
        })) || []
      }

      return models
    } catch (error) {
      console.error(`Error fetching ${provider} models:`, error)
      return []
    }
  }

  // Fetch models based on provider
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true)

      try {
        let models: any[] = []

        if (ollamastate === 0) {
          // Fetch OpenRouter models
          const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
              // Authorization: `Bearer ${apiKey}`,
            },
          })

          if (!response.ok) {
            throw new Error("Failed to fetch OpenRouter models")
          }

          const data = await response.json()
          const openRouterModels = data.data

          // Filter out models with missing required fields and sort by creation date
          models = openRouterModels
            .filter((model: any) => model?.id && model?.pricing?.prompt !== undefined && model?.pricing?.completion !== undefined)
            .sort((a: any, b: any) => b.created - a.created)

          console.log("Loaded OpenRouter models:", models.length)

        } else if (ollamastate === 1 && lmurl) {
          // Fetch Ollama models
          models = await fetchLocalModels(lmurl, 'ollama')
          console.log("Loaded Ollama models:", models.length)

        } else if (ollamastate === 2 && lmurl) {
          // Fetch LM Studio models
          models = await fetchLocalModels(lmurl, 'lmstudio')
          console.log("Loaded LM Studio models:", models.length)
        }

        setAllModels(models)

        // Auto-select first model if none selected and models are available
        if (models.length > 0 && !selectedModel) {
          const firstModel = models[0]
          setSelectedModel(firstModel.id)
          setSelectedModelInfo(firstModel)
        }

      } catch (err) {
        console.error("Error fetching models:", err)
        setAllModels([])
      } finally {
        setIsLoadingModels(false)
      }
    }

    // Only fetch if we have the necessary conditions
    if (ollamastate === 0 || (ollamastate === 1 && lmurl) || (ollamastate === 2 && lmurl)) {
      fetchModels()
    } else {
      // Clear models when conditions not met
      setAllModels([])
      setIsLoadingModels(false)
    }
  }, [ollamastate, lmurl])

  const createNewChat = async (chattitle = "New Chat") => {
    const newChatId = Date.now().toString()
    const newChat: Chat = {
      id: newChatId,
      title: chattitle,
      messages: [],
      createdAt: new Date().toISOString(),
      lastModelUsed: selectedModel,
      branchedFrom: null,
    }

    try {
      await saveChat(newChat)
      setCurrentChatId(newChatId)
    } catch (error) {
      console.error("Failed to create new chat:", error)
    }
  }

  const updateChat = async (updatedChat: Chat) => {
    try {
      await saveChat(updatedChat)
    } catch (error) {
      console.error("Failed to update chat:", error)
    }
  }
  const renameChat = async (id: string, newTitle: string) => {
    const chatToUpdate = chats.find((chat) => chat.id === id)
    if (chatToUpdate) {
      const updatedChat = { ...chatToUpdate, title: newTitle }
      try {
        await saveChat(updatedChat)
      } catch (error) {
        console.error("Failed to rename chat:", error)
      }
    }
  }
  const deleteChat = async (chatId: string) => {
    try {
      await deleteChatFromDB(chatId)

      if (currentChatId === chatId) {
        const remainingChats = chats.filter((chat) => chat.id !== chatId)
        if (remainingChats.length > 0) {
          // Set current chat to the next available one
          setCurrentChatId(remainingChats[0].id)
        } else {
          await createNewChat()
        }
      }
    } catch (error) {
      console.error("Failed to delete chat:", error)
    }
  }

  const handleBranchConversation = async (branchPoint: BranchPoint) => {
    const originalChat = chats.find((chat) => chat.id === branchPoint.originalChatId)

    if (!originalChat) return

    // Create a title based on the last user message in the branch
    const lastUserMessage = [...branchPoint.messages].reverse().find((msg) => msg.role === "user")
    const branchTitle = lastUserMessage ? `Branch: ${lastUserMessage.content.slice(0, 20)}...` : "New Branch"

    const newChat: Chat = {
      id: Date.now().toString(),
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

    try {
      await saveChat(newChat)
      setCurrentChatId(newChat.id)
    } catch (error) {
      console.error("Failed to branch conversation:", error)
    }
  }

  const handleSelectModel = async (modelId: string) => {
    setSelectedModel(modelId)
    const modelInfo = allModels.find((model: any) => model.id === modelId)
    setSelectedModelInfo(modelInfo || null)

    try {
      await idb.set("or_model", modelId)
      await idb.set("or_model_info", modelInfo || null)
    } catch (error) {
      console.error("Failed to save model selection:", error)
    }
  }


  const toggleMenu = () => {
    setCollapsed(prev => !prev);
  };

  const currentChat = chats.find((chat) => chat.id === currentChatId)
  // const [viewportHeight, setViewportHeight] = useState((typeof window === 'undefined')? "h-full" :window.innerHeight);

  // useEffect(() => {
  //   if (typeof window === 'undefined') return;
  //   const handleResize = () => {
  //     setViewportHeight(window.visualViewport?.height || window.innerHeight);
  //   };

  //   window.visualViewport?.addEventListener('resize', handleResize);
  //   window.addEventListener('resize', handleResize);

  //   // Initial call
  //   handleResize();

  //   return () => {
  //     window.visualViewport?.removeEventListener('resize', handleResize);
  //     window.removeEventListener('resize', handleResize);
  //   };
  // }, []);

  const debounce = (func: (...args: any[]) => void, wait: number): (...args: any[]) => void => {
    let timeout: NodeJS.Timeout | undefined;
    return function executedFunction(...args: any[]): void {
      const later = (): void => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  useEffect(() => {
    const setViewportHeight = () => {
      document.documentElement.style.setProperty('--100vh', `${window.innerHeight}px`);
    };
    setViewportHeight();
    const debouncedSetViewportHeight = debounce(setViewportHeight, 100);
    window.addEventListener('resize', debouncedSetViewportHeight);
    return () => {
      window.removeEventListener('resize', debouncedSetViewportHeight);
    };
  }, []);

  useEffect(() => {
    // (async ()=>createNewChat((await(await import('@tauri-apps/api/window')).appWindow.title()).replace("FileGPT: ","")))()
    // createNewChat();
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      // In a real Next.js app, you might use next/router here
      // For example: router.replace(window.location.href.replace('http:', 'https:'));
      if (window.location.protocol !== 'https:') {
        console.warn("Attempting to redirect to HTTPS (simulated for component context)");
        // window.location.protocol = "https:"; // This would cause a full page reload
      }
    }
  }, []);

  return (
    <div className="absolute min-h-svh flex flex-col inset-0 w-screen bg-gray-50 dark:bg-gray-900">
      <div style={{ height: 'var(--100vh, 100vh)' }} className="relative overflow-hidden">
          <div className="absolute top-4 left-4 z-50 p-2 rounded-md  dark:text-white  dark:bg-gray-900 bg-gray-10 ">
            <div className="flex flex-row gap-4 ">
              <Button className="bg-gray-50 dark:bg-gray-900" variant="ghost" size="icon" onClick={() => toggleMenu()}>
                {<MenuIcon size={20} />}
              </Button>
              <Button variant={"outline"} onClick={() => createNewChat} className=" w-full flex items-center justify-center gap-2">
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
          <div className="absolute top-4 right-4 z-50 p-2 rounded-md  text-white dark:bg-gray-900 bg-gray-10 ">
            <DarkButton />

          </div>
          <div className={cn(`overflow-y-auto absolute top-0 left-0 h-full bg-gray-50 dark:bg-gray-900 text-white transition-transform duration-300 ease-in-out z-40 ${collapsed ? '-translate-x-full' : 'translate-x-0'}`, "pt-20 border-r border-gray-200 dark:border-r-gray-950")}>
            {(ollamastate == 0 || ollamastate == 4) ? (<div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <ApiKeyInput ollamastate={ollamastate} />
            </div>) : null}
            {ollamastate == 4 && null}
            {(ollamastate !== 0 && ollamastate !== 4) ? (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <LMStudioURL ollamastate={ollamastate} lmurl={lmurl} setlmurl={setlmurl} />
                </div>
                {ollamastate === 3 && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <FileGPTUrl filegpturl={filegpturl} setFilegpturl={setFilegpturl} />
                  </div>
                )}
              </>
            ) : null}


            <div className="flex-1 overflow-y-auto pb-16 ">
              <ChatHistory
                chats={chats}
                currentChatId={currentChatId}
                setCurrentChatId={setCurrentChatId}
                deleteChat={deleteChat}
                renameChat={renameChat}
              />
            </div>


          </div>
        </div>
      {/* <SidebarMenu/> */}
      {/* <div className={` ${!collapsed?"absolute bottom-0 left-0 p-4 z-50 w-48":"hidden"}`}> */}
      {/* <Button onClick={createNewChat} className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-900 dark:text-white text-black border border-gray-200 dark:border-gray-700">
                <PlusIcon size={16} />
                New Chat
              </Button>
            </div> */}

      {/* Main content */}
      <div style={{ height: 'var(--100vh, 100vh)' }} className={cn("absolute bottom-0 z-10 w-full bg-gray-50 dark:bg-gray-900 overflow-hidden")} onClick={() => { setCollapsed(true) }} >
        {/* <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!sidebarVisible?(<Button variant="ghost" size="icon" onClick={() => setSidebarVisible(!sidebarVisible)}>
            {<MenuIcon size={20} />}
          </Button>):null}
        </div> */}

        {currentChat && (
          <ChatInterface
            // fileloader={fileloader}
            // filegpturl={filegpturl}
            // filePaths={filePaths}
            setollamastate={setollamastate}
            ollamastate={ollamastate}
            lmstudio_model_name={model_name}
            setlmmodel={set_model_name}
            lmstudio_url={lmurl}
            setlmurl={setlmurl}
            filegpt_url={filegpturl}
            message={message}
            chat={currentChat}
            updateChat={updateChat}
            // apiKey={apiKey}
            selectedModel={selectedModel}
            selectedModelInfo={selectedModelInfo}
            onBranchConversation={handleBranchConversation}
            directsendmessage={false}
            messagetosend=""
            sidebarVisible={sidebarVisible}
            setSidebarVisible={setSidebarVisible}
            getModelColor={getModelColor}
            getModelDisplayName={getModelDisplayName}
            allModels={allModels}
            handleSelectModel={handleSelectModel}
            isLoadingModels={isLoadingModels}
          />
        )}
      </div>



      {/* Export Dialog */}
      <ExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} chat={currentChat} />

      {/* Migration Status Notification */}
      <MigrationStatus
        isMigrating={migrating}
        migrationComplete={migrationComplete}
        migrationStats={migrationStats}
        error={migrationError}
      />

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
