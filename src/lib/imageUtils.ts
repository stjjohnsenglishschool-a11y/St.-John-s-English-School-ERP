import type React from 'react'

/**
 * Helper utilities for formatting and resolving image URLs,
 * specifically handling Google Drive links, raw file IDs, CORS restrictions, and broken image fallbacks.
 */

/**
 * Transforms Google Drive and external image links into direct CDN URLs
 * that render cleanly in standard <img> tags.
 * Converts Google Drive view/file/uc/open URLs and raw IDs into direct embeddable links.
 */
export function formatImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return ''
  let trimmed = url.trim()
  if (!trimmed) return ''

  // Strip wrapping quotes, brackets, and whitespace: e.g. "https://...", <https://...>
  trimmed = trimmed.replace(/^[<"'\s]+|[>"'\s]+$/g, '')
  if (!trimmed) return ''

  // Return data URLs and blob URLs as-is
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }

  // Handle bare protocol: //example.com -> https://example.com
  if (trimmed.startsWith('//')) {
    trimmed = 'https:' + trimmed
  }

  // Check if it's a standalone Google Drive file ID (25 to 50 alphanumeric, underscore, hyphen chars)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return `https://lh3.googleusercontent.com/d/${trimmed}`
  }

  // Process Google Drive & Docs URLs
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
    // Pattern 4: /(open|uc)?id={FILE_ID}
    const matchOpen = trimmed.match(/\/(open|uc)\?id=([a-zA-Z0-9_-]+)/)

    if (matchPath && matchPath[1]) {
      fileId = matchPath[1]
    } else if (matchQuery && matchQuery[1]) {
      fileId = matchQuery[1]
    } else if (matchD && matchD[1]) {
      fileId = matchD[1]
    } else if (matchOpen && matchOpen[2]) {
      fileId = matchOpen[2]
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
  const currentSrc = img.src || ''

  // Step 1: If Google CDN endpoint failed, try thumbnail fallback endpoint
  if (currentSrc.includes('lh3.googleusercontent.com/d/')) {
    const parts = currentSrc.split('/d/')
    const id = parts[parts.length - 1]
    if (id) {
      img.src = `https://drive.google.com/thumbnail?id=${id}&sz=w1000`
      return
    }
  }

  // Step 2: If thumbnail endpoint also failed, try export=view endpoint
  if (currentSrc.includes('thumbnail?id=')) {
    const match = currentSrc.match(/[?&]id=([^&]+)/)
    if (match && match[1]) {
      img.src = `https://drive.google.com/uc?export=view&id=${match[1]}`
      return
    }
  }

  // Step 3: If all image load attempts fail, hide the broken icon cleanly
  img.onerror = null
  img.style.display = 'none'
  if (img.parentElement) {
    img.parentElement.setAttribute('data-image-error', 'true')
  }
}
