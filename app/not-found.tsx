import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-950 text-slate-100">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-slate-400 mb-6 text-sm">Page not found</p>
      <Link
        href="/"
        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
      >
        Return to Dashboard
      </Link>
    </div>
  )
}
