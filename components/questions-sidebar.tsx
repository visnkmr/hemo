"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { ChevronDownIcon, ChevronRightIcon, MessageSquareIcon, ChevronLeftIcon, ChevronRightIcon as ArrowRightIcon, MenuIcon, XIcon } from "lucide-react"
import { cn } from "../lib/utils"
import type { Message } from "../lib/types"

interface QuestionsSidebarProps {
  messages: Message[]
  onQuestionClick: (messageId: string) => void
  collapsed: boolean
  onToggleCollapsed?: () => void
  className?: string
  isMobile?: boolean
}

interface UserQuestion {
  id: string
  content: string
  timestamp: string
  isExpanded: boolean
  answers: Array<{
    id: string
    content: string
    timestamp: string
  }>
}





export default function QuestionsSidebar({ messages, onQuestionClick, collapsed, onToggleCollapsed, className, isMobile = false }: QuestionsSidebarProps) {
  const [userQuestions, setUserQuestions] = useState<UserQuestion[]>([])
  const [sidebarWidth, setSidebarWidth] = useState(256) // Default width in pixels
  const [isResizing, setIsResizing] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)

  // Extract user questions for navigation (simplified since grouping is handled in main chat)
  useEffect(() => {
    const questionsMap = new Map<string, UserQuestion>()
    
    messages.forEach((message, index) => {
      if (message.role === "user") {
        const questionContent = message.content.toLowerCase().trim()
        
        // Only add unique questions (first occurrence)
        if (!questionsMap.has(questionContent)) {
          // Count how many times this question appears
          const answerCount = messages.filter((m, i) => 
            m.role === "user" && m.content.toLowerCase().trim() === questionContent
          ).length
          
          const newQuestion: UserQuestion = {
            id: message.id,
            content: message.content,
            timestamp: message.timestamp,
            isExpanded: false,
            answers: [] // We don't need to store answers here since main chat handles it
          }
          
          questionsMap.set(questionContent, newQuestion)
        }
      }
    })
    
    setUserQuestions(Array.from(questionsMap.values()))
  }, [messages])

  // Handle drag resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const newWidth = window.innerWidth - e.clientX
      setSidebarWidth(Math.max(200, Math.min(600, newWidth))) // Min 200px, max 600px
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const toggleExpanded = (questionId: string) => {
    setUserQuestions(prev => 
      prev.map(q => 
        q.id === questionId 
          ? { ...q, isExpanded: !q.isExpanded }
          : q
      )
    )
  }

  const handleQuestionClick = (questionId: string) => {
    onQuestionClick(questionId)
  }



  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  return (
    <>
      {/* Questions sidebar toggle button - always visible */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-16 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md"
        onClick={() => {
          if (isMobile) {
            setMobileMenuOpen(!mobileMenuOpen)
          } else {
            onToggleCollapsed?.()
          }
        }}
        title="Toggle Questions Sidebar"
      >
        <MessageSquareIcon size={20} />
      </Button>

      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <div className={cn(
          "fixed top-0 right-0 h-full w-80 bg-gray-50 dark:bg-gray-900 transform transition-transform duration-300 ease-in-out z-50",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 pt-16">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageSquareIcon size={16} />
              {userQuestions.length === 0 ? "Questions" : `Questions (${userQuestions.length})`}
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pb-16">
            <QuestionsList 
              userQuestions={userQuestions}
              onToggleExpanded={toggleExpanded}
              onQuestionClick={handleQuestionClick}
              truncateText={truncateText}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <div 
          className={cn(
            `overflow-y-auto absolute top-0 right-0 h-full bg-gray-50 dark:bg-gray-900 text-white transition-all duration-300 ease-in-out z-40 ${
              collapsed ? 'translate-x-full' : 'translate-x-0'
            }`, 
            "pt-20 border-l border-gray-200 dark:border-l-gray-950", 
            className
          )}
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Resize handle */}
          <div
            ref={resizeRef}
            className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-10"
            onMouseDown={() => setIsResizing(true)}
          />
          
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageSquareIcon size={16} />
              {userQuestions.length === 0 ? "Questions" : `Questions (${userQuestions.length})`}
            </h3>
          </div>
          
          {userQuestions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                No questions yet. Start a conversation to see your questions here.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pb-16">
              <QuestionsList 
                userQuestions={userQuestions}
                onToggleExpanded={toggleExpanded}
                onQuestionClick={handleQuestionClick}
                truncateText={truncateText}
              />
            </div>
          )}
        </div>
      )}
    </>
  )
}

// Questions list component (simplified for navigation only)
function QuestionsList({ 
  userQuestions, 
  onToggleExpanded, 
  onQuestionClick, 
  truncateText 
}: {
  userQuestions: UserQuestion[]
  onToggleExpanded: (id: string) => void
  onQuestionClick: (id: string) => void
  truncateText: (text: string, maxLength?: number) => string
}) {
  if (userQuestions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          No questions yet. Start a conversation to see your questions here.
        </p>
      </div>
    )
  }

  return (
    <div className="p-2 space-y-2">
      {userQuestions.map((question, index) => (
        <div
          key={question.id}
          className="border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 overflow-hidden"
        >
          <div className="flex items-start gap-2 p-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 flex-shrink-0 mt-0.5"
              onClick={() => onToggleExpanded(question.id)}
            >
              {question.isExpanded ? (
                <ChevronDownIcon size={14} />
              ) : (
                <ChevronRightIcon size={14} />
              )}
            </Button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Q{index + 1}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(question.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              
              <button
                onClick={() => onQuestionClick(question.id)}
                className="text-left w-full text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {question.isExpanded 
                  ? question.content 
                  : truncateText(question.content)
                }
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}