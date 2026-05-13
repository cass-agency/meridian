import { useMemo } from 'react'
import { useStore } from '../store'
import type { Entry } from '../store'

function EntryRow({ entry }: { entry: Entry }) {
  const dotColor =
    entry.type === 'system'
      ? '#475569'
      : entry.type === 'price_alert'
        ? '#f59e0b'
        : '#00FFFF'

  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 rounded"
      style={{ background: '#111827', border: '1px solid #1e2d4a' }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full mt-[7px] shrink-0"
        style={{ background: dotColor }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-slate-300 break-words leading-relaxed">
          {entry.text}
        </p>
        {(entry.amount !== undefined || entry.token) && (
          <p className="text-xs font-mono mt-1 font-semibold" style={{ color: '#00FFFF' }}>
            {entry.amount !== undefined && <span>{entry.amount} </span>}
            {entry.token && <span>{entry.token}</span>}
          </p>
        )}
        <p className="text-xs font-mono mt-1" style={{ color: '#1e3a5f' }}>
          {new Date(entry.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  )
}

export default function EntryFeed() {
  const { dashboards, activeDashboardId } = useStore()

  const activeDashboard = useMemo(
    () => dashboards.find((d) => d.id === activeDashboardId),
    [dashboards, activeDashboardId],
  )

  if (!activeDashboard) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs font-mono italic" style={{ color: '#475569' }}>
          Select or create a dashboard to see entries
        </p>
      </div>
    )
  }

  const entries = [...activeDashboard.entries].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="px-4 py-2 text-xs font-mono uppercase tracking-widest border-b shrink-0"
        style={{ color: '#475569', borderColor: '#1e2d4a' }}
      >
        {activeDashboard.name} — {entries.length} entries
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <p className="text-xs font-mono italic text-center mt-4" style={{ color: '#1e3a5f' }}>
            No entries yet. Log activity via chat below.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
