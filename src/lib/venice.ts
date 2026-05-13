/**
 * Venice AI inference client — OpenAI-compatible API.
 * Private, uncensored, no data retention.
 * Docs: https://docs.venice.ai
 */

const VENICE_BASE = 'https://api.venice.ai/api/v1'
const VENICE_KEY = import.meta.env.VITE_VENICE_API_KEY as string
// Best available capable model on Venice
export const VENICE_MODEL = (import.meta.env.VITE_VENICE_MODEL as string) || 'llama-3.3-70b'

export type Intent =
  | { intent: 'create_dashboard'; name: string }
  | { intent: 'log_entry'; text: string; amount?: number; token?: string; dashboardHint?: string }
  | { intent: 'track_token'; url: string }
  | { intent: 'chat'; message: string }
  | { intent: 'unknown'; message: string }

// ─── Core fetch ──────────────────────────────────────────────────────────────

async function veniceChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  opts: { temperature?: number; max_tokens?: number } = {},
): Promise<string> {
  const resp = await fetch(`${VENICE_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VENICE_KEY}`,
    },
    body: JSON.stringify({
      model: VENICE_MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 600,
      stream: false,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Venice API ${resp.status}: ${err}`)
  }

  const data = await resp.json() as {
    choices: Array<{ message: { content: string } }>
  }
  return data.choices[0]?.message?.content ?? ''
}

// ─── Intent parser ───────────────────────────────────────────────────────────

const INTENT_SYSTEM = `You are an intent classifier for Meridian, a private crypto intelligence app.
Parse the user message and respond with ONLY a JSON object. No markdown, no explanation, no code fences.

Intents:
1. create_dashboard — user wants to make a new named dashboard
   {"intent":"create_dashboard","name":"<name>"}

2. log_entry — user is recording a financial event (received, paid, bought, sold, earned, invoice, freelance)
   {"intent":"log_entry","text":"<verbatim>","amount":<number|null>,"token":"<SYMBOL|null>","dashboardHint":"<dashboard name if mentioned|null>"}

3. track_token — user pasted a dexscreener.com or coingecko.com URL
   {"intent":"track_token","url":"<url>"}

4. chat — general question, analysis, or conversation
   {"intent":"chat","message":"<message>"}

Respond ONLY with valid JSON. No other text.`

export async function parseIntentWithVenice(message: string): Promise<Intent | null> {
  try {
    const raw = await veniceChat(
      [
        { role: 'system', content: INTENT_SYSTEM },
        { role: 'user', content: message },
      ],
      { temperature: 0.1, max_tokens: 150 },
    )
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    return JSON.parse(jsonStr) as Intent
  } catch {
    return null
  }
}

// ─── Regex fallback ───────────────────────────────────────────────────────────

const DEXSCREENER_RE = /https?:\/\/dexscreener\.com\/([^/\s]+)\/([a-zA-Z0-9]+)/i
const COINGECKO_RE = /https?:\/\/(?:www\.)?coingecko\.com\/en\/coins\/([a-zA-Z0-9-]+)/i

export function parseIntentWithRegex(message: string): Intent {
  const trimmed = message.trim()

  if (DEXSCREENER_RE.test(trimmed) || COINGECKO_RE.test(trimmed)) {
    const urlMatch = trimmed.match(/https?:\/\/\S+/)
    if (urlMatch) return { intent: 'track_token', url: urlMatch[0] }
  }

  const createDash = /(?:create|new|add|make)\s+(?:a\s+)?(?:dashboard|dash)/i.test(trimmed)
  if (createDash) {
    const m = trimmed.match(/(?:create|new|add|make)\s+a?\s*(.+?)\s+dashboard/i)
    const name = m ? m[1].trim() : 'Untitled'
    return { intent: 'create_dashboard', name }
  }

  const logPatterns = [
    /(?:i\s+)?(?:got paid|received|earned|got)\s+([\d.,]+)\s+([A-Z]{2,10})/i,
    /(?:bought|purchased|acquired)\s+([\d.,]+)\s+([A-Z]{2,10})/i,
    /(?:sold|sent|paid)\s+([\d.,]+)\s+([A-Z]{2,10})/i,
    /(?:staked|unstaked|swapped|invoiced?)\s+([\d.,]+)/i,
  ]
  for (const pattern of logPatterns) {
    const match = trimmed.match(pattern)
    if (match) {
      return {
        intent: 'log_entry',
        text: trimmed,
        amount: parseFloat(match[1].replace(/,/g, '')),
        token: match[2]?.toUpperCase(),
      }
    }
  }

  if (/\b(?:log|note|record|track|entry|invoice|freelance)\b/i.test(trimmed)) {
    return { intent: 'log_entry', text: trimmed }
  }

  return { intent: 'chat', message: trimmed }
}

// ─── Public API (same signatures as old ollama.ts) ────────────────────────────

export async function parseIntent(message: string): Promise<Intent> {
  if (VENICE_KEY) {
    const result = await parseIntentWithVenice(message)
    if (result) return result
  }
  return parseIntentWithRegex(message)
}

export async function chat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  if (!VENICE_KEY) {
    return 'Venice API key not configured. Add VITE_VENICE_API_KEY to your .env file.'
  }
  try {
    return await veniceChat(
      [
        {
          role: 'system',
          content: `You are Meridian — a private, intelligent crypto and financial assistant.
You help the user track crypto portfolios, analyse tokens, understand market data, and manage their financial dashboards.
Be concise, insightful, and direct. You have no data retention and full privacy.`,
        },
        ...messages,
      ],
      { temperature: 0.7, max_tokens: 600 },
    )
  } catch (e) {
    return `Venice error: ${e instanceof Error ? e.message : 'unknown'}`
  }
}

// Legacy aliases — keeps ChatInput.tsx imports working
export const chatWithOllama = chat
export const checkOllamaAvailable = async () => !!VENICE_KEY
