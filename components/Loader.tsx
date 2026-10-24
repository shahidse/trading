'use client'

import React from 'react'

export type SpinnerProps = {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  color?: 'accent' | 'emerald' | 'cyan' | 'white' | 'subtle'
}

const SIZE_MAP = {
  xs: 'h-3.5 w-3.5 border-2',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[2.5px]',
  xl: 'h-12 w-12 border-3',
}

const COLOR_MAP = {
  accent: 'border-accent/25 border-t-accent text-accent',
  emerald: 'border-emerald-500/25 border-t-emerald-400 text-emerald-400',
  cyan: 'border-cyan-500/25 border-t-cyan-400 text-cyan-400',
  white: 'border-white/20 border-t-white text-white',
  subtle: 'border-line border-t-subtle text-subtle',
}

/**
 * High-performance, glowing circular spinner.
 */
export function Spinner({
  size = 'md',
  className = '',
  color = 'accent',
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full transition-all ${SIZE_MAP[size]} ${COLOR_MAP[color]} ${className}`}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

/**
 * Three rhythmic bouncing glowing dots with staggered animation.
 */
export function PulseDots({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
    </div>
  )
}

/**
 * Inline button spinner that retains button layout without jitter.
 */
export function ButtonSpinner({
  label = 'Loading...',
  size = 'xs',
}: {
  label?: string
  size?: 'xs' | 'sm'
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Spinner size={size} color="white" />
      {label && <span>{label}</span>}
    </span>
  )
}

/**
 * Section or Panel loader with glowing backdrop and status message.
 */
export function SectionLoader({
  message = 'Loading data...',
  detail,
  minHeight = 'min-h-[220px]',
}: {
  message?: string
  detail?: string
  minHeight?: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-6 text-center ${minHeight}`}
    >
      <div className="relative mb-3 flex items-center justify-center">
        <div className="absolute h-12 w-12 rounded-full bg-accent/20 blur-md animate-pulse" />
        <Spinner size="lg" color="accent" />
      </div>
      <p className="text-xs font-semibold text-ink">{message}</p>
      {detail && <p className="mt-1 text-[11px] text-muted max-w-xs">{detail}</p>}
    </div>
  )
}

/**
 * High-fidelity Candlestick & Technical Chart skeleton loader.
 */
export function ChartSkeleton({
  height = 360,
  message = 'Streaming Market Candles & Syncing Indicators…',
}: {
  height?: number
  message?: string
}) {
  return (
    <div
      style={{ height: `${height}px` }}
      className="relative flex w-full flex-col justify-between overflow-hidden rounded-xl border border-line-soft bg-surface-2/60 p-4 select-none"
    >
      {/* Top Header Placeholder */}
      <div className="flex items-center justify-between border-b border-line-soft pb-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 rounded-md shimmer-bg" />
          <div className="h-4 w-14 rounded-md shimmer-bg" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-10 rounded-md shimmer-bg" />
          <div className="h-5 w-10 rounded-md shimmer-bg" />
          <div className="h-5 w-10 rounded-md shimmer-bg" />
        </div>
      </div>

      {/* Simulated Candlestick Bars */}
      <div className="relative my-auto flex h-48 items-end justify-between gap-1 px-4 opacity-40">
        {[45, 60, 52, 70, 85, 68, 92, 110, 95, 120, 140, 130, 160, 145, 175, 190, 170, 200, 215, 195].map(
          (h, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end h-full">
              {/* Wick */}
              <div
                style={{ height: `${Math.min(h + 20, 180)}px` }}
                className="w-[1px] bg-accent/30"
              />
              {/* Candle Body */}
              <div
                style={{ height: `${Math.max(h * 0.45, 16)}px` }}
                className={`w-full rounded-xs transition-all shimmer-bg ${
                  i % 2 === 0 ? 'bg-emerald-500/30' : 'bg-rose-500/25'
                }`}
              />
            </div>
          ),
        )}
      </div>

      {/* Floating Centered Status Pill */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/40 backdrop-blur-[2px]">
        <div className="flex items-center gap-2.5 rounded-full border border-line bg-surface/90 px-4 py-2 shadow-lg">
          <Spinner size="sm" color="accent" />
          <span className="text-xs font-semibold text-ink">{message}</span>
        </div>
      </div>

      {/* Bottom Axis Placeholder */}
      <div className="flex items-center justify-between border-t border-line-soft pt-2 text-[10px] text-subtle font-mono">
        <div className="h-3 w-16 rounded shimmer-bg" />
        <div className="h-3 w-16 rounded shimmer-bg" />
        <div className="h-3 w-16 rounded shimmer-bg" />
      </div>
    </div>
  )
}

/**
 * Dedicated Equity Curve & Portfolio Skeleton for AssetsChart.
 */
export function EquityChartSkeleton() {
  return (
    <div className="space-y-4">
      {/* Top Stat Row Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="h-3.5 w-32 rounded shimmer-bg" />
          <div className="h-8 w-48 rounded shimmer-bg" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-28 rounded-lg shimmer-bg" />
          <div className="h-7 w-36 rounded-lg shimmer-bg" />
        </div>
      </div>

      {/* Chart Canvas Skeleton */}
      <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-xl border border-line-soft bg-surface-2/40">
        <div className="absolute inset-0 flex flex-col justify-between p-4 opacity-20">
          <div className="w-full border-b border-dashed border-line" />
          <div className="w-full border-b border-dashed border-line" />
          <div className="w-full border-b border-dashed border-line" />
        </div>

        {/* Center Loading Status */}
        <div className="relative z-10 flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface/90 px-5 py-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Spinner size="sm" color="emerald" />
            <span className="text-xs font-bold text-ink">
              Calculating Portfolio Valuation & PKR Conversion...
            </span>
          </div>
          <span className="text-[10px] text-subtle">
            Fetching Binance holdings, live prices & interbank currency rates
          </span>
        </div>
      </div>

      {/* Asset Allocation Bar Skeleton */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-24 rounded shimmer-bg" />
          <div className="h-3 w-36 rounded shimmer-bg" />
        </div>
        <div className="h-2.5 w-full rounded-full shimmer-bg" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl border border-line-soft shimmer-bg p-2" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton Loader for Hot Coins Radar during initial scan.
 */
export function HotCoinsRadarSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-16 rounded-md shimmer-bg" />
              <div className="h-4 w-12 rounded shimmer-bg" />
            </div>
            <div className="h-5 w-20 rounded-full shimmer-bg" />
          </div>

          {/* Price & Change */}
          <div className="flex items-baseline justify-between">
            <div className="h-7 w-24 rounded shimmer-bg" />
            <div className="h-4 w-14 rounded shimmer-bg" />
          </div>

          {/* Action & Targets */}
          <div className="rounded-xl border border-line-soft p-2.5 space-y-2 bg-surface-2/40">
            <div className="h-3.5 w-full rounded shimmer-bg" />
            <div className="flex justify-between">
              <div className="h-3 w-16 rounded shimmer-bg" />
              <div className="h-3 w-16 rounded shimmer-bg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Generic Card Skeleton for TradePlanCard or SignalCard.
 */
export function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 rounded shimmer-bg" />
        <div className="h-4 w-16 rounded-full shimmer-bg" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{ width: `${85 - i * 12}%` }}
            className="h-3.5 rounded shimmer-bg"
          />
        ))}
      </div>
    </div>
  )
}

