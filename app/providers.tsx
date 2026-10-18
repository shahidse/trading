'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

// WalletConnect Cloud Project ID (from cloud.reown.com).
// Can be customized via NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID environment variable.
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '3fcc6bba2d1de9622409fae050313dd6'

const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
      metadata: {
        name: 'ETH Signal Engine',
        description: 'Ethereum 15m Signal & Execution Dashboard',
        url: 'https://jade-pavlova-ba20a5.netlify.app',
        icons: ['https://ethereum.org/favicon.ico'],
      },
    }),
    coinbaseWallet({
      appName: 'ETH Signal Engine',
      appLogoUrl: 'https://ethereum.org/favicon.ico',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
