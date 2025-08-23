"use client"

import React from 'react'
import { useState } from 'react'
import MultiModelComparison from '../../components/multi-model-comparison'
import { Button } from '../../components/ui/button'
import { ArrowLeft, GitCompare, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function MultiModelPage() {
  const router = useRouter()
  const [lmurl, setlmurl] = useState("")
  const [lmmodel, setlmmodel] = useState("")
  const [ollamastate, setollamastate] = useState(0)
  const [lmstudio_url] = useState("")
  const [lmstudio_model_name] = useState("")
  const [filegpt_url] = useState("")
  const [selectedModel] = useState("")
  const [selectedModelInfo] = useState(null)
  const [allModels] = useState([])
  const [isLoadingModels] = useState(false)

  const handleSelectModel = (modelId: string) => {
    // Handle model selection if needed
  }

  const getModelDisplayName = (modelId: string) => {
    return modelId
  }

  const getModelColor = (modelId: string) => {
    return "bg-blue-500"
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Breadcrumb Navigation */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push('/')}
            className="p-0 h-auto font-normal text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Chat
          </Button>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">Multi-Model Comparison</span>
        </div>
      </div>

      {/* Navigation Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/')}
          className="flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Back to Chat"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-blue-500" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Multi-Model Comparison
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Compare responses from multiple AI models side by side
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/')}
          className="hidden md:flex items-center gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Back to Chat
        </Button>
      </div>

      {/* Multi-Model Comparison Component */}
      <div className="flex-1 overflow-hidden">
        <MultiModelComparison
          setlmurl={setlmurl}
          setlmmodel={setlmmodel}
          ollamastate={ollamastate}
          lmstudio_url={lmstudio_url}
          lmstudio_model_name={lmstudio_model_name}
          filegpt_url={filegpt_url}
          selectedModel={selectedModel}
          selectedModelInfo={selectedModelInfo}
          allModels={allModels}
          handleSelectModel={handleSelectModel}
          isLoadingModels={isLoadingModels}
          getModelDisplayName={getModelDisplayName}
          getModelColor={getModelColor}
        />
      </div>
    </div>
  )
}