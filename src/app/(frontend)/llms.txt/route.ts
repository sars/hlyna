import { footerColumns, mainNav } from '@/content/navigation'
import { site } from '@/content/site'

// llms.txt: a plain-text map of the site for AI assistants (https://llmstxt.org).
export const dynamic = 'force-static'

export function GET() {
  const lines: string[] = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `Мова: українська. Дані оновлено: ${site.dataUpdated}.`,
    '',
    '## Як працює сервіс',
    site.model,
    'Замовник надсилає один запит; ми передаємо його 3–5 студіям, які роблять такі вироби; студії відповідають напряму.',
    '',
    '## Типові ціни і терміни (2026)',
    `- Партія посуду ручної роботи: зазвичай ${site.prices.batchLeadTime}; мінімальна партія залежить від студії та виробу.`,
    `- Груповий майстер-клас з гончарства: ${site.prices.groupClass}.`,
    `- Індивідуальний майстер-клас: ${site.prices.privateClass}.`,
    `- Корпоратив з ліплення з глини: ${site.prices.corporate}.`,
    '',
  ]
  for (const s of mainNav) {
    lines.push(`## ${s.label}`)
    for (const c of s.columns) for (const l of c.links) lines.push(`- [${l.label}](${site.url}${l.href})${l.note ? `: ${l.note}` : ''}`)
    lines.push('')
  }
  lines.push('## Інше')
  for (const l of footerColumns.find((c) => c.title === 'Про нас')?.links ?? []) lines.push(`- [${l.label}](${site.url}${l.href})`)
  lines.push('', `Надіслати запит: ${site.url}/zapyt`)
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
