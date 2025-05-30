// "use client"

// import { useEffect, useState } from "react"
// import ChatInterface from "@/components/chat-interface"
// import ChatHistory from "@/components/chat-history"
// import ApiKeyInput from "@/components/api-key-input"
// import LMStudioURL from "@/components/lmstudio-url"
// import LMStudioModelName from "@/components/localmodelname"
// import type { Chat, BranchPoint } from "@/lib/types"
// import { Button } from "@/components/ui/button"
// import { PlusIcon, MenuIcon, XIcon, Download, Bot } from "lucide-react"
// import ModelSelectionDialog from "@/components/model-selection-dialog"
// import ExportDialog from "@/components/export-dialog"
// import { Toaster } from "@/components/ui/toaster"
// import { cn } from "@/lib/utils"

// export default function Home() {
//   const [apiKey, setApiKey] = useState<string>("")
//   const [lmurl, setlmurl] = useState<string>("")
//   const [model_name, set_model_name] = useState<string>("")
//   const [selectedModel, setSelectedModel] = useState<string>("")
//   const [selectedModelInfo, setSelectedModelInfo] = useState<any>(null)
//   const [chats, setChats] = useState<Chat[]>([])
//   const [currentChatId, setCurrentChatId] = useState<string>("")
//   const [sidebarVisible, setSidebarVisible] = useState(true)
//   const [ollamastate, setollamastate] = useState(0)
//   const [isModelDialogOpen, setIsModelDialogOpen] = useState(false)
//   const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
//   const [allModels, setAllModels] = useState<any[]>([])

//   useEffect(()=>{
//     setCollapsed(true)
//   },[currentChatId])
//   // Load API key and chats from localStorage on initial render
//   useEffect(() => {
//     const storedlmurl = localStorage.getItem("lmstudio_url")
//     if (ollamastate!==0 && storedlmurl) {
//       setlmurl(storedlmurl)
//     }
    
//     const stored_lm_model_name = localStorage.getItem("lmstudio_model_name")
//     if (ollamastate!==0 && storedlmurl && stored_lm_model_name) {
//       set_model_name(stored_lm_model_name)
//       setSelectedModel(model_name)
//     }
//   },[ollamastate]);
//   console.log(lmurl)
//   console.log(model_name)
//   useEffect(() => {
//     const storedApiKey = localStorage.getItem("openrouter_api_key")
//     if (storedApiKey) {
//       setApiKey(storedApiKey)
//     }

    

//     const storedChats = localStorage.getItem("chat_history")
//     if (storedChats) {
//       try {
//         const parsedChats = JSON.parse(storedChats)
//         setChats(parsedChats)

//         // Set current chat to the most recent one if it exists
//         if (parsedChats.length > 0) {
//           setCurrentChatId(parsedChats[0].id)
//         } else {
//           createNewChat()
//         }
//       } catch (error) {
//         console.error("Failed to parse stored chats:", error)
//         createNewChat()
//       }
//     } else {
//       createNewChat()
//     }
//   }, [])

//   // Save chats to localStorage whenever they change
//   useEffect(() => {
//     if (chats.length > 0) {
//       localStorage.setItem("chat_history", JSON.stringify(chats))
//     }
//   }, [chats])

//   // Fetch models when API key is set
//   useEffect(() => {
//     if (!apiKey) return

//     const fetchModels = async () => {
//       try {
//         const response = await fetch("https://openrouter.ai/api/v1/models", {
//           headers: {
//             Authorization: `Bearer ${apiKey}`,
//           },
//         })

//         if (!response.ok) {
//           throw new Error("Failed to fetch models")
//         }

//         const data = await response.json()
//         setAllModels(data.data)

//         // // Filter for free models (where pricing is 0)
//         // const freeModels = data.data.filter((model: any) => {
//         //   return Number.parseFloat(model.pricing?.prompt) <= 0 && Number.parseFloat(model.pricing?.completion) <= 0
//         // })

//         // Set the first model as selected if none is selected
//         // if (freeModels.length > 0 && !selectedModel) {
//         //   setSelectedModel(freeModels[0].id)
//         //   setSelectedModelInfo(freeModels[0])
//         // }
//       } catch (err) {
//         console.error("Error fetching models:", err)
//       }
//     }

//     fetchModels()
//   }, [apiKey])

