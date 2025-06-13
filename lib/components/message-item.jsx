"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MessageItem;
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const markdown_1 = require("./markdown");
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
function MessageItem({ message, isStreaming = false, onCopy, onBranch, setdsm, setmts }) {
    const isUser = message.role === "user";
    const [showCursor, setShowCursor] = (0, react_1.useState)(true);
    const [isHovered, setIsHovered] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (!isStreaming)
            return;
        const interval = setInterval(() => {
            setShowCursor((prev) => !prev);
        }, 500);
        return () => clearInterval(interval);
    }, [isStreaming]);
    const Resend = () => {
        setdsm(true);
        setmts(message.content);
    };
    return (<div className={(0, utils_1.cn)("", isUser ? "justify-end" : "")} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
    <div className={(0, utils_1.cn)(isUser ? "place-items-end" : "")}>
    <div className={(0, utils_1.cn)("gap-3 p-4 rounded-lg relative overflow-hidden", isUser ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-50 dark:bg-gray-800/50")}>
      

      <div className="space-y-2">
        <div className="items-center gap-2">
          <span className="font-medium">
            
            {message.model && !isUser && (<span className="text-xs ml-2 opacity-70">({getModelDisplayName(message.model)})</span>)}
          </span>
          
        </div>

        <div className={(0, utils_1.cn)(isUser ? "max-w-[70vw]" : "w-full", "prose dark:prose-invert prose-sm break-words")}>
          <markdown_1.Markdown>{message.content}</markdown_1.Markdown>
          {isStreaming && showCursor && <span className="animate-pulse">▌</span>}
        </div>
      </div>

      
    </div>
    {!isStreaming && (<div className={(0, utils_1.cn)("gap-1 ", isUser, isHovered ? "visible" : "invisible")}>
          <button_1.Button variant="ghost" className={(isUser && isHovered ? "visible" : "hidden")} size="icon" onClick={Resend} title="Branch from here">
            <lucide_react_1.RefreshCw className="h-4 w-4"/>
          </button_1.Button>
          <button_1.Button variant="ghost" size="icon" onClick={onCopy} title="Copy message">
            <lucide_react_1.CopyIcon className="h-4 w-4"/>
          </button_1.Button>
          <button_1.Button variant="ghost" size="icon" onClick={onBranch} title="Branch from here">
            <lucide_react_1.GitBranchIcon className="h-4 w-4"/>
          </button_1.Button>
        </div>)}
      </div>  
    </div>);
}
function getModelColor(modelId) {
    const colors = [
        "purple-500",
        "pink-500",
        "rose-500",
        "red-500",
        "orange-500",
        "amber-500",
        "yellow-500",
        "lime-500",
        "green-500",
        "emerald-500",
        "teal-500",
        "cyan-500",
        "sky-500",
        "blue-500",
        "indigo-500",
        "violet-500",
    ];
    let hash = 0;
    for (let i = 0; i < modelId.length; i++) {
        hash = modelId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}
function getModelDisplayName(modelId) {
    const parts = modelId.split("/");
    return parts.length > 1 ? parts[1] : modelId;
}
