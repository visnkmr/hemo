"use client"

import { useEffect, useState, useMemo } from "react"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Button } from "../components/ui/button"
import { EyeIcon, EyeOffIcon, SaveIcon } from "lucide-react"

interface ApiKeyInputProps {
   ollamastate: number
}

export default function ApiKeyInput({ ollamastate }: ApiKeyInputProps) {
   const [showKey, setShowKey] = useState(false)
   const [inputValue, setInputValue] = useState("")

   // Memoize computed values to prevent unnecessary recalculations
   const providerConfig = useMemo(() => {
     switch (ollamastate) {
       case 4:
         return {
           keyName: "groq_api_key",
           label: "Groq API Key",
           placeholder: "Enter your Groq API key"
         }
       case 5:
         return {
           keyName: "gemini_api_key",
           label: "Gemini API Key",
           placeholder: "Enter your Gemini API key"
         }
       default:
         return {
           keyName: "openrouter_api_key",
           label: "OpenRouter API Key",
           placeholder: "Enter your OpenRouter API key"
         }
     }
   }, [ollamastate])

   // Load stored API key when ollamastate changes
   useEffect(() => {
     const storedApiKey = localStorage.getItem(providerConfig.keyName)
     setInputValue(storedApiKey || "")
   }, [providerConfig.keyName])

   const handleSave = () => {
     localStorage.setItem(providerConfig.keyName, inputValue)
     // Optional: Add success feedback or callback
   }

   return (
     <div className="space-y-2 text-black dark:text-white">
       <Label className="dark:text-white text-black" htmlFor="api-key">
         {providerConfig.label}
       </Label>
       <div className="flex gap-2">
         <div className="relative flex-1">
           <Input
             id="api-key"
             type={showKey ? "text" : "password"}
             value={inputValue}
             onChange={(e) => setInputValue(e.target.value)}
             placeholder={providerConfig.placeholder}
             className="pr-10"
           />
           <Button
             type="button"
             variant="ghost"
             size="icon"
             className="absolute right-0 top-0 h-full"
             onClick={() => setShowKey(!showKey)}
           >
             {showKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
           </Button>
         </div>
         <Button onClick={handleSave} size="icon">
           <SaveIcon className="h-4 w-4" />
         </Button>
       </div>
     </div>
   )
}
