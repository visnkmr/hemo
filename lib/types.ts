export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  lastModelUsed: string;
  branchedFrom: {
    chatId: string;
    messageId: string;
    timestamp: string;
  } | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model: string;
  imageUrl?: string;
  imageGenerations?: ImageGenerationResponse[];
  uploadedImages?: UploadedImageData[];
  isGeneratingImage?: boolean;
  imageGenerationError?: string;
  generationParameters?: ImageGenerationParameters;
}

export interface UploadedImageData {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  base64Data: string;
  width?: number;
  height?: number;
}

export interface BranchPoint {
  originalChatId: string;
  messages: Message[];
  branchedFromMessageId: string;
  timestamp: string;
}

export interface FileItem {
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
export interface ModelRow {
  id: string
  context_length:number
  model: string
  cost: {
      prompt_token: number
      completion_token: number
  }
  supported_parameters:string[]
}

export interface Choice {
    finish_reason: string
    message: Message
}

export interface ChatCompletion {
    id: string
    model: string
    choices: Choice[]
}

export interface ModelArchitecture {
    modality: string
    input_modalities: string[]
    output_modalities: string[]
    tokenizer: string
    instruct_type: string | null
}

export interface ModelPricing {
    prompt: string
    completion: string
    request: string
    image: string
    web_search: string
    internal_reasoning: string
}

export interface ModelTopProvider {
    context_length: number
    max_completion_tokens: number
    is_moderated: boolean
}

export interface OpenRouterModel {
    id: string
    canonical_slug: string
    hugging_face_id: string
    name: string
    created: number
    description: string
    context_length: number
    architecture: ModelArchitecture
    pricing: ModelPricing
    top_provider: ModelTopProvider
    per_request_limits: any
    supported_parameters: string[]
}

export interface LocalModel {
    id: string
    name: string
    size?: number
    modified_at?: string
}

export interface GeminiModel {
    name?: string
    baseModelId?: string
    version?: string
    displayName?: string
    description?: string
    inputTokenLimit?: number
    outputTokenLimit?: number
    supportedGenerationMethods?: string[]
    temperature?: number
    topP?: number
    topK?: number
    isImageGenerationCapable?: boolean
}

// Image Generation types for Gemini
export interface ImageGenerationParameters {
  prompt?: string; // Made optional for default parameter config
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  personGeneration?: "allow_adult" | "block_some" | "block_many";
  style?: "photorealistic" | "creative" | "abstract" | "cartoon";
  quality?: "standard" | "premium";
  seed?: number;
  negativePrompt?: string;
  safetyFilterLevel?: "block_most" | "block_some" | "block_few" | "block_fewest";
}

export interface ImageGenerationRequest {
  prompt: string;
  parameters?: ImageGenerationParameters;
  model?: string;
}

export interface ImageGenerationResponse {
  images: Array<{
    originalImageId: string; // ID from originalimage database
    optimizedImageId: string; // ID from webuse database
  }>;
  model: string;
  timestamp: string;
}

export interface EnhancedMessage extends Message {
  imageGenerations?: ImageGenerationResponse[];
  isGeneratingImage?: boolean;
  imageGenerationError?: string;
  generationParameters?: ImageGenerationParameters;
}