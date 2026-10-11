// Page width: content is at most 1600px with the fluid gutter; coloured panels go full-bleed and put `wrap` inside.
export const wrap = 'mx-auto w-full max-w-wrap px-gutter'

/** Joins class names, skipping falsy values. */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')
