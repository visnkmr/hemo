"use client"

import { useEffect, useState } from "react"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { SaveIcon } from "lucide-react"
import { useConfigItem } from "../hooks/use-indexeddb"

interface FileGPTUrlInputProps {
   // Removed props since component now manages its own state
}

export default function FileGPTUrl({}: FileGPTUrlInputProps) {
   // Use IndexedDB hook for FileGPT URL
   const { value: storedUrl, setValue: saveUrl, loading, error } = useConfigItem<string>("filegpt_url", "")

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
        <Button onClick={handleSave} disabled={!inputValue || inputValue === storedUrl} size="icon">
          <SaveIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
