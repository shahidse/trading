import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Native / heavy server-only modules must not be bundled by webpack.
  serverExternalPackages: ['better-sqlite3', 'ccxt'],

  webpack: (config) => {
    // The `wagmi/connectors` barrel eagerly imports the Base/Coinbase account
    // connectors, which depend on optional `@x402/*` packages that aren't
    // installed (there is no fine-grained subpath export to import instead).
    // We only use the injected connector, so stub that dead subtree out.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@base-org/account': false,
      '@coinbase/cdp-sdk': false,
      '@x402/evm': false,
      '@x402/svm': false,
    }
    return config
  },
}

export default nextConfig
