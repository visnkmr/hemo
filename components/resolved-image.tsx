"use client"

import React, { useState, useEffect } from "react"
import { GeminiImageService } from "../lib/gemini-image-service"

interface ResolvedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string
  fallbackSrc?: string
}

/**
 * An image component that can resolve IndexedDB URLs to actual base64 data
 */
export function ResolvedImage({ src, fallbackSrc, ...imgProps }: ResolvedImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const resolveImage = async () => {
      if (!src) return

      // If it's not an IndexedDB URL, use it directly
      if (!src.startsWith('indexeddb:')) {
        setResolvedSrc(src)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const imageService = GeminiImageService.createGeminiImageService()
        if (!imageService) {
          throw new Error('Gemini service not available')
        }

        const resolvedUrl = await imageService.resolveImageUrl(src)
        if (isMounted) {
          if (resolvedUrl) {
            setResolvedSrc(resolvedUrl)
          } else if (fallbackSrc) {
            setResolvedSrc(fallbackSrc)
          } else {
            setError('Failed to resolve image URL')
          }
        }
      } catch (err) {
        console.error('[ResolvedImage] Failed to resolve image:', err)
        if (isMounted) {
          if (fallbackSrc) {
            setResolvedSrc(fallbackSrc)
          } else {
            setError(err instanceof Error ? err.message : 'Failed to resolve image')
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    resolveImage()

    return () => { isMounted = false }
  }, [src, fallbackSrc])

  // Show loading state or error
  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded"
        style={{ width: imgProps.width || '200px', height: imgProps.height || '200px' }}
      >
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error && !resolvedSrc) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded"
        style={{ width: imgProps.width || '200px', height: imgProps.height || '200px' }}
      >
        <div className="text-sm text-red-400">Failed to load image</div>
      </div>
    )
  }

  if (!resolvedSrc) return null

  return <img src={resolvedSrc} {...imgProps} />
}