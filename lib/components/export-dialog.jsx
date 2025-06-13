"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ExportDialog;
const react_1 = require("react");
const dialog_1 = require("../components/ui/dialog");
const button_1 = require("../components/ui/button");
const radio_group_1 = require("../components/ui/radio-group");
const label_1 = require("../components/ui/label");
const lucide_react_1 = require("lucide-react");
function ExportDialog({ isOpen, onClose, chat }) {
    const [exportFormat, setExportFormat] = (0, react_1.useState)("txt");
    const handleExport = () => {
        if (!chat)
            return;
        switch (exportFormat) {
            case "txt":
                exportAsTxt(chat);
                break;
            case "json":
                exportAsJson(chat);
                break;
            case "pdf":
                exportAsPdf(chat);
                break;
        }
        onClose();
    };
    const exportAsTxt = (chat) => {
        let content = `# ${chat.title || "Chat Export"}\n`;
        content += `# Date: ${new Date(chat.createdAt).toLocaleString()}\n\n`;
        chat.messages.forEach((message) => {
            content += `${message.role.toUpperCase()} [${new Date(message.timestamp).toLocaleString()}]:\n`;
            content += `${message.content}\n\n`;
        });
        downloadFile(content, `chat-export-${Date.now()}.txt`, "text/plain");
    };
    const exportAsJson = (chat) => {
        const content = JSON.stringify(chat, null, 2);
        downloadFile(content, `chat-export-${Date.now()}.json`, "application/json");
    };
    const exportAsPdf = (chat) => {
        const content = document.createElement("div");
        content.innerHTML = `
      <h1>${chat.title || "Chat Export"}</h1>
      <p>Date: ${new Date(chat.createdAt).toLocaleString()}</p>
      <hr />
      ${chat.messages
            .map((message) => `
        <div style="margin-bottom: 20px;">
          <p><strong>${message.role.toUpperCase()}</strong> [${new Date(message.timestamp).toLocaleString()}]:</p>
          <div style="white-space: pre-wrap;">${message.content}</div>
        </div>
      `)
            .join("")}
    `;
        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(`
        <html>
          <head>
            <title>${chat.title || "Chat Export"}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
              pre { white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 5px; }
              code { font-family: monospace; background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
            </style>
          </head>
          <body>
            ${content.innerHTML}
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `);
            printWindow.document.close();
        }
    };
    const downloadFile = (content, fileName, contentType) => {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    return (<dialog_1.Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <dialog_1.DialogContent className="sm:max-w-[425px]">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Export Chat</dialog_1.DialogTitle>
        </dialog_1.DialogHeader>

        <div className="py-4">
          <radio_group_1.RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value)}>
            <div className="flex items-center space-x-2 mb-2">
              <radio_group_1.RadioGroupItem value="txt" id="txt"/>
              <label_1.Label htmlFor="txt">Plain Text (.txt)</label_1.Label>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <radio_group_1.RadioGroupItem value="json" id="json"/>
              <label_1.Label htmlFor="json">JSON (.json)</label_1.Label>
            </div>
            <div className="flex items-center space-x-2">
              <radio_group_1.RadioGroupItem value="pdf" id="pdf"/>
              <label_1.Label htmlFor="pdf">PDF Document (.pdf)</label_1.Label>
            </div>
          </radio_group_1.RadioGroup>
        </div>

        <div className="flex justify-end">
          <button_1.Button variant="outline" onClick={onClose} className="mr-2">
            Cancel
          </button_1.Button>
          <button_1.Button onClick={handleExport} disabled={!chat}>
            <lucide_react_1.Download className="mr-2 h-4 w-4"/>
            Export
          </button_1.Button>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
