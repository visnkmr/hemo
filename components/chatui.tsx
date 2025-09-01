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
import { GeminiImageService } from "../lib/gemini-image-service"
import { imageDBService } from "../lib/image-db-service"
import { CompressionSettingsService, compressionSettingsService } from "../lib/compression-settings-service"
import { Button } from "../components/ui/button"
import { Database } from "lucide-react"
import { PlusIcon, MenuIcon, XIcon, Download, Bot, Zap, Eye, Bug, Settings, Archive, BarChart3 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu"

import ExportDialog from "../components/export-dialog"
import { Toaster } from "../components/ui/toaster"
import { cn } from "../lib/utils"
import DarkButton from './dark-button'
import ImageGalleryModal from './image-gallery-modal'
import CompressionDashboardModal from './compression-dashboard-modal'
import RecycleBinModal from './recycle-bin-modal'
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
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [isMigratingImages, setIsMigratingImages] = useState(false);
  const [showCompressionDashboard, setShowCompressionDashboard] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const isMobile = useIsMobile();

  // Helper functions for compression settings
  const getCompressionSettingsSummary = () => {
    try {
      return CompressionSettingsService.getSettingsSummary();
    } catch (error) {
      return 'Optimized';
    }
  };

  const showCompressionSettings = () => {
    try {
      const summary = getCompressionSettingsSummary();
      console.log(`[Compression] Current Settings: ${summary}`);
      console.log('[Compression] Full settings:', CompressionSettingsService.getSettings());
    } catch (error) {
      console.log('[Compression] Settings not available');
    }
  };

  const resetCompressionSettings = () => {
    try {
      CompressionSettingsService.clearSettings();
      console.log('[Compression] ✅ Settings reset to defaults');
    } catch (error) {
      console.log('[Compression] Failed to reset settings');
    }
  };

  const exportCompressionSettings = () => {
    try {
      const exported = CompressionSettingsService.exportSettings();
      console.log('[Compression] 📤 Exported Settings:');
      console.log(exported);
    } catch (error) {
      console.log('[Compression] Failed to export settings');
    }
  };

 // const [tempApiKey, setTempApiKey] = useState("");

  /**
   * Formats bytes into human-readable format
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Calculates and reports total storage space usage (localStorage + IndexedDB)
   */
  const reportStorageUsage = async (): Promise<void> => {
    console.log(`\n[Storage] 📊 COMPREHENSIVE STORAGE USAGE REPORT:`);

    try {
      // localStorage report
      console.log(`├── localStorage:`);
      const totalItems = localStorage.length;
      let totalLocalBytes = 0;
      const itemsReport: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        const value = localStorage.getItem(key) || '';
        const keySize = key.length;
        const valueSize = value.length;
        const pairSize = keySize + valueSize;

        totalLocalBytes += pairSize;

        // if (itemsReport.length < 5) {
          itemsReport.push(`${key}: ${formatBytes(pairSize)}`);
        // }
      }

      console.log(`│   ├── Items: ${totalItems}`);
      console.log(`│   ├── Size: ${formatBytes(totalLocalBytes)}`);
      console.log(`│   └── Largest Items:`);
      itemsReport.forEach((item, index) => {
        console.log(`│       ${index + 1}. ${item}`);
      });

      // IndexedDB report
      console.log(`├── IndexedDB (Images):`);
      try {
        const imageDBStats = await imageDBService.getStats();
        console.log(`│   ├── Images: ${imageDBStats.totalImages}`);
        console.log(`│   ├── Size: ${formatBytes(imageDBStats.totalSize)}`);
        console.log(`│   ├── Image Types:`, imageDBStats.imagesByType);
        if (imageDBStats.oldestImage && imageDBStats.newestImage) {
          console.log(`│   └── Date Range: ${imageDBStats.oldestImage.toLocaleDateString()} - ${imageDBStats.newestImage.toLocaleDateString()}`);
        }

        // Get individual database sizes and last 5 images
        console.log(`│   ├── Database Breakdown:`);

        // Original image database
        try {
          const originalImages = await imageDBService.getAllImagesFromDb('original');
          const originalSize = originalImages.reduce((sum, img) => sum + img.size, 0);
          console.log(`│   │   ├── originalimage:`);
          console.log(`│   │   │   ├── Images: ${originalImages.length}`);
          console.log(`│   │   │   ├── Size: ${formatBytes(originalSize)}`);
          console.log(`│   │   │   └── Last 5 Images:`);

          // Sort by lastAccessed (most recent first) and get last 5
          const sortedOriginalImages = originalImages
            .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
            .slice(0, 5);

          sortedOriginalImages.forEach((img, index) => {
            console.log(`│   │   │       ${index + 1}. ${img.messageId}... (${formatBytes(img.size)}) - ${img.mimeType}`);
          });
        } catch (originalError) {
          console.log(`│   │   ├── originalimage: ❌ Error accessing database`);
        }

        // Webuse database
        try {
          const webuseImages = await imageDBService.getAllImagesFromDb('webuse');
          const webuseSize = webuseImages.reduce((sum, img) => sum + img.size, 0);
          console.log(`│   │   └── webuse:`);
          console.log(`│   │       ├── Images: ${webuseImages.length}`);
          console.log(`│   │       ├── Size: ${formatBytes(webuseSize)}`);
          console.log(`│   │       └── Last 5 Images:`);

          // Sort by lastAccessed (most recent first) and get last 5
          const sortedWebuseImages = webuseImages
            .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
            .slice(0, 5);

          sortedWebuseImages.forEach((img, index) => {
            console.log(`│   │           ${index + 1}.sfdsf ${img.messageId}... (${formatBytes(img.size)}) - ${img.mimeType}`);
          });
        } catch (webuseError) {
          console.log(`│   │   └── webuse: ❌ Error accessing database`);
        }

        // Combined total
        const totalStorage = totalLocalBytes + imageDBStats.totalSize;
        console.log(`└── Combined Total:`);
        console.log(`    ├── localStorage: ${formatBytes(totalLocalBytes)}`);
        console.log(`    ├── IndexedDB: ${formatBytes(imageDBStats.totalSize)}`);
        console.log(`   ्यू Total Used: ${formatBytes(totalStorage)}`);

      } catch (dbError) {
        console.log(`│   ❌ IndexedDB not available or inaccessible`);
        console.log(`│       ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);

        // Still show localStorage total
        console.log(`└── Total localStorage: ${formatBytes(totalLocalBytes)}`);
      }

    } catch (error) {
      console.error('[Storage] ❌ Error calculating storage usage:', error);
    }
  };

  /**
   * Optimizes existing images in chat history using the Gemini image optimizer
   */
  const optimizeChatHistoryImages = async () => {
    if (isOptimizing) return;

    setIsOptimizing(true);
    console.log('[Chat Optimization] 🔧 Starting chat history image optimization...');

    // Report storage usage before optimization
    console.log('\n[Chat Optimization] 📊 BEFORE OPTIMIZATION:');
    await reportStorageUsage();

    try {
      const geminiService = GeminiImageService.createGeminiImageService();
      if (!geminiService) {
        console.error('[Chat Optimization] ❌ Gemini API key not available');
        return;
      }

      let totalSavings = 0;
      let imagesProcessed = 0;
      const optimizedChats = JSON.parse(JSON.stringify(chats)); // Deep clone

      for (let chatIndex = 0; chatIndex < optimizedChats.length; chatIndex++) {
        const chat = optimizedChats[chatIndex];

        for (let messageIndex = 0; messageIndex < chat.messages.length; messageIndex++) {
          const message = chat.messages[messageIndex];
          let messageModified = false;

          // Optimize single imageUrl
          if (message.imageUrl && (message.imageUrl.startsWith('data:image/') || message.imageUrl.startsWith('indexeddb:'))) {
            try {
              let imageData: string | null = null;

              // Handle IndexedDB URLs by resolving them first
              if (message.imageUrl.startsWith('indexeddb:')) {
                imageData = await geminiService.resolveImageUrl(message.imageUrl,false);
              } else if (message.imageUrl.startsWith('data:image/')) {
                imageData = message.imageUrl;
              }

              if (imageData) {
                console.log(`[Chat Optimization] 📸 Optimizing ${chat.title} - imageUrl (${message.id})...`);
                const result = await geminiService.optimizeImageForGemini(imageData);

                // Store optimized image in IndexedDB and get reference
                const indexedDBUrl = await geminiService.convertToIndexedDB(result.optimizedBase64, chat.id, message.id);

                // Update message to use IndexedDB reference instead of base64
                message.imageUrl = indexedDBUrl;
                totalSavings += result.savings.savingsBytes;
                imagesProcessed++;
                messageModified = true;
              }
            } catch (error) {
              console.error(`[Chat Optimization] ❌ Failed to optimize imageUrl in ${chat.title}:`, error);
            }
          }

          // Optimize images in imageGenerations array
          if (message.imageGenerations && Array.isArray(message.imageGenerations)) {
            for (let genIndex = 0; genIndex < message.imageGenerations.length; genIndex++) {
              const generation = message.imageGenerations[genIndex];

              if (generation.images && Array.isArray(generation.images)) {
                for (let imgIndex = 0; imgIndex < generation.images.length; imgIndex++) {
                  const image = generation.images[imgIndex];

                  if (image.uri && (image.uri.startsWith('data:image/') || image.uri.startsWith('indexeddb:'))) {
                    try {
                      let imageData: string | null = null;

                      // Handle IndexedDB URLs by resolving them first
                      if (image.uri.startsWith('indexeddb:')) {
                        imageData = await geminiService.resolveImageUrl(image.uri,false);
                      } else if (image.uri.startsWith('data:image/')) {
                        imageData = image.uri;
                      }

                      if (imageData) {
                        console.log(`[Chat Optimization] 🖼️ Optimizing ${chat.title} - message ${message.id}, generation ${genIndex}, image ${imgIndex}...`);
                        const result = await geminiService.optimizeImageForGemini(imageData);

                        // Store optimized image in IndexedDB and get reference
                        const indexedDBUrl = await geminiService.convertToIndexedDB(result.optimizedBase64, chat.id, message.id);

                        // Update image to use IndexedDB reference instead of base64
                        image.uri = indexedDBUrl;
                        totalSavings += result.savings.savingsBytes;
                        imagesProcessed++;
                        messageModified = true;

                        // Update mimeType to reflect JPEG optimization
                        image.mimeType = "image/jpeg";
                      }
                    } catch (error) {
                      console.error(`[Chat Optimization] ❌ Failed to optimize image in ${chat.title}:`, error);
                    }
                  }
                }
              }
            }
          }

          if (messageModified) {
            console.log(`[Chat Optimization] ✅ Optimized message ${message.id} in "${chat.title}"`);
          }
        }
      }

      // Save optimized chats back to localStorage (with IndexedDB references maintained)
      localStorage.setItem("chat_history", JSON.stringify(optimizedChats));

      // Update state to reflect changes
      setChats(optimizedChats);

      // Report comprehensive results
      console.log('\n[Chat Optimization] 🎉 OPTIMIZATION COMPLETE:');
      console.log(`├── Images Processed: ${imagesProcessed}`);
      console.log(`├── Space Saved: ${formatBytes(totalSavings)}`);
      console.log(`└── Optimization completed successfully!`);

      // Report storage usage after optimization
      console.log('\n[Chat Optimization] 📊 AFTER OPTIMIZATION:');
      await reportStorageUsage();

    } catch (error) {
      console.error('[Chat Optimization] ❌ Error during optimization:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  /**
   * Migrate existing images from base64 to IndexedDB
   */
  const migrateImagesToIndexedDB = async () => {
    if (isMigratingImages) return;

    setIsMigratingImages(true);
    console.log('[UI Migration] 🔄 Checking for any remaining base64 images to migrate to IndexedDB...');

    try {
      let totalBase64Images = 0;
      const updatedChats = JSON.parse(JSON.stringify(chats));

      // Scan for any base64 images that need to be migrated
      for (const chat of updatedChats) {
        for (const message of chat.messages) {
          if (message.imageUrl && message.imageUrl.startsWith('data:image/')) {
            try {
              // Convert base64 to IndexedDB
              const geminiService = GeminiImageService.createGeminiImageService();
              if (geminiService) {
                const indexedDBUrl = await geminiService.convertToIndexedDB(message.imageUrl, chat.id, message.id);
                message.imageUrl = indexedDBUrl;
                totalBase64Images++;
              }
            } catch (error) {
              console.warn(`[UI Migration] Failed to convert base64 image in message ${message.id}:`, error);
            }
          }

          // Handle images in imageGenerations
          if (message.imageGenerations && Array.isArray(message.imageGenerations)) {
            for (const generation of message.imageGenerations) {
              if (generation.images && Array.isArray(generation.images)) {
                for (const image of generation.images) {
                  if (image.uri && image.uri.startsWith('data:image/')) {
                    try {
                      const geminiService = GeminiImageService.createGeminiImageService();
                      if (geminiService) {
                        const indexedDBUrl = await geminiService.convertToIndexedDB(image.uri, chat.id, message.id);
                        image.uri = indexedDBUrl;
                        totalBase64Images++;
                      }
                    } catch (error) {
                      console.warn(`[UI Migration] Failed to convert base64 image in generation for message ${message.id}:`, error);
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (totalBase64Images > 0) {
        // Save updated chats with IndexedDB references to localStorage
        localStorage.setItem("chat_history", JSON.stringify(updatedChats));
        setChats(updatedChats);

        console.log(`[UI Migration] ✅ Successfully migrated ${totalBase64Images} base64 images to IndexedDB`);
        alert(`✅ Migration Complete!\n${totalBase64Images} base64 images have been converted to IndexedDB for better performance.`);
      } else {
        console.log(`[UI Migration] ✅ No base64 images found to migrate - all images are already in IndexedDB`);
        alert(`✅ No Migration Needed!\nAll images are already stored in IndexedDB efficiently.`);
      }

    } catch (error) {
      console.error('[UI Migration] ❌ Migration failed:', error);
      alert('❌ Migration failed. Please check the console for details.');
    } finally {
      setIsMigratingImages(false);
    }
  };

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
     // Function to load chats from localStorage but resolve image references from IndexedDB
     const loadChats = async () => {
       const storedChats = localStorage.getItem("chat_history")
       if (storedChats) {
         try {
           const parsedChats = JSON.parse(storedChats)

           // Resolve all image references from IndexedDB
           const resolvedChats = await Promise.all(parsedChats.map(async (chat: Chat) => {
             const updatedChat = { ...chat }
             updatedChat.messages = []

             for (const message of chat.messages) {
               const updatedMessage = { ...message }

               // Resolve single imageUrl
               if (message.imageUrl && message.imageUrl.startsWith('indexeddb:')) {
                 const imageData = await imageDBService.getImage(message.imageUrl.replace('indexeddb:', ''))
                 if (imageData) {
                   updatedMessage.imageUrl = `indexeddb:${imageData.id}` // Ensure proper format
                 }
               }

               // Resolve images in imageGenerations
               if (message.imageGenerations && Array.isArray(message.imageGenerations)) {
                 updatedMessage.imageGenerations = await Promise.all(message.imageGenerations.map(async (generation) => {
                   const updatedGeneration = { ...generation }

                   if (updatedGeneration.images && Array.isArray(updatedGeneration.images)) {
                     updatedGeneration.images = await Promise.all(updatedGeneration.images.map(async (image) => {
                       const updatedImage = { ...image }

                       // If we have image IDs, ensure proper IndexedDB URI format
                       if (image.originalImageId || image.optimizedImageId) {
                         // Already in correct format with IDs, no change needed
                       }

                       return updatedImage
                     }))
                   }

                   return updatedGeneration
                 }))
               }

               updatedChat.messages.push(updatedMessage)
             }

             return updatedChat
           }))

           setChats(resolvedChats)

           // Set current chat to the most recent one if it exists
           if (resolvedChats.length > 0) {
             setCurrentChatId(resolvedChats[0].id)
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
     }

     loadChats()
   }, [])

  // Save chats to localStorage whenever they change (minimal data, images via IndexedDB)
  useEffect(() => {
    if (chats.length > 0) {
      // Create a minimal version for localStorage with only metadata
      const chatsToSave = chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        messages: chat.messages.map(message => {
          const minimalMessage = { ...message }

          // Ensure imageUrl is saved as IndexedDB reference
          if (message.imageUrl) {
            if (message.imageUrl.startsWith('data:image/')) {
              // If it's still base64, it should have been converted by now
              console.warn('Saving base64 image to localStorage - should be IndexedDB reference')
            }
          }

          // Ensure images in generations are saved as IndexedDB references
          if (message.imageGenerations && Array.isArray(message.imageGenerations)) {
            minimalMessage.imageGenerations = message.imageGenerations.map(generation => ({
              ...generation,
              images: generation.images.map(image => ({
                ...image,
                // Ensure URI format for IndexedDB references
                uri: image.originalImageId ? `indexeddb:${image.optimizedImageId || image.originalImageId}` : ''
              }))
            }))
          }

          return minimalMessage
        }),
        createdAt: chat.createdAt,
        lastModelUsed: chat.lastModelUsed,
        branchedFrom: chat.branchedFrom
      }))

      localStorage.setItem("chat_history", JSON.stringify(chatsToSave))
      console.log(`[ChatUI] 💾 Saved ${chatsToSave.length} chats to localStorage (images via IndexedDB)`)
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

  const handleApiKeySaved = () => {
    console.log("[DEBUG] API key saved, refreshing state and fetching models")
    // Refresh API key state from localStorage
    const keyName = ollamastate === 5 ? "gemini_api_key" :
                    ollamastate === 4 ? "groq_api_key" : "openrouter_api_key"
    const storedApiKey = localStorage.getItem(keyName)
    // console.log(`[DEBUG] Reloading API key: ${keyName}: ${storedApiKey ? 'loaded' : 'not found'}`)
    setApiKey(storedApiKey || "")

    // Trigger model fetching to update current model name
    setTimeout(() => {
      console.log("[DEBUG] Triggering model fetch after API key save")
      // Use existing fetchModels logic by setting a temporary state
      const tempOllamastate = ollamastate
      setollamastate(prev => prev === tempOllamastate ? tempOllamastate : tempOllamastate)
    }, 100)
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

  const handleDeleteImage = async (imageData: any) => {
    console.log('[Image Delete] Starting image deletion:', imageData);

    try {
      const updatedChats = chats.map(chat => {
        if (chat.id !== imageData.chatId) return chat;

        const updatedMessages = chat.messages.map(message => {
          if (message.id !== imageData.messageId) return message;

          const updatedMessage = { ...message };

          if (imageData.isSingleImage) {
            // Delete single imageUrl
            updatedMessage.imageUrl = undefined;
            console.log(`[Image Delete] Removed single imageUrl from message ${imageData.messageId}`);
          } else {
            // Delete from imageGenerations array
            if (updatedMessage.imageGenerations && imageData.generationIndex !== undefined && imageData.imageIndex !== undefined) {
              const generation = updatedMessage.imageGenerations[imageData.generationIndex];
              if (generation && generation.images) {
                // Remove the specific image from the generation
                generation.images.splice(imageData.imageIndex, 1);

                // If this was the only image in the generation, remove the entire generation
                if (generation.images.length === 0) {
                  updatedMessage.imageGenerations.splice(imageData.generationIndex, 1);
                  console.log(`[Image Delete] Removed entire generation (no images left) from message ${imageData.messageId}`);
                } else {
                  console.log(`[Image Delete] Removed image ${imageData.imageIndex} from generation ${imageData.generationIndex} in message ${imageData.messageId}`);
                }
              }
            }
          }

          return updatedMessage;
        });

        return {
          ...chat,
          messages: updatedMessages
        };
      });

      // Update state and localStorage
      setChats(updatedChats);

      console.log('[Image Delete] Image deletion completed successfully');

    } catch (error) {
      console.error('[Image Delete] Error during image deletion:', error);
      throw error;
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
    if (typeof window !== 'undefined') {
      const setViewportHeight = () => {
        document.documentElement.style.setProperty('--100vh', `${window.innerHeight}px`);
      };
      setViewportHeight();
      const debouncedSetViewportHeight = debounce(setViewportHeight, 100);
      window.addEventListener('resize', debouncedSetViewportHeight);
      return () => {
        window.removeEventListener('resize', debouncedSetViewportHeight);
      };
    }
    return undefined; // Fix for TypeScript - all code paths must return a value
  }, []);

    // Expose test functions to global window for console testing
  useEffect(() => {
    // Import and expose the optimization test function
    import('../lib/image-optimization-service').then((module) => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.testPicaOptimization = module.ImageOptimizations.testPicaOptimization;
        console.log('🧪 Pica test function available: run `testPicaOptimization()` in console');
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // (async ()=>createNewChat((await(await import('@tauri-apps/api/window')).appWindow.title()).replace("FileGPT: ","")))()
      // createNewChat();
      if (!window.isSecureContext) {
        // In a real Next.js app, you might use next/router here
        // For example: router.replace(window.location.href.replace('http:', 'https:'));
        if (window.location.protocol !== 'https:') {
          console.warn("Attempting to redirect to HTTPS (simulated for component context)");
          // window.location.protocol = "https:"; // This would cause a full page reload
        }
      }
    }
  }, []);

  // Check for WebP images in webuse database on startup and reorganize if needed
  useEffect(() => {
    const checkAndReorganizeImages = async () => {
      try {
        // Check if there are any WebP images in the webuse database
        const webuseImages = await imageDBService.getAllImagesFromDb('webuse');
        const webpImages = webuseImages.filter(img => img.mimeType === 'image/webp');

        if (webpImages.length === 0) {
          console.log('[Startup] No WebP images found in webuse database, running reorganization...');
          const result = await imageDBService.reorganizeImages();
          console.log('[Startup] Reorganization completed:', result);
        } else {
          console.log(`[Startup] Found ${webpImages.length} WebP images in webuse database, skipping reorganization`);
        }
      } catch (error) {
        console.error('[Startup] Error during image reorganization check:', error);
      }
    };

    // Only run if IndexedDB is available and we're in browser
    if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined') {
      checkAndReorganizeImages();
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

              <Button
                variant="outline"
                onClick={() => setIsImageGalleryOpen(true)}
                title="View all images in chat history"
              >
                <Eye size={16} className="opacity-70" />
                <span className="hidden lg:inline lg:ml-2">Images</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" title="Debug and maintenance tools">
                    <Bug size={16} className="opacity-70" />
                    <span className="hidden lg:inline lg:ml-2">Debug</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1 text-sm font-medium text-gray-500">Storage Operations</div>
                  <DropdownMenuItem onClick={reportStorageUsage}>
                    <Bot className="mr-2 h-4 w-4" />
                    <span>Storage Usage</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={migrateImagesToIndexedDB}
                    disabled={isMigratingImages || chats.length === 0}
                  >
                    <Database className="mr-2 h-4 w-4" />
                    <span>{isMigratingImages ? "Migrating..." : "Migrate to IndexedDB"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowRecycleBin(true)}>
                    <Archive className="mr-2 h-4 w-4" />
                    <span>Recycle Bin</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <div className="px-2 py-1 text-sm font-medium text-gray-500">Image Compression</div>
                  <DropdownMenuItem onClick={showCompressionSettings}>
                    <Zap className="mr-2 h-4 w-4" />
                    <span>Current Settings: {getCompressionSettingsSummary()}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCompressionDashboard(true)}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>Compression Dashboard</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <div className="px-2 py-1 text-sm font-medium text-gray-500">Optimization Tools</div>
                  <DropdownMenuItem
                    onClick={optimizeChatHistoryImages}
                    disabled={isOptimizing || chats.length === 0}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    <span>{isOptimizing ? "Optimizing..." : "Optimize Images"}</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <div className="px-2 py-1 text-sm font-medium text-gray-500">Debug & Maintenance</div>
                  <DropdownMenuItem onClick={resetCompressionSettings}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Reset Compression Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportCompressionSettings}>
                    <Database className="mr-2 h-4 w-4" />
                    <span>Export Compression Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      // Dynamic import to get the test function
                      const { ImageOptimizations } = await import('../lib/image-optimization-service');
                      ImageOptimizations.testPicaOptimization();
                    }}
                  >
                    <Bug className="mr-2 h-4 w-4" />
                    <span>Test Pica</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>
          <div className="absolute top-4 right-4 z-50 p-2 rounded-md  text-white dark:bg-gray-900 bg-gray-10 ">
            <DarkButton />

          </div>
          <div className={cn(`overflow-y-auto absolute top-0 left-0 h-full bg-gray-50 dark:bg-gray-900 text-white transition-transform duration-300 ease-in-out z-40 ${collapsed ? '-translate-x-full' : 'translate-x-0'}`, "pt-20 border-r border-gray-200 dark:border-r-gray-950")}>
            {(ollamastate == 0 || ollamastate == 4 || ollamastate == 5) ? (<div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <ApiKeyInput ollamastate={ollamastate} onApiKeySaved={handleApiKeySaved} />
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

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={isImageGalleryOpen}
        onClose={() => setIsImageGalleryOpen(false)}
        chats={chats}
        onDeleteImage={handleDeleteImage}
      />

      {/* Compression Dashboard Modal */}
      <CompressionDashboardModal
        isOpen={showCompressionDashboard}
        onClose={() => setShowCompressionDashboard(false)}
      />

      {/* Recycle Bin Modal */}
      <RecycleBinModal
        isOpen={showRecycleBin}
        onClose={() => setShowRecycleBin(false)}
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
