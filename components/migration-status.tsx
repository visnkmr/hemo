"use client"

import React, { useEffect, useState } from "react"
import { CheckCircle, Database, RefreshCw } from "lucide-react"
import { cn } from "../lib/utils"

interface MigrationStatusProps {
  isMigrating: boolean
  migrationComplete: boolean
  migrationStats: {
    configItems: number
    chatHistory: number
  } | null
  error: Error | null
}

export default function MigrationStatus({
  isMigrating,
  migrationComplete,
  migrationStats,
  error
}: MigrationStatusProps) {
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")

  useEffect(() => {
    if (migrationComplete && migrationStats) {
      let message = "Migration completed! "

      if (migrationStats.configItems > 0) {
        message += `${migrationStats.configItems} settings migrated. `
      }

      if (migrationStats.chatHistory > 0) {
        message += "Chat history migrated."
      }

      if (migrationStats.configItems === 0 && migrationStats.chatHistory === 0) {
        message += "No data needed migration."
      }

      setNotificationMessage(message)
      setShowNotification(true)

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setShowNotification(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [migrationComplete, migrationStats])

  useEffect(() => {
    if (error) {
      setNotificationMessage("Migration failed. Using existing data.")
      setShowNotification(true)

      const timer = setTimeout(() => {
        setShowNotification(false)
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [error])

  if (!isMigrating && !showNotification && !migrationComplete) {
    return null
  }

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm">
      {/* Migration in progress indicator */}
      {isMigrating && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Migrating data...</span>
          </div>
        </div>
      )}

      {/* Migration complete notification */}
      {showNotification && (
        <div className={cn(
          "border rounded-lg p-3 shadow-lg transition-all duration-300",
          error
            ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
            : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
        )}>
          <div className={cn(
            "flex items-center gap-2",
            error
              ? "text-red-800 dark:text-red-200"
              : "text-green-800 dark:text-green-200"
          )}>
            {error ? (
              <Database className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{notificationMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}