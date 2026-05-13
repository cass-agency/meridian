import { useStore } from '../store'
import TokenCard from './TokenCard'

export default function Sidebar() {
  const {
    dashboards,
    activeDashboardId,
    watchlist,
    setActiveDashboard,
    deleteDashboard,
    removeToken,
  } = useStore()

  return (
    <aside
      className="flex flex-col h-full overflow-hidden select-none"
      style={{
        width: 240,
        minWidth: 240,
        background: '#0d1526',
        borderRight: '1px solid #1e2d4a',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-4 py-4 border-b shrink-0"
        style={{ borderColor: '#1e2d4a' }}
      >
        <div
          className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold"
          style={{ background: 'rgba(0,255,255,0.1)', color: '#00FFFF', border: '1px solid #00FFFF' }}
        >
          M
        </div>
        <span
          className="text-sm font-mono font-bold tracking-widest"
          style={{ color: '#00FFFF' }}
        >
          MERIDIAN
        </span>
      </div>

      {/* Dashboards */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="px-3 pt-4 pb-1 text-xs font-mono uppercase tracking-widest"
          style={{ color: '#475569' }}
        >
          Dashboards
        </div>

        {dashboards.length === 0 ? (
          <div className="px-3 py-2">
            <p className="text-xs font-mono italic" style={{ color: '#475569' }}>
              Type &quot;create a [name] dashboard&quot; to get started
            </p>
          </div>
        ) : (
          dashboards.map((dash) => (
            <div
              key={dash.id}
              className="flex items-center justify-between px-3 py-2 mx-1 rounded cursor-pointer group transition-all"
              style={{
                background: activeDashboardId === dash.id ? 'rgba(0,255,255,0.08)' : 'transparent',
                borderLeft: activeDashboardId === dash.id ? '2px solid #00FFFF' : '2px solid transparent',
              }}
              onClick={() => setActiveDashboard(dash.id)}
            >
              <span
                className="text-sm font-mono truncate flex-1"
                style={{ color: activeDashboardId === dash.id ? '#00FFFF' : '#94a3b8' }}
              >
                {dash.name}
              </span>
              <span className="text-xs font-mono mr-1" style={{ color: '#475569' }}>
                {dash.entries.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteDashboard(dash.id)
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 w-4 h-4 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))
        )}

        {/* Watchlist */}
        <div
          className="px-3 pt-5 pb-1 text-xs font-mono uppercase tracking-widest"
          style={{ color: '#475569' }}
        >
          Watchlist
        </div>

        {watchlist.length === 0 ? (
          <div className="px-3 py-2">
            <p className="text-xs font-mono italic" style={{ color: '#475569' }}>
              Paste a DexScreener or CoinGecko URL
            </p>
          </div>
        ) : (
          watchlist.map((token) => (
            <TokenCard
              key={token.id}
              token={token}
              onRemove={removeToken}
              compact
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-3 border-t shrink-0"
        style={{ borderColor: '#1e2d4a' }}
      >
        <div className="text-xs font-mono" style={{ color: '#1e3a5f' }}>
          v0.1.0 — web mode
        </div>
      </div>
    </aside>
  )
}
