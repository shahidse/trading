import { config } from '@/lib/config'
import {
  assertWithdrawalsDisabled,
  getTradingExchange,
  minimumNotional,
  normaliseQuantity,
} from '@/lib/exchange/client'
import { getExchangeSettings } from '@/lib/exchange/settings'
import { pairCurrencies } from '@/lib/exchange/trader'

/**
 * Diagnostic for the Binance trading connection.
 *
 *   npm run check-exchange
 *
 * Verifies the API key can trade, that withdrawals are disabled, and what the
 * configured order size would actually buy. **Never places an order.**
 */
async function main(): Promise<void> {
  const settings = getExchangeSettings()
  const { base, quote } = pairCurrencies(config.symbol)

  console.log(`Environment : ${settings.testnet ? 'Binance Spot Testnet' : 'Binance MAINNET'}`)
  console.log(`Armed       : ${settings.enabled ? 'yes' : 'no'}   kill switch: ${settings.killSwitch ? 'ON' : 'off'}`)
  console.log(`Dry run     : ${settings.dryRun ? 'ON (orders logged, never sent)' : 'off'}`)
  console.log(
    `Sizing      : $${settings.notionalUsd} per order · cap $${settings.maxNotionalUsd} · daily loss limit $${settings.dailyLossLimitUsd}`,
  )
  console.log(`Credentials : ${settings.apiKey && settings.secret ? 'set' : 'missing'}`)
  console.log('')

  if (!settings.apiKey || !settings.secret) {
    console.log('Add BINANCE_API_KEY / BINANCE_SECRET to .env.local, or set them on /settings.')
    console.log('Use a key with Spot Trading enabled and Withdrawals DISABLED.')
    process.exitCode = 1
    return
  }

  try {
    const exchange = await getTradingExchange()
    const balance = await exchange.fetchBalance()
    const free = balance.free as unknown as Record<string, number>

    console.log('✅ Authenticated — the key can read the account')
    console.log(`   ${quote} free : ${free[quote] ?? 0}`)
    console.log(`   ${base} free : ${free[base] ?? 0}`)

    await assertWithdrawalsDisabled(exchange)
    console.log('✅ Withdrawal permission is disabled')

    const ticker = await exchange.fetchTicker(config.symbol)
    const price = Number(ticker.last ?? ticker.close)
    const quantity = normaliseQuantity(exchange, config.symbol, settings.notionalUsd / price)
    const minCost = minimumNotional(exchange, config.symbol)

    console.log('')
    console.log(`   ${config.symbol} last : $${price.toLocaleString()}`)
    console.log(`   $${settings.notionalUsd} would buy ${quantity} ${base}`)
    console.log(`   Exchange minimum order: $${minCost}`)

    if (quantity * price < minCost) {
      console.log('')
      console.log(`⚠️  Order size is below the exchange minimum — raise TRADE_NOTIONAL_USD.`)
      process.exitCode = 1
    }
  } catch (error) {
    console.log('')
    console.log(`❌ ${error instanceof Error ? error.message : String(error)}`)
    console.log('')
    console.log('Common causes: wrong key/secret, key lacks Spot Trading, IP not allowlisted,')
    console.log('or a mainnet key pointed at the testnet (or vice versa).')
    process.exitCode = 1
  }
}

main()
