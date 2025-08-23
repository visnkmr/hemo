"use client"

import { useEffect, useState } from "react"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Button } from "../components/ui/button"
import { EyeIcon, EyeOffIcon, SaveIcon } from "lucide-react"
import { useConfigItem } from "../hooks/use-indexeddb"

interface ApiKeyInputProps {
  // apiKey: string
  ollamastate:number
  // setApiKey: (key: string) => void
}

export default function ApiKeyInput({  ollamastate }: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false)
  const keyName = ollamastate === 4 ? "groq_api_key" : "openrouter_api_key"

  // Use IndexedDB hook instead of localStorage
  const { value: storedApiKey, setValue: saveApiKey, loading, error } = useConfigItem<string>(keyName, "")

  const [inputValue, setInputValue] = useState(storedApiKey || "")

  // Update input value when storedApiKey changes
  useEffect(() => {
    if (storedApiKey) {
      setInputValue(storedApiKey)
    }
  }, [storedApiKey])

  const handleSave = async () => {
    try {
      await saveApiKey(inputValue)
    } catch (err) {
      console.error("Failed to save API key:", err)
    }
  }

  return (
      <div className="space-y-2 text-black dark:text-white">
      <Label className="dark:text-white text-black " htmlFor="api-key">{ollamastate==4?"Groq":"OpenRouter"} API Key</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            // id="api-key"
            type={showKey ? "text" : "password"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter your OpenRouter API key"
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
        <Button onClick={handleSave}  size="icon">
          <SaveIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
