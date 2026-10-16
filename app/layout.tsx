import type { Metadata } from 'next'
import { themeInitScript } from '@/lib/theme'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'ETH Signal — 15m multi-indicator oracle',
  description:
    'Bollinger Bands, Ichimoku, RSI and candlestick patterns combined into one ETH spot signal.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before paint — prevents a light/dark flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
