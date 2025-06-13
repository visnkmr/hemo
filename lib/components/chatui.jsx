"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChatUI;
const react_1 = require("react");
const chat_interface_1 = __importDefault(require("../components/chat-interface"));
const chat_history_1 = __importDefault(require("../components/chat-history"));
const api_key_input_1 = __importDefault(require("../components/api-key-input"));
const lmstudio_url_1 = __importDefault(require("../components/lmstudio-url"));
const localmodelname_1 = __importDefault(require("../components/localmodelname"));
const filegpt_url_1 = __importDefault(require("../components/filegpt-url"));
const button_1 = require("../components/ui/button");
const lucide_react_1 = require("lucide-react");
const model_selection_dialog_1 = __importDefault(require("../components/model-selection-dialog"));
const export_dialog_1 = __importDefault(require("../components/export-dialog"));
const toaster_1 = require("../components/ui/toaster");
const utils_1 = require("../lib/utils");
const dark_button_1 = __importDefault(require("./dark-button"));
function ChatUI({ message, fgptendpoint = "localhost", setasollama = false }) {
    const [apiKey, setApiKey] = (0, react_1.useState)("");
    const [lmurl, setlmurl] = (0, react_1.useState)("");
    const [model_name, set_model_name] = (0, react_1.useState)("");
    const [filegpturl, setFilegpturl] = (0, react_1.useState)("");
    const [selectedModel, setSelectedModel] = (0, react_1.useState)("");
    const [selectedModelInfo, setSelectedModelInfo] = (0, react_1.useState)(null);
    const [chats, setChats] = (0, react_1.useState)([]);
    const [currentChatId, setCurrentChatId] = (0, react_1.useState)("");
    const [sidebarVisible, setSidebarVisible] = (0, react_1.useState)(true);
    const [ollamastate, setollamastate] = (0, react_1.useState)(0);
    const [isModelDialogOpen, setIsModelDialogOpen] = (0, react_1.useState)(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = (0, react_1.useState)(false);
    const [allModels, setAllModels] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        setCollapsed(true);
    }, [currentChatId]);
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
        if (chats.length > 0) {
            localStorage.setItem("chat_history", JSON.stringify(chats));
        }
    }, [chats]);
    (0, react_1.useEffect)(() => {
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
    const [collapsed, setCollapsed] = (0, react_1.useState)(true);
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
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
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
          <button_1.Button className="bg-gray-50 dark:bg-gray-900" variant="ghost" size="icon" onClick={() => toggleMenu()}>
            {<lucide_react_1.MenuIcon size={20}/>}
          </button_1.Button>
         <button_1.Button onClick={createNewChat} variant={"outline"} className=" w-full flex items-center justify-center gap-2">
              <lucide_react_1.PlusIcon size={16}/>
              New Chat
            </button_1.Button>
            
            <button_1.Button variant="outline" onClick={() => setIsExportDialogOpen(true)} disabled={!currentChat || currentChat.messages.length === 0}>
              <lucide_react_1.Download size={16} className=""/>
              <span className="hidden lg:inline lg:ml-2">Export</span>
            </button_1.Button>
             
            </div>
          </div>
          <div className="absolute top-4 right-4 z-50 p-2 rounded-md  text-white dark:bg-gray-900 bg-gray-10 ">
          <dark_button_1.default />

          </div>
          <div className={(0, utils_1.cn)(`absolute top-0 left-0 h-full bg-gray-50 dark:bg-gray-900 text-white transition-transform duration-300 ease-in-out z-40 ${collapsed ? '-translate-x-full' : 'translate-x-0'}`, "pt-20 border-r border-gray-200 dark:border-r-gray-950")}>
          {ollamastate == 0 ? (<div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <api_key_input_1.default apiKey={apiKey} setApiKey={setApiKey}/>
          </div>) : null}
          {ollamastate !== 0 ? (<>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <lmstudio_url_1.default lmurl={lmurl} setlmurl={setlmurl}/>
              </div>
              {ollamastate !== 3 && (<div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <localmodelname_1.default model_name={model_name} set_model_name={set_model_name}/>
                </div>)}
              {ollamastate === 3 && (<div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <filegpt_url_1.default filegpturl={filegpturl} setFilegpturl={setFilegpturl}/>
                </div>)}
            </>) : <></>}
          

          <div className="flex-1 overflow-y-auto">
            <chat_history_1.default chats={chats} currentChatId={currentChatId} setCurrentChatId={setCurrentChatId} deleteChat={deleteChat} renameChat={renameChat}/>
          </div>

            <div className="absolute bottom-4 left-0 right-0 items-end gap-2 p-4 border-gray-200 dark:border-gray-700">
          <button_1.Button onClick={createNewChat} className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-900 dark:text-white text-black border border-gray-200 dark:border-gray-700">
              <lucide_react_1.PlusIcon size={16}/>
              New Chat
            </button_1.Button>
            </div>
            </div>
        </div>)}
                
      

      
      <div style={{ height: 'var(--100vh, 100vh)' }} className={(0, utils_1.cn)("absolute bottom-0 z-10 w-full px-2 bg-gray-50 dark:bg-gray-900 overflow-hidden")} onClick={() => { setCollapsed(true); }}>
        

        {currentChat && (<chat_interface_1.default setollamastate={setollamastate} ollamastate={ollamastate} lmstudio_model_name={model_name} lmstudio_url={lmurl} filegpt_url={filegpturl} message={message} chat={currentChat} updateChat={updateChat} apiKey={apiKey} selectedModel={selectedModel} selectedModelInfo={selectedModelInfo} onBranchConversation={handleBranchConversation} directsendmessage={false} messagetosend="" sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible} getModelColor={getModelColor} getModelDisplayName={getModelDisplayName} setIsModelDialogOpen={setIsModelDialogOpen}/>)}
      </div>

      
      <model_selection_dialog_1.default isOpen={isModelDialogOpen} onClose={() => setIsModelDialogOpen(false)} models={allModels} selectedModel={selectedModel} onSelectModel={handleSelectModel} apiKey={apiKey}/>

      
      <export_dialog_1.default isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} chat={currentChat}/>

      <toaster_1.Toaster />
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
