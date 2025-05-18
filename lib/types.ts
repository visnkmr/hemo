export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
}

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: string
}

export interface Model {
  id: string
  name: string
  provider: string
}
