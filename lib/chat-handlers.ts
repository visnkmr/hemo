import type { Message } from "../lib/types"
import { sendMessageStream } from "./send-message-stream"

// Interface for message sending context
interface SendMessageContext {
  ollamastate: number;
  selectedModel: string;
  chat: any;
  updateChat: (chat: any) => void;
  setStreamingMessageId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPendingErrorMessage: (message: string | null) => void;
  pendingErrorMessage: string | null;
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
  quotedMessages: Message[];
  setQuotedMessages: (messages: Message[]) => void;
}

// Main function to handle sending a message
export async function handleSendMessage(
  messageContent: string,
  input: string,
  context: SendMessageContext
): Promise<void> {
  if (!messageContent.trim()) return;

  context.setError(null);

  // Check if using LM Studio or Ollama and if URL and model are provided
  if (context.ollamastate === 1 || context.ollamastate === 2) {
    // This should be handled by the component - URL validation
    if (!context.lmstudio_url || !context.lmstudio_model_name) {
      throw new Error("LM Studio/Ollama URL and model name are required");
    }
  }

  context.setIsLoading(true);

  // Include quoted messages if they exist
  let finalMessageContent = messageContent
  if (context.quotedMessages.length > 0) {
    const quotes = context.quotedMessages.map(msg => {
      const quotePrefix = msg.role === 'user' ? 'User' : 'Assistant'
      const quotedText = msg.content.length > 100
        ? msg.content.substring(0, 100) + "..."
        : msg.content
      return `> ${quotePrefix}: ${quotedText}`
    }).join('\n')
    finalMessageContent = `${quotes}\n\n${messageContent}`
    context.setQuotedMessages([]) // Clear quoted messages after using them
  }

  // Prepare user and assistant messages
  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: finalMessageContent,
    timestamp: new Date().toISOString(),
    model: context.ollamastate == 0 ? context.selectedModel : context.lmstudio_model_name,
  };

  // If there is a leftover pending error message from a previous failure, flush it into the chat
  if (context.setPendingErrorMessage) {
    const errorAsAssistant: Message = {
      id: (Date.now() + 0.5).toString(),
      role: "assistant",
      content: context.pendingErrorMessage || "",
      timestamp: new Date().toISOString(),
      model: context.ollamastate == 0 ? context.selectedModel : context.lmstudio_model_name,
    }
    const flushed = {
      ...context.chat,
      messages: [...context.chat.messages, errorAsAssistant],
      lastModelUsed: context.ollamastate == 0 ? context.selectedModel : context.lmstudio_model_name,
    }
    context.updateChat(flushed)
    context.setPendingErrorMessage(null)
  }

  const assistantMessageId = (Date.now() + 1).toString();
  const assistantMessage: Message = {
    id: assistantMessageId,
    role: "assistant",
    content: "",
    timestamp: new Date().toISOString(),
    model: context.ollamastate == 0 ? context.selectedModel : context.lmstudio_model_name,
  };

  context.setStreamingMessageId(assistantMessageId);

  const initialMessages = context.chat.messages;
  // Update chat with user message & placeholder
  let currentChatState = {
    ...context.chat,
    messages: [...initialMessages, userMessage, assistantMessage],
    title: initialMessages.length === 0 ? messageContent.slice(0, 30) : context.chat.title,
    lastModelUsed: context.ollamastate == 0 ? context.selectedModel : context.lmstudio_model_name,
  };
  context.updateChat(currentChatState);

  // Scroll to bottom if we were already at the bottom when starting to stream
  if (context.isAtBottom) {
    setTimeout(context.scrolltobottom, 100);
  }

  // Call the generator and process the stream
  if (context.ollamastate !== 3) {
    try {
      // Determine API URL and model
      let apiUrl = "";
      if (context.ollamastate === 0) {
        apiUrl = "https://openrouter.ai/api";
      } else if (context.ollamastate === 4) {
        apiUrl = "https://api.groq.com/openai";
      } else if (context.ollamastate === 1 || context.ollamastate === 2) {
        apiUrl = context.lmstudio_url;
      }

      const modelToSend = context.ollamastate == 0 ? context.selectedModel : context.lmstudio_model_name;
      const messagesToSend = [...initialMessages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      let accumulatedContent = "";

      for await (const contentChunk of sendMessageStream({
        url: apiUrl,
        notollama: context.ollamastate,
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
        const updatedMessages = [...currentChatState.messages];
        updatedMessages[updatedMessages.length - 1] = {
          ...updatedMessages[updatedMessages.length - 1],
          content: accumulatedContent,
        };

        currentChatState = {
          ...currentChatState,
          messages: updatedMessages,
        };
        context.updateChat(currentChatState); // Update UI
      }
    } catch (err) {
      console.error("Error sending message:", err);
      const errMsg = err instanceof Error ? err.message : "An error occurred";
      context.setError(errMsg);
      // Replace the assistant placeholder with an inline error message in the message stream
      const errorAssistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `Error: ${errMsg}`,
        timestamp: new Date().toISOString(),
        model: context.ollamastate == 0 ? context.selectedModel : context.lmstudio_model_name,
      };
      context.updateChat({
        ...context.chat,
        messages: [...initialMessages, userMessage, errorAssistantMessage],
        lastModelUsed: context.ollamastate == 0 ? context.selectedModel : context.lmstudio_model_name,
      });
      // In case UI batching prevents immediate update, keep a pending copy to flush on next send
      context.setPendingErrorMessage(`Error: ${errMsg}`);
    } finally {
      context.setIsLoading(false);
      context.setStreamingMessageId(null);
    }
  } else {
    // Handle file-based messages
    context.setIsLoading(false);
    context.setStreamingMessageId(null);
  }
}

// Function to handle image generation
export async function generateImage(
  prompt: string,
  context: SendMessageContext
): Promise<void> {
  context.setIsLoading(true);
  context.setError(null);

  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: prompt,
    timestamp: new Date().toISOString(),
    model: context.selectedModel,
  };

  const assistantMessageId = (Date.now() + 1).toString();
  const assistantMessage: Message = {
    id: assistantMessageId,
    role: "assistant",
    content: "",
    timestamp: new Date().toISOString(),
    model: context.selectedModel,
  };

  context.setStreamingMessageId(assistantMessageId);

  const initialMessages = context.chat.messages;
  let currentChatState = {
    ...context.chat,
    messages: [...initialMessages, userMessage, assistantMessage],
    title: initialMessages.length === 0 ? prompt.slice(0, 30) : context.chat.title,
    lastModelUsed: context.selectedModel,
  };
  context.updateChat(currentChatState);

  // Scroll to bottom if we were already at the bottom when starting to stream
  if (context.isAtBottom) {
    setTimeout(context.scrolltobottom, 100);
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${context.openrouterApiKey || ""}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        n: 1,
        size: "512x512",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate image");
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    const updatedMessages = [...currentChatState.messages];
    updatedMessages[updatedMessages.length - 1] = {
      ...updatedMessages[updatedMessages.length - 1],
      content: `Image generated for prompt: ${prompt}`,
      imageUrl: imageUrl,
    };

    currentChatState = {
      ...currentChatState,
      messages: updatedMessages,
    };
    context.updateChat(currentChatState);
  } catch (err) {
    console.error("Error generating image:", err);
    context.setError(err instanceof Error ? err.message : "An error occurred");
    context.updateChat({
      ...context.chat,
      messages: [...initialMessages, userMessage],
    });
  } finally {
    context.setIsLoading(false);
    context.setStreamingMessageId(null);
  }
}