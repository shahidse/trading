import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'ETH Signal — 15m multi-indicator oracle',
  description:
    'Bollinger Bands, Ichimoku, RSI and candlestick patterns combined into one ETH spot signal.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070b14] text-slate-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