//   const createNewChat = () => {
//     const newChatId = Date.now().toString()
//     const newChat: Chat = {
//       id: newChatId,
//       title: "New Chat",
//       messages: [],
//       createdAt: new Date().toISOString(),
//       lastModelUsed: selectedModel,
//       branchedFrom: null,
//     }

//     setChats((prevChats) => [newChat, ...prevChats])
//     setCurrentChatId(newChatId)
//   }

//   const updateChat = (updatedChat: Chat) => {
//     setChats((prevChats) => prevChats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat)))
//   }
//  const renameChat = (id: string, newTitle: string) => {
//     setChats(chats.map((chat) => (chat.id === id ? { ...chat, title: newTitle } : chat)))
//   }
//   const deleteChat = (chatId: string) => {
//     setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId))

//     if (currentChatId === chatId) {
//       if (chats.length > 1) {
//         // Set current chat to the next available one
//         const nextChat = chats.find((chat) => chat.id !== chatId)
//         if (nextChat) {
//           setCurrentChatId(nextChat.id)
//         } else {
//           createNewChat()
//         }
//       } else {
//         createNewChat()
//       }
//     }
//   }

//   const handleBranchConversation = (branchPoint: BranchPoint) => {
//     const newChatId = Date.now().toString()
//     const originalChat = chats.find((chat) => chat.id === branchPoint.originalChatId)

//     if (!originalChat) return

//     // Create a title based on the last user message in the branch
//     const lastUserMessage = [...branchPoint.messages].reverse().find((msg) => msg.role === "user")
//     const branchTitle = lastUserMessage ? `Branch: ${lastUserMessage.content.slice(0, 20)}...` : "New Branch"

//     const newChat: Chat = {
//       id: newChatId,
//       title: branchTitle,
//       messages: branchPoint.messages,
//       createdAt: new Date().toISOString(),
//       lastModelUsed: selectedModel,
//       branchedFrom: {
//         chatId: branchPoint.originalChatId,
//         messageId: branchPoint.branchedFromMessageId,
//         timestamp: branchPoint.timestamp,
//       },
//     }

//     setChats((prevChats) => [newChat, ...prevChats])
//     setCurrentChatId(newChatId)
//   }

//   const handleSelectModel = (modelId: string) => {
//     setSelectedModel(modelId)
//     const modelInfo = allModels.find((model: any) => model.id === modelId)
//     setSelectedModelInfo(modelInfo || null)
//     setIsModelDialogOpen(false)
//   }
// const [collapsed, setCollapsed] = useState(true);

//   const toggleMenu = () => {
//     setCollapsed(prev => !prev);
//   };

//   const currentChat = chats.find((chat) => chat.id === currentChatId)
//   const [viewportHeight, setViewportHeight] = useState((typeof window === 'undefined')? "h-full" :window.innerHeight);

//   useEffect(() => {
//     if (typeof window === 'undefined') return;
//     const handleResize = () => {
//       setViewportHeight(window.visualViewport?.height || window.innerHeight);
//     };

//     window.visualViewport?.addEventListener('resize', handleResize);
//     window.addEventListener('resize', handleResize);

//     // Initial call
//     handleResize();

//     return () => {
//       window.visualViewport?.removeEventListener('resize', handleResize);
//       window.removeEventListener('resize', handleResize);
//     };
//   }, []);

//   return (
//     <div className="absolute w-screen bg-gray-50 dark:bg-gray-900 overflow-hidden" style={{ height: viewportHeight }}>
//       {(
//         <div className="relative h-full overflow-hidden">
//           <div className="absolute top-4 left-4 z-50 p-2 rounded-md  text-white bg-gray-900 ">
//             <div className="flex flex-row gap-4 ">
//           <Button className="bg-gray-50 dark:bg-gray-900" variant="ghost" size="icon" onClick={() => toggleMenu()}>
//             {<MenuIcon size={20} />}
//           </Button>
//          <Button onClick={createNewChat} variant={"outline"} className=" w-full flex items-center justify-center gap-2">
//               <PlusIcon size={16} />
//               New Chat
//             </Button>
            
//             <Button
//               variant="outline"
//               onClick={() => setIsExportDialogOpen(true)}
//               disabled={!currentChat || currentChat.messages.length === 0}
//             >
//               <Download size={16} className="" />
//               <span className="hidden lg:inline lg:ml-2">Export</span>
//             </Button>
             
