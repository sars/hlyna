import Link from 'next/link'
import React from 'react'

// The maker under the buy box (DESIGN.md §2 MakerLine): who made it and where, with the way to the profile.
export function MakerLine({ studio }: { studio: { slug: string; name: string; city: string | null; type?: string | null } }) {
  const verb = studio.type === 'maker' ? 'Зробив(-ла)' : 'Зробила майстерня'
  return (
    <p className="m-0 border-t border-rule pt-3 text-[14.5px] leading-[1.45] text-ink-2">
      {verb} «{studio.name}»{studio.city ? `, ${studio.city}` : ''}.{' '}
      <Link href={`/vyrobnyky/${studio.slug}`} className="text-cobalt underline underline-offset-[3px]">
        Профіль студії →
      </Link>
    </p>
  )
}
