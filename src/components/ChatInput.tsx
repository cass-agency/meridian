import { useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../store'
import { parseIntent } from '../lib/ollama'
import { chatWithOllama } from '../lib/ollama'
import { detectTokenFromUrl } from '../lib/tokenDetector'
import {
  fetchCoinGeckoCoinInfo,
  fetchDexScreenerToken,
  fetchTokenData,
} from '../lib/prices'

interface StatusMessage {
  text: string
  type: 'info' | 'success' | 'error' | 'loading'
}

export default function ChatInput() {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    isOllamaAvailable,
    createDashboard,
    addEntry,
    addToken,
    updateTokenPrice,
    setPriceHistory,
    addChatMessage,
    activeDashboardId,
    dashboards,
    chatMessages,
  } = useStore()

  const showStatus = useCallback((text: string, type: StatusMessage['type'], duration = 4000) => {
    setStatus({ text, type })
    if (duration > 0) {
      setTimeout(() => setStatus(null), duration)
    }
  }, [])

  const handleTrackToken = useCallback(
    async (url: string) => {
      showStatus('Detecting token...', 'loading', 0)
      const detected = detectTokenFromUrl(url)
      if (!detected) {
        showStatus('Could not detect token from URL', 'error')
        return
      }

      try {
        let tokenBase: Parameters<typeof addToken>[0] | null = null

        if (detected.type === 'coingecko') {
          const info = await fetchCoinGeckoCoinInfo(detected.id)
          if (!info || !info.symbol || !info.name) {
            showStatus('Could not fetch token info from CoinGecko', 'error')
            return
          }
          tokenBase = {
            id: detected.id,
            symbol: info.symbol,
            name: info.name,
            source: 'coingecko',
          }
        } else {
          const result = await fetchDexScreenerToken(detected.address)
          if (!result || !result.token.symbol || !result.token.name) {
            showStatus('Could not fetch token info from DexScreener', 'error')
            return
          }
          tokenBase = {
            id: detected.id,
            symbol: result.token.symbol,
            name: result.token.name,
            address: detected.address,
            chain: detected.chain,
            source: 'dexscreener',
          }
        }

        addToken(tokenBase)
        showStatus(`Fetching price data for ${tokenBase.symbol}...`, 'loading', 0)

        const data = await fetchTokenData({
          id: tokenBase.id,
          source: tokenBase.source,
          address: tokenBase.source === 'dexscreener' ? (tokenBase as { address?: string }).address : undefined,
        })

        if (data.price !== undefined && data.price !== null) {
          updateTokenPrice(tokenBase.id, data.price, data.change24h ?? 0)
        }
        if (data.history.length > 0) {
          setPriceHistory(tokenBase.id, data.history)
        }

        showStatus(`Tracking ${tokenBase.symbol} — $${data.price?.toFixed(4) ?? '?'}`, 'success')
        addChatMessage(
          'assistant',
          `Now tracking **${tokenBase.symbol}** (${tokenBase.name}). Current price: $${data.price?.toFixed(6) ?? 'unknown'}`,
        )
      } catch (e) {
        showStatus(`Error fetching token: ${e instanceof Error ? e.message : 'unknown'}`, 'error')
      }
    },
    [addToken, updateTokenPrice, setPriceHistory, addChatMessage, showStatus],
  )

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      const message = input.trim()
      if (!message || isProcessing) return

      setInput('')
      setIsProcessing(true)
      addChatMessage('user', message)

      try {
        const intent = await parseIntent(message, isOllamaAvailable)

        switch (intent.intent) {
          case 'track_token': {
            await handleTrackToken(intent.url)
            break
          }

          case 'create_dashboard': {
            const name = intent.name.trim() || 'Untitled'
            const dashboard = createDashboard(name)
            showStatus(`Dashboard "${name}" created`, 'success')
            addChatMessage('assistant', `Created dashboard **${dashboard.name}**`)
            break
          }

          case 'log_entry': {
            const targetId =
              intent.dashboardHint
                ? dashboards.find((d) =>
                    d.name.toLowerCase().includes((intent.dashboardHint ?? '').toLowerCase()),
                  )?.id ?? activeDashboardId
                : activeDashboardId

            if (!targetId) {
              showStatus('No active dashboard. Create one first.', 'error')
              addChatMessage('assistant', 'Please create a dashboard first (type "create a [name] dashboard")')
              break
            }

            addEntry(targetId, {
              text: intent.text,
              amount: intent.amount,
              token: intent.token,
              timestamp: Date.now(),
              type: 'log',
            })

            const dashName = dashboards.find((d) => d.id === targetId)?.name ?? 'dashboard'
            const summary = intent.amount && intent.token
              ? `Logged: ${intent.amount} ${intent.token} → ${dashName}`
              : `Logged entry → ${dashName}`
            showStatus(summary, 'success')
            addChatMessage('assistant', summary)
            break
          }

          case 'chat': {
            if (isOllamaAvailable) {
              showStatus('Thinking...', 'loading', 0)
              const recentMsgs = chatMessages.slice(-10).map((m) => ({
                role: m.role,
                content: m.content,
              }))
              const reply = await chatWithOllama([
                ...recentMsgs,
                { role: 'user', content: message },
              ])
              addChatMessage('assistant', reply)
              setStatus(null)
            } else {
              addChatMessage(
                'assistant',
                'Ollama is not available. Connect Ollama (localhost:11434) for AI chat. I can still detect tokens, create dashboards, and log entries.',
              )
            }
            break
          }

          default: {
            addChatMessage('assistant', 'I didn\'t understand that. Try pasting a token URL, "create a [name] dashboard", or logging an entry like "I received 2 SOL".')
          }
        }
      } catch (e) {
        showStatus(`Error: ${e instanceof Error ? e.message : 'unknown'}`, 'error')
      } finally {
        setIsProcessing(false)
        inputRef.current?.focus()
      }
    },
    [
      input,
      isProcessing,
      isOllamaAvailable,
      activeDashboardId,
      dashboards,
      chatMessages,
      addChatMessage,
      createDashboard,
      addEntry,
      handleTrackToken,
      showStatus,
    ],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSubmit()
      }
    },
    [handleSubmit],
  )

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const statusColors: Record<StatusMessage['type'], string> = {
    info: '#94a3b8',
    success: '#4ade80',
    error: '#f87171',
    loading: '#00FFFF',
  }

  return (
    <div
      className="border-t shrink-0"
      style={{ borderColor: '#1e2d4a', background: '#0d1526' }}
    >
      {/* Chat messages (last few) */}
      {chatMessages.length > 0 && (
        <div
          className="px-4 pt-3 pb-2 max-h-40 overflow-y-auto"
          style={{ borderBottom: '1px solid #1e2d4a' }}
        >
          {chatMessages.slice(-6).map((msg, i) => (
            <div
              key={i}
              className={`text-xs font-mono mb-1.5 flex gap-2 ${
                msg.role === 'user' ? 'text-slate-300' : 'text-cyan-300'
              }`}
            >
              <span
                className="shrink-0 font-semibold"
                style={{ color: msg.role === 'user' ? '#475569' : '#00FFFF' }}
              >
                {msg.role === 'user' ? '>' : 'M'}
              </span>
              <span className="break-words min-w-0">{msg.content}</span>
            </div>
          ))}
        </div>
      )}

      {/* Status bar */}
      {status && (
        <div
          className="px-4 py-1.5 text-xs font-mono flex items-center gap-2"
          style={{ background: '#0a0f1e', color: statusColors[status.type] }}
        >
          {status.type === 'loading' && (
            <span className="animate-pulse">⊙</span>
          )}
          {status.text}
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3">
        <span className="text-xs font-mono shrink-0" style={{ color: '#00FFFF' }}>
          {isOllamaAvailable ? '⬡' : '○'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isOllamaAvailable
              ? 'Ask Meridian anything...'
              : 'Paste token URL, "create a dashboard", or log an entry...'
          }
          disabled={isProcessing}
          className="flex-1 bg-transparent text-sm font-mono outline-none placeholder-opacity-30"
          style={{
            color: '#e2e8f0',
            caretColor: '#00FFFF',
          }}
        />
        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          className="text-xs font-mono px-3 py-1.5 rounded transition-all"
          style={{
            background: isProcessing || !input.trim() ? '#0d1526' : 'rgba(0,255,255,0.1)',
            color: isProcessing || !input.trim() ? '#1e3a5f' : '#00FFFF',
            border: `1px solid ${isProcessing || !input.trim() ? '#1e2d4a' : '#00FFFF'}`,
          }}
        >
          {isProcessing ? '...' : 'Send'}
        </button>
      </form>

      <div className="px-4 pb-2">
        <p className="text-xs font-mono" style={{ color: '#1e3a5f' }}>
          Hints: paste dexscreener.com or coingecko.com URL · "create a [name] dashboard" · "I received 2 SOL"
        </p>
      </div>
    </div>
  )
}
