"use client";
import { useEffect, useState } from "react";
import ChatInterface from "../components/chat-interface";
import ChatHistory from "../components/chat-history";
import ApiKeyInput from "../components/api-key-input";
import LMStudioURL from "../components/lmstudio-url";
import LMStudioModelName from "../components/localmodelname";
import FileGPTUrl from "../components/filegpt-url";
import { Button } from "../components/ui/button";
import { PlusIcon, MenuIcon, Download } from "lucide-react";
import ModelSelectionDialog from "../components/model-selection-dialog";
import ExportDialog from "../components/export-dialog";
import { Toaster } from "../components/ui/toaster";
import { cn } from "../lib/utils";
import DarkButton from './dark-button';
export default function ChatUI({ message, fgptendpoint = "localhost", setasollama = false }) {
    const [apiKey, setApiKey] = useState("");
    const [lmurl, setlmurl] = useState("");
    const [model_name, set_model_name] = useState("");
    const [filegpturl, setFilegpturl] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [selectedModelInfo, setSelectedModelInfo] = useState(null);
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState("");
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [ollamastate, setollamastate] = useState(0);
    const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [allModels, setAllModels] = useState([]);
    useEffect(() => {
        setCollapsed(true);
    }, [currentChatId]);
    useEffect(() => {
        const storedlmurl = localStorage.getItem("lmstudio_url");
        if (ollamastate !== 0 && storedlmurl) {
            setlmurl(storedlmurl);
        }
        const stored_lm_model_name = localStorage.getItem("lmstudio_model_name");
        if (ollamastate !== 0 && storedlmurl && stored_lm_model_name) {
            set_model_name(stored_lm_model_name);
            setSelectedModel(model_name);
        }
        const storedFilegpturl = localStorage.getItem("filegpt_url");
        if (ollamastate === 3 && storedFilegpturl) {
            setFilegpturl(storedFilegpturl);
        }
    }, [ollamastate]);
    console.log(lmurl);
    console.log(model_name);
    useEffect(() => {
        const storedApiKey = localStorage.getItem("openrouter_api_key");
        if (storedApiKey) {
            setApiKey(storedApiKey);
        }
        const storedChats = localStorage.getItem("chat_history");
        if (storedChats) {
            try {
                const parsedChats = JSON.parse(storedChats);
                setChats(parsedChats);
                if (parsedChats.length > 0) {
                    setCurrentChatId(parsedChats[0].id);
                }
                else {
                    createNewChat();
                }
            }
            catch (error) {
                console.error("Failed to parse stored chats:", error);
                createNewChat();
            }
        }
        else {
            createNewChat();
        }
    }, []);
    useEffect(() => {
        if (chats.length > 0) {
            localStorage.setItem("chat_history", JSON.stringify(chats));
        }
    }, [chats]);
    useEffect(() => {
        if (!apiKey)
            return;
        const fetchModels = async () => {
            try {
                const response = await fetch("https://openrouter.ai/api/v1/models", {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                    },
                });
                if (!response.ok) {
                    throw new Error("Failed to fetch models");
                }
                const data = await response.json();
                setAllModels(data.data);
            }
            catch (err) {
                console.error("Error fetching models:", err);
            }
        };
        fetchModels();
    }, [apiKey]);
    const createNewChat = () => {
        const newChatId = Date.now().toString();
        const newChat = {
            id: newChatId,
            title: "New Chat",
            messages: [],
            createdAt: new Date().toISOString(),
            lastModelUsed: selectedModel,
            branchedFrom: null,
        };
        setChats((prevChats) => [newChat, ...prevChats]);
        setCurrentChatId(newChatId);
    };
    const updateChat = (updatedChat) => {
        setChats((prevChats) => prevChats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat)));
    };
    const renameChat = (id, newTitle) => {
        setChats(chats.map((chat) => (chat.id === id ? { ...chat, title: newTitle } : chat)));
    };
    const deleteChat = (chatId) => {
        setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));
        if (currentChatId === chatId) {
            if (chats.length > 1) {
                const nextChat = chats.find((chat) => chat.id !== chatId);
                if (nextChat) {
                    setCurrentChatId(nextChat.id);
                }
                else {
                    createNewChat();
                }
            }
            else {
                createNewChat();
            }
        }
    };
    const handleBranchConversation = (branchPoint) => {
        const newChatId = Date.now().toString();
        const originalChat = chats.find((chat) => chat.id === branchPoint.originalChatId);
        if (!originalChat)
            return;
        const lastUserMessage = [...branchPoint.messages].reverse().find((msg) => msg.role === "user");
        const branchTitle = lastUserMessage ? `Branch: ${lastUserMessage.content.slice(0, 20)}...` : "New Branch";
        const newChat = {
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
        };
        setChats((prevChats) => [newChat, ...prevChats]);
        setCurrentChatId(newChatId);
    };
    const handleSelectModel = (modelId) => {
        setSelectedModel(modelId);
        const modelInfo = allModels.find((model) => model.id === modelId);
        setSelectedModelInfo(modelInfo || null);
        setIsModelDialogOpen(false);
    };
    const [collapsed, setCollapsed] = useState(true);
    const toggleMenu = () => {
        setCollapsed(prev => !prev);
    };
    const currentChat = chats.find((chat) => chat.id === currentChatId);
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
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
        if (typeof window !== 'undefined' && !window.isSecureContext) {
            if (window.location.protocol !== 'https:') {
                console.warn("Attempting to redirect to HTTPS (simulated for component context)");
            }
        }
    }, []);
    return (<div className="absolute min-h-svh flex flex-col inset-0 w-screen bg-gray-50 dark:bg-gray-900">
      {(<div style={{ height: 'var(--100vh, 100vh)' }} className="relative overflow-hidden">
          <div className="absolute top-4 left-4 z-50 p-2 rounded-md  dark:text-white  dark:bg-gray-900 bg-gray-10 ">
            <div className="flex flex-row gap-4 ">
          <Button className="bg-gray-50 dark:bg-gray-900" variant="ghost" size="icon" onClick={() => toggleMenu()}>
            {<MenuIcon size={20}/>}
          </Button>
         <Button onClick={createNewChat} variant={"outline"} className=" w-full flex items-center justify-center gap-2">
              <PlusIcon size={16}/>
              New Chat
            </Button>
            
            <Button variant="outline" onClick={() => setIsExportDialogOpen(true)} disabled={!currentChat || currentChat.messages.length === 0}>
              <Download size={16} className=""/>
              <span className="hidden lg:inline lg:ml-2">Export</span>
            </Button>
             
            </div>
          </div>
          <div className="absolute top-4 right-4 z-50 p-2 rounded-md  text-white dark:bg-gray-900 bg-gray-10 ">
          <DarkButton />

          </div>
          <div className={cn(`absolute top-0 left-0 h-full bg-gray-50 dark:bg-gray-900 text-white transition-transform duration-300 ease-in-out z-40 ${collapsed ? '-translate-x-full' : 'translate-x-0'}`, "pt-20 border-r border-gray-200 dark:border-r-gray-950")}>
          {ollamastate == 0 ? (<div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey}/>
          </div>) : null}
          {ollamastate !== 0 ? (<>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <LMStudioURL lmurl={lmurl} setlmurl={setlmurl}/>
              </div>
              {ollamastate !== 3 && (<div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <LMStudioModelName model_name={model_name} set_model_name={set_model_name}/>
                </div>)}
              {ollamastate === 3 && (<div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <FileGPTUrl filegpturl={filegpturl} setFilegpturl={setFilegpturl}/>
                </div>)}
            </>) : <></>}
          

          <div className="flex-1 overflow-y-auto">
            <ChatHistory chats={chats} currentChatId={currentChatId} setCurrentChatId={setCurrentChatId} deleteChat={deleteChat} renameChat={renameChat}/>
          </div>

            <div className="absolute bottom-4 left-0 right-0 items-end gap-2 p-4 border-gray-200 dark:border-gray-700">
          <Button onClick={createNewChat} className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-900 dark:text-white text-black border border-gray-200 dark:border-gray-700">
              <PlusIcon size={16}/>
              New Chat
            </Button>
            </div>
            </div>
        </div>)}
                
      

      
      <div style={{ height: 'var(--100vh, 100vh)' }} className={cn("absolute bottom-0 z-10 w-full px-2 bg-gray-50 dark:bg-gray-900 overflow-hidden")} onClick={() => { setCollapsed(true); }}>
        

        {currentChat && (<ChatInterface setollamastate={setollamastate} ollamastate={ollamastate} lmstudio_model_name={model_name} lmstudio_url={lmurl} filegpt_url={filegpturl} message={message} chat={currentChat} updateChat={updateChat} apiKey={apiKey} selectedModel={selectedModel} selectedModelInfo={selectedModelInfo} onBranchConversation={handleBranchConversation} directsendmessage={false} messagetosend="" sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible} getModelColor={getModelColor} getModelDisplayName={getModelDisplayName} setIsModelDialogOpen={setIsModelDialogOpen}/>)}
      </div>

      
      <ModelSelectionDialog isOpen={isModelDialogOpen} onClose={() => setIsModelDialogOpen(false)} models={allModels} selectedModel={selectedModel} onSelectModel={handleSelectModel} apiKey={apiKey}/>

      
      <ExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} chat={currentChat}/>

      <Toaster />
    </div>);
}
function getModelColor(modelId) {
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
    ];
    let hash = 0;
    for (let i = 0; i < modelId.length; i++) {
        hash = modelId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}
function getModelDisplayName(modelId) {
    const parts = modelId.split("/");
    return parts.length > 1 ? parts[1] : modelId;
}
