import { cn } from '../lib/utils';
import { marked } from 'marked';
import { memo, useId, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock, CodeBlockCode } from './codeblock';
import React from 'react';
function parseMarkdownIntoBlocks(markdown) {
    const tokens = marked.lexer(markdown);
    return tokens.map((token) => token.raw);
}
function extractLanguage(className) {
    if (!className)
        return 'plaintext';
    const match = className.match(/language-(\w+)/);
    return match ? match[1] : 'plaintext';
}
const INITIAL_COMPONENTS = {
    code: function CodeComponent({ className, children, ...props }) {
        const isInline = !props.node?.position?.start.line ||
            props.node?.position?.start.line === props.node?.position?.end.line;
        if (isInline) {
            return (<span className={cn('bg-primary-foreground dark:bg-zinc-800 dark:border dark:border-zinc-700 rounded-sm px-1 font-mono text-sm', className)} {...props}>
          {children}
        </span>);
        }
        const language = extractLanguage(className);
        return (<CodeBlock className="rounded-md overflow-hidden my-4 border border-zinc-200 dark:border-zinc-800">
        <CodeBlockCode code={children} language={language} className="text-sm overflow-x-auto"/>
      </CodeBlock>);
    },
    pre: function PreComponent({ children }) {
        return <>{children}</>;
    },
    ul: function UnorderedList({ children, ...props }) {
        return (<ul className="list-disc pl-5 my-2" {...props}>
        {children}
      </ul>);
    },
    ol: function OrderedList({ children, ...props }) {
        return (<ol className="list-decimal pl-5 my-2" {...props}>
        {children}
      </ol>);
    },
    li: function ListItem({ children, ...props }) {
        return (<li className="my-1" {...props}>
        {children}
      </li>);
    },
    h1: function H1({ children, ...props }) {
        return (<h1 className="text-2xl font-bold my-3" {...props}>
        {children}
      </h1>);
    },
    h2: function H2({ children, ...props }) {
        return (<h2 className="text-xl font-bold my-2" {...props}>
        {children}
      </h2>);
    },
    h3: function H3({ children, ...props }) {
        return (<h3 className="text-lg font-bold my-2" {...props}>
        {children}
      </h3>);
    },
    blockquote: function Blockquote({ children, ...props }) {
        return (<blockquote className="border-l-4 border-muted pl-4 italic my-2 dark:text-zinc-400 dark:border-zinc-600" {...props}>
        {children}
      </blockquote>);
    },
    a: function Anchor({ children, href, ...props }) {
        return (<a href={href} className="text-primary hover:underline dark:text-blue-400" target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>);
    },
    table: function Table({ children, ...props }) {
        return (<table className="w-full border-collapse my-3 text-sm" {...props}>
        {children}
      </table>);
    },
    th: function TableHeader({ children, ...props }) {
        return (<th className="border border-slate-300 dark:border-zinc-700 px-3 py-2 text-left font-semibold bg-slate-100 dark:bg-zinc-800" {...props}>
        {children}
      </th>);
    },
    td: function TableCell({ children, ...props }) {
        return (<td className="border border-slate-300 dark:border-zinc-700 px-3 py-2" {...props}>
        {children}
      </td>);
    },
};
const MemoizedMarkdownBlock = memo(function MarkdownBlock({ content, components = INITIAL_COMPONENTS, }) {
    return (<ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>);
}, function propsAreEqual(prevProps, nextProps) {
    return prevProps.content === nextProps.content;
});
MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';
function MarkdownComponent({ children, id, className, components = INITIAL_COMPONENTS, }) {
    const generatedId = useId();
    const blockId = id ?? generatedId;
    const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children]);
    return (<div className={cn('prose-code:before:hidden prose-code:after:hidden', className)}>
      {blocks.map((block, index) => (<MemoizedMarkdownBlock key={`${blockId}-block-${index}`} content={block} components={components}/>))}
    </div>);
}
const Markdown = memo(MarkdownComponent);
Markdown.displayName = 'Markdown';
export { Markdown };
