import type { Payload } from 'payload'
import React from 'react'

// Admin dashboard block: new profile claims and owner edits waiting for review.
export default async function OwnerQueue({ payload }: { payload: Payload }) {
  const [claims, studios] = await Promise.all([
    payload.find({ collection: 'claims', where: { status: { equals: 'pending' } }, depth: 1, limit: 20, sort: '-createdAt' }),
    payload.find({ collection: 'studios', where: { pendingOwnerChanges: { equals: true } }, depth: 0, limit: 20, draft: true, sort: '-updatedAt' }),
  ])
  if (!claims.totalDocs && !studios.totalDocs) return null
  const box: React.CSSProperties = { border: '1px solid var(--theme-elevation-150)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }
  return (
    <div style={box}>
      {claims.totalDocs > 0 && (
        <>
          <h4 style={{ margin: '0 0 6px' }}>Нові заявки на профіль ({claims.totalDocs})</h4>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18 }}>
            {claims.docs.map((c) => (
              <li key={c.id}>
                <a href={`/admin/collections/claims/${c.id}`}>
                  {c.name} — {typeof c.studio === 'object' && c.studio ? c.studio.name : `#${c.studio}`} ({c.contact})
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      {studios.totalDocs > 0 && (
        <>
          <h4 style={{ margin: '0 0 6px' }}>Зміни від власників ({studios.totalDocs})</h4>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {studios.docs.map((s) => (
              <li key={s.id}>
                <a href={`/admin/collections/studios/${s.id}`}>{s.name}</a> — перегляньте чернетку й опублікуйте
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
