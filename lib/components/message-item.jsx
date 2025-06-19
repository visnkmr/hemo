"use client";
import { CopyIcon, GitBranchIcon, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { Markdown } from "./markdown";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
export default function MessageItem({ message, isStreaming = false, onCopy, onBranch, setdsm, setmts }) {
    const isUser = message.role === "user";
    const [showCursor, setShowCursor] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    useEffect(() => {
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
    return (<div className={cn("", isUser ? "justify-end" : "")} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
    <div className={cn(isUser ? "place-items-end" : "")}>
    <div className={cn("gap-3 p-4 rounded-lg relative overflow-hidden", isUser ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-50 dark:bg-gray-800/50")}>
      

      <div className="space-y-2">
        <div className="items-center gap-2">
          <span className="font-medium">
            
            {message.model && !isUser && (<span className="text-xs ml-2 opacity-70">({getModelDisplayName(message.model)})</span>)}
          </span>
          
        </div>

        <div className={cn(isUser ? "max-w-[70vw]" : "w-full", "prose dark:prose-invert prose-sm break-words")}>
          <Markdown>{message.content}</Markdown>
          {isStreaming && showCursor && <span className="animate-pulse">▌</span>}
        </div>
      </div>

      
    </div>
    {!isStreaming && (<div className={cn("gap-1 ", isUser, isHovered ? "visible" : "invisible")}>
          <Button variant="ghost" className={(isUser && isHovered ? "visible" : "hidden")} size="icon" onClick={Resend} title="Branch from here">
            <RefreshCw className="h-4 w-4"/>
          </Button>
          <Button variant="ghost" size="icon" onClick={onCopy} title="Copy message">
            <CopyIcon className="h-4 w-4"/>
          </Button>
          <Button variant="ghost" size="icon" onClick={onBranch} title="Branch from here">
            <GitBranchIcon className="h-4 w-4"/>
          </Button>
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
