import type React from "react";
import type { Chat, BranchPoint, FileItem } from "../lib/types";
interface SendMessageStreamParams {
    notollama: number;
    url: string;
    apiKey: string;
    model: string;
    messages: Array<{
        role: string;
        content: string;
    }>;
    lmstudio_url: string;
}
interface ChatInterfaceProps {
    ollamastate: number;
    chat: Chat;
    updateChat: (chat: Chat) => void;
    apiKey: string;
    selectedModel: string;
    selectedModelInfo: any;
    onBranchConversation: (branchPoint: BranchPoint) => void;
    lmstudio_url: string;
    lmstudio_model_name: string;
    filegpt_url: string;
    message?: FileItem;
    directsendmessage?: boolean;
    messagetosend?: string;
    sidebarVisible: any;
    setSidebarVisible: any;
    setIsModelDialogOpen: any;
    getModelColor: any;
    getModelDisplayName: any;
    setollamastate: any;
}
export declare function sendMessageStream({ notollama, url, apiKey, model, messages, lmstudio_url }: SendMessageStreamParams): AsyncGenerator<string, void, unknown>;
export default function ChatInterface({ ollamastate, chat, updateChat, apiKey, lmstudio_url, lmstudio_model_name, filegpt_url, message, selectedModel, selectedModelInfo, onBranchConversation, directsendmessage, messagetosend, sidebarVisible, setSidebarVisible, setIsModelDialogOpen, getModelDisplayName, getModelColor, setollamastate }: ChatInterfaceProps): React.JSX.Element;
export {};
