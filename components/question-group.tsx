"use client"

import React, { useState, useEffect } from "react"
import { Button } from "../components/ui/button"
import type { Message } from "../lib/types"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import MessageItem from "../components/message-item"
import ExpandableMessageItem from "../components/expandable-message-item"

// Question Group Component for Grok-style scrollable answers
interface QuestionGroupProps {
     question: Message
     answers: Message[]
     onCopy: (content: string) => void
     onBranch: (messageId: string, branchType: 'full' | 'single' | 'model') => void
     setdsm: any
     setmts: any
     isStreaming?: boolean
     streamingMessageId?: string | null
     isQuestionExpanded: boolean
     onToggleQuestionExpand: () => void
     currentAnswerIndex: number
     onAnswerIndexChange: (index: number) => void
     onEdit?: (messageId: string, newContent: string, editOllamaState?: number, editSelectedModel?: string) => void
     onQuoteMessage?: (message: Message) => void
     isQuoted?: boolean
     quotedMessages: Message[]
   // Props for EditDialog
   ollamastate: number
   selectedModel: string
   selectedModelInfo: any
   allModels: any[]
   handleSelectModel: (modelId: string) => void
   isLoadingModels: boolean
   vendor: string
   setollamastate: any
   getModelColor: any
   getModelDisplayName: any
   answerfromfile: boolean
   setanswerfromfile: any
   sendwithhistory: boolean
   setsendwithhistory: any
   fullfileascontext: boolean
   setfullfileascontext: any
   morethanonefile: boolean
   searchcurrent: boolean
   setsearchcurrent: any
   contextUsage: number
   setcolorpertheme: string
 }

function QuestionGroup({ question, answers, onCopy, onBranch, setdsm, setmts, isStreaming, streamingMessageId, isQuestionExpanded, onToggleQuestionExpand, currentAnswerIndex, onAnswerIndexChange, onEdit, onQuoteMessage, isQuoted = false, quotedMessages, ollamastate, selectedModel, selectedModelInfo, allModels, handleSelectModel, isLoadingModels, vendor, setollamastate, getModelColor, getModelDisplayName, answerfromfile, setanswerfromfile, sendwithhistory, setsendwithhistory, fullfileascontext, setfullfileascontext, morethanonefile, searchcurrent, setsearchcurrent, contextUsage, setcolorpertheme }: QuestionGroupProps) {
  const handlePrevious = () => {
    const newIndex = Math.max(0, currentAnswerIndex - 1)
    onAnswerIndexChange(newIndex)
  }

  const handleNext = () => {
    const newIndex = Math.min(answers.length - 1, currentAnswerIndex + 1)
    onAnswerIndexChange(newIndex)
  }

  const handleDotClick = (index: number) => {
    onAnswerIndexChange(index)
  }

  const currentAnswer = answers[currentAnswerIndex]

  // Auto-switch to latest answer when streaming
  useEffect(() => {
    if (isStreaming && streamingMessageId) {
      const streamingAnswerIndex = answers.findIndex(answer => answer.id === streamingMessageId)
      if (streamingAnswerIndex !== -1 && streamingAnswerIndex !== currentAnswerIndex) {
        onAnswerIndexChange(streamingAnswerIndex)
      }
    }
  }, [isStreaming, streamingMessageId, answers, currentAnswerIndex, onAnswerIndexChange])

  return (
    <div className="w-full space-y-4">
      {/* Question with expand/collapse */}
      <ExpandableMessageItem
        message={question}
        onCopy={() => onCopy(question.content)}
        onBranch={(branchType) => onBranch(question.id, branchType)}
        setdsm={setdsm}
        setmts={setmts}
        isExpanded={isQuestionExpanded}
        onToggleExpand={onToggleQuestionExpand}
        onEdit={onEdit}
        onQuoteMessage={onQuoteMessage}
        isQuoted={isQuoted}
        ollamastate={ollamastate}
        selectedModel={selectedModel}
        selectedModelInfo={selectedModelInfo}
        allModels={allModels}
        handleSelectModel={handleSelectModel}
        isLoadingModels={isLoadingModels}
        vendor={vendor}
        setollamastate={setollamastate}
        getModelColor={getModelColor}
        getModelDisplayName={getModelDisplayName}
        answerfromfile={answerfromfile}
        setanswerfromfile={setanswerfromfile}
        sendwithhistory={sendwithhistory}
        setsendwithhistory={setsendwithhistory}
        fullfileascontext={fullfileascontext}
        setfullfileascontext={setfullfileascontext}
        morethanonefile={morethanonefile}
        searchcurrent={searchcurrent}
        setsearchcurrent={setsearchcurrent}
        contextUsage={contextUsage}
        setcolorpertheme={setcolorpertheme}
      />

      {/* Answer Group with Navigation */}
      <div className="w-full">
        {/* Answer Counter and Navigation */}
        <div className="flex items-center justify-between mb-2 px-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Answer {currentAnswerIndex + 1} of {answers.length}
          </div>

          {answers.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                disabled={currentAnswerIndex === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeftIcon size={16} />
              </Button>

              {/* Dot indicators */}
              <div className="flex gap-1">
                {answers.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleDotClick(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${index === currentAnswerIndex
                      ? 'bg-blue-500'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                      }`}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                disabled={currentAnswerIndex === answers.length - 1}
                className="h-8 w-8 p-0"
              >
                <ChevronRightIcon size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* Current Answer */}
        <div className="relative">
          <MessageItem
            message={currentAnswer}
            isStreaming={isStreaming && streamingMessageId === currentAnswer.id}
            onCopy={() => onCopy(currentAnswer.content)}
            onBranch={(branchType) => onBranch(currentAnswer.id, branchType)}
            setdsm={setdsm}
            setmts={setmts}
            onQuoteMessage={onQuoteMessage}
            isQuoted={quotedMessages.some(q => q.id === currentAnswer.id)}
          />

          {/* Multiple answers indicator */}
          {answers.length > 1 && (
            <div className="absolute top-2 right-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
              {answers.length} answers
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuestionGroup