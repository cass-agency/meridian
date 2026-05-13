/**
 * Intent classification for Meridian.
 * Wraps Ollama + regex fallback from ollama.ts.
 *
 * Intent types (matching design-meridian.md):
 * - URL_TRACK   → user pasted a DexScreener or CoinGecko URL
 * - CREATE_DASHBOARD → user wants to create a named dashboard
 * - LOG_ENTRY   → user is logging a financial event
 * - GENERAL     → anything else (route to Ollama chat)
 */

export type { Intent } from './ollama'
export { parseIntent, parseIntentWithOllama, parseIntentWithRegex } from './ollama'

/**
 * Normalizes Ollama response to canonical Intent shape.
 * The design doc uses URL_TRACK/CREATE_DASHBOARD/LOG_ENTRY/GENERAL labels —
 * our Intent type uses snake_case. Both forms are handled here.
 */
export function normalizeIntent(raw: unknown): import('./ollama').Intent | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  // Support design-doc label format
  const intentLabel = (obj.intent as string | undefined)?.toUpperCase()
  const params = (obj.params ?? {}) as Record<string, unknown>

  switch (intentLabel) {
    case 'URL_TRACK':
      return { intent: 'track_token', url: String(params.url ?? '') }
    case 'CREATE_DASHBOARD':
      return { intent: 'create_dashboard', name: String(params.name ?? 'Untitled') }
    case 'LOG_ENTRY':
      return {
        intent: 'log_entry',
        text: String(params.content ?? ''),
        amount: params.amount != null ? Number(params.amount) : undefined,
        token: params.asset != null ? String(params.asset) : undefined,
      }
    case 'GENERAL':
      return { intent: 'chat', message: String(params.message ?? obj.message ?? '') }
    default:
      // Already in snake_case form — pass through
      return obj as import('./ollama').Intent
  }
}
