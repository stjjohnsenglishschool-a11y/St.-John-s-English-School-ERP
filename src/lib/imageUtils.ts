import type React from 'react'

/**
 * Helper utilities for formatting and resolving image URLs,
 * specifically handling Google Drive links, CORS restrictions, and broken image fallbacks.
 */

/**
 * Transforms Google Drive and external image links into direct CDN URLs
 * that render cleanly in standard <img> tags.
 * Converts Google Drive view/file/uc URLs into direct embeddable links.
 */
export function formatImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  // Process Google Drive URLs
  if (
    trimmed.includes('drive.google.com') ||
    trimmed.includes('docs.google.com') ||
    trimmed.includes('googleusercontent.com')
  ) {
    let fileId = ''

    // Pattern 1: /file/d/{FILE_ID}/
    const matchPath = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    // Pattern 2: id={FILE_ID}
    const matchQuery = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    // Pattern 3: /d/{FILE_ID}
    const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)

    if (matchPath && matchPath[1]) {
      fileId = matchPath[1]
    } else if (matchQuery && matchQuery[1]) {
      fileId = matchQuery[1]
    } else if (matchD && matchD[1]) {
      fileId = matchD[1]
    }

    if (fileId) {
      // Use Google's CDN direct high-res image endpoint
      return `https://lh3.googleusercontent.com/d/${fileId}`
    }
  }

  return trimmed
}

/**
 * Fallback image error handler for Google Drive and external images
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const img = e.currentTarget
  const currentSrc = img.src

  // If Google CDN endpoint failed, try thumbnail fallback endpoint
  if (currentSrc.includes('lh3.googleusercontent.com/d/')) {
    const parts = currentSrc.split('/d/')
    const id = parts[parts.length - 1]
    if (id) {
      img.src = `https://drive.google.com/thumbnail?id=${id}&sz=w1000`
      return
    }
  }

  // If thumbnail endpoint also failed
  img.onerror = null
  img.style.opacity = '0.3'
}
