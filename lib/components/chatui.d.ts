interface FileItem {
    name: string;
    path: string;
    is_dir: boolean;
    size: number;
    rawfs: number;
    lmdate: number;
    timestamp: number;
    foldercon: number;
    ftype: string;
    parent: string;
}
interface gptargs {
    message?: FileItem;
    fgptendpoint?: string;
    setasollama: boolean;
}
export default function ChatUI({ message, fgptendpoint, setasollama }: gptargs): import("react").JSX.Element;
export {};
