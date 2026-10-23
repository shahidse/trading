'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useTheme } from '@/components/ThemeToggle'
import type { Theme } from '@/lib/theme'
import type { ChartPayload, LinePoint } from '@/lib/types'
import { readJson } from '@/lib/utils'

/** Theme-specific colours for the canvas chart (lightweight-charts can't read CSS vars). */
type Palette = {
  up: string
  down: string
  upFill: string
  downFill: string
  grid: string
  border: string
  text: string
}

const PALETTES: Record<Theme, Palette> = {
  dark: {
    up: '#22c55e',
    down: '#ef4444',
    upFill: 'rgba(34,197,94,0.35)',
    downFill: 'rgba(239,68,68,0.35)',
    grid: 'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.15)',
    text: '#94a3b8',
  },
  light: {
    up: '#16a34a',
    down: '#dc2626',
    upFill: 'rgba(22,163,74,0.30)',
    downFill: 'rgba(220,38,38,0.30)',
    grid: 'rgba(15,23,42,0.06)',
    border: 'rgba(15,23,42,0.12)',
    text: '#64748b',
  },
}

const MAIN_HEIGHT = 440
const RSI_HEIGHT = 130
const MACD_HEIGHT = 140

type ToggleKey =
  | 'bollinger'
  | 'ema'
  | 'vwap'
  | 'supertrend'
  | 'ichimoku'
  | 'volume'
  | 'rsi'
  | 'macd'
  | 'plan'

type Toggles = Record<ToggleKey, boolean>

const DEFAULT_TOGGLES: Toggles = {
  bollinger: true,
  ema: true,
  vwap: true,
  supertrend: true,
  ichimoku: true,
  volume: true,
  rsi: true,
  macd: true,
  plan: true,
}

const TOGGLE_LABELS: { key: ToggleKey; label: string }[] = [
  { key: 'supertrend', label: 'SuperTrend' },
  { key: 'bollinger', label: 'Bollinger' },
  { key: 'ema', label: 'EMA 20/50/200' },
  { key: 'vwap', label: 'VWAP' },
  { key: 'ichimoku', label: 'Ichimoku' },
  { key: 'volume', label: 'Volume' },
  { key: 'rsi', label: 'RSI' },
  { key: 'macd', label: 'MACD' },
  { key: 'plan', label: 'Trade plan' },
]

const toSec = (ms: number): UTCTimestamp => Math.floor(ms / 1000) as UTCTimestamp

const toLine = (points: LinePoint[]): LineData[] =>
  points.map((p) => ({ time: toSec(p.time), value: p.value }))

/** Shared chart look-and-feel, TradingView-dark flavoured. */
function baseOptions(container: HTMLElement, height: number, palette: Palette) {
  return {
    width: container.clientWidth || 600,
    height,
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' as const },
      textColor: palette.text,
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: palette.grid },
      horzLines: { color: palette.grid },
    },
    rightPriceScale: { borderColor: palette.border },
    leftPriceScale: { visible: false },
    timeScale: { borderColor: palette.border, timeVisible: true, secondsVisible: false, rightOffset: 4 },
    crosshair: { mode: CrosshairMode.Normal },
  }
}

export const TIMEFRAME_OPTIONS = [
  { tf: '1m', label: '1m', desc: '1m High-Freq Scalp (15m Anchor)' },
  { tf: '15m', label: '15m', desc: '15m Intraday Momentum (1h Anchor)' },
  { tf: '1h', label: '1h', desc: '1h Swing Fast (4h Anchor)' },
  { tf: '4h', label: '4h', desc: '4h Swing Macro (1d Anchor)' },
] as const

