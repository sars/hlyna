// A rough price per conversation for the panel, from the stored token counts. Prices in USD per million tokens
// (OpenAI list prices, October 2026); an unknown model shows no estimate. Cached input is billed lower, so the
// real bill is a little below this.
const PRICES: [prefix: string, input: number, output: number][] = [
  ['gpt-5.5', 5, 30],
  ['gpt-5.4-mini', 0.75, 4.5],
  ['gpt-5.4-nano', 0.2, 1.25],
  ['gpt-5.4', 2.5, 15],
  ['gpt-5-mini', 0.25, 2],
  ['gpt-5', 1.25, 10],
]

export function estimateUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const p = PRICES.find(([prefix]) => model.startsWith(prefix))
  if (!p) return null
  return (inputTokens * p[1] + outputTokens * p[2]) / 1_000_000
}

export const fmtUsd = (v: number) => (v < 0.01 ? '< $0.01' : `≈ $${v.toFixed(2)}`)
