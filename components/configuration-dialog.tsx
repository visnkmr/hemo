"use client"

import React from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import LMStudioURL from "./lmstudio-url"
import LMStudioModelName from "./localmodelname"

interface ConfigurationDialogProps {
  showDialog: boolean
  setShowDialog: (show: boolean) => void
  ollamastate: number
  lmstudio_url: string
  setlmurl: any
  lmstudio_model_name: string
}

function ConfigurationDialog({
  showDialog,
  setShowDialog,
  ollamastate,
  lmstudio_url,
  setlmurl,
  lmstudio_model_name
}: ConfigurationDialogProps) {
  if (!showDialog) return null

  return (
    <div className="mx-auto flex w-full max-w-3xl mb-2 px-4">
      <div className="w-full border rounded-lg p-3 bg-white dark:bg-gray-800">
        <h2 className="text-sm font-semibold mb-2">LM Studio/Ollama Configuration</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Provide URL and model to proceed.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            type="text"
            value={lmstudio_url}
            onChange={(e) => setlmurl(e.target.value)}
            placeholder="Enter URL"
            className="w-full"
            autoFocus
          />
          <Input
            type="text"
            value={lmstudio_model_name}
            onChange={(e) => setlmurl(e.target.value)} // This should probably be setlmmodel instead
            placeholder="Enter Model Name"
            className="w-full"
          />
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
          <Button onClick={() => setShowDialog(false)}>Submit</Button>
        </div>
      </div>
    </div>
  )
}

export default ConfigurationDialog