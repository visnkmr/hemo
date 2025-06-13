"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageStream = sendMessageStream;
exports.default = ChatInterface;
const react_1 = require("react");
const textarea_1 = require("../components/ui/textarea");
const button_1 = require("../components/ui/button");
const input_1 = require("../components/ui/input");
const lucide_react_1 = require("lucide-react");
const message_item_1 = __importDefault(require("../components/message-item"));
const progress_1 = require("../components/ui/progress");
async function* sendMessageStream({ notollama, url, apiKey, model, messages, lmstudio_url }) {
    let headers_openrouter = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": typeof window !== "undefined" ? window.location.href : "",
        "X-Title": "Batu",
    };
    let headers_ollama = { 'Content-Type': 'application/json' };
    const response = await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: (notollama === 0 || notollama === 2) ? headers_openrouter : headers_ollama,
        body: JSON.stringify({
            model: model,
            messages: messages,
            stream: true,
        }),
    });
    if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = errorData || "Failed to get response";
        try {
            const jsonError = JSON.parse(errorData);
            errorMessage = jsonError.error?.message || errorMessage;
        }
        catch {
        }
        throw new Error(errorMessage);
    }
    if (!response.body) {
        throw new Error("Response body is null");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        const chunk = decoder.decode(value);
        const lines = chunk
            .split("\n")
            .filter((line) => line.trim() !== "")
            .map((line) => line.replace(/^data: /, "").trim());
        for (const line of lines) {
            if (line === "[DONE]")
                continue;
            try {
                const parsedLine = JSON.parse(line);
                const content = parsedLine.choices[0]?.delta?.content || "";
                if (content) {
                    yield content;
                }
            }
            catch (e) {
                console.warn("Failed to parse stream line:", line, e);
            }
        }
    }
}
function ChatInterface({ ollamastate, chat, updateChat, apiKey, lmstudio_url, lmstudio_model_name, filegpt_url, message, selectedModel, selectedModelInfo, onBranchConversation, directsendmessage = false, messagetosend = "", sidebarVisible, setSidebarVisible, setIsModelDialogOpen, getModelDisplayName, getModelColor, setollamastate }) {
    const [input, setInput] = (0, react_1.useState)("");
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [dsm, setdsm] = (0, react_1.useState)(directsendmessage);
    const [mts, setmts] = (0, react_1.useState)(messagetosend);
    const [error, setError] = (0, react_1.useState)(null);
    const [selectedFilePath, setSelectedFilePath] = (0, react_1.useState)(message?.path || "");
    const textareaRef = (0, react_1.useRef)(null);
    const messagesEndRef = (0, react_1.useRef)(null);
    const [streamingMessageId, setStreamingMessageId] = (0, react_1.useState)(null);
    const [contextUsage, setContextUsage] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        const totalChars = chat.messages.reduce((acc, msg) => acc + msg.content.length, 0) + input.length;
        const estimatedTokens = Math.ceil(totalChars / 4);
        const maxContext = selectedModelInfo?.context_length || 4096;
        const usagePercentage = Math.min(100, Math.ceil((estimatedTokens / maxContext) * 100));
        setContextUsage(usagePercentage);
    }, [chat.messages, input, selectedModelInfo]);
    (0, react_1.useEffect)(() => {
        if (message?.path) {
            setSelectedFilePath(message.path);
        }
    }, [message]);
    const handleSendMessage = async (messageContent = input) => {
        if (!messageContent.trim() || isLoading)
            return;
        setError(null);
        setIsLoading(true);
        if (messageContent === input) {
            setInput("");
        }
        const userMessage = {
            id: Date.now().toString(),
            role: "user",
            content: messageContent,
            timestamp: new Date().toISOString(),
            model: ollamastate == 0 ? selectedModel : lmstudio_model_name,
        };
        const assistantMessageId = (Date.now() + 1).toString();
        const assistantMessage = {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
            model: ollamastate == 0 ? selectedModel : lmstudio_model_name,
        };
        setStreamingMessageId(assistantMessageId);
        const initialMessages = chat.messages;
        let currentChatState = {
            ...chat,
            messages: [...initialMessages, userMessage, assistantMessage],
            title: initialMessages.length === 0 ? messageContent.slice(0, 30) : chat.title,
            lastModelUsed: ollamastate == 0 ? selectedModel : lmstudio_model_name,
        };
        updateChat(currentChatState);
        try {
            let apiUrl = "https://openrouter.ai/api";
            if (ollamastate === 0) {
                apiUrl = "https://openrouter.ai/api";
            }
            else if (ollamastate === 1 || ollamastate === 2) {
                apiUrl = lmstudio_url;
            }
            else if (ollamastate === 3) {
                apiUrl = filegpt_url;
            }
            const modelToSend = ollamastate == 0 ? selectedModel : lmstudio_model_name;
            const messagesToSend = [...initialMessages, userMessage].map((msg) => ({
                role: msg.role,
                content: msg.content,
            }));
            let accumulatedContent = "";
            for await (const contentChunk of sendMessageStream({
                url: apiUrl,
                notollama: ollamastate,
                apiKey: apiKey,
                model: modelToSend,
                messages: messagesToSend,
                lmstudio_url: lmstudio_url,
            })) {
                accumulatedContent += contentChunk;
                const updatedMessages = [...currentChatState.messages];
                updatedMessages[updatedMessages.length - 1] = {
                    ...updatedMessages[updatedMessages.length - 1],
                    content: accumulatedContent,
                };
                currentChatState = {
                    ...currentChatState,
                    messages: updatedMessages,
                };
                updateChat(currentChatState);
            }
        }
        catch (err) {
            console.error("Error sending message:", err);
            setError(err instanceof Error ? err.message : "An error occurred");
            updateChat({
                ...chat,
                messages: [...initialMessages, userMessage],
            });
        }
        finally {
            setIsLoading(false);
            setStreamingMessageId(null);
        }
    };
    (0, react_1.useEffect)(() => {
        if (dsm && mts && !isLoading) {
            handleSendMessage(mts);
            setdsm(false);
            setmts("");
        }
    }, [dsm, mts, isLoading]);
    const handleInputChange = (e) => {
        setInput(e.target.value);
    };
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };
    const handleCopyMessage = (content) => {
        navigator.clipboard.writeText(content);
    };
    const handleBranchFromMessage = (messageId) => {
        const messageIndex = chat.messages.findIndex((msg) => msg.id === messageId);
        if (messageIndex >= 0) {
            const branchPoint = {
                originalChatId: chat.id,
                messages: chat.messages.slice(0, messageIndex + 1),
                branchedFromMessageId: messageId,
                timestamp: new Date().toISOString(),
            };
            onBranchConversation(branchPoint);
        }
    };
    const [sbi, setcobi] = (0, react_1.useState)(false);
    return (<div className="" onClick={() => setcobi(false)}>
      
      
      

      
      
      
      <div className="absolute w-full bottom-0 top-0 pt-20 pb-[144px] overflow-y-scroll pl-8 pr-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col pb-10">
          
          {chat.messages.length === 0 ? (<div className="flex items-center justify-center h-full w-full">
              <p className="text-gray-500 dark:text-gray-400">Send a message to start the conversation</p>
            </div>) : (chat.messages.map((message) => (<message_item_1.default key={message.id} message={message} isStreaming={streamingMessageId === message.id} onCopy={() => handleCopyMessage(message.content)} onBranch={() => handleBranchFromMessage(message.id)} setmts={setmts} setdsm={setdsm}/>)))}
          <div ref={messagesEndRef}/>
        </div>
        </div>
        
      

      
      {error && (<div className="p-2 mx-4 mb-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded">
          {error}
        </div>)}

      
      <div className="absolute w-full bottom-0  pl-8 pr-8 ">
        <div className="mx-auto flex w-full max-w-4xl flex-col pb-10  bg-gray-50 dark:bg-gray-900">
      
        
        

        
        
        <div className="flex flex-grow items-end gap-2">
          <div className="flex flex-col flex-grow">

          <textarea_1.Textarea ref={textareaRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Type a message... (Enter to send, Ctrl+Enter for new line)" className="flex-1 min-h-[80px] max-h-[200px] dark:bg-gray-900 border bg-gray-50" disabled={isLoading}/>
          <progress_1.Progress value={contextUsage} className="h-1"/>
          </div>
          
        </div>
        <div className="mt-4 flex flex-row gap-4 w-full">
          <button_1.Button variant="outline" onClick={(e) => { setcobi(true); e.stopPropagation(); setollamastate((ollamastate + 1) % 4); }}>
              <lucide_react_1.Bot size={16} className="mr-2"/>
              {`${sbi ? (ollamastate === 0 ? "Using Openrouter" : (ollamastate === 1 ? "Using Ollama" : (ollamastate === 2 ? "Using LM Studio" : "Using FileGPT"))) : ""}`}
            </button_1.Button>
          {ollamastate == 0 ? (<button_1.Button variant="outline" onClick={() => setIsModelDialogOpen(true)} className="flex items-center gap-2">
                        {selectedModelInfo ? (<>
                            <div className={`w-4 h-4 rounded-full bg-${getModelColor(selectedModel)}`}></div>
                            <span className="truncate max-w-[150px]">{getModelDisplayName(selectedModel)}</span>
                          </>) : ("Select Model")}
                      </button_1.Button>) : null}
          {ollamastate === 3 && (<div className="flex flex-grow items-center gap-2">
              <input_1.Input type="text" value={selectedFilePath} onChange={(e) => setSelectedFilePath(e.target.value)} placeholder="Enter file path or choose file" className="flex-grow"/>
              <button_1.Button variant="outline" size="icon" onClick={() => setSelectedFilePath("")}>
                <lucide_react_1.FileIcon className="h-4 w-4"/>
              </button_1.Button>
            </div>)}
          <button_1.Button variant={"outline"} onClick={() => handleSendMessage()} disabled={isLoading || !input.trim()} className="text-black dark:text-white ">
            {isLoading ? <lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/> : <lucide_react_1.SendIcon className="h-4 w-4"/>}
          </button_1.Button>
        </div>
        </div>
      </div>
    </div>);
}
