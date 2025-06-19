import { Components } from 'react-markdown';
import React from 'react';
export type MarkdownProps = {
    children: string;
    id?: string;
    className?: string;
    components?: Partial<Components>;
};
declare function MarkdownComponent({ children, id, className, components, }: MarkdownProps): React.JSX.Element;
declare const Markdown: React.MemoExoticComponent<typeof MarkdownComponent>;
export { Markdown };
