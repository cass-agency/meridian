import { useCallback } from 'react'
import type { TrackedToken } from '../store'

interface TokenCardProps {
  token: TrackedToken
  onRemove?: (id: string) => void
  compact?: boolean
}

function formatPrice(price?: number): string {
  if (price === undefined || price === null) return '—'
  if (price < 0.000001) return price.toExponential(4)
  if (price < 0.01) return price.toFixed(8)
  if (price < 1) return price.toFixed(6)
  if (price < 1000) return price.toFixed(4)
  return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function formatChange(change?: number): { text: string; positive: boolean } {
  if (change === undefined || change === null) return { text: '—', positive: true }
  const text = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
  return { text, positive: change >= 0 }
}

export default function TokenCard({ token, onRemove, compact = false }: TokenCardProps) {
  const priceStr = formatPrice(token.currentPrice)
  const change = formatChange(token.priceChange24h)

  const handleRemove = useCallback(() => {
    onRemove?.(token.id)
  }, [onRemove, token.id])

  if (compact) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded hover:bg-[#1e2d4a] transition-colors group cursor-pointer">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
          <span className="text-xs font-mono text-slate-200 truncate">{token.symbol}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-slate-400">${priceStr}</span>
          <span
            className={`text-xs font-mono ${change.positive ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {change.text}
          </span>
          {onRemove && (
            <button
              onClick={handleRemove}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all text-xs ml-1"
              title="Remove token"
            >
              ×
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative rounded-lg p-4 border transition-all"
      style={{
        background: '#111827',
        borderColor: '#1e2d4a',
      }}
    >
      {onRemove && (
        <button
          onClick={handleRemove}
          className="absolute top-2 right-2 text-slate-600 hover:text-red-400 transition-colors text-sm w-5 h-5 flex items-center justify-center"
          title="Remove token"
        >
          ×
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-sm font-mono text-white font-semibold truncate">
              {token.symbol}
            </span>
            <span className="text-xs font-mono text-slate-500 truncate">{token.name}</span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-lg font-mono text-white">${priceStr}</span>
            <span
              className={`text-sm font-mono ${change.positive ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {change.text}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span
              className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{
                background: token.source === 'coingecko' ? '#0d2b1a' : '#0d1b2b',
                color: token.source === 'coingecko' ? '#4ade80' : '#60a5fa',
                border: `1px solid ${token.source === 'coingecko' ? '#166534' : '#1e3a5f'}`,
              }}
            >
              {token.source === 'coingecko' ? 'CG' : 'DEX'}
            </span>
            {token.chain && (
              <span className="text-xs font-mono text-slate-500">{token.chain}</span>
            )}
            {token.lastUpdated && (
              <span className="text-xs font-mono text-slate-600">
                {new Date(token.lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
