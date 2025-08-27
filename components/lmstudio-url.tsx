"use client"

import { useEffect, useState } from "react"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Button } from "../components/ui/button"
import { EyeIcon, EyeOffIcon, SaveIcon } from "lucide-react"
import { useConfigItem } from "../hooks/use-indexeddb"

interface LMUrlInputProps {
   // Removed props since component now manages its own state
}

export default function LMStudioURL({}: LMUrlInputProps) {
   // Use IndexedDB hooks for both URL and state
   const { value: storedUrl, setValue: saveUrl, loading, error } = useConfigItem<string>("lmstudio_url", "")
   const { value: ollamastate } = useConfigItem<number>("laststate", 0)

   const [inputValue, setInputValue] = useState(storedUrl || "")

   // Update input value when storedUrl changes
   useEffect(() => {
     if (storedUrl) {
       setInputValue(storedUrl)
     }
   }, [storedUrl])

  const handleSave = async () => {
    try {
      await saveUrl(inputValue)
    } catch (err) {
      console.error("Failed to save URL:", err)
    }
  }
const [label,setlabel]=useState("")
  useEffect(()=>{

    switch (ollamastate) {
      case 0:
        setlabel("Openrouter")
        break;
      case 1:
        setlabel("Ollama")
        break;
      case 2:
        setlabel("LM studio")
        break;
      case 4:
        setlabel("Groq")
        break;
    
      default:
        break;
    }
  },[ollamastate])
  return (
    <div className="space-y-2 text-black dark:text-white">
      <Label htmlFor="api-key">{label} URL</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="api-key"
            type={"text"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="LM Studio IP"
            className="pr-10"
          />
        </div>
        <Button onClick={handleSave} disabled={!inputValue || inputValue === storedUrl} size="icon">
          <SaveIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
