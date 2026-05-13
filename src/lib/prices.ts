/**
 * Price data fetchers for CoinGecko and DexScreener APIs.
 */

import type { PricePoint, TrackedToken } from '../store'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const DEXSCREENER_BASE = 'https://api.dexscreener.com/latest/dex'

// ─── CoinGecko ───────────────────────────────────────────────────────────────

interface CoinGeckoMarketChart {
  prices: [number, number][]
}

interface CoinGeckoSimplePrice {
  [id: string]: {
    usd: number
    usd_24h_change: number
  }
}

interface CoinGeckoCoinInfo {
  id: string
  symbol: string
  name: string
  market_data?: {
    current_price?: { usd?: number }
    price_change_percentage_24h?: number
  }
}

export async function fetchCoinGeckoPriceHistory(
  coinId: string,
  days = 7,
): Promise<PricePoint[]> {
  try {
    const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!resp.ok) throw new Error(`CoinGecko error ${resp.status}`)
    const data = (await resp.json()) as CoinGeckoMarketChart
    return data.prices.map(([time, value]) => ({
      time: Math.floor(time / 1000),
      value,
    }))
  } catch (e) {
    console.error('[prices] CoinGecko history error:', e)
    return generateMockPriceHistory()
  }
}

export async function fetchCoinGeckoCurrentPrice(
  coinId: string,
): Promise<{ price: number; change24h: number } | null> {
  try {
    const url = `${COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!resp.ok) throw new Error(`CoinGecko error ${resp.status}`)
    const data = (await resp.json()) as CoinGeckoSimplePrice
    const coin = data[coinId]
    if (!coin) return null
    return { price: coin.usd, change24h: coin.usd_24h_change }
  } catch (e) {
    console.error('[prices] CoinGecko price error:', e)
    return null
  }
}

export async function fetchCoinGeckoCoinInfo(
  coinId: string,
): Promise<Partial<TrackedToken> | null> {
  try {
    const url = `${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!resp.ok) throw new Error(`CoinGecko error ${resp.status}`)
    const data = (await resp.json()) as CoinGeckoCoinInfo
    return {
      id: data.id,
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      source: 'coingecko',
      currentPrice: data.market_data?.current_price?.usd,
      priceChange24h: data.market_data?.price_change_percentage_24h,
      lastUpdated: Date.now(),
    }
  } catch (e) {
    console.error('[prices] CoinGecko info error:', e)
    return null
  }
}

// ─── DexScreener ─────────────────────────────────────────────────────────────

interface DexScreenerPair {
  chainId: string
  dexId: string
  baseToken: { address: string; name: string; symbol: string }
  quoteToken: { symbol: string }
  priceUsd?: string
  priceChange?: { h24?: number }
  volume?: { h24?: number }
}

interface DexScreenerResponse {
  pairs?: DexScreenerPair[] | null
}

export async function fetchDexScreenerToken(
  address: string,
): Promise<{ token: Partial<TrackedToken>; pairs: DexScreenerPair[] } | null> {
  try {
    const url = `${DEXSCREENER_BASE}/tokens/${address}`
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!resp.ok) throw new Error(`DexScreener error ${resp.status}`)
    const data = (await resp.json()) as DexScreenerResponse
    const pairs = data.pairs ?? []
    if (pairs.length === 0) return null

    // Use the most liquid pair
    const bestPair = pairs.sort((a, b) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0))[0]
    const price = bestPair.priceUsd ? parseFloat(bestPair.priceUsd) : undefined
    const change24h = bestPair.priceChange?.h24

    return {
      token: {
        id: `dex-${bestPair.chainId}-${address}`,
        symbol: bestPair.baseToken.symbol.toUpperCase(),
        name: bestPair.baseToken.name,
        address,
        chain: bestPair.chainId,
        source: 'dexscreener',
        currentPrice: price,
        priceChange24h: change24h,
        lastUpdated: Date.now(),
      },
      pairs,
    }
  } catch (e) {
    console.error('[prices] DexScreener error:', e)
    return null
  }
}

// Generate simulated OHLC-style price history for a DexScreener token
// (DexScreener free tier doesn't provide historical candles)
export async function generateDexScreenerHistory(
  _address: string,
  currentPrice?: number,
): Promise<PricePoint[]> {
  const base = currentPrice ?? 1
  return generateMockPriceHistory(base)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function generateMockPriceHistory(basePrice = 100): PricePoint[] {
  const points: PricePoint[] = []
  const now = Math.floor(Date.now() / 1000)
  const sevenDays = 7 * 24 * 60 * 60
  const intervalSecs = sevenDays / 168 // ~1 hour intervals

  let price = basePrice
  for (let i = 0; i <= 168; i++) {
    const time = now - sevenDays + Math.floor(i * intervalSecs)
    price = price * (1 + (Math.random() - 0.49) * 0.04)
    points.push({ time, value: parseFloat(price.toFixed(8)) })
  }
  return points
}

// ─── Combined fetcher ─────────────────────────────────────────────────────────

export async function fetchTokenData(
  token: Pick<TrackedToken, 'id' | 'source' | 'address'>,
): Promise<{ price: number | undefined; change24h: number | undefined; history: PricePoint[] }> {
  if (token.source === 'coingecko') {
    const [priceData, history] = await Promise.all([
      fetchCoinGeckoCurrentPrice(token.id),
      fetchCoinGeckoPriceHistory(token.id),
    ])
    return {
      price: priceData?.price,
      change24h: priceData?.change24h,
      history: history.length > 0 ? history : generateMockPriceHistory(priceData?.price ?? 100),
    }
  } else {
    // DexScreener
    const address = token.address ?? token.id.split('-').slice(2).join('-')
    const result = await fetchDexScreenerToken(address)
    const history = await generateDexScreenerHistory(address, result?.token.currentPrice)
    return {
      price: result?.token.currentPrice,
      change24h: result?.token.priceChange24h,
      history,
    }
  }
}
