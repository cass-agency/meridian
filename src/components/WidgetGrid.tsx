import { useStore } from '../store'
import PriceChart from './PriceChart'
import TokenCard from './TokenCard'

export default function WidgetGrid() {
  const { watchlist, priceHistory, removeToken } = useStore()

  if (watchlist.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs font-mono italic" style={{ color: '#475569' }}>
          Paste a DexScreener or CoinGecko URL in chat to track a token
        </p>
      </div>
    )
  }

  const [featured, ...rest] = watchlist

  return (
    <div className="p-4 overflow-y-auto h-full">
      {/* Token cards row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {watchlist.slice(0, 4).map((token) => (
          <TokenCard key={token.id} token={token} onRemove={removeToken} />
        ))}
      </div>

      {/* Featured chart */}
      {featured && (
        <div
          className="rounded-lg overflow-hidden border mb-3"
          style={{ borderColor: '#1e2d4a', height: 220 }}
        >
          <PriceChart
            tokenId={featured.id}
            symbol={featured.symbol}
            data={priceHistory[featured.id] ?? []}
            height={220}
          />
        </div>
      )}

      {/* Additional charts 2-up */}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {rest.slice(0, 4).map((token) => {
            const hist = priceHistory[token.id] ?? []
            return (
              <div
                key={token.id}
                className="rounded-lg overflow-hidden border"
                style={{ borderColor: '#1e2d4a', height: 150 }}
              >
                <PriceChart
                  tokenId={token.id}
                  symbol={token.symbol}
                  data={hist}
                  height={150}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
