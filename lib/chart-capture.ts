/**
 * Captures the active HTML5 canvas elements of the candlestick chart
 * into a single high-quality PNG data URL suitable for sharing to Binance Square.
 */
export function captureCandleChartSnapshot(symbol = 'ETH/USDT', timeframe = '15m'): string | null {
  if (typeof document === 'undefined') return null

  const container =
    document.getElementById('main-candle-chart-container') ||
    document.getElementById('candle-chart-wrapper') ||
    document.querySelector('[data-chart-container]')

  if (!container) return null

  const canvases = Array.from(container.querySelectorAll('canvas'))
  if (canvases.length === 0) return null

  const width = canvases[0].width
  const height = canvases[0].height
  if (!width || !height) return null

  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
  const ctx = offscreen.getContext('2d')
  if (!ctx) return null

  // 1. Sleek dark trading background
  ctx.fillStyle = '#0b0f19'
  ctx.fillRect(0, 0, width, height)

  // 2. Draw composite canvas layers
  for (const c of canvases) {
    if (c.width > 0 && c.height > 0) {
      ctx.drawImage(c, 0, 0)
    }
  }

  // 3. Top watermark badge
  ctx.save()
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)'
  ctx.lineWidth = 1
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(14, 14, 230, 32, 6)
    ctx.fill()
    ctx.stroke()
  } else {
    ctx.fillRect(14, 14, 230, 32)
    ctx.strokeRect(14, 14, 230, 32)
  }

  ctx.fillStyle = '#f59e0b'
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif'
  ctx.fillText(`⚡ ${symbol} · ${timeframe} Chart`, 24, 35)
  ctx.restore()

  return offscreen.toDataURL('image/png')
}