/**
 * High-fidelity Skeleton for the Settings page during configuration load.
 */
export function SettingsSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      {/* Layout Architecture Card Skeleton */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
        <div className="space-y-1.5">
          <div className="h-4 w-44 rounded shimmer-bg" />
          <div className="h-3 w-80 rounded shimmer-bg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl border border-line-soft shimmer-bg p-4" />
          ))}
        </div>
      </div>

      {/* Color Themes & Ambient Lighting Card Skeleton */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
        <div className="space-y-1.5">
          <div className="h-4 w-48 rounded shimmer-bg" />
          <div className="h-3 w-72 rounded shimmer-bg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-20 rounded-2xl border border-line-soft shimmer-bg p-3" />
          ))}
        </div>
        <div className="border-t border-line-soft pt-4 space-y-3">
          <div className="h-3.5 w-40 rounded shimmer-bg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-line-soft shimmer-bg p-3" />
            ))}
          </div>
        </div>
      </div>

      {/* Notification Channel Card Skeleton */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-4 w-28 rounded shimmer-bg" />
          <div className="h-5 w-20 rounded-full shimmer-bg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 h-10 rounded-lg shimmer-bg" />
          <div className="h-10 rounded-lg shimmer-bg" />
          <div className="h-10 rounded-lg shimmer-bg" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-9 w-20 rounded-lg shimmer-bg" />
          <div className="h-9 w-24 rounded-lg shimmer-bg" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for Exchange Settings Card.
 */
export function ExchangeSettingsSkeleton() {
  return (
    <div className="mt-4 space-y-5">
      {/* Guard Toggles */}
      <div className="flex flex-wrap gap-4">
        <div className="h-5 w-48 rounded shimmer-bg" />
        <div className="h-5 w-44 rounded shimmer-bg" />
        <div className="h-5 w-36 rounded shimmer-bg" />
      </div>

      {/* Numeric Guard Inputs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-24 rounded shimmer-bg" />
            <div className="h-10 rounded-lg shimmer-bg" />
          </div>
        ))}
      </div>

      {/* API Credential Inputs */}
      <div className="space-y-3 pt-2">
        <div className="space-y-1.5">
          <div className="h-3 w-28 rounded shimmer-bg" />
          <div className="h-10 rounded-lg shimmer-bg" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-28 rounded shimmer-bg" />
          <div className="h-10 rounded-lg shimmer-bg" />
        </div>
      </div>

      {/* Button Row */}
      <div className="flex gap-3 pt-2">
        <div className="h-9 w-24 rounded-lg shimmer-bg" />
        <div className="h-9 w-36 rounded-lg shimmer-bg" />
      </div>
    </div>
  )
}

