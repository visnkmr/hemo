interface ModelSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    models: any[];
    selectedModel: string;
    onSelectModel: (modelId: string) => void;
    apiKey: string;
}
export default function ModelSelectionDialog({ isOpen, onClose, models, selectedModel, onSelectModel, apiKey, }: ModelSelectionDialogProps): import("react").JSX.Element;
export {};
