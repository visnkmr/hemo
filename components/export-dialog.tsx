"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { Button } from "../components/ui/button"
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group"
import { Label } from "../components/ui/label"
import { Download } from "lucide-react"
import type { Chat } from "../lib/types"
import { GeminiImageService } from "../lib/gemini-image-service"

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  chat: Chat | undefined
}

type ExportFormat = "pdf" | "txt" | "json"

/**
 * Get constrained image style for PDF export
 * Keeps aspect ratio while respecting max dimensions
 */
const getConstrainedImageStyle = (maxWidth: number, maxHeight: number): string => {
  return `max-width: ${maxWidth}px; max-height: ${maxHeight}px; width: auto; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);`;
};

/**
 * Get grid item style for generated images in PDF
 */
const getGridImageStyle = (maxWidth: number = 250): string => {
  return `max-width: ${maxWidth}px; width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);`;
};

export default function ExportDialog({ isOpen, onClose, chat }: ExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>("txt")

  const handleExport = () => {
    if (!chat) return

    switch (exportFormat) {
      case "txt":
        exportAsTxt(chat)
        break
      case "json":
        exportAsJson(chat)
        break
      case "pdf":
        exportAsPdf(chat)
        break
    }

    onClose()
  }

  const exportAsTxt = (chat: Chat) => {
    let content = `# ${chat.title || "Chat Export"}\n`
    content += `# Date: ${new Date(chat.createdAt).toLocaleString()}\n\n`

    chat.messages.forEach((message) => {
      content += `${message.role.toUpperCase()} [${new Date(message.timestamp).toLocaleString()}]:\n`
      content += `${message.content}\n\n`
    })

    downloadFile(content, `chat-export-${Date.now()}.txt`, "text/plain")
  }

  const exportAsJson = (chat: Chat) => {
    const content = JSON.stringify(chat, null, 2)
    downloadFile(content, `chat-export-${Date.now()}.json`, "application/json")
  }

  const exportAsPdf = async (chat: Chat) => {
    try {
      // Resolve all images in the chat to base64 data
      const resolvedMessages = await Promise.all(
        chat.messages.map(async (message) => {
          let content = message.content;
          let imageHtml = '';

          // Handle single imageUrl
          if (message.imageUrl) {
            try {
              const geminiService = GeminiImageService.createGeminiImageService();
              if (geminiService) {
                // Use optimized image from webuse database for PDF export
                const resolvedImage = await geminiService.resolveImageUrl(message.imageUrl, true);
                if (resolvedImage) {
                  const imageStyle = getConstrainedImageStyle(800, 600); // Max 800x600 for single images
                  imageHtml += `<div style="margin: 10px 0;"><img src="${resolvedImage}" alt="Generated image" style="${imageStyle}" /></div>`;
                }
              }
            } catch (error) {
              console.warn('Failed to resolve image for PDF export:', error);
              imageHtml += `<div style="margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 8px;">[Image: ${message.imageUrl}]</div>`;
            }
          }

          // Handle image generations
          if (message.imageGenerations && message.imageGenerations.length > 0) {
            for (const generation of message.imageGenerations) {
              if (generation.images && generation.images.length > 0) {
                imageHtml += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0;">';

                for (const image of generation.images) {
                  try {
                    const geminiService = GeminiImageService.createGeminiImageService();
                    if (geminiService) {
                      // Use optimized image from webuse database (true = optimized)
                      const imageUri = `indexeddb:${image.originalImageId || image.optimizedImageId}`;
                      const resolvedImage = await geminiService.resolveImageUrl(imageUri, true);
                      if (resolvedImage) {
                        const imageStyle = getGridImageStyle(250); // Max 250px width for grid items
                        imageHtml += `<img src="${resolvedImage}" alt="Generated image" style="${imageStyle}" />`;
                      }
                    }
                  } catch (error) {
                    console.warn('Failed to resolve generation image for PDF export:', error);
                    imageHtml += `<div style="padding: 20px; background: #f0f0f0; border-radius: 8px; text-align: center;">[Generated Image]</div>`;
                  }
                }

                imageHtml += '</div>';
              }
            }
          }

          return {
            ...message,
            content,
            imageHtml
          };
        })
      );

      // Create HTML content with resolved images
      const content = document.createElement("div")
      content.innerHTML = `
        <h1 style="color: #333; margin-bottom: 10px;">${chat.title || "Chat Export"}</h1>
        <p style="color: #666; margin-bottom: 20px;">Date: ${new Date(chat.createdAt).toLocaleString()}</p>
        <hr style="border: none; border-top: 2px solid #eee; margin-bottom: 30px;" />
        ${resolvedMessages
          .map(
            (message) => `
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <p style="font-weight: bold; color: #333; margin-bottom: 8px;">
              ${message.role.toUpperCase()} [${new Date(message.timestamp).toLocaleString()}]:
            </p>
            <div style="white-space: pre-wrap; line-height: 1.6; margin-bottom: 10px;">${message.content}</div>
            ${message.imageHtml}
          </div>
        `,
          )
          .join("")}
      `

      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${chat.title || "Chat Export"}</title>
              <style>
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  line-height: 1.6;
                  padding: 20px;
                  color: #333;
                  background: white;
                  max-width: 800px;
                  margin: 0 auto;
                }
                h1 {
                  color: #2c3e50;
                  border-bottom: 3px solid #3498db;
                  padding-bottom: 10px;
                }
                pre {
                  white-space: pre-wrap;
                  background: #f8f9fa;
                  padding: 15px;
                  border-radius: 8px;
                  border-left: 4px solid #3498db;
                  font-family: 'Consolas', 'Monaco', monospace;
                  overflow-x: auto;
                }
                code {
                  font-family: 'Consolas', 'Monaco', monospace;
                  background: #f8f9fa;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-size: 0.9em;
                }
                img {
                  max-width: 100%;
                  height: auto;
                  border-radius: 8px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                @media print {
                  body {
                    padding: 0;
                    max-width: none;
                    margin: 0;
                  }
                  img {
                    break-inside: avoid;
                    page-break-inside: avoid;
                  }
                  div[style*="page-break-inside: avoid"] {
                    break-inside: avoid;
                    page-break-inside: avoid;
                  }
                }
              </style>
            </head>
            <body>
              ${content.innerHTML}
              <script>
                // Wait for all images to load before printing
                let imagesLoaded = 0;
                const images = document.querySelectorAll('img');
                const totalImages = images.length;

                if (totalImages === 0) {
                  setTimeout(() => {
                    window.print();
                    window.close();
                  }, 500);
                } else {
                  images.forEach(img => {
                    img.onload = () => {
                      imagesLoaded++;
                      if (imagesLoaded === totalImages) {
                        setTimeout(() => {
                          window.print();
                          window.close();
                        }, 1000);
                      }
                    };
                    img.onerror = () => {
                      imagesLoaded++;
                      if (imagesLoaded === totalImages) {
                        setTimeout(() => {
                          window.print();
                          window.close();
                        }, 1000);
                      }
                    };
                  });
                }
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
      }
    } catch (error) {
      console.error('Failed to export as PDF:', error);
      alert('Failed to export as PDF. Please try again.');
    }
  }

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Chat</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
            <div className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value="txt" id="txt" />
              <Label htmlFor="txt">Plain Text (.txt)</Label>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value="json" id="json" />
              <Label htmlFor="json">JSON (.json)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="pdf" />
              <Label htmlFor="pdf">PDF Document (.pdf)</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose} className="mr-2">
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={!chat}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
