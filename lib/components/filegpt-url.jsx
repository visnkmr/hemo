"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FileGPTUrl;
const react_1 = require("react");
const input_1 = require("./ui/input");
const label_1 = require("./ui/label");
const button_1 = require("./ui/button");
const lucide_react_1 = require("lucide-react");
function FileGPTUrl({ filegpturl, setFilegpturl }) {
    const [inputValue, setInputValue] = (0, react_1.useState)(filegpturl);
    (0, react_1.useEffect)(() => {
        setInputValue(filegpturl);
    }, [filegpturl]);
    const handleSave = () => {
        setFilegpturl(inputValue);
        localStorage.setItem("filegpt_url", inputValue);
    };
    return (<div className="space-y-2">
      <label_1.Label htmlFor="filegpt-url">FileGPT URL</label_1.Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input_1.Input id="filegpt-url" type={"text"} value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="FileGPT Endpoint (e.g., http://localhost:8694)" className="pr-10"/>
        </div>
        <button_1.Button onClick={handleSave} disabled={!inputValue || inputValue === filegpturl} size="icon">
          <lucide_react_1.SaveIcon className="h-4 w-4"/>
        </button_1.Button>
      </div>
    </div>);
}
