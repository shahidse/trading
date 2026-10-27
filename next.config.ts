import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Native / heavy server-only modules must not be bundled by webpack.
  serverExternalPackages: ['better-sqlite3', 'ccxt'],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        'node:fs': false,
        path: false,
        'node:path': false,
        net: false,
        'node:net': false,
        tls: false,
        'node:tls': false,
        crypto: false,
        'node:crypto': false,
      }
    }
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

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ]
  },
}

export default nextConfig
