/**
 * trackToken(url) — entry point for adding a token to the watchlist.
 * Detects source from URL, fetches metadata + price data, saves to store + db.
 */

import { detectTokenFromUrl } from './tokenDetector'
import {
  fetchCoinGeckoCoinInfo,
  fetchCoinGeckoPriceHistory,
  fetchCoinGeckoCurrentPrice,
} from './prices'
import { fetchDexScreenerToken, generateDexScreenerHistory } from './prices'
import { useStore } from '../store'
import type { TrackedToken, PricePoint } from '../store'

export interface TrackTokenResult {
  token: TrackedToken
  history: PricePoint[]
}

export async function trackToken(url: string): Promise<TrackTokenResult | null> {
  const detected = detectTokenFromUrl(url.trim())
  if (!detected) return null

  const store = useStore.getState()

  if (detected.type === 'coingecko') {
    const info = await fetchCoinGeckoCoinInfo(detected.id)
    if (!info || !info.symbol) return null

    const [priceData, history] = await Promise.all([
      fetchCoinGeckoCurrentPrice(detected.id),
      fetchCoinGeckoPriceHistory(detected.id, 7),
    ])

    const token: TrackedToken = {
      id: detected.id,
      symbol: info.symbol ?? detected.id.toUpperCase(),
      name: info.name ?? detected.id,
      source: 'coingecko',
      currentPrice: priceData?.price ?? info.currentPrice,
      priceChange24h: priceData?.change24h ?? info.priceChange24h,
      lastUpdated: Date.now(),
    }

    store.addToken(token)
    store.updateTokenPrice(token.id, token.currentPrice ?? 0, token.priceChange24h ?? 0)
    store.setPriceHistory(token.id, history)

    return { token, history }
  } else {
    // dexscreener
    const result = await fetchDexScreenerToken(detected.address)
    if (!result) return null

    const history = await generateDexScreenerHistory(
      detected.address,
      result.token.currentPrice,
    )

    const token: TrackedToken = {
      id: detected.id,
      symbol: result.token.symbol ?? detected.address.slice(0, 6).toUpperCase(),
      name: result.token.name ?? detected.address,
      address: detected.address,
      chain: detected.chain,
      source: 'dexscreener',
      currentPrice: result.token.currentPrice,
      priceChange24h: result.token.priceChange24h,
      lastUpdated: Date.now(),
    }

    store.addToken(token)
    store.updateTokenPrice(token.id, token.currentPrice ?? 0, token.priceChange24h ?? 0)
    store.setPriceHistory(token.id, history)

    return { token, history }
  }
}
