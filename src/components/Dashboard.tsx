import { useMemo } from 'react'
import { useStore } from '../store'
import PriceChart from './PriceChart'
import TokenCard from './TokenCard'

export default function Dashboard() {
  const { dashboards, activeDashboardId, watchlist, priceHistory, removeToken } = useStore()

  const activeDashboard = useMemo(
    () => dashboards.find((d) => d.id === activeDashboardId),
    [dashboards, activeDashboardId],
  )

  const featuredToken = watchlist[0]
  const featuredHistory = featuredToken ? (priceHistory[featuredToken.id] ?? []) : []

  if (!activeDashboard && watchlist.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div
            className="text-6xl font-mono mb-4 font-bold"
            style={{ color: '#1e2d4a' }}
          >
            MERIDIAN
          </div>
          <p className="text-sm font-mono" style={{ color: '#475569' }}>
            Paste a token URL or type &quot;create a dashboard&quot; to begin
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Widget Grid */}
      <div
        className="overflow-y-auto p-4 border-b"
        style={{ flex: '0 0 auto', maxHeight: '55%', borderColor: '#1e2d4a' }}
      >
        {activeDashboard && (
          <div className="mb-3">
            <h2
              className="text-base font-mono font-semibold tracking-wide"
              style={{ color: '#00FFFF' }}
            >
              {activeDashboard.name}
            </h2>
            <p className="text-xs font-mono mt-0.5" style={{ color: '#475569' }}>
              {activeDashboard.entries.length} entries ·{' '}
              {new Date(activeDashboard.createdAt).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Token Cards Grid */}
        {watchlist.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {watchlist.slice(0, 4).map((token) => (
              <TokenCard key={token.id} token={token} onRemove={removeToken} />
            ))}
          </div>
        )}

        {/* Featured Price Chart */}
        {featuredToken && (
          <div
            className="rounded-lg overflow-hidden border"
            style={{ borderColor: '#1e2d4a' }}
          >
            <PriceChart
              tokenId={featuredToken.id}
              symbol={featuredToken.symbol}
              data={featuredHistory}
              height={200}
            />
          </div>
        )}

        {/* Additional charts for other tokens */}
        {watchlist.length > 1 && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {watchlist.slice(1, 3).map((token) => {
              const hist = priceHistory[token.id] ?? []
              if (hist.length === 0) return null
              return (
                <div
                  key={token.id}
                  className="rounded-lg overflow-hidden border"
                  style={{ borderColor: '#1e2d4a' }}
                >
                  <PriceChart
                    tokenId={token.id}
                    symbol={token.symbol}
                    data={hist}
                    height={140}
                  />
                </div>
              )
            })}
          </div>
        )}

        {!activeDashboard && watchlist.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs font-mono" style={{ color: '#475569' }}>
              No widgets yet
            </p>
          </div>
        )}
      </div>

      {/* Entry Feed */}
      {activeDashboard && (
        <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
          <div
            className="text-xs font-mono uppercase tracking-widest mb-3"
            style={{ color: '#475569' }}
          >
            Entry Feed
          </div>

          {activeDashboard.entries.length === 0 ? (
            <p className="text-xs font-mono italic" style={{ color: '#1e3a5f' }}>
              No entries yet. Log activity via chat below.
            </p>
          ) : (
            <div className="space-y-2">
              {[...activeDashboard.entries]
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 px-3 py-2.5 rounded"
                    style={{ background: '#111827', border: '1px solid #1e2d4a' }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{
                        background:
                          entry.type === 'system'
                            ? '#475569'
                            : entry.type === 'price_alert'
                              ? '#f59e0b'
                              : '#00FFFF',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-slate-300 break-words">{entry.text}</p>
                      {(entry.amount !== undefined || entry.token) && (
                        <p className="text-xs font-mono mt-1" style={{ color: '#00FFFF' }}>
                          {entry.amount !== undefined && (
                            <span>{entry.amount} </span>
                          )}
                          {entry.token && <span>{entry.token}</span>}
                        </p>
                      )}
                      <p className="text-xs font-mono mt-1" style={{ color: '#1e3a5f' }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
