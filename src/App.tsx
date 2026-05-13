import { useEffect, useCallback } from 'react'
import { useStore } from './store'
import { checkOllamaAvailable } from './lib/ollama'
import { fetchTokenData } from './lib/prices'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ChatInput from './components/ChatInput'

export default function App() {
  const { setOllamaAvailable, watchlist, updateTokenPrice, setPriceHistory } = useStore()

  // Check Ollama availability on mount and periodically
  useEffect(() => {
    const check = async () => {
      const available = await checkOllamaAvailable()
      setOllamaAvailable(available)
    }

    void check()
    const interval = setInterval(() => void check(), 30000)
    return () => clearInterval(interval)
  }, [setOllamaAvailable])

  // Refresh token prices on mount and periodically
  const refreshPrices = useCallback(async () => {
    for (const token of watchlist) {
      try {
        const data = await fetchTokenData({
          id: token.id,
          source: token.source,
          address: token.address,
        })
        if (data.price !== undefined) {
          updateTokenPrice(token.id, data.price, data.change24h ?? 0)
        }
        if (data.history.length > 0) {
          setPriceHistory(token.id, data.history)
        }
      } catch (e) {
        console.error('[App] price refresh error for', token.id, e)
      }
    }
  }, [watchlist, updateTokenPrice, setPriceHistory])

  useEffect(() => {
    if (watchlist.length > 0) {
      void refreshPrices()
    }
    // Refresh every 60 seconds
    const interval = setInterval(() => {
      if (watchlist.length > 0) void refreshPrices()
    }, 60000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.length])

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#0a0f1e' }}
    >
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Dashboard />
        <ChatInput />
      </main>
    </div>
  )
}
