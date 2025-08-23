"use client"

import { useEffect, useState } from "react"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { SaveIcon } from "lucide-react"
import { useConfigItem } from "../hooks/use-indexeddb"

interface FileGPTUrlInputProps {
  filegpturl: string
  setFilegpturl: (key: string) => void
}

export default function FileGPTUrl({ filegpturl, setFilegpturl }: FileGPTUrlInputProps) {
  // Use IndexedDB hook instead of localStorage
  const { value: storedUrl, setValue: saveUrl, loading, error } = useConfigItem<string>("filegpt_url", "")

  const [inputValue, setInputValue] = useState(storedUrl || filegpturl)

  // Update input value when storedUrl or filegpturl changes
  useEffect(() => {
    const valueToUse = storedUrl || filegpturl
    setInputValue(valueToUse)
  }, [storedUrl, filegpturl])

  const handleSave = async () => {
    try {
      setFilegpturl(inputValue)
      await saveUrl(inputValue)
    } catch (err) {
      console.error("Failed to save FileGPT URL:", err)
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="filegpt-url">FileGPT URL</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="filegpt-url"
            type={"text"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="FileGPT Endpoint (e.g., http://localhost:8694)"
            className="pr-10"
          />
        </div>
        <Button onClick={handleSave} disabled={!inputValue || inputValue === filegpturl} size="icon">
          <SaveIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
