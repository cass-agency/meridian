import { useEffect, useRef, memo } from 'react'
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  ColorType,
} from 'lightweight-charts'
import type { PricePoint } from '../store'

interface PriceChartProps {
  tokenId: string
  symbol: string
  data: PricePoint[]
  height?: number
}

const PriceChart = memo(function PriceChart({ symbol, data, height = 200 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#111827' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e2d4a' },
        horzLines: { color: '#1e2d4a' },
      },
      crosshair: {
        vertLine: { color: '#00FFFF', width: 1, style: 3 },
        horzLine: { color: '#00FFFF', width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: '#1e2d4a',
        textColor: '#94a3b8',
      },
      timeScale: {
        borderColor: '#1e2d4a',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height,
    })

    const areaOptions = {
      lineColor: '#00FFFF',
      topColor: 'rgba(0, 255, 255, 0.3)',
      bottomColor: 'rgba(0, 255, 255, 0.0)',
      lineWidth: 2 as 2,
      priceFormat: {
        type: 'price' as const,
        precision: 6,
        minMove: 0.000001,
      },
    }

    const series = chart.addSeries(AreaSeries, areaOptions)
    chartRef.current = chart
    seriesRef.current = series

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        chart.resize(width, height)
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [height])

  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return
    try {
      // Sort by time and deduplicate
      const sorted = [...data]
        .sort((a, b) => a.time - b.time)
        .filter((p, i, arr) => i === 0 || p.time !== arr[i - 1].time)
      seriesRef.current.setData(sorted.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })))
      chartRef.current?.timeScale().fitContent()
    } catch (e) {
      console.error('[PriceChart] setData error:', e)
    }
  }, [data])

  return (
    <div className="relative w-full">
      <div className="absolute top-2 left-3 z-10 text-xs font-mono text-cyan-400 opacity-70">
        {symbol} / USD — 7D
      </div>
      <div ref={containerRef} style={{ height }} />
    </div>
  )
})

export default PriceChart
