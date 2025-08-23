import type { Message } from "../lib/types"
import { sendMessageStream } from "./send-message-stream"
import { useConfigItem } from "../hooks/use-indexeddb"

export async function handleEditMessage(
  messageId: string,
  newContent: string,
  editOllamaState?: number,
  editSelectedModel?: string,
  context?: {
    ollamastate: number;
    selectedModel: string;
    chat: any;
    updateChat: (chat: any) => void;
    setStreamingMessageId: (id: string | null) => void;
    isAtBottom: boolean;
    scrolltobottom: () => void;
    lmstudio_url: string;
    answerfromfile: boolean;
    sendwithhistory: boolean;
    lmstudio_model_name: string;
    groqApiKey?: string;
    openrouterApiKey?: string;
    orModel?: string;
    groqModelName?: string;
  }
) {
  if (!newContent.trim() || !context) return;

  // Use provided edit state or fall back to global state
  const currentOllamaState = editOllamaState ?? context.ollamastate;
  const currentSelectedModel = editSelectedModel ?? context.selectedModel;

  // Find the message to edit
  const messageIndex = context.chat.messages.findIndex((msg: Message) => msg.id === messageId);
  if (messageIndex === -1) return;

  const originalMessage = context.chat.messages[messageIndex];
  if (originalMessage.role !== 'user') return;

  // Find the next assistant message (the response to edit)
  const assistantMessageIndex = messageIndex + 1;
  const hasAssistantResponse = assistantMessageIndex < context.chat.messages.length &&
                               context.chat.messages[assistantMessageIndex].role === 'assistant';

  // Create updated messages array
  const updatedMessages = [...context.chat.messages];

  // Update the user message
  updatedMessages[messageIndex] = {
    ...originalMessage,
    content: newContent.trim(),
    timestamp: new Date().toISOString(),
  };

  // Remove the old assistant response if it exists
  if (hasAssistantResponse) {
    updatedMessages.splice(assistantMessageIndex, 1);
  }

  // Update the chat state
  let updatedChat = {
    ...context.chat,
    messages: updatedMessages,
    lastModelUsed: currentOllamaState == 0 ? currentSelectedModel : context.lmstudio_model_name,
  };

  context.updateChat(updatedChat);

  // Create a new assistant message for the response
  const newAssistantMessageId = (Date.now() + 1).toString();
  const newAssistantMessage: Message = {
    id: newAssistantMessageId,
    role: "assistant",
    content: "",
    timestamp: new Date().toISOString(),
    model: currentOllamaState == 0 ? currentSelectedModel : context.lmstudio_model_name,
  };

  // Add the new assistant message
  updatedChat = {
    ...updatedChat,
    messages: [...updatedMessages, newAssistantMessage],
  };

  context.updateChat(updatedChat);
  context.setStreamingMessageId(newAssistantMessageId);

  // Scroll to bottom if we were already at the bottom when starting to stream
  if (context.isAtBottom) {
    setTimeout(context.scrolltobottom, 100);
  }

  // Call the API with the edited message
  try {
    let apiUrl = "";
    if (currentOllamaState === 0) {
      apiUrl = "https://openrouter.ai/api";
    } else if (currentOllamaState === 4) {
      apiUrl = "https://api.groq.com/openai";
    } else if (currentOllamaState === 1 || currentOllamaState === 2) {
      apiUrl = context.lmstudio_url;
    }

    const modelToSend = currentOllamaState == 0 ? currentSelectedModel : context.lmstudio_model_name;
    const messagesToSend = updatedMessages.slice(0, -1).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    let accumulatedContent = "";
    for await (const contentChunk of sendMessageStream({
      url: apiUrl,
      notollama: currentOllamaState,
      model: modelToSend,
      messages: context.sendwithhistory ? messagesToSend : [messagesToSend[messagesToSend.length - 1]],
      lmstudio_url: context.lmstudio_url,
      context: context.answerfromfile ? "" : "",
      apiKeys: {
        groq_api_key: context.groqApiKey || "",
        openrouter_api_key: context.openrouterApiKey || "",
        or_model: context.orModel || "",
        lmstudio_model_name: context.lmstudio_model_name || "",
        groq_model_name: context.groqModelName || ""
      }
    })) {
      accumulatedContent += contentChunk;

      // Update the last message (assistant's) with new content
      const currentMessages = [...updatedChat.messages];
      currentMessages[currentMessages.length - 1] = {
        ...currentMessages[currentMessages.length - 1],
        content: accumulatedContent,
      };

      updatedChat = {
        ...updatedChat,
        messages: currentMessages,
      };
      context.updateChat(updatedChat);
    }
  } catch (err) {
    console.error("Error sending edited message:", err);
    const errMsg = err instanceof Error ? err.message : "An error occurred";

    // Replace the assistant placeholder with an error message
    const currentMessages = [...updatedChat.messages];
    currentMessages[currentMessages.length - 1] = {
      ...currentMessages[currentMessages.length - 1],
      content: `Error: ${errMsg}`,
    };

    context.updateChat({
      ...updatedChat,
      messages: currentMessages,
    });
  } finally {
    context.setStreamingMessageId(null);
  }
}

export function handleBranchFromMessage(
  messageId: string,
  branchType: 'full' | 'single' | 'model',
  chat: any,
  selectedModel: string,
  onBranchConversation: (branchPoint: any, branchType: 'full' | 'single' | 'model') => void
) {
  const messageIndex = chat.messages.findIndex((msg: Message) => msg.id === messageId);
  if (messageIndex >= 0) {
    let messagesToInclude = chat.messages.slice(0, messageIndex + 1);

    // Handle different branch types
    if (branchType === 'single') {
      // Single message branch - only include the specific message
      messagesToInclude = [chat.messages[messageIndex]];
    } else if (branchType === 'model') {
      // New query branch - create a new query based on the message
      const branchedMessage = chat.messages[messageIndex];
      const newQuery = branchedMessage.role === 'user'
        ? `Please provide a different response to: ${branchedMessage.content}`
        : `Please respond to: ${branchedMessage.content}`;
      messagesToInclude = [{
        id: Date.now().toString(),
        role: 'user',
        content: newQuery,
        timestamp: new Date().toISOString(),
        model: selectedModel
      }];
    }
    // For 'full' branch type, use all messages up to the branch point (default behavior)

    const branchPoint = {
      originalChatId: chat.id,
      messages: messagesToInclude,
      branchedFromMessageId: messageId,
      timestamp: new Date().toISOString(),
    };
    onBranchConversation(branchPoint, branchType);
  }
}

export function handleQuoteMessage(
  message: Message,
  quotedMessages: Message[],
  setQuotedMessages: (messages: Message[]) => void
) {
  // Allow quoting all messages (both user and assistant)
  // Check if already quoted, if so remove it, otherwise add it
  const isAlreadyQuoted = quotedMessages.some(q => q.id === message.id)
  if (isAlreadyQuoted) {
    setQuotedMessages(quotedMessages.filter(q => q.id !== message.id))
  } else {
    setQuotedMessages([...quotedMessages, message])
  }

  // Focus the input when quoting
  setTimeout(() => {
    const textarea = document.querySelector('textarea[placeholder*="Type a message"]') as HTMLTextAreaElement
    if (textarea) {
      textarea.focus()
    }
  }, 100)
}