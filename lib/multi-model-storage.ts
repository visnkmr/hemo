interface MultiModelMessage {
  id: string
  query: string
  timestamp: string
  responses: {
    id: string
    model: string
    modelId: string
    response: string
    timestamp: string
    isLoading: boolean
    error?: string
    tokensUsed?: number
    responseTime?: number
  }[]
}

interface MultiModelChat {
  id: string
  title: string
  messages: MultiModelMessage[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'multi-model-comparison-chats'

class MultiModelStorage {
  private getStoredChats(): MultiModelChat[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load chats from storage:', error)
      return []
    }
  }

  private saveChats(chats: MultiModelChat[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
    } catch (error) {
      console.error('Failed to save chats to storage:', error)
    }
  }

  async createChat(title: string = 'Multi-Model Comparison'): Promise<MultiModelChat> {
    const chats = this.getStoredChats()
    const chat: MultiModelChat = {
      id: Date.now().toString(),
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    chats.push(chat)
    this.saveChats(chats)
    return chat
  }

  async getChat(chatId: string): Promise<MultiModelChat | null> {
    const chats = this.getStoredChats()
    return chats.find(chat => chat.id === chatId) || null
  }

  async getAllChats(): Promise<MultiModelChat[]> {
    const chats = this.getStoredChats()
    return chats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  async updateChat(chat: MultiModelChat): Promise<void> {
    const chats = this.getStoredChats()
    const index = chats.findIndex(c => c.id === chat.id)
    if (index !== -1) {
      chat.updatedAt = new Date().toISOString()
      chats[index] = chat
      this.saveChats(chats)
    }
  }

  async deleteChat(chatId: string): Promise<void> {
    const chats = this.getStoredChats()
    const filteredChats = chats.filter(chat => chat.id !== chatId)
    this.saveChats(filteredChats)
  }

  async addMessage(chatId: string, message: MultiModelMessage): Promise<void> {
    const chat = await this.getChat(chatId)
    if (chat) {
      chat.messages.push(message)
      await this.updateChat(chat)
    }
  }

  async updateMessage(chatId: string, messageId: string, message: MultiModelMessage): Promise<void> {
    const chat = await this.getChat(chatId)
    if (chat) {
      const messageIndex = chat.messages.findIndex(m => m.id === messageId)
      if (messageIndex !== -1) {
        chat.messages[messageIndex] = message
        await this.updateChat(chat)
      }
    }
  }

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    const chat = await this.getChat(chatId)
    if (chat) {
      chat.messages = chat.messages.filter(m => m.id !== messageId)
      await this.updateChat(chat)
    }
  }

  async clearAllChats(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY)
  }

  // Export chat data for backup/sharing
  async exportChat(chatId: string): Promise<string> {
    const chat = await this.getChat(chatId)
    return JSON.stringify(chat, null, 2)
  }

  // Import chat data
  async importChat(chatData: string): Promise<MultiModelChat | null> {
    try {
      const chat: MultiModelChat = JSON.parse(chatData)
      const chats = this.getStoredChats()

      // Ensure the chat has a unique ID
      chat.id = Date.now().toString()
      chat.createdAt = new Date().toISOString()
      chat.updatedAt = new Date().toISOString()

      chats.push(chat)
      this.saveChats(chats)
      return chat
    } catch (error) {
      console.error('Failed to import chat:', error)
      return null
    }
  }

  // Get storage statistics
  async getStats(): Promise<{
    totalChats: number
    totalMessages: number
    totalResponses: number
    storageSize: string
  }> {
    const chats = await this.getAllChats()
    const totalMessages = chats.reduce((sum, chat) => sum + chat.messages.length, 0)
    const totalResponses = chats.reduce((sum, chat) =>
      sum + chat.messages.reduce((sum, msg) => sum + msg.responses.length, 0), 0
    )

    // Estimate storage size (rough calculation)
    const jsonString = JSON.stringify(chats)
    const storageSize = (jsonString.length / 1024).toFixed(2) + ' KB'

    return {
      totalChats: chats.length,
      totalMessages,
      totalResponses,
      storageSize
    }
  }
}

// Export singleton instance
export const multiModelStorage = new MultiModelStorage()
export type { MultiModelChat, MultiModelMessage }