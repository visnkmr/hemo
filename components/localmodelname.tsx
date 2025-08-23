"use client"

import { useEffect, useState } from "react"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Button } from "../components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu"
import { EyeIcon, EyeOffIcon, SaveIcon, ChevronDownIcon } from "lucide-react"
import { useConfigItem } from "../hooks/use-indexeddb"

interface LMmodelnameProps {
  model_name: string
  ollamastate: number
  set_model_name: (key: string) => void
  lmstudio_url?: string
}

interface AvailableModel {
  id: string
  name: string
  provider: string
  size?: number
  details?: any
}

export default function LMStudioModelName({ model_name, set_model_name, ollamastate, lmstudio_url }: LMmodelnameProps) {
  // const [showKey, setShowKey] = useState(false)
  const keyName = ollamastate === 4 ? "groq_model_name" : "lmstudio_model_name"

  // Use IndexedDB hook instead of localStorage
  const { value: storedModelName, setValue: saveModelName, loading, error } = useConfigItem<string>(keyName, "")

  const [inputValue, setInputValue] = useState(storedModelName || model_name)
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [useDropdown, setUseDropdown] = useState(false)

  // Function to fetch available models
  const fetchAvailableModels = async (url: string, provider: 'ollama' | 'lmstudio') => {
    if (!url) {
      console.log('No URL provided, skipping fetch')
      return
    }

    console.log(`Fetching ${provider} models from: ${url}`)
    setIsLoadingModels(true)
    try {
      let modelsEndpoint = ''
      if (provider === 'ollama') {
        modelsEndpoint = `${url}/api/tags`
      } else if (provider === 'lmstudio') {
        modelsEndpoint = `${url}/v1/models`
      }

      console.log('Models endpoint:', modelsEndpoint)
      const response = await fetch(modelsEndpoint)
      console.log('Response status:', response.status, response.ok)

      if (!response.ok) {
        throw new Error(`Failed to fetch ${provider} models: ${response.status}`)
      }

      const data = await response.json()
      console.log('Response data:', data)
      let models: AvailableModel[] = []

      if (provider === 'ollama' && data.models) {
        models = data.models.map((model: any) => ({
          id: model.name,
          name: model.name,
          provider: 'Ollama',
          size: model.size,
          details: model.details
        }))
        console.log('Parsed Ollama models:', models)
      } else if (provider === 'lmstudio' && data.data) {
        models = data.data.map((model: any) => ({
          id: model.id,
          name: model.id,
          provider: 'LM Studio'
        }))
        console.log('Parsed LM Studio models:', models)
      }

      console.log('Final models array:', models)

      if (models.length > 0) {
        setAvailableModels(models)
        setUseDropdown(true)
        console.log('Set dropdown to true with', models.length, 'models')

        // Auto-select first model if none selected
        if (!inputValue && models.length > 0) {
          const firstModel = models[0].name
          console.log('Auto-selecting first model:', firstModel)
          setInputValue(firstModel)
          set_model_name(firstModel)
          await saveModelName(firstModel)
        }
      } else {
        console.log('No models found, setting dropdown to false')
        setUseDropdown(false)
      }
    } catch (error) {
      console.error(`Failed to fetch ${provider} models:`, error)
      setUseDropdown(false)
    } finally {
      setIsLoadingModels(false)
    }
  }

  // Update input value when storedModelName or model_name changes
  useEffect(() => {
    const valueToUse = storedModelName || model_name
    setInputValue(valueToUse)
  }, [storedModelName, model_name])

  // Fetch models when URL is available
  useEffect(() => {
    console.log('LMStudioModelName - URL:', lmstudio_url, 'State:', ollamastate)

    if (lmstudio_url && (ollamastate === 1 || ollamastate === 2)) {
      const provider = ollamastate === 1 ? 'ollama' : 'lmstudio'
      console.log('Fetching models for provider:', provider)
      fetchAvailableModels(lmstudio_url, provider)
    } else {
      console.log('Not fetching models - URL:', lmstudio_url, 'State:', ollamastate)
      setUseDropdown(false)
      setAvailableModels([])
    }
  }, [lmstudio_url, ollamastate])

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

  const handleModelSelect = async (modelName: string) => {
    setInputValue(modelName)
    set_model_name(modelName)
    await saveModelName(modelName)
  }

  return (
    <div className="space-y-2 text-black dark:text-white">
      {( lmstudio_url && (ollamastate === 1 || ollamastate === 2))?(<><Label htmlFor="model-selection">{label} Model Name</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          {useDropdown && availableModels.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                  disabled={isLoadingModels}
                >
                  <span className="truncate">
                    {isLoadingModels
                      ? "Loading models..."
                      : inputValue || "Select a model"
                    }
                  </span>
                  <ChevronDownIcon className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
                {availableModels.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => handleModelSelect(model.name)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      {model.size && (
                        <span className="text-xs text-gray-500">
                          {(model.size / 1e9).toFixed(1)} GB
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Input
              id="model-selection"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`${label} model name`}
              className="pr-10"
            />
          )}
        </div>
        {!useDropdown && (
          <Button onClick={handleSave} disabled={!inputValue || inputValue === model_name} size="icon">
            <SaveIcon className="h-4 w-4" />
          </Button>
        )}
      </div></>):(<Label htmlFor="model-selection">No {label} instance found </Label>)
}
      {useDropdown && (
        <div className="text-xs text-gray-500">
          {availableModels.length} models available • Click dropdown to select
        </div>
      )}

      {/* Debug info - remove in production availableModels.length > 0 &&*/}
      {/* <div className="text-xs text-red-500 mt-1 p-1 bg-red-50 rounded">
        <strong>Debug Info:</strong><br />
        useDropdown: {useDropdown ? 'true' : 'false'}<br />
        availableModels: {availableModels.length}<br />
        lmstudio_url: {lmstudio_url || 'none'}<br />
        ollamastate: {ollamastate}<br />
        isLoadingModels: {isLoadingModels ? 'true' : 'false'}
      </div> */}
    </div>
  )
}
