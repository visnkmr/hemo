"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LMStudioModelName;
const react_1 = require("react");
const input_1 = require("../components/ui/input");
const label_1 = require("../components/ui/label");
const button_1 = require("../components/ui/button");
const lucide_react_1 = require("lucide-react");
function LMStudioModelName({ model_name, set_model_name }) {
    const [inputValue, setInputValue] = (0, react_1.useState)(model_name);
    (0, react_1.useEffect)(() => {
        setInputValue(model_name);
    }, [model_name]);
    const handleSave = () => {
        set_model_name(inputValue);
        localStorage.setItem("lmstudio_model_name", inputValue);
    };
    return (<div className="space-y-2">
      <label_1.Label htmlFor="api-key">Ollama / LM Studio Model Name</label_1.Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input_1.Input id="api-key" type={"text"} value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="LM Studio Model name" className="pr-10"/>
        </div>
        <button_1.Button onClick={handleSave} disabled={!inputValue || inputValue === model_name} size="icon">
          <lucide_react_1.SaveIcon className="h-4 w-4"/>
        </button_1.Button>
      </div>
    </div>);
}
