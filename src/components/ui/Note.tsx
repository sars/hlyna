import React from 'react'

// A service note on paper-2 («студія ще не вказала…»). No frame, no radius.
export function Note({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`max-w-read bg-paper-2 px-[18px] py-4 text-[15.5px] leading-normal ${className ?? ''}`}>{children}</div>
}
