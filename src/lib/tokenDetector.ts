/**
 * URL parser for DexScreener and CoinGecko token URLs.
 */

export type TokenDetectionResult =
  | { type: 'dexscreener'; id: string; chain: string; address: string }
  | { type: 'coingecko'; id: string }

const DEXSCREENER_RE = /https?:\/\/dexscreener\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9]+)/i
const COINGECKO_RE = /https?:\/\/(?:www\.)?coingecko\.com\/en\/coins\/([a-zA-Z0-9-]+)/i

export function detectTokenFromUrl(url: string): TokenDetectionResult | null {
  // DexScreener: https://dexscreener.com/{chain}/{address}
  const dexMatch = url.match(DEXSCREENER_RE)
  if (dexMatch) {
    const chain = dexMatch[1].toLowerCase()
    const address = dexMatch[2]
    return {
      type: 'dexscreener',
      id: `dex-${chain}-${address}`,
      chain,
      address,
    }
  }

  // CoinGecko: https://www.coingecko.com/en/coins/{id}
  const geckoMatch = url.match(COINGECKO_RE)
  if (geckoMatch) {
    return {
      type: 'coingecko',
      id: geckoMatch[1].toLowerCase(),
    }
  }

  return null
}

export function isTokenUrl(text: string): boolean {
  return DEXSCREENER_RE.test(text) || COINGECKO_RE.test(text)
}
