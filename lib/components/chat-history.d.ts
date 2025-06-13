import type { Chat } from "@/lib/types";
interface ChatHistoryProps {
    chats: Chat[];
    currentChatId: string;
    setCurrentChatId: (id: string) => void;
    deleteChat: (id: string) => void;
    renameChat: (id: string, newTitle: string) => void;
}
export default function ChatHistory({ chats, currentChatId, setCurrentChatId, deleteChat, renameChat, }: ChatHistoryProps): import("react").JSX.Element;
export {};
