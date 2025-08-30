"use client"

import { useEffect, useState } from "react"
import ChatInterface from "../components/chat-interface"
import ChatHistory from "../components/chat-history"
import { useIsMobile } from "../hooks/use-mobile"
import ApiKeyInput from "../components/api-key-input"
import LMStudioURL from "../components/lmstudio-url"
import LMStudioModelName from "../components/localmodelname"
import GeminiModelSelectionDialog from "../components/gemini-model-selection-dialog"
import FileGPTUrl from "../components/filegpt-url"
import type { Chat, BranchPoint, ModelRow, LocalModel, GeminiModel } from "../lib/types"
import { fetchModelsByState } from "../lib/local-models"
import { Button } from "../components/ui/button"
import { PlusIcon, MenuIcon, XIcon, Download, Bot } from "lucide-react"

import ExportDialog from "../components/export-dialog"
import { Toaster } from "../components/ui/toaster"
import { cn } from "../lib/utils"
import DarkButton from './dark-button'
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
  const [apiKey, setApiKey] = useState<string>("")
  const [lmurl, setlmurl] = useState<string>("")
  const [model_name, set_model_name] = useState<string>("")
  const [filegpturl, setFilegpturl] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [selectedModelInfo, setSelectedModelInfo] = useState<any>("")
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string>("")
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [ollamastate, setollamastate] = useState(whichgpt)

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [allModels, setAllModels] = useState<any[]>([])
  const [localModels, setLocalModels] = useState<LocalModel[]>([])
  const [geminiModels, setGeminiModels] = useState<GeminiModel[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  //Collapse sidebar on chat select
  const [collapsed, setCollapsed] = useState(true);
  const isMobile = useIsMobile();
  // const [tempApiKey, setTempApiKey] = useState("");
  useEffect(() => {
    setCollapsed(true)
  }, [currentChatId])
  useEffect(()=>{
    const lastState = localStorage.getItem("laststate");
    setollamastate(lastState ? parseInt(lastState, 10) : 0);
    
  },[])
  // useEffect(()=>{const storedApiKey = localStorage.getItem("openrouter_api_key")
  //     if (storedApiKey) {
  //       setApiKey(storedApiKey)
  //     }},[collapsed])
  // useEffect(()=>{
  //   if (message && message.path && filePaths && whichgpt!==0  && whichgpt!==1 && whichgpt!==2){

  //     fileloader(filegpturl,filePaths as string[])
  //   }},[filePaths])

  // Load API key and model info from localStorage on initial render
  useEffect(() => {
    let apiUrl = "";
        if (ollamastate === 0) {
          apiUrl = "https://openrouter.ai/api";
        } else if (ollamastate === 4) {
          apiUrl = "https://api.groq.com/openai";
        } else if (ollamastate === 5) {
          apiUrl = "https://generativelanguage.googleapis.com";
        } else if (ollamastate === 1 || ollamastate === 2) {
          apiUrl = localStorage.getItem("lmstudio_url")!;
        } else if (ollamastate === 3) {
          // apiUrl = filegpt_url;
        }
        setlmurl(apiUrl)

    const model_name = localStorage.getItem(ollamastate==0?"or_model":(ollamastate == 4 ? "groq_model_name" : (ollamastate == 5 ? "gemini_model_name" : "local_model")))
    if (model_name) {
      set_model_name(model_name)
      setSelectedModel(model_name)
    }

    const storedFilegpturl = localStorage.getItem("filegpt_url")
    if (storedFilegpturl) {
      setFilegpturl(storedFilegpturl)
    }
    console.log("checking here for ollamastate val")
    {
      // const storedApiKey = localStorage.getItem(ollamastate==4?"groq_api_key":"openrouter_api_key")
      // if (storedApiKey) {
      //   setApiKey(storedApiKey)
      // }
      if (ollamastate === 0) {
        // OpenRouter models
        const selmodel = localStorage.getItem("or_model")
        const selmodelinfo = localStorage.getItem("or_model_info")
        if (selmodel)
          setSelectedModel(selmodel)
          setSelectedModelInfo(selmodelinfo)
      } else if (ollamastate === 1 || ollamastate === 2) {
        // Local models
        const selmodel = localStorage.getItem("local_model")
        const selmodelinfoStr = localStorage.getItem("local_model_info")
        if (selmodel)
          setSelectedModel(selmodel)
        if (selmodelinfoStr && selmodelinfoStr.trim()) {
          try {
            setSelectedModelInfo(JSON.parse(selmodelinfoStr))
          } catch (e) {
            console.error("Error parsing local model info:", e)
          }
        }
      }
      else if (ollamastate === 4) {
        // Groq models
        const selmodel = localStorage.getItem("groq_model_name")
        const selmodelinfo = localStorage.getItem("groq_model_info")
        if (selmodel)
          setSelectedModel(selmodel)
          setSelectedModelInfo(selmodelinfo)
      }
      else if (ollamastate === 5) {
        // Gemini models
        const selmodel = localStorage.getItem("gemini_model_name")
        const selmodelinfo = localStorage.getItem("gemini_model_info")
        if (selmodel)
          setSelectedModel(selmodel)
          setSelectedModelInfo(selmodelinfo)
      }
    }
    let keyName: string;
    switch (ollamastate) {
      case 4:
        keyName = "groq_api_key";
        break;
      case 5:
        keyName = "gemini_api_key";
        break;
      default:
        keyName = "openrouter_api_key";
    }
    const storedApiKey = localStorage.getItem(keyName);
    if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      setApiKey("");
    }
    
    // localStorage.setItem("laststate",ollamastate.toString())
  }, [ollamastate]);
  // useEffect(() => {
  //      // const handleApiKeyDialogSubmit = () => {
  //         if (apiKey && apiKey.trim()) {
  //           // Save the API key
  //           if (ollamastate === 0) {
  //             localStorage.setItem("openrouter_api_key", apiKey);
  //           } else if (ollamastate === 4) {
  //             localStorage.setItem("groq_api_key", apiKey);
  //           } else if (ollamastate === 5) {
  //             localStorage.setItem("gemini_api_key", apiKey);
  //           }
  //         }
  //       // };
  //   },[apiKey])
  // console.log("ollamastatae val "+ollamastate)
  // console.log(lmurl)
  // console.log(model_name)

  //Chat history loader
  useEffect(() => {
    
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

  // Fetch models based on ollamastate
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true)
      try {
        if (ollamastate === 0) {
          // OpenRouter models
          const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
              // Authorization: `Bearer ${apiKey}`,
            },
          })

          if (!response.ok) {
            throw new Error("Failed to fetch models")
          }
          console.log("loaded OpenRouter models")
          const data = await response.json()
          const models = data.data

          // Filter out models with missing required fields and sort by creation date
          const validModels = models
            .filter((model: any) => model?.id && model?.pricing?.prompt !== undefined && model?.pricing?.completion !== undefined)
            .sort((a: any, b: any) => b.created - a.created);

          console.log("All valid OpenRouter models:", validModels.length)
          setAllModels(validModels)
        } else if (ollamastate === 1 || ollamastate === 2) {
          // Local models (Ollama or LM Studio)
          console.log(`Fetching local models for state ${ollamastate}`)
          const models = await fetchModelsByState(ollamastate, lmurl || undefined)
          console.log(`Loaded ${models.length} local models`)
          setLocalModels(models)

          // Set the first model as selected if none is selected
          if (models.length > 0 && !selectedModel) {
            setSelectedModel(models[0].id)
          }
        } else if (ollamastate === 4) {
          // Grok models
          console.log("Fetching Grok models")
          try {
            const groqApiKey = localStorage.getItem("groq_api_key")
            if (groqApiKey) {
              const response = await fetch("https://api.groq.com/openai/v1/models", {
                headers: {
                  Authorization: `Bearer ${groqApiKey}`,
                },
              })
              if (response.ok) {
                const data = await response.json()
                const models = data.data.map((model: any) => ({
                  id: model.id,
                  name: model.id,
                  size: null,
                  modified_at: null
                }))
                console.log(`Loaded ${models.length} Grok models`)
                setLocalModels(models)

                // Set the first model as selected if none is selected
                if (models.length > 0 && !selectedModel) {
                  setSelectedModel(models[0].id)
                }
              }
            }
          } catch (error) {
            console.error("Error fetching Grok models:", error)
          }
        } else if (ollamastate === 5) {
          // Gemini models - fetch from API if key available
          console.log("Fetching Gemini models")
          try {
            const geminiApiKey = localStorage.getItem("gemini_api_key")
            if (geminiApiKey) {
              const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
                headers: {
                  "x-goog-api-key": geminiApiKey,
                },
              })
              if (response.ok) {
                const data = await response.json()
                const models = data.models.map((model: any) => ({
                  name: model.name,
                  baseModelId: model.baseModelId,
                  version: model.version,
                  displayName: model.displayName,
                  description: model.description,
                  inputTokenLimit: model.inputTokenLimit,
                  outputTokenLimit: model.outputTokenLimit,
                  supportedGenerationMethods: model.supportedGenerationMethods,
                  temperature: model.temperature,
                  topP: model.topP,
                  topK: model.topK
                }))
                console.log(`Loaded ${models.length} Gemini models`)
                setGeminiModels(models)

                // Set the first model as selected if none is selected
                if (models.length > 0 && !selectedModel) {
                  const firstModel = models[0]
                  setSelectedModel(firstModel.name?.split('/').pop() || firstModel.name || '')
                }
              }
            } 
            // else {
            //   // No API key, use hardcoded models with full GeminiModel structure
            //   const fallbackModels: GeminiModel[] = [
            //     {
            //       name: "models/gemini-pro",
            //       baseModelId: "gemini-pro",
            //       version: "001",
            //       displayName: "Gemini Pro",
            //       description: "Gemini Pro model",
            //       inputTokenLimit: 30720,
            //       outputTokenLimit: 2048,
            //       supportedGenerationMethods: ["generateContent"],
            //       temperature: 0.9,
            //       topP: 1.0,
            //       topK: 1
            //     },
            //     {
            //       name: "models/gemini-pro-vision",
            //       baseModelId: "gemini-pro-vision",
            //       version: "001",
            //       displayName: "Gemini Pro Vision",
            //       description: "Gemini Pro Vision model with image understanding",
            //       inputTokenLimit: 16384,
            //       outputTokenLimit: 2048,
            //       supportedGenerationMethods: ["generateContent"],
            //       temperature: 0.9,
            //       topP: 1.0,
            //       topK: 1
            //     },
            //     {
            //       name: "models/gemini-1.5-pro",
            //       baseModelId: "gemini-1.5-pro",
            //       version: "001",
            //       displayName: "Gemini 1.5 Pro",
            //       description: "Latest Gemini 1.5 Pro model with enhanced capabilities",
            //       inputTokenLimit: 2097152,
            //       outputTokenLimit: 8192,
            //       supportedGenerationMethods: ["generateContent"],
            //       temperature: 0.9,
            //       topP: 1.0,
            //       topK: 1
            //     },
            //     {
            //       name: "models/gemini-1.5-flash",
            //       baseModelId: "gemini-1.5-flash",
            //       version: "001",
            //       displayName: "Gemini 1.5 Flash",
            //       description: "Fast Gemini 1.5 Flash model optimized for speed",
            //       inputTokenLimit: 1048576,
            //       outputTokenLimit: 8192,
            //       supportedGenerationMethods: ["generateContent"],
            //       temperature: 0.9,
            //       topP: 1.0,
            //       topK: 1
            //     }
            //   ]
            //   setGeminiModels(fallbackModels)

            //   // Set the first model as selected if none is selected
            //   if (fallbackModels.length > 0 && !selectedModel) {
            //     const firstModel = fallbackModels[0]
            //     setSelectedModel(firstModel.name?.split('/').pop() || firstModel.name || '')
            //   }
            // }
          } catch (error) {
            console.error("Error fetching Gemini models:", error)
            // // Fallback to hardcoded models
            // const fallbackModels: GeminiModel[] = [
            //   {
            //     name: "models/gemini-pro",
            //     baseModelId: "gemini-pro",
            //     version: "001",
            //     displayName: "Gemini Pro",
            //     description: "Gemini Pro model",
            //     inputTokenLimit: 30720,
            //     outputTokenLimit: 2048,
            //     supportedGenerationMethods: ["generateContent"],
            //     temperature: 0.9,
            //     topP: 1.0,
            //     topK: 1
            //   }
            // ]
            // setGeminiModels(fallbackModels)
          }
        }
      } catch (err) {
        console.error("Error fetching models:", err)
      } finally {
        setIsLoadingModels(false)
      }
    }

    fetchModels()
  }, [ollamastate, lmurl,apiKey])

  const createNewChat = (chattitle = "New Chat") => {
    const newChatId = Date.now().toString()
    const newChat: Chat = {
      id: newChatId,
      title: chattitle,
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

    if (ollamastate === 0) {
      // OpenRouter models
      localStorage.setItem("or_model", modelId);
      const modelInfo = allModels.find((model: any) => model.id === modelId)
      setSelectedModelInfo(modelInfo || null)
      localStorage.setItem("or_model_info", modelInfo || null);
    } else if (ollamastate === 1 || ollamastate === 2) {
      // Local models
      localStorage.setItem("local_model", modelId);
      const modelInfo = localModels.find((model: LocalModel) => model.id === modelId)
      setSelectedModelInfo(modelInfo || null)
      localStorage.setItem("local_model_info", modelInfo ? JSON.stringify(modelInfo) : "");
    } else if (ollamastate === 4) {
      // Grok models
      localStorage.setItem("groq_model_name", modelId);
      const modelInfo = localModels.find((model: LocalModel) => model.id === modelId)
      setSelectedModelInfo(modelInfo || null)
      localStorage.setItem("groq_model_info", modelInfo ? JSON.stringify(modelInfo) : "");
    } else if (ollamastate === 5) {
      // Gemini models
      localStorage.setItem("gemini_model_name", modelId);
      const modelInfo = geminiModels.find((model: GeminiModel) => model.name?.split('/').pop() === modelId)
      setSelectedModelInfo(modelInfo || null)
      localStorage.setItem("gemini_model_info", modelInfo ? JSON.stringify(modelInfo) : "");
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
      {(
        <div style={{ height: 'var(--100vh, 100vh)' }} className="relative overflow-hidden">
          <div className="absolute top-4 left-4 z-50 p-2 rounded-md  dark:text-white  dark:bg-gray-900 bg-gray-10 ">
            <div className="flex flex-row gap-4 ">
              <Button className="bg-gray-50 dark:bg-gray-900" variant="ghost" size="icon" onClick={() => toggleMenu()}>
                {<MenuIcon size={20} />}
              </Button>
              <Button variant={"outline"} onClick={() => createNewChat()} className=" w-full flex items-center justify-center gap-2">
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
            {(ollamastate == 0 || ollamastate == 4 || ollamastate == 5) ? (<div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <ApiKeyInput ollamastate={ollamastate} />
            </div>) : null}
            {/* {(ollamastate == 4 || ollamastate == 5) && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <LMStudioModelName model_name={model_name} set_model_name={set_model_name} ollamastate={ollamastate} />
              </div>
            )} */}
            {(ollamastate !== 0 && ollamastate !== 4 && ollamastate !== 5) ? (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <LMStudioURL ollamastate={ollamastate} lmurl={lmurl} setlmurl={setlmurl} />
                </div>
                {/* {ollamastate !== 3 && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <LMStudioModelName model_name={model_name} set_model_name={set_model_name} ollamastate={ollamastate} />
                  </div>
                )} */}
                {ollamastate === 3 && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <FileGPTUrl filegpturl={filegpturl} setFilegpturl={setFilegpturl} />
                  </div>
                )}
              </>
            ) : <></>}


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
      )}
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
            tempApiKey={apiKey}
            setTempApiKey={setApiKey}
            ollamastate={ollamastate}
            // local_model={model_name}
            // setlmmodel={set_model_name}
            lmstudio_url={lmurl}
            setlmurl={setlmurl}
            // filegpt_url={filegpturl}
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
            allModels={ollamastate === 0 ? allModels : localModels}
            geminiModels={geminiModels}
            handleSelectModel={handleSelectModel}
            isLoadingModels={isLoadingModels}
          />
        )}
      </div>



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
