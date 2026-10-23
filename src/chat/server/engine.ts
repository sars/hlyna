import type { ChatDb, Conversation, Message } from './store'
import type { Llm, LlmOutputItem, LlmResponse, ToolCtx, ToolDef } from './types'

// One turn of the model: history + the visitor's message in, tool calls run, text streamed out.
// The engine knows nothing about pages or studios; tools and context come from the config.

export const HISTORY_LIMIT = 30
const MAX_TOOL_ROUNDS = 6
const MAX_OUTPUT_TOKENS = 1200

export type TurnDeps = {
  db: ChatDb
  llm: Llm
  model: string
  instructions: string
  context: string
  tools: ToolDef[]
  ctx: Omit<ToolCtx, 'db'>
  onDelta?: (text: string) => void
  log?: (msg: string) => void
}

export type ToolCall = { name: string; args: Record<string, unknown>; result: unknown; ms: number }
export type TurnResult = { text: string; toolCalls: ToolCall[]; usage: { input: number; output: number }; rounds: number }

/** History rows as the model sees them: visitor → user, assistant → assistant, a human's reply → user-role note, status lines dropped. */
export function historyToInput(history: Message[]): { role: 'user' | 'assistant'; content: string }[] {
  return history.slice(-HISTORY_LIMIT).flatMap((m): { role: 'user' | 'assistant'; content: string }[] => {
    if (m.role === 'visitor') return [{ role: 'user' as const, content: m.text }]
    if (m.role === 'assistant') return [{ role: 'assistant' as const, content: m.text }]
    if (m.role === 'human') return [{ role: 'user' as const, content: `[Людина з Глини відповіла відвідувачу]: ${m.text}` }]
    return []
  })
}

const parseArgs = (raw: string): Record<string, unknown> => {
  try {
    const v = JSON.parse(raw || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** Output items replayed to the next round: the calls and any text, with only the fields the API accepts back
 * (the SDK's stream adds parsed fields it then rejects); reasoning items are dropped (store is off). */
const replayable = (items: LlmOutputItem[]): unknown[] =>
  items.flatMap((it): unknown[] => {
    if (isCall(it)) return [{ type: 'function_call', call_id: it.call_id, name: it.name, arguments: it.arguments }]
    if (isMessage(it)) return [{ type: 'message', role: 'assistant', content: it.content.map((c) => ({ type: 'output_text', text: c.text })) }]
    return []
  })
const isCall = (it: LlmOutputItem): it is Extract<LlmOutputItem, { type: 'function_call' }> => it.type === 'function_call' && 'call_id' in it
const isMessage = (it: LlmOutputItem): it is Extract<LlmOutputItem, { type: 'message' }> => it.type === 'message' && 'content' in it

export async function runTurn(deps: TurnDeps, history: Message[], userText: string): Promise<TurnResult> {
  const input: unknown[] = [{ role: 'developer', content: deps.context }, ...historyToInput(history), { role: 'user', content: userText }]
  const tools = deps.tools.map((t) => ({ type: 'function' as const, name: t.name, description: t.description, parameters: t.parameters, strict: false }))
  const byName = new Map(deps.tools.map((t) => [t.name, t]))
  let text = ''
  const toolCalls: ToolCall[] = []
  const usage = { input: 0, output: 0 }
  let rounds = 0

  for (;;) {
    rounds++
    const stream = deps.llm.stream({
      model: deps.model,
      instructions: deps.instructions,
      input,
      tools,
      store: false,
      reasoning: { effort: 'low' },
      text: { verbosity: 'low' },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      prompt_cache_key: 'hlyna-chat-v1',
      parallel_tool_calls: true,
    })
    for await (const ev of stream) {
      if (ev.type === 'response.output_text.delta') {
        const d = (ev as { delta: string }).delta
        text += d
        deps.onDelta?.(d)
      }
    }
    const res: LlmResponse = await stream.finalResponse()
    usage.input += res.usage?.input_tokens ?? 0
    usage.output += res.usage?.output_tokens ?? 0
    const calls = res.output.filter(isCall)
    if (!calls.length || rounds >= MAX_TOOL_ROUNDS) break

    input.push(...replayable(res.output))
    const results = await Promise.all(
      calls.map(async (c) => {
        const tool = byName.get(c.name)
        const args = parseArgs(c.arguments)
        const started = Date.now()
        let result: unknown
        try {
          result = tool ? await tool.run(args, { db: deps.db, ...deps.ctx }) : { error: `Невідомий інструмент ${c.name}` }
        } catch (e) {
          deps.log?.(`chat tool ${c.name} failed: ${String(e).slice(0, 300)}`)
          result = { error: 'Інструмент зараз недоступний. Скажи відвідувачу, що ці дані зараз не вдалося отримати.' }
        }
        toolCalls.push({ name: c.name, args, result, ms: Date.now() - started })
        return { type: 'function_call_output' as const, call_id: c.call_id, output: JSON.stringify(result ?? null).slice(0, 20_000) }
      }),
    )
    input.push(...results)
  }
  return { text: text.trim(), toolCalls, usage, rounds }
}

export type { Conversation }
