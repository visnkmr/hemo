export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  model?: string // The model that generated this message
}

export interface BranchInfo {
  chatId: string
  messageId: string
  timestamp: string
}

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  lastModelUsed?: string
  branchedFrom: BranchInfo | null
}

export interface Model {
  id: string
  name: string
  provider: string
}

export interface BranchPoint {
  originalChatId: string
  messages: Message[]
  branchedFromMessageId: string
  timestamp: string
}