//             </div>
//           </div>
//           <div className={cn(`absolute top-0 left-0 h-full bg-gray-900 text-white transition-transform duration-300 ease-in-out z-40 ${
//           collapsed ? '-translate-x-full' : 'translate-x-0'}`,"pt-20 border-r border-r-gray-950")}>
//           {ollamastate==0?(<div className="p-4 border-b border-gray-200 dark:border-gray-700">
//             <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
//           </div>):null}
//           {ollamastate!==0? (<><div className="p-4 border-b border-gray-200 dark:border-gray-700">
//             <LMStudioURL lmurl={lmurl} setlmurl={setlmurl} />
//           </div>
          
//           <div className="p-4 border-b border-gray-200 dark:border-gray-700">
//             <LMStudioModelName model_name={model_name} set_model_name={set_model_name} />
//           </div></>):<></>}
          

//           <div className="flex-1 overflow-y-auto">
//             <ChatHistory
//             chats={chats}
//             currentChatId={currentChatId}
//             setCurrentChatId={setCurrentChatId}
//             deleteChat={deleteChat}
//             renameChat={renameChat}
//       />
//           </div>
//             <div className="flex items-end gap-2 p-4">
//           <Button onClick={createNewChat} className="w-full flex items-center justify-center gap-2">
//               <PlusIcon size={16} />
//               New Chat
//             </Button>
//             </div>
//             </div>
//         </div>
//       )}
//                 {/* <SidebarMenu/> */}
      

//       {/* Main content */}
//       <div className={cn("flex flex-col h-full")} onClick={()=>{setCollapsed(true)}} >
//         {/* <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
//           {!sidebarVisible?(<Button variant="ghost" size="icon" onClick={() => setSidebarVisible(!sidebarVisible)}>
//             {<MenuIcon size={20} />}
//           </Button>):null}
//         </div> */}

//         {currentChat && (
//           <ChatInterface
//           setollamastate={setollamastate}
//             ollamastate={ollamastate}
//             lmstudio_model_name={model_name}
//             lmstudio_url={lmurl}
//             chat={currentChat}
//             updateChat={updateChat}
//             apiKey={apiKey}
//             selectedModel={selectedModel}
//             selectedModelInfo={selectedModelInfo}
//             onBranchConversation={handleBranchConversation}
//             directsendmessage={false}
//             messagetosend=""
//             sidebarVisible={sidebarVisible}
//             setSidebarVisible={setSidebarVisible}
//             getModelColor={getModelColor}
//             getModelDisplayName={getModelDisplayName}
//             setIsModelDialogOpen={setIsModelDialogOpen}
//           />
//         )}
//       </div>

//       {/* Model Selection Dialog */}
//       <ModelSelectionDialog
//         isOpen={isModelDialogOpen}
//         onClose={() => setIsModelDialogOpen(false)}
//         models={allModels}
//         selectedModel={selectedModel}
//         onSelectModel={handleSelectModel}
//         apiKey={apiKey}
//       />

//       {/* Export Dialog */}
//       <ExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} chat={currentChat} />

//       <Toaster />
//     </div>
//   )
// }

// // Helper function to get a consistent color based on model name
// function getModelColor(modelId: string): string {
//   const colors = [
//     "purple-500",
//     "pink-500",
//     "rose-500",
//     "red-500",
//     "orange-500",
//     "amber-500",
//     "yellow-500",
//     "lime-500",
//     "green-500",
//     "emerald-500",
//     "teal-500",
//     "cyan-500",
//     "sky-500",
//     "blue-500",
//     "indigo-500",
//     "violet-500",
//   ]

//   // Simple hash function to get consistent color
//   let hash = 0
//   for (let i = 0; i < modelId.length; i++) {
//     hash = modelId.charCodeAt(i) + ((hash << 5) - hash)
//   }

//   const index = Math.abs(hash) % colors.length
//   return colors[index]
// }

// // Helper function to get a display name from model ID
// function getModelDisplayName(modelId: string): string {
//   // Extract the model name from the provider/model format
//   const parts = modelId.split("/")
//   return parts.length > 1 ? parts[1] : modelId
// }





// "use client"

// import React from 'react';

