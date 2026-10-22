/**
 * Pure EIP-712 payload builder for Hyperliquid Agent Wallet authorization.
 *
 * Safe for client-side inclusion (zero server/Node/CCXT dependencies).
 */

export function buildApproveAgentEip712(agentAddress: string, agentName = 'ETH-Signal-Agent') {
  return {
    domain: {
      name: 'HyperliquidSignTransaction',
      version: '1',
      chainId: 1337,
      verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    },
    types: {
      Agent: [
        { name: 'source', type: 'string' },
        { name: 'connectionId', type: 'bytes32' },
      ],
    },
    primaryType: 'Agent' as const,
    message: {
      source: 'a',
      connectionId: agentAddress as `0x${string}`,
    },
    agentAddress,
    agentName,
  }
}
