import type { Message } from "../lib/types";
interface MessageItemProps {
    message: Message;
    isStreaming?: boolean;
    onCopy: () => void;
    onBranch: () => void;
    setdsm: any;
    setmts: any;
}
export default function MessageItem({ message, isStreaming, onCopy, onBranch, setdsm, setmts }: MessageItemProps): import("react").JSX.Element;
export {};