// const ChatLayout = () => {
//   return (
//     <div className="h-screen flex flex-col bg-gray-900">
//       {/* Scrollable content area */}
//       <div className="flex-1 overflow-y-auto p-4">
//         {/* Simulate long text */}
//         {Array.from({ length: 100 }).map((_, i) => (
//           <p key={i} className="mb-2">This is line {i + 1} of content.</p>
//         ))}
//       </div>

//       {/* Fixed input bar */}
//       <div className="w-full p-2 border-t border-gray-300 bg-white">
//         <textarea
//           className="w-full resize-none border rounded p-2 text-sm focus:outline-none focus:ring focus:border-blue-300"
//           rows={2}
//           placeholder="Type your message..."
//         />
//       </div>
//     </div>
//   );
// };

// export default ChatLayout;


"use client"

import Head from 'next/head';
import { useEffect, useRef, useState, useCallback } from 'react';

// Debounce utility function (from util.js)
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

// SVG Icon for the send button
const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="24px"
    viewBox="0 0 24 24"
    width="24px"
    fill="currentColor"
  >
    <path d="M0 0h24v24H0V0z" fill="none" />
    <path d="M4.01 6.03l7.51 3.22-7.52-1 .01-2.22m7.5 8.72L4 17.97v-2.22l7.51-1M2.01 3L2 10l15 2-15 2 .01 7L23 12 2.01 3z" />
  </svg>
);

