import { NextResponse } from 'next/server'
import {
  getExchangeSettings,
  publicExchangeSettings,
  saveExchangeSettings,
} from '@/lib/exchange/settings'
import { assertWithdrawalsDisabled, resetTradingExchange } from '@/lib/exchange/client'
import { binance } from 'ccxt'

export const dynamic = 'force-dynamic'

/**
 * Binance Fast Connect API.
 *
 * ENV Credentials are ALWAYS the primary default.
 * Fast Connect provides the secondary, interactive connect option
 * when no API key is provided in .env.local.
 */

const BINANCE_FAST_CONNECT_APP_NAME = 'ETHTrendMasterSpot'
const BINANCE_FAST_CONNECT_URL = `https://accounts.binance.com/en/oauth/authorize?response_type=code&client_id=${BINANCE_FAST_CONNECT_APP_NAME}&scope=user:read,trade:spot`

export async function GET() {
  try {
    const settings = getExchangeSettings()
    const pub = publicExchangeSettings(settings)

    return NextResponse.json({
      ...pub,
      fastConnectUrl: BINANCE_FAST_CONNECT_URL,
      appName: BINANCE_FAST_CONNECT_APP_NAME,
      permissions: ['READ_BALANCES', 'SPOT_TRADING'],
      withdrawalsDisabled: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Connect Binance via Fast Connect payload / OAuth exchange.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { apiKey, secret, testnet = false } = body

    if (!apiKey || !secret) {
      return NextResponse.json(
        { error: 'apiKey and secret are required for Fast Connect' },
        { status: 400 }
      )
    }

    // Zero-withdrawal safety check: instantiate test exchange and verify
    const testExchange = new binance({
      enableRateLimit: true,
      apiKey: apiKey.trim(),
      secret: secret.trim(),
      options: { defaultType: 'spot', fetchMarkets: ['spot'], fetchCurrencies: false },
    })

    if (testnet) {
      testExchange.setSandboxMode(true)
    }

    // Verify withdrawal permission is NOT enabled
    try {
      await assertWithdrawalsDisabled(testExchange)
    } catch (guardErr) {
      return NextResponse.json(
        {
          error:
            guardErr instanceof Error
              ? guardErr.message
              : 'Withdrawal guard failed: Withdrawals must be strictly disabled.',
        },
        { status: 403 }
      )
    }

    // Save as secondary stored credentials
    saveExchangeSettings({
      apiKey: apiKey.trim(),
      secret: secret.trim(),
      testnet: Boolean(testnet),
    })

    resetTradingExchange()

    const updated = publicExchangeSettings()
    return NextResponse.json({
      success: true,
      message: updated.hasEnvCredentials
        ? 'Fast Connect stored as standby (ENV key is active as primary default).'
        : 'Binance Fast Connect activated successfully.',
      settings: updated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Disconnect Fast Connect (clears stored keys without touching .env.local).
 */
export async function DELETE() {
  try {
    saveExchangeSettings({
      apiKey: '',
      secret: '',
    })

    resetTradingExchange()

    const updated = publicExchangeSettings()
    return NextResponse.json({
      success: true,
      message: 'Fast Connect credentials cleared.',
      settings: updated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
