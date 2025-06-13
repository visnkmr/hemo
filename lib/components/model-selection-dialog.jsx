"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ModelSelectionDialog;
const react_1 = require("react");
const dialog_1 = require("../components/ui/dialog");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("../lib/utils");
const input_1 = require("../components/ui/input");
const badge_1 = require("../components/ui/badge");
const react_fast_marquee_1 = __importDefault(require("react-fast-marquee"));
function ModelSelectionDialog({ isOpen, onClose, models, selectedModel, onSelectModel, apiKey, }) {
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [filteredModels, setFilteredModels] = (0, react_1.useState)([]);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
    (0, react_1.useEffect)(() => {
        if (!models) {
            setFilteredModels([]);
            return;
        }
        if (!searchQuery) {
            setFilteredModels(models);
            return;
        }
        const filtered = models.filter((model) => {
            const modelName = model.id.toLowerCase();
            const provider = model.id.split("/")[0].toLowerCase();
            const modelId = model.id.split("/").pop().toLowerCase();
            return (modelName.includes(searchQuery.toLowerCase()) ||
                provider.includes(searchQuery.toLowerCase()) ||
                modelId.includes(searchQuery.toLowerCase()));
        });
        setFilteredModels(filtered);
    }, [models, searchQuery]);
    const HoverMarqueeItem = ({ text }) => {
        const [isHovered, setIsHovered] = (0, react_1.useState)(false);
        return (<div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="text-center w-full">
        <react_fast_marquee_1.default className="h3 font-medium text-sm truncate w-full" play={isHovered} speed={50} gradient={false}>
          <span>{text}</span>
        </react_fast_marquee_1.default>
      </div>);
    };
    const getModelColor = (modelId) => {
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
    const [modelcount, setmodelcount] = (0, react_1.useState)(10);
    return (<dialog_1.Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <dialog_1.DialogContent className="overflow-y-auto sm:max-w-[800px] max-h-[80vh] flex flex-col">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Select a Model</dialog_1.DialogTitle>
        </dialog_1.DialogHeader>

        <div className="mb-4">
          <input_1.Input placeholder="Search models..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full"/>
        </div>

        {isLoading ? (<div className="flex items-center justify-center py-8">
            <lucide_react_1.Loader2 className="h-8 w-8 animate-spin text-gray-400"/>
          </div>) : (<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredModels.slice(0, modelcount).map((model) => (<div key={model.id} className={(0, utils_1.cn)("flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-all", selectedModel === model.id
                    ? "border-primary bg-primary/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5")} onClick={() => onSelectModel(model.id)}>
                  <div className={(0, utils_1.cn)("w-12 h-12 rounded-full flex items-center justify-center mb-2", getModelColor(model.id))}>
                    <lucide_react_1.BotIcon className="h-6 w-6 text-white"/>
                  </div>

                  <div className="text-center w-full">
                   <HoverMarqueeItem text={model.id.split("/").pop()}/>
                    <p className="text-xs text-gray-500 truncate w-full" title={model.id.split("/")[0]}>
                      {model.id.split("/")[0]}
                    </p>
                  </div>

                  <div className="mt-2 flex flex-col items-center gap-1 w-full">
                    <badge_1.Badge variant="outline" className="text-xs">
                      {model.context_length.toLocaleString()} tokens
                    </badge_1.Badge>

                    
                  </div>
                </div>))}
              {modelcount + 10 < filteredModels.length && (<div key={"othermodels"} className={(0, utils_1.cn)("flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-all", "border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5")} onClick={() => setmodelcount(modelcount + 10)}>
                 

                  <div className="flex items-center h-full ">
                    <p className="h3 font-medium text-sm truncate w-full">
                      More models
                    </p>
                  </div>

                  
                </div>)}
            </div>)}
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
