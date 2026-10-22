import { NextResponse } from 'next/server'
import {
  buildApproveAgentEip712,
  fetchHyperliquidState,
  registerApprovedAgent,
} from '@/lib/exchange/hyperliquid'
import { getExchangeSettings } from '@/lib/exchange/settings'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const userAddress = url.searchParams.get('user')
    const agentAddress = url.searchParams.get('agent')
    const settings = getExchangeSettings()

    if (!userAddress) {
      return NextResponse.json({
        venue: 'hyperliquid',
        custody: 'non-custodial',
        auth: 'agent-wallet',
        testnet: settings.testnet,
        message: 'Provide ?user=0x... to inspect account balances and agent status',
      })
    }

    const state = await fetchHyperliquidState(userAddress, settings.testnet)

    let eip712Payload = null
    if (agentAddress) {
      eip712Payload = buildApproveAgentEip712(agentAddress)
    }

    return NextResponse.json({
      user: userAddress,
      testnet: settings.testnet,
      state,
      eip712Payload,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { masterAddress, agentAddress, signature } = body
    const settings = getExchangeSettings()

    if (!masterAddress || !agentAddress || !signature) {
      return NextResponse.json(
        { error: 'masterAddress, agentAddress, and signature are required' },
        { status: 400 }
      )
    }

    const result = await registerApprovedAgent(
      masterAddress,
      agentAddress,
      signature,
      settings.testnet
    )

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
