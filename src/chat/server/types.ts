import type { ChatDb, Conversation, Message } from './store'

// The contracts between the chat module and whoever embeds it (src/server/chatAdapter.ts on this site).

/** A function the model may call. `parameters` is a JSON schema; `run` returns anything JSON-serialisable. */
export type ToolDef = {
  name: string
  description: string
  parameters: Record<string, unknown>
  run: (args: Record<string, unknown>, ctx: ToolCtx) => Promise<unknown>
}

export type ToolCtx = { db: ChatDb; conversation: Conversation; ip: string; via: 'site' | 'telegram' }

/** The one thing the module needs from Telegram: send, edit, answer. Message ids come back so replies can be matched. */
export type Transport = {
  /** A message in the owner's chat; `replyTo` threads it under the conversation's head message. */
  sendToOwner(text: string, opts?: { keyboard?: TgKeyboard; replyTo?: number }): Promise<number | null>
  /** A message to any Telegram chat (the visitor who continued in Telegram). */
  sendTo(chatId: number, text: string, opts?: { keyboard?: TgKeyboard }): Promise<number | null>
  editOwnerMessage(messageId: number, text: string, keyboard?: TgKeyboard): Promise<void>
  answerCallback(id: string, text?: string): Promise<void>
  /** The bot's @username for the «Продовжити в Telegram» link; null when the bot is not configured. */
  botUsername(): Promise<string | null>
  /** Where the owner reads the transcript. */
  panelUrl(conversationId: number): string
}

export type TgButton = { text: string; callback_data?: string; url?: string }
export type TgKeyboard = TgButton[][]

/** What the module asks the embedding site for. */
export type ChatConfig = {
  db: ChatDb
  llm: Llm
  model: string
  /** Stable instructions (cached across requests): who the assistant is, the rules. */
  instructions: string
  /** Facts about this conversation for this turn: page, studio, city, state. Rebuilt every turn. */
  context: (c: Conversation, extra: { presenceOnline: boolean; otherThreads: { page: string; first: string }[] }) => Promise<string> | string
  tools: ToolDef[]
  transport: Transport
  /** Fixed-window limit shared with the rest of the site; true means over the limit. */
  rateLimited: (key: string, max: number, windowMs: number) => Promise<boolean>
  /** A business lead (a batch, a logo, a venue, a team): the owner is told at once, before the assistant answers. */
  business?: { detect: (text: string, c: Conversation) => boolean; detectTools?: (calls: { name: string; args: Record<string, unknown> }[]) => boolean }
  /** The opener the thread shows before the visitor writes (by kind of page). */
  log?: (msg: string) => void
}

/** The slice of the OpenAI Responses API the engine uses, so tests can pass a fake. */
export type Llm = {
  stream(params: LlmParams): LlmStream
}
export type LlmParams = {
  model: string
  instructions: string
  input: unknown[]
  tools: { type: 'function'; name: string; description: string; parameters: Record<string, unknown>; strict: boolean }[]
  store: false
  reasoning?: { effort: 'none' | 'minimal' | 'low' | 'medium' | 'high' }
  text?: { verbosity: 'low' | 'medium' | 'high' }
  max_output_tokens: number
  prompt_cache_key?: string
  parallel_tool_calls?: boolean
}
export type LlmEvent = { type: 'response.output_text.delta'; delta: string } | { type: string }
export type LlmOutputItem =
  | { type: 'function_call'; call_id: string; name: string; arguments: string; id?: string }
  | { type: 'message'; role: 'assistant'; content: { type: 'output_text'; text: string }[]; id?: string }
  | { type: string; id?: string }
export type LlmResponse = {
  output: LlmOutputItem[]
  output_text: string
  usage?: { input_tokens: number; output_tokens: number } | null
  status?: string
}
export type LlmStream = AsyncIterable<LlmEvent> & { finalResponse(): Promise<LlmResponse> }

export type { Conversation, Message }
