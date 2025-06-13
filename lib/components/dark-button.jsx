"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DarkButton;
const react_1 = require("react");
const react_2 = __importDefault(require("react"));
const next_themes_1 = require("next-themes");
const lucide_react_1 = require("lucide-react");
function DarkButton() {
    const { setTheme, theme } = (0, next_themes_1.useTheme)();
    (0, react_1.useEffect)(() => {
        const darkIcon = document.getElementById("theme-toggle-dark-icon");
        const lightIcon = document.getElementById("theme-toggle-light-icon");
        if (theme === 'dark') {
            darkIcon.style.display = "block";
            lightIcon.style.display = "none";
        }
        else {
            darkIcon.style.display = "none";
            lightIcon.style.display = "block";
        }
    }, [theme]);
    return (<>
    
    <div className='h-10'>
    <span className='p-2.5 absolute right-0'>

      <button id="theme-toggle" type="button" aria-label='light dark mode toggle' className="text-gray-500  rounded-lg text-sm p-2.5" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        <lucide_react_1.Sun className='h-4 w-4' id="theme-toggle-dark-icon"/>
        <lucide_react_1.Moon className='h-4 w-4' id="theme-toggle-light-icon"/>
      </button>
      </span>
    </div>

    </>);
}
