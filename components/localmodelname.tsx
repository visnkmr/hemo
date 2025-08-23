"use client"

import { useEffect, useState } from "react"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Button } from "../components/ui/button"
import { EyeIcon, EyeOffIcon, SaveIcon } from "lucide-react"
import { useConfigItem } from "../hooks/use-indexeddb"

interface LMmodelnameProps {
  model_name: string
  ollamastate: number
  set_model_name: (key: string) => void
}

export default function LMStudioModelName({ model_name, set_model_name,ollamastate }: LMmodelnameProps) {
  // const [showKey, setShowKey] = useState(false)
  const keyName = ollamastate === 4 ? "groq_model_name" : "lmstudio_model_name"

  // Use IndexedDB hook instead of localStorage
  const { value: storedModelName, setValue: saveModelName, loading, error } = useConfigItem<string>(keyName, "")

  const [inputValue, setInputValue] = useState(storedModelName || model_name)

  // Update input value when storedModelName or model_name changes
  useEffect(() => {
    const valueToUse = storedModelName || model_name
    setInputValue(valueToUse)
  }, [storedModelName, model_name])

  const handleSave = async () => {
    try {
      set_model_name(inputValue)
      await saveModelName(inputValue)
    } catch (err) {
      console.error("Failed to save model name:", err)
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
      <Label htmlFor="api-key">{label} Model Name</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="api-key"
            type={"text"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="LM Studio Model name"
            className="pr-10"
          />
        </div>
        <Button onClick={handleSave} disabled={!inputValue || inputValue === model_name} size="icon">
          <SaveIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
