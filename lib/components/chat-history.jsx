"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChatHistory;
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const date_fns_1 = require("date-fns");
const input_1 = require("@/components/ui/input");
function ChatHistory({ chats, currentChatId, setCurrentChatId, deleteChat, renameChat, }) {
    const [editingChatId, setEditingChatId] = (0, react_1.useState)(null);
    const [editTitle, setEditTitle] = (0, react_1.useState)("");
    if (chats.length === 0) {
        return <div className="p-4 text-center text-gray-500 dark:text-gray-400">No chat history</div>;
    }
    const getModelColor = (modelId) => {
        if (!modelId)
            return "bg-gray-500";
        const colors = [
            "bg-purple-500",
            "bg-pink-500",
            "bg-rose-500",
            "bg-red-500",
            "bg-orange-500",
            "bg-amber-500",
            "bg-yellow-500",
            "bg-lime-500",
            "bg-green-500",
            "bg-emerald-500",
            "bg-teal-500",
            "bg-cyan-500",
            "bg-sky-500",
            "bg-blue-500",
            "bg-indigo-500",
            "bg-violet-500",
        ];
        let hash = 0;
        for (let i = 0; i < modelId.length; i++) {
            hash = modelId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };
    const startEditing = (chat) => {
        setEditingChatId(chat.id);
        setEditTitle(chat.title || "New Chat");
    };
    const saveEdit = (chatId) => {
        if (editTitle.trim()) {
            renameChat(chatId, editTitle.trim());
        }
        setEditingChatId(null);
    };
    const cancelEdit = () => {
        setEditingChatId(null);
    };
    return (<div className="space-y-1 p-2">
      {chats.map((chat) => (<div key={chat.id} className={(0, utils_1.cn)("dark:text-white text-black flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group", chat.id === currentChatId ? " bg-gray-300 dark:bg-gray-700" : "")}>
          <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => editingChatId !== chat.id && setCurrentChatId(chat.id)}>
            <div className="relative">
              <lucide_react_1.MessageSquareIcon className="h-4 w-4 flex-shrink-0"/>
              {chat.lastModelUsed && (<div className={(0, utils_1.cn)("absolute -bottom-1 -right-1 w-2 h-2 rounded-full", getModelColor(chat.lastModelUsed))}></div>)}
              {chat.branchedFrom && <lucide_react_1.GitBranchIcon className="absolute -top-1 -right-1 h-3 w-3 text-gray-500"/>}
            </div>

            {editingChatId === chat.id ? (<div className="flex-1 flex items-center gap-1">
                <input_1.Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-7 py-1 text-sm" autoFocus onClick={(e) => e.stopPropagation()} onKeyDown={(e) => {
                    if (e.key === "Enter")
                        saveEdit(chat.id);
                    if (e.key === "Escape")
                        cancelEdit();
                }}/>
                <button_1.Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                    e.stopPropagation();
                    saveEdit(chat.id);
                }}>
                  <lucide_react_1.CheckIcon className="h-3 w-3"/>
                </button_1.Button>
                <button_1.Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                    e.stopPropagation();
                    cancelEdit();
                }}>
                  <lucide_react_1.XIcon className="h-3 w-3"/>
                </button_1.Button>
              </div>) : (<div className="truncate">
                <div className="font-medium truncate">{chat.title || "New Chat"}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {(0, date_fns_1.format)(new Date(chat.createdAt), "MMM d, yyyy")}
                </div>
              </div>)}
          </div>

          {editingChatId !== chat.id && (<div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
              <button_1.Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                    e.stopPropagation();
                    startEditing(chat);
                }}>
                <lucide_react_1.PencilIcon className="h-4 w-4"/>
              </button_1.Button>
              <button_1.Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                }}>
                <lucide_react_1.TrashIcon className="h-4 w-4"/>
              </button_1.Button>
            </div>)}
        </div>))}
    </div>);
}
