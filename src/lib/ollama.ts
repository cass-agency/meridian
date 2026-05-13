/**
 * Ollama HTTP API client + regex-based intent parser fallback.
 * Model: llama3 at localhost:11434
 */

export type Intent =
  | { intent: 'create_dashboard'; name: string }
  | { intent: 'log_entry'; text: string; amount?: number; token?: string; dashboardHint?: string }
  | { intent: 'track_token'; url: string }
  | { intent: 'chat'; message: string }
  | { intent: 'unknown'; message: string }

const OLLAMA_BASE = 'http://localhost:11434'
const MODEL = 'llama3'

export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) })
    return resp.ok
  } catch {
    return false
  }
}

const SYSTEM_PROMPT = `You are an intent parser for a crypto intelligence app called Meridian.
Parse the user message and respond with ONLY a JSON object (no markdown, no explanation).

Possible intents:
1. create_dashboard: user wants to create a named dashboard
   {"intent":"create_dashboard","name":"<name>"}

2. log_entry: user is logging a financial event (received, paid, bought, sold, earned)
   {"intent":"log_entry","text":"<original text>","amount":<number or null>,"token":"<token symbol or null>","dashboardHint":"<dashboard name if mentioned>"}

3. track_token: user pasted a URL (dexscreener or coingecko)
   {"intent":"track_token","url":"<url>"}

4. chat: general question or conversation
   {"intent":"chat","message":"<message>"}

Respond ONLY with valid JSON.`

export async function parseIntentWithOllama(message: string): Promise<Intent | null> {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: message,
        system: SYSTEM_PROMPT,
        stream: false,
        options: { temperature: 0.1, num_predict: 200 },
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!resp.ok) return null
    const data = await resp.json() as { response: string }
    const raw = data.response?.trim() ?? ''
    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    return JSON.parse(jsonStr) as Intent
  } catch {
    return null
  }
}

// URL pattern check
const DEXSCREENER_RE = /https?:\/\/dexscreener\.com\/([^/]+)\/([a-zA-Z0-9]+)/i
const COINGECKO_RE = /https?:\/\/(?:www\.)?coingecko\.com\/en\/coins\/([a-zA-Z0-9-]+)/i

export function parseIntentWithRegex(message: string): Intent {
  const trimmed = message.trim()

  // Check for URLs first
  if (DEXSCREENER_RE.test(trimmed) || COINGECKO_RE.test(trimmed)) {
    const urlMatch = trimmed.match(/https?:\/\/\S+/)
    if (urlMatch) {
      return { intent: 'track_token', url: urlMatch[0] }
    }
  }

  // "create a X dashboard" / "create dashboard X" / "new dashboard X"
  const createDash = trimmed.match(
    /(?:create|new|add|make)\s+(?:a\s+)?(?:dashboard\s+(?:called\s+|named\s+)?)?(.+?)(?:\s+dashboard)?$/i,
  )
  if (
    /(?:create|new|add|make)\s+(?:a\s+)?(?:dashboard|dash)/i.test(trimmed) &&
    createDash
  ) {
    let name = createDash[1].replace(/\s*dashboard\s*$/i, '').trim()
    // fallback: extract name between "create a" and "dashboard"
    const m2 = trimmed.match(/(?:create|new|add|make)\s+a?\s*(.+?)\s+dashboard/i)
    if (m2) name = m2[1].trim()
    return { intent: 'create_dashboard', name: name || 'Untitled' }
  }

  // Log entry patterns: "I got paid 2 SOL", "received 0.5 ETH", "bought 100 USDC"
  const logPatterns = [
    /(?:i\s+)?(?:got paid|received|earned|got)\s+([\d.,]+)\s+([A-Z]{2,10})/i,
    /(?:bought|purchased|acquired)\s+([\d.,]+)\s+([A-Z]{2,10})/i,
    /(?:sold|sent|paid)\s+([\d.,]+)\s+([A-Z]{2,10})/i,
    /(?:staked|unstaked|swapped)\s+([\d.,]+)\s+([A-Z]{2,10})/i,
  ]

  for (const pattern of logPatterns) {
    const match = trimmed.match(pattern)
    if (match) {
      return {
        intent: 'log_entry',
        text: trimmed,
        amount: parseFloat(match[1].replace(/,/g, '')),
        token: match[2].toUpperCase(),
      }
    }
  }

  // Generic log indicators
  if (/\b(?:log|note|record|track|entry)\b/i.test(trimmed)) {
    return { intent: 'log_entry', text: trimmed }
  }

  return { intent: 'chat', message: trimmed }
}

export async function parseIntent(
  message: string,
  ollamaAvailable: boolean,
): Promise<Intent> {
  if (ollamaAvailable) {
    const result = await parseIntentWithOllama(message)
    if (result) return result
  }
  return parseIntentWithRegex(message)
}

export async function chatWithOllama(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are Meridian, a crypto intelligence assistant. Be concise and helpful. You help users track crypto portfolios, analyze tokens, and understand market data.',
          },
          ...messages,
        ],
        stream: false,
        options: { temperature: 0.7, num_predict: 500 },
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json() as { message: { content: string } }
    return data.message.content
  } catch (e) {
    return `[Ollama unavailable] ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}
