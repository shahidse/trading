import { config } from '@/lib/config'
import { getNotifySettings } from '@/lib/notify/settings'
import { isTelegramConfigured, sendTelegramText, telegramGetMe } from '@/lib/notify/telegram'

/**
 * Diagnostic for the Telegram alert channel.
 *
 *   npm run check-telegram
 *
 * Verifies the bot token (getMe) and sends one test message to the configured
 * chat, surfacing Telegram's own error text instead of a silent failure.
 */
async function main(): Promise<void> {
  const { telegram } = getNotifySettings()

  console.log(`Token : ${telegram.botToken ? 'set' : 'missing'}`)
  console.log(`Chat  : ${telegram.chatId || 'missing'}`)
  console.log(`Mode  : ${telegram.mode}   Enabled: ${telegram.enabled}`)

  if (!isTelegramConfigured()) {
    console.log('')
    console.log('Configure it on the /settings page, or set TELEGRAM_BOT_TOKEN and')
    console.log('TELEGRAM_CHAT_ID in .env.local.')
    console.log('Create a bot with @BotFather, then message it and read the chat id from')
    console.log('https://api.telegram.org/bot<token>/getUpdates')
    process.exitCode = 1
    return
  }

  try {
    const me = await telegramGetMe()
    console.log('')
    console.log(`✅ Bot  : @${me.username ?? '?'} (${me.first_name ?? '?'})`)

    await sendTelegramText(
      `✅ ETH Signal connected — ${config.symbol} ${config.timeframe} alerts are live.`,
    )
    console.log('✅ Test message delivered to the configured chat.')
  } catch (error) {
    console.log('')
    console.log(`❌ ${error instanceof Error ? error.message : String(error)}`)
    console.log('')
    console.log('Common causes: wrong token, bot never messaged (no chat id), or chat not started.')
    process.exitCode = 1
  }
}

main()
