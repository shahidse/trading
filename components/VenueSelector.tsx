'use client'

import { useState, useEffect } from 'react'
import { EXECUTION_VENUES, DEFAULT_VENUE, type ExecutionVenue } from '@/lib/constants/venues'
import { HyperliquidAgentModal } from '@/components/HyperliquidAgentModal'
import { SolanaWalletModal } from '@/components/SolanaWalletModal'

export function VenueSelector() {
  const [activeVenue, setActiveVenue] = useState<ExecutionVenue>(DEFAULT_VENUE)
  const [loading, setLoading] = useState(false)
  const [hlModalOpen, setHlModalOpen] = useState(false)
  const [solModalOpen, setSolModalOpen] = useState(false)

  useEffect(() => {
    fetch('/api/venue')
      .then((r) => r.json())
      .then((d) => {
        if (d?.activeVenue) setActiveVenue(d.activeVenue)
      })
      .catch(() => {})
  }, [])

  const selectVenue = async (venue: ExecutionVenue) => {
    setActiveVenue(venue)
    setLoading(true)
    try {
      await fetch('/api/venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue }),
      })
    } catch (err) {
      console.error('Failed to set venue:', err)
    } finally {
      setLoading(false)
    }

    if (venue === 'hyperliquid') setHlModalOpen(true)
    if (venue === 'solana') setSolModalOpen(true)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface/60 p-1 backdrop-blur-md">
        <span className="hidden px-2 text-[11px] font-bold uppercase tracking-wider text-subtle md:inline">
          Execution Venue:
        </span>

        {Object.values(EXECUTION_VENUES).map((v) => {
          const isSelected = activeVenue === v.id
          return (
            <button
              key={v.id}
              onClick={() => selectVenue(v.id)}
              disabled={loading}
              className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                isSelected
                  ? 'bg-accent text-accent-ink shadow-sm'
                  : 'text-subtle hover:bg-surface-tint hover:text-ink'
              }`}
            >
              <span>{v.name}</span>
              {v.isDefault ? (
                <span className="rounded bg-accent-soft/80 px-1 py-0.2 text-[9px] font-bold uppercase text-accent">
                  Default
                </span>
              ) : (
                <span
                  className={`rounded px-1 py-0.2 text-[9px] font-bold uppercase ${
                    isSelected
                      ? 'bg-accent-soft text-accent'
                      : 'bg-surface-tint text-subtle'
                  }`}
                >
                  {v.type.toUpperCase()}
                </span>
              )}
            </button>
          )
        })}

        {activeVenue === 'hyperliquid' && (
          <button
            onClick={() => setHlModalOpen(true)}
            className="ml-auto rounded-lg border border-accent/40 bg-accent-soft/50 px-2 py-0.8 text-[11px] font-medium text-accent hover:bg-accent-soft"
          >
            Agent Status
          </button>
        )}

        {activeVenue === 'solana' && (
          <button
            onClick={() => setSolModalOpen(true)}
            className="ml-auto rounded-lg border border-accent/40 bg-accent-soft/50 px-2 py-0.8 text-[11px] font-medium text-accent hover:bg-accent-soft"
          >
            Phantom / Jupiter
          </button>
        )}
      </div>

      <HyperliquidAgentModal
        open={hlModalOpen}
        onClose={() => setHlModalOpen(false)}
      />

      <SolanaWalletModal
        open={solModalOpen}
        onClose={() => setSolModalOpen(false)}
      />
    </>
  )
}
