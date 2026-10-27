'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Signal } from '@/lib/types'
import type { FutureCoinPrediction } from '@/lib/data/predictions'
import {
  SIGNAL_SQUARE_TEMPLATES,
  PREDICTION_SQUARE_TEMPLATES,
  CHART_SQUARE_TEMPLATES,
  formatSignalForSquare,
  formatPredictionForSquare,
  formatChartForSquare,
  type SignalSquareTemplateId,
  type PredictionSquareTemplateId,
  type ChartSquareTemplateId,
  type SquareTemplateOption,
} from '@/lib/notify/square-templates'

export interface SquarePostModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'signal' | 'prediction' | 'chart'
  signal?: Signal
  prediction?: FutureCoinPrediction
  chartInfo?: {
    symbol: string
    timeframe: string
    price?: number
  }
  initialImageBase64?: string
  onPublished?: (result: { ok: boolean; contentId?: string; message: string }) => void
}

export function SquarePostModal({
  isOpen,
  onClose,
  type,
  signal,
  prediction,
  chartInfo,
  initialImageBase64,
  onPublished,
}: SquarePostModalProps) {
  // Available templates based on post type
  const templates: SquareTemplateOption[] = useMemo(() => {
    if (type === 'signal') return SIGNAL_SQUARE_TEMPLATES
    if (type === 'prediction') return PREDICTION_SQUARE_TEMPLATES
    return CHART_SQUARE_TEMPLATES
  }, [type])

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    if (type === 'signal') return 'detailed'
    if (type === 'prediction') return 'alpha'
    return 'standard'
  })

  // Editable post content
  const [content, setContent] = useState<string>('')
  const [includeImage, setIncludeImage] = useState<boolean>(Boolean(initialImageBase64))
  const [isPosting, setIsPosting] = useState<boolean>(false)
  const [result, setResult] = useState<{ ok: boolean; message: string; contentId?: string } | null>(null)
  const [hasUserEdited, setHasUserEdited] = useState<boolean>(false)

  // Generate template text for a specific template ID
  const generateTextForTemplate = (templateId: string): string => {
    if (type === 'signal' && signal) {
      return formatSignalForSquare(signal, templateId as SignalSquareTemplateId)
    }
    if (type === 'prediction' && prediction) {
      return formatPredictionForSquare(prediction, templateId as PredictionSquareTemplateId)
    }
    if (type === 'chart' && chartInfo) {
      return formatChartForSquare(
        chartInfo.symbol,
        chartInfo.timeframe,
        chartInfo.price,
        templateId as ChartSquareTemplateId
      )
    }
    return ''
  }

  // Reset or initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultId = type === 'signal' ? 'detailed' : type === 'prediction' ? 'alpha' : 'standard'
      setSelectedTemplateId(defaultId)
      const initialText = generateTextForTemplate(defaultId)
      setContent(initialText)
      setIncludeImage(Boolean(initialImageBase64))
      setResult(null)
      setHasUserEdited(false)
      setIsPosting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, signal, prediction, chartInfo, initialImageBase64])

  // Handle template selection change
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const newText = generateTextForTemplate(templateId)
    setContent(newText)
    setHasUserEdited(false)
    setResult(null)
  }

  // Reset text back to the currently selected template
  const handleResetToTemplate = () => {
    const defaultText = generateTextForTemplate(selectedTemplateId)
    setContent(defaultText)
    setHasUserEdited(false)
  }

  // Count hashtags
  const hashtagCount = useMemo(() => {
    const matches = content.match(/#[a-zA-Z0-9_]+/g)
    return matches ? matches.length : 0
  }, [content])

  // Handle post submit
  const handlePublish = async () => {
    if (isPosting) return
    setIsPosting(true)
    setResult(null)

    try {
      const payload: Record<string, unknown> = {
        type: type === 'chart' ? 'raw' : type,
        templateId: selectedTemplateId,
        content: content.trim(),
      }

      if (type === 'signal' && signal) {
        payload.signal = signal
      } else if (type === 'prediction' && prediction) {
        payload.prediction = prediction
      }

      if (includeImage && initialImageBase64) {
        payload.imageBase64 = initialImageBase64
      }

      const res = await fetch('/api/square/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        const msg = data.contentId
          ? `Successfully published to Binance Square! (ID: ${data.contentId})`
          : 'Successfully published to Binance Square!'
        setResult({
          ok: true,
          message: msg,
          contentId: data.contentId,
        })
        onPublished?.({ ok: true, contentId: data.contentId, message: msg })
      } else {
        const errMsg = data.error || 'Failed to publish to Binance Square'
        setResult({ ok: false, message: errMsg })
        onPublished?.({ ok: false, message: errMsg })
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Network error while publishing'
      setResult({ ok: false, message: errMsg })
      onPublished?.({ ok: false, message: errMsg })
    } finally {
      setIsPosting(false)
    }
  }

  if (!isOpen) return null

  // Target item title badge
  const targetLabel =
    type === 'signal' && signal
      ? `${signal.symbol} (${signal.timeframe}) · ${signal.plan.action}`
      : type === 'prediction' && prediction
      ? `${prediction.name} ($${prediction.base}) · ${prediction.horizonLabel}`
      : type === 'chart' && chartInfo
      ? `${chartInfo.symbol} (${chartInfo.timeframe}) Chart`
      : 'Binance Square Content'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="square-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-amber-500/25 bg-surface p-5 sm:p-6 shadow-2xl my-auto text-ink max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-line pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 font-bold text-lg">
              📢
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="square-modal-title" className="text-lg font-bold tracking-tight text-ink">
                  Publish to Binance Square
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Creator Feed
                </span>
              </div>
              <p className="text-xs text-subtle mt-0.5 font-medium">{targetLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-subtle hover:bg-surface-2 hover:text-ink transition-colors"
            title="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="mt-4 space-y-5 overflow-y-auto pr-1 flex-1 min-h-0 text-sm">
          {/* Step 1: Choose Template */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
                1. Select Post Template
              </label>
              <span className="text-xs text-muted">Choose style & tone</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {templates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl.id)}
                    className={`text-left rounded-xl border p-3 transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500/70 bg-amber-500/10 shadow-xs ring-1 ring-amber-500/30'
                        : 'border-line bg-surface-2/60 hover:border-amber-500/40 hover:bg-surface-2'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-ink">{tpl.name}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-surface border border-line text-subtle'
                        }`}
                      >
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-subtle mt-1.5 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 2: Content Preview & Live Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label htmlFor="square-post-content" className="text-xs font-semibold uppercase tracking-wider text-subtle">
                2. Post Content Preview & Editor
              </label>
              <div className="flex items-center gap-3">
                {hasUserEdited && (
                  <button
                    type="button"
                    onClick={handleResetToTemplate}
                    className="text-xs font-medium text-amber-500 hover:underline"
                  >
                    ↺ Reset to Template
                  </button>
                )}
                <span className="text-xs text-subtle">
                  {content.length} characters
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                    hashtagCount <= 4
                      ? 'bg-surface-2 text-subtle'
                      : 'bg-rose-500/15 text-rose-500 font-semibold'
                  }`}
                  title={hashtagCount > 4 ? 'Binance Square OpenAPI limit is 4 hashtags' : undefined}
                >
                  {hashtagCount}/4 hashtags
                </span>
              </div>
            </div>

            <textarea
              id="square-post-content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                setHasUserEdited(true)
              }}
              rows={8}
              className="w-full rounded-xl border border-line bg-surface-2 p-3 font-mono text-xs sm:text-sm text-ink leading-relaxed focus:border-amber-500/70 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all resize-y"
              placeholder="Post content will appear here..."
            />

            {hashtagCount > 4 && (
              <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                ⚠️ You have {hashtagCount} hashtags. Binance Square limits posts to 4 hashtags; excess '#' symbols will automatically be converted to regular text upon publishing.
              </p>
            )}
          </div>

          {/* Step 3: Chart Image Attachment (Optional) */}
          {initialImageBase64 && (
            <div className="rounded-xl border border-line bg-surface-2/60 p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="include-chart-image"
                  checked={includeImage}
                  onChange={(e) => setIncludeImage(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="include-chart-image" className="cursor-pointer select-none">
                  <span className="font-semibold text-xs text-ink block">
                    Attach Live Chart Snapshot
                  </span>
                  <span className="text-[11px] text-subtle block">
                    Uploads a rendered candlestick chart with EMAs and indicators to Binance Media Center
                  </span>
                </label>
              </div>

              {includeImage && (
                <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-slate-950">
                  <img
                    src={initialImageBase64}
                    alt="Chart preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Feedback & Result Alert */}
          {result && (
            <div
              className={`rounded-xl border p-3.5 text-xs sm:text-sm flex items-start gap-2.5 ${
                result.ok
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              <span className="text-base shrink-0">{result.ok ? '✅' : '⚠️'}</span>
              <div className="flex-1">
                <p className="font-semibold">{result.ok ? 'Post Published' : 'Publishing Error'}</p>
                <p className="mt-0.5 text-xs opacity-90">{result.message}</p>
                {!result.ok && result.message.includes('API Key is missing') && (
                  <p className="mt-1 text-xs underline">
                    <a href="/settings" className="hover:opacity-80">
                      Configure your Binance Square Creator OpenAPI Key in Settings →
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="mt-5 pt-4 border-t border-line flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2 text-xs sm:text-sm font-semibold text-subtle hover:bg-surface-2 hover:text-ink transition-colors"
          >
            {result?.ok ? 'Done' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPosting || !content.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPosting ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                <span>Publishing to Square…</span>
              </>
            ) : (
              <>
                <span>📢</span>
                <span>Publish to Binance Square</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
