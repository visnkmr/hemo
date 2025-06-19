interface LMmodelnameProps {
    model_name: string;
    set_model_name: (key: string) => void;
}
export default function LMStudioModelName({ model_name, set_model_name }: LMmodelnameProps): import("react").JSX.Element;
export {};