export function CandleChart({
  limit = 500,
  symbol,
  timeframe = '15m',
  onTimeframeChange,
}: {
  limit?: number
  symbol?: string
  timeframe?: string
  onTimeframeChange?: (tf: string) => void
}) {
  const [payload, setPayload] = useState<ChartPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggles, setToggles] = useState<Toggles>(DEFAULT_TOGGLES)
  const { theme } = useTheme()

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const mainContainerRef = useRef<HTMLDivElement | null>(null)
  const rsiContainerRef = useRef<HTMLDivElement | null>(null)
  const macdContainerRef = useRef<HTMLDivElement | null>(null)

  const mainRef = useRef<IChartApi | null>(null)
  const rsiChartRef = useRef<IChartApi | null>(null)
  const macdChartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const overlaysRef = useRef<Record<string, ISeriesApi<'Line'>>>({})
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])

  const toggle = useCallback((key: ToggleKey) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // ---- fetch chart data -------------------------------------------------
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const symQuery = symbol ? `&symbol=${encodeURIComponent(symbol)}` : ''
    const tfQuery = timeframe ? `&timeframe=${encodeURIComponent(timeframe)}` : ''
    fetch(`/api/chart?limit=${limit}${symQuery}${tfQuery}`)
      .then((response) => readJson<ChartPayload>(response))
      .then((json) => {
        if (!cancelled) {
          setPayload(json)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load chart')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [limit, symbol, timeframe])

  // ---- build the charts once data arrives -------------------------------
  useEffect(() => {
    if (!payload) return

    const mainEl = mainContainerRef.current
    const rsiEl = rsiContainerRef.current
    const macdEl = macdContainerRef.current
    if (!mainEl || !rsiEl || !macdEl) return

    const { series } = payload
    const overlays: Record<string, ISeriesApi<'Line'>> = {}

    // -- main chart: candles + price overlays -----------------------------
    const palette = PALETTES[theme]
    const initialWidth = mainEl.clientWidth || 600
    const initialHeight = initialWidth < 640 ? 320 : MAIN_HEIGHT
    const main = createChart(mainEl, baseOptions(mainEl, initialHeight, palette))
    mainRef.current = main

    const candle = main.addCandlestickSeries({
      upColor: palette.up,
      downColor: palette.down,
      borderVisible: false,
      wickUpColor: palette.up,
      wickDownColor: palette.down,
    })
    candle.setData(
      series.candles.map((c) => ({
        time: toSec(c.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    )
    candleRef.current = candle

    // Volume in the bottom band, on its own overlay scale.
    main.priceScale('right').applyOptions({ scaleMargins: { top: 0.04, bottom: 0.24 } })
    const volume = main.addHistogramSeries({
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      priceLineVisible: false,
      lastValueVisible: false,
    })
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
    volume.setData(
      series.candles.map((c) => ({
        time: toSec(c.time),
        value: c.volume,
        color: c.close >= c.open ? palette.upFill : palette.downFill,
      })),
    )
    volumeRef.current = volume

    const line = (color: string, width: 1 | 2 = 1, style = LineStyle.Solid) =>
      main.addLineSeries({
        color,
        lineWidth: width,
        lineStyle: style,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })

    // Bollinger Bands
    overlays.bollingerUpper = line('#3b82f6')
    overlays.bollingerUpper.setData(toLine(series.bollinger.upper))
    overlays.bollingerLower = line('#3b82f6')
    overlays.bollingerLower.setData(toLine(series.bollinger.lower))
    overlays.bollingerMiddle = line('#f59e0b', 1, LineStyle.Dotted)
    overlays.bollingerMiddle.setData(toLine(series.bollinger.middle))

    // EMA trend
    overlays.emaFast = line('#f59e0b', 2)
    overlays.emaFast.setData(toLine(series.ema.fast))
    overlays.emaMid = line('#8b5cf6', 2)
    overlays.emaMid.setData(toLine(series.ema.mid))
    overlays.emaSlow = line('#06b6d4', 2)
    overlays.emaSlow.setData(toLine(series.ema.slow))

    // VWAP
    overlays.vwap = line('#ec4899', 2)
    overlays.vwap.setData(toLine(series.vwap))

    // SuperTrend (Scalping trailing stop / support-resistance)
    overlays.supertrend = line('#10b981', 2)
    overlays.supertrend.setData(toLine(series.supertrend ?? []))

    // Ichimoku (cloud drawn as the two leading-span lines)
    overlays.ichimokuConversion = line('#22d3ee')
    overlays.ichimokuConversion.setData(toLine(series.ichimoku.conversion))
    overlays.ichimokuBase = line('#f472b6')
    overlays.ichimokuBase.setData(toLine(series.ichimoku.base))
    overlays.ichimokuSpanA = line('rgba(74,222,128,0.9)', 1, LineStyle.Dashed)
    overlays.ichimokuSpanA.setData(toLine(series.ichimoku.spanA))
    overlays.ichimokuSpanB = line('rgba(248,113,113,0.9)', 1, LineStyle.Dashed)
    overlays.ichimokuSpanB.setData(toLine(series.ichimoku.spanB))

    overlaysRef.current = overlays

    // -- RSI sub-chart ----------------------------------------------------
    const rsiChart = createChart(rsiEl, baseOptions(rsiEl, RSI_HEIGHT, palette))
    rsiChartRef.current = rsiChart
    const rsiLine = rsiChart.addLineSeries({
      color: '#a78bfa',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    })
    rsiLine.setData(toLine(series.rsi))
    rsiLine.createPriceLine({
      price: 70,
      color: 'rgba(239,68,68,0.5)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: '70',
    })
    rsiLine.createPriceLine({
      price: 30,
      color: 'rgba(34,197,94,0.5)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: '30',
    })
    rsiChart.priceScale('right').applyOptions({ scaleMargins: { top: 0.12, bottom: 0.12 } })

    // -- MACD sub-chart ---------------------------------------------------
    const macdChart = createChart(macdEl, baseOptions(macdEl, MACD_HEIGHT, palette))
    macdChartRef.current = macdChart
    const macdHistogram = macdChart.addHistogramSeries({
      priceLineVisible: false,
      lastValueVisible: false,
    })
    macdHistogram.setData(
      series.macd.histogram.map((p) => ({
        time: toSec(p.time),
        value: p.value,
        color: p.value >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)',
      })),
    )
    const macdLine = macdChart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    macdLine.setData(toLine(series.macd.macd))
    const macdSignal = macdChart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    macdSignal.setData(toLine(series.macd.signal))
    macdChart.priceScale('right').applyOptions({ scaleMargins: { top: 0.15, bottom: 0.15 } })

    // -- keep all three panes on the same time axis -----------------------
    const charts = [main, rsiChart, macdChart]
    let syncing = false
    const handlers: { chart: IChartApi; handler: (range: unknown) => void }[] = []
    for (const source of charts) {
      const handler = (range: unknown) => {
        if (!range || syncing) return
        syncing = true
        for (const target of charts) {
          if (target !== source) {
            target.timeScale().setVisibleLogicalRange(range as never)
          }
        }
        syncing = false
      }
      source.timeScale().subscribeVisibleLogicalRangeChange(handler as never)
      handlers.push({ chart: source, handler })
    }

    // -- responsive width & mobile height ---------------------------------
    const observer = new ResizeObserver(() => {
      const width = wrapperRef.current?.clientWidth ?? 0
      if (width <= 0) return
      const targetMainHeight = width < 640 ? 320 : MAIN_HEIGHT
      main.applyOptions({ width, height: targetMainHeight })
      rsiChart.applyOptions({ width })
      macdChart.applyOptions({ width })
    })
    if (wrapperRef.current) observer.observe(wrapperRef.current)

    return () => {
      for (const { chart, handler } of handlers) {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler as never)
      }
      observer.disconnect()
      main.remove()
      rsiChart.remove()
      macdChart.remove()
      mainRef.current = null
      rsiChartRef.current = null
      macdChartRef.current = null
      candleRef.current = null
      volumeRef.current = null
      overlaysRef.current = {}
      priceLinesRef.current = []
    }
  }, [payload, theme])

  // ---- apply toggles (and keep them in sync after a rebuild) -----------
  useEffect(() => {
    const overlays = overlaysRef.current
    const palette = PALETTES[theme]
    const visible = (key: string, on: boolean) => overlays[key]?.applyOptions({ visible: on })

    visible('bollingerUpper', toggles.bollinger)
    visible('bollingerMiddle', toggles.bollinger)
    visible('bollingerLower', toggles.bollinger)

    visible('emaFast', toggles.ema)
    visible('emaMid', toggles.ema)
    visible('emaSlow', toggles.ema)

    visible('vwap', toggles.vwap)
    visible('supertrend', toggles.supertrend)

    visible('ichimokuConversion', toggles.ichimoku)
    visible('ichimokuBase', toggles.ichimoku)
    visible('ichimokuSpanA', toggles.ichimoku)
    visible('ichimokuSpanB', toggles.ichimoku)

    volumeRef.current?.applyOptions({ visible: toggles.volume })

    if (rsiContainerRef.current) rsiContainerRef.current.style.display = toggles.rsi ? '' : 'none'
    if (macdContainerRef.current) {
      macdContainerRef.current.style.display = toggles.macd ? '' : 'none'
    }

    // Sub-charts need a resize when revealed.
    requestAnimationFrame(() => {
      if (rsiChartRef.current && rsiContainerRef.current) {
        rsiChartRef.current.resize(rsiContainerRef.current.clientWidth, RSI_HEIGHT)
      }
      if (macdChartRef.current && macdContainerRef.current) {
        macdChartRef.current.resize(macdContainerRef.current.clientWidth, MACD_HEIGHT)
      }
    })

    // Markers + plan price lines are recreated rather than toggled.
    const candle = candleRef.current
    if (candle && payload) {
      for (const priceLine of priceLinesRef.current) candle.removePriceLine(priceLine)
      priceLinesRef.current = []

      if (toggles.plan) {
        const levels = payload.plan?.levels
        if (levels) {
          priceLinesRef.current.push(
            candle.createPriceLine({
              price: levels.entry,
              color: '#6366f1',
              lineWidth: 1,
              lineStyle: LineStyle.Solid,
              axisLabelVisible: true,
              title: 'Entry',
            }),
            candle.createPriceLine({
              price: levels.takeProfit,
              color: palette.up,
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: 'Target',
            }),
            candle.createPriceLine({
              price: levels.stopLoss,
              color: palette.down,
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: 'Stop',
            }),
          )
        } else if (payload.plan?.protectiveStop != null) {
          priceLinesRef.current.push(
            candle.createPriceLine({
              price: payload.plan.protectiveStop,
              color: palette.down,
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: 'Protective stop',
            }),
          )
        }

        const markers: SeriesMarker<Time>[] = payload.markers.map((m) => ({
          time: toSec(m.time),
          position: m.direction === 'LONG' ? 'belowBar' : 'aboveBar',
          color: m.direction === 'LONG' ? palette.up : palette.down,
          shape: m.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
          text: m.direction,
        }))
        candle.setMarkers(markers)
      } else {
        candle.setMarkers([])
      }
    }
  }, [toggles, payload, theme])

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Price chart
          </h2>
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2/80 p-0.5">
            {TIMEFRAME_OPTIONS.map(({ tf, label, desc }) => (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange?.(tf)}
                title={desc}
                className={
                  'rounded-lg px-2.5 py-1 text-xs font-bold transition ' +
                  (timeframe === tf
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-subtle hover:text-ink hover:bg-surface')
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 max-w-full overflow-x-auto pb-1">
          {TOGGLE_LABELS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              aria-pressed={toggles[key]}
              className={
                'rounded-full border px-3 py-1 text-xs transition ' +
                (toggles[key]
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line text-subtle hover:text-ink')
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-down">
          {error}
        </p>
      ) : null}

      {loading && !payload ? (
        <p className="mt-6 text-sm text-subtle">Loading chart…</p>
      ) : (
        <div ref={wrapperRef} className="mt-4 space-y-1">
          <div ref={mainContainerRef} className="w-full" />
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-wide text-subtle">RSI (14)</span>
          </div>
          <div ref={rsiContainerRef} className="w-full" />
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-wide text-subtle">
              MACD (12/26/9)
            </span>
          </div>
          <div ref={macdContainerRef} className="w-full" />
        </div>
      )}

      {payload ? (
        <p className="mt-3 text-xs text-subtle">
          {payload.series.candles.length} × {payload.timeframe} candles · all indicators computed
          server-side from the same modules the signal engine uses. Ichimoku&apos;s cloud is drawn
          as its two leading-span lines (Senkou A/B).
        </p>
      ) : null}
    </section>
  )
}
