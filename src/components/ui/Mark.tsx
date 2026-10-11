import React from 'react'

// The jug mark (paths of public/favicon.svg), drawn in the current text colour: put `text-terracotta` on it.
// The only terracotta element of the header and footer.
export function Mark({ size = 26, className }: { size?: 22 | 26 | 28; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" fill="currentColor" className={className ?? 'shrink-0 text-terracotta'}>
      <path fillRule="evenodd" d="M32 17 A21 21 0 1 1 31.99 17 Z M32 27.2 A10.8 10.8 0 1 0 32.01 27.2 Z" />
      <path d="M23.3 4 H40.7 L35.7 18 H28.3 Z" />
      <rect x="23.5" y="59" width="17" height="3.6" />
    </svg>
  )
}
