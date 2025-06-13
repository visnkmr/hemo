'use client';
import { cn } from '../lib/utils';
import React, { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { useTheme } from 'next-themes';
function CodeBlock({ children, className, ...props }) {
    return (<div className={cn(className)} {...props}>
      {children}
    </div>);
}
function CodeBlockCode({ code, language = 'tsx', theme: propTheme, className, ...props }) {
    const { resolvedTheme } = useTheme();
    const [highlightedHtml, setHighlightedHtml] = useState(null);
    const theme = propTheme || (resolvedTheme === 'dark' ? 'github-dark' : 'github-light');
    useEffect(() => {
        async function highlight() {
            const html = await codeToHtml(code, { lang: language, theme });
            setHighlightedHtml(html);
        }
        highlight();
    }, [code, language, theme]);
    const classNames = cn('', className);
    return highlightedHtml ? (<div className={classNames} dangerouslySetInnerHTML={{ __html: highlightedHtml }} {...props}/>) : (<div className={classNames} {...props}>
      <pre>
        <code>{code}</code>
      </pre>
    </div>);
}
function CodeBlockGroup({ children, className, ...props }) {
    return (<div className={cn('', className)} {...props}>
      {children}
    </div>);
}
export { CodeBlockGroup, CodeBlockCode, CodeBlock };
