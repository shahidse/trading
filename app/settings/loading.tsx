import { SettingsSkeleton } from '@/components/Loader'
import Link from 'next/link'

export default function SettingsLoading() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">App & Notification Settings</h1>
            <span className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              Loading configuration…
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Configure layout mode, visual design archetype, automated trading, and alert channels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <SettingsSkeleton />
    </main>
  )
}
