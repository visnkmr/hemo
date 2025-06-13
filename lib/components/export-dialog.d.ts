import type { Chat } from "@/lib/types";
interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    chat: Chat | undefined;
}
export default function ExportDialog({ isOpen, onClose, chat }: ExportDialogProps): import("react").JSX.Element;
export {};
