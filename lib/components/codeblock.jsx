"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBlockGroup = CodeBlockGroup;
exports.CodeBlockCode = CodeBlockCode;
exports.CodeBlock = CodeBlock;
const utils_1 = require("../lib/utils");
const react_1 = __importStar(require("react"));
const shiki_1 = require("shiki");
const next_themes_1 = require("next-themes");
function CodeBlock({ children, className, ...props }) {
    return (<div className={(0, utils_1.cn)(className)} {...props}>
      {children}
    </div>);
}
function CodeBlockCode({ code, language = 'tsx', theme: propTheme, className, ...props }) {
    const { resolvedTheme } = (0, next_themes_1.useTheme)();
    const [highlightedHtml, setHighlightedHtml] = (0, react_1.useState)(null);
    const theme = propTheme || (resolvedTheme === 'dark' ? 'github-dark' : 'github-light');
    (0, react_1.useEffect)(() => {
        async function highlight() {
            const html = await (0, shiki_1.codeToHtml)(code, { lang: language, theme });
            setHighlightedHtml(html);
        }
        highlight();
    }, [code, language, theme]);
    const classNames = (0, utils_1.cn)('', className);
    return highlightedHtml ? (<div className={classNames} dangerouslySetInnerHTML={{ __html: highlightedHtml }} {...props}/>) : (<div className={classNames} {...props}>
      <pre>
        <code>{code}</code>
      </pre>
    </div>);
}
function CodeBlockGroup({ children, className, ...props }) {
    return (<div className={(0, utils_1.cn)('', className)} {...props}>
      {children}
    </div>);
}
