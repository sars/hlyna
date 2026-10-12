// Small helpers of the studio profile page.
import React from 'react'

export const link = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener nofollow" className="break-all">
    {label}
  </a>
)
