"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ApiKeyInput;
const react_1 = require("react");
const input_1 = require("../components/ui/input");
const label_1 = require("../components/ui/label");
const button_1 = require("../components/ui/button");
const lucide_react_1 = require("lucide-react");
function ApiKeyInput({ apiKey, setApiKey }) {
    const [showKey, setShowKey] = (0, react_1.useState)(false);
    const [inputValue, setInputValue] = (0, react_1.useState)(apiKey);
    const handleSave = () => {
        setApiKey(inputValue);
        localStorage.setItem("openrouter_api_key", inputValue);
    };
    return (<div className="space-y-2">
      <label_1.Label className="dark:text-white text-black " htmlFor="api-key">OpenRouter API Key</label_1.Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input_1.Input id="api-key" type={showKey ? "text" : "password"} value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Enter your OpenRouter API key" className="pr-10"/>
          <button_1.Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowKey(!showKey)}>
            {showKey ? <lucide_react_1.EyeOffIcon className="h-4 w-4"/> : <lucide_react_1.EyeIcon className="h-4 w-4"/>}
          </button_1.Button>
        </div>
        <button_1.Button onClick={handleSave} disabled={!inputValue || inputValue === apiKey} size="icon">
          <lucide_react_1.SaveIcon className="h-4 w-4"/>
        </button_1.Button>
      </div>
    </div>);
}