const ChatPage = () => {
  const initialMessages = [
    { id: '1', text: 'Hey there!', sender: 'me', isHtml: false },
    { id: '2', text: 'Hi! How are you?', sender: 'them', isHtml: false },
    { id: '3', text: "Good, thanks! Just gettin' started with the VirtualKeyboard API!", sender: 'me', isHtml: false },
  ];

  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const ulRef = useRef(null);
  const [composeHeight] = useState('50px'); // from --compose-height

  // Effect for setting --100vh (from util.js)
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

  // Effect for :root CSS variables related to color scheme (for scrollbars etc.)
  // Tailwind handles component colors, but this helps the browser.
  useEffect(() => {
    document.documentElement.style.setProperty('color-scheme', 'dark light');
  }, []);

  // Effect for isSecureContext check
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      // In a real Next.js app, you might use next/router here
      // For example: router.replace(window.location.href.replace('http:', 'https:'));
      if (window.location.protocol !== 'https:') {
        console.warn("Attempting to redirect to HTTPS (simulated for component context)");
        // window.location.protocol = "https:"; // This would cause a full page reload
      }
    }
  }, []);


  const addMessageToList = useCallback((text, sender, isHtml = false) => {
    setMessages(prevMessages => [
      ...prevMessages,
      { id: Date.now().toString() + Math.random(), text, sender, isHtml },
    ]);
  }, []);

  // Effect for VirtualKeyboard API
  useEffect(() => {
    const virtualKeyboardSupported = 'virtualKeyboard' in navigator;

    if (!virtualKeyboardSupported) {
      setMessages([]); // Clear initial messages
      const unsupportedText = '😔 Your device does not support the VirtualKeyboard API.';
      addMessageToList(unsupportedText, 'me', false);
      // Simulate the bot reply from original writeMessage
      setTimeout(() => {
        addMessageToList(
          ["LOL, yeah!", "What?", "No way.", "Awesome!!1!"][Math.floor(Math.random() * 4)],
          'them',
          false
        );
      }, Math.floor(Math.random() * 3 + 1) * 500);
    } else {
      navigator.virtualKeyboard.overlaysContent = true;

      let previousWidth;
      let previousHeight;

      const handleGeometryChange = (e) => {
        let { x, y, width, height } = e.target.boundingRect;
        x = Math.abs(x);
        y = Math.abs(y);
        width = Math.abs(width);
        height = Math.abs(height);

        if (previousWidth === width && previousHeight === height) {
          return;
        }
        previousWidth = width;
        previousHeight = height;

        const geometryText = `⌨️ geometrychange<br>x: ${x} y: ${y} width: ${width} height: ${height}`;
        addMessageToList(geometryText, 'me', true);
         // Simulate the bot reply from original writeMessage
        setTimeout(() => {
          addMessageToList(
            ["LOL, yeah!", "What?", "No way.", "Awesome!!1!"][Math.floor(Math.random() * 4)],
            'them',
            false
          );
        }, Math.floor(Math.random() * 3 + 1) * 500);
      };

      navigator.virtualKeyboard.addEventListener('geometrychange', handleGeometryChange);

      return () => {
        navigator.virtualKeyboard.removeEventListener('geometrychange', handleGeometryChange);
      };
    }
  }, [addMessageToList]);


  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    addMessageToList(inputValue, 'me', false); // User message
    setInputValue(''); // Clear input

    // Simulate bot reply
    setTimeout(() => {
      addMessageToList(
        ["LOL, yeah!", "What?", "No way.", "Awesome!!1!"][Math.floor(Math.random() * 4)],
        'them',
        false
      );
    }, Math.floor(Math.random() * 3 + 1) * 500);

    inputRef.current?.focus();
    if ('virtualKeyboard' in navigator && navigator.virtualKeyboard) {
      navigator.virtualKeyboard.show();
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    ulRef.current?.lastElementChild?.scrollIntoView();
  }, [messages]);

  // Define base styles for list items and their pseudo-elements
  // Using arbitrary values for custom colors like deeppink and turquoise
  // Deeppink: #FF1493, Turquoise: #40E0D0
  const liBaseStyle = "p-1 mb-1 rounded relative break-words text-white dark:text-black";
  const meLiStyle = `bg-[#FF1493] me-4 before:content-[''] before:absolute before:w-[10px] before:h-[10px] before:left-[-10px] before:top-[50%] before:translate-y-[-50%] before:border-solid before:border-t-[10px] before:border-r-[15px] before:border-b-[10px] before:border-l-0 before:border-t-transparent before:border-r-[#FF1493] before:border-b-transparent before:border-l-transparent`;
  const themLiStyle = `bg-[#40E0D0] ms-4 before:content-[''] before:absolute before:w-[10px] before:h-[10px] before:right-[-10px] before:top-[50%] before:translate-y-[-50%] before:border-solid before:border-t-[10px] before:border-r-0 before:border-b-[10px] before:border-l-[15px] before:border-t-transparent before:border-r-transparent before:border-b-transparent before:border-l-[#40E0D0]`;


  return (
    <>
      <Head>
        <title>VirtualKeyboard API Demo - Next.js</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="https://glitch.com/favicon.ico" />
      </Head>
      {/* The global styles for html, body, box-sizing are typically handled by Tailwind's preflight 
        and a _app.js or globals.css in Next.js.
        For this single component to work as standalone as possible, we apply height to the main container.
        The `var(--100vh)` is set by the useEffect hook.
      */}
      <div style={{ height: 'var(--100vh, 100vh)' }} className="p-4 font-sans flex flex-col bg-white dark:bg-black text-black dark:text-white overflow-hidden">
        <div
          className="grid h-full gap-[10px]"
          style={{
            gridTemplateRows: `minmax(0, 1fr) ${composeHeight} env(keyboard-inset-height, 0px)`
          }}
        >
          <div className="messages-container overflow-y-auto overflow-x-hidden flex flex-col h-full"> {/* Changed to flex-col */}
            <ul ref={ulRef} className="list-none p-[10px] mt-auto w-full"> {/* Added w-full, mt-auto works with flex-col parent */}
              {messages.map((msg) => (
                <li
                  key={msg.id}
                  className={`${liBaseStyle} ${msg.sender === 'me' ? meLiStyle : themLiStyle}`}
                >
                  {msg.isHtml ? (
                    <span dangerouslySetInnerHTML={{ __html: msg.text }} />
                  ) : (
                    msg.text
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="compose-area border border-black dark:border-white w-full"
            style={{ height: composeHeight }}
          >
            <form onSubmit={handleFormSubmit} className="flex h-full">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-grow text-base rounded-none p-2 bg-transparent focus:outline-none border-none text-black dark:text-white"
                placeholder="Type a message..."
              />
              <button
                type="submit"
                className="bg-black dark:bg-white text-white dark:text-black border-none px-3 py-2 flex items-center justify-center focus:outline-none"
              >
                <SendIcon />
                <div className="ml-2 hidden sm:inline">Send</div> {/* Text part of button, improved layout */}
              </button>
            </form>
          </div>
          {/* The third grid row for env(keyboard-inset-height) is implicitly handled by grid-template-rows */}
        </div>
      </div>
    </>
  );
};

export default ChatPage;