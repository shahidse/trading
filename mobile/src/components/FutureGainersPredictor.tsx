import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { api } from '../services/api'
import {
  FutureCoinPrediction,
  FutureGainHorizon,
  PredictionCatalyst,
  PredictionsPayload,
} from '../types'
import { useTheme, formatPrice } from '../theme'

interface Props {
  activeSymbol?: string
  onSelectSymbol?: (symbol: string) => void
}

export const FutureGainersPredictor: React.FC<Props> = ({ activeSymbol, onSelectSymbol }) => {
  const { colors } = useTheme()
  const [data, setData] = useState<PredictionsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedHorizon, setSelectedHorizon] = useState<FutureGainHorizon | 'ALL'>('ALL')
  const [selectedCatalyst, setSelectedCatalyst] = useState<PredictionCatalyst | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [postingSymbol, setPostingSymbol] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadPredictions = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)
      setErrorMsg(null)
      const res = await api.getPredictions(refresh)
      setData(res)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load predictions')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadPredictions()
  }, [loadPredictions])

  const handleShareToSquare = async (pred: FutureCoinPrediction) => {
    setPostingSymbol(pred.symbol)
    try {
      const res = await api.publishToSquare({
        type: 'prediction',
        prediction: pred,
      })
      if (res.success) {
        Alert.alert(
          'Posted to Binance Square! 🚀',
          res.contentId
            ? `Successfully posted ${pred.symbol} prediction (Post ID: ${res.contentId}). Target tracking is now armed!`
            : `Successfully posted ${pred.symbol} prediction. Target tracking is now armed!`
        )
      } else {
        Alert.alert('Publish Failed', res.error || 'Failed to post to Binance Square')
      }
    } catch (err: any) {
      Alert.alert('Publish Error', err.message || 'Network error while posting to Binance Square')
    } finally {
      setPostingSymbol(null)
    }
  }

  const filteredPredictions = useMemo(() => {
    if (!data?.predictions) return []
    let list = [...data.predictions]

    if (selectedHorizon !== 'ALL') {
      list = list.filter((p) => p.horizon === selectedHorizon)
    }

    if (selectedCatalyst !== 'ALL') {
      list = list.filter((p) => p.catalyst === selectedCatalyst)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (p) =>
          p.symbol.toLowerCase().includes(q) ||
          p.base.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
      )
    }

    return list
  }, [data, selectedHorizon, selectedCatalyst, searchQuery])

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: colors.borderWidth,
          borderRadius: colors.borderRadiusCard,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.icon}>🔮</Text>
            <Text style={[styles.title, { color: colors.text }]}>AI Multi-Day Predictor</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
            Forward-looking machine predicting future coin pumps across 75+ liquid pairs
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => loadPredictions(true)}
          disabled={refreshing}
          style={[
            styles.refreshBtn,
            {
              backgroundColor: colors.surface2,
              borderColor: colors.borderSubtle,
              borderWidth: colors.borderWidth,
              borderRadius: colors.borderRadiusSm,
            },
          ]}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.refreshText, { color: colors.textMuted }]}>↻ Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Top Picks Row */}
      {data?.topPicks && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topPicksScroll}
        >
          {data.topPicks.best24h && (
            <TouchableOpacity
              onPress={() => onSelectSymbol?.(data.topPicks.best24h!.symbol)}
              style={[
                styles.pickCard,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.warning,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadiusSm,
                },
              ]}
            >
              <Text style={[styles.pickBadge, { color: colors.warning }]}>⚡ TOP 24H SURGE</Text>
              <Text style={[styles.pickSymbol, { color: colors.text }]}>
                {data.topPicks.best24h.base}
              </Text>
              <Text style={[styles.pickGain, { color: colors.bullish }]}>
                +{data.topPicks.best24h.predictedGainPctMin}% ~ +{data.topPicks.best24h.predictedGainPctMax}%
              </Text>
              <Text style={[styles.pickTarget, { color: colors.textSubtle }]}>
                Tgt: {formatPrice(data.topPicks.best24h.targetPriceLow)}
              </Text>
            </TouchableOpacity>
          )}

          {data.topPicks.best3Days && (
            <TouchableOpacity
              onPress={() => onSelectSymbol?.(data.topPicks.best3Days!.symbol)}
              style={[
                styles.pickCard,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.primary,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadiusSm,
                },
              ]}
            >
              <Text style={[styles.pickBadge, { color: colors.primary }]}>🚀 BEST 3-5D SWING</Text>
              <Text style={[styles.pickSymbol, { color: colors.text }]}>
                {data.topPicks.best3Days.base}
              </Text>
              <Text style={[styles.pickGain, { color: colors.bullish }]}>
                +{data.topPicks.best3Days.predictedGainPctMin}% ~ +{data.topPicks.best3Days.predictedGainPctMax}%
              </Text>
              <Text style={[styles.pickTarget, { color: colors.textSubtle }]}>
                Tgt: {formatPrice(data.topPicks.best3Days.targetPriceLow)}
              </Text>
            </TouchableOpacity>
          )}

          {data.topPicks.best7Days && (
            <TouchableOpacity
              onPress={() => onSelectSymbol?.(data.topPicks.best7Days!.symbol)}
              style={[
                styles.pickCard,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.neutral,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadiusSm,
                },
              ]}
            >
              <Text style={[styles.pickBadge, { color: colors.neutral }]}>💎 BEST 7D MACRO</Text>
              <Text style={[styles.pickSymbol, { color: colors.text }]}>
                {data.topPicks.best7Days.base}
              </Text>
              <Text style={[styles.pickGain, { color: colors.bullish }]}>
                +{data.topPicks.best7Days.predictedGainPctMin}% ~ +{data.topPicks.best7Days.predictedGainPctMax}%
              </Text>
              <Text style={[styles.pickTarget, { color: colors.textSubtle }]}>
                Tgt: {formatPrice(data.topPicks.best7Days.targetPriceLow)}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Horizon Filter Tabs */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'ALL', label: 'All Horizons' },
            { id: '24H', label: '⚡ Next 24H' },
            { id: '3_DAYS', label: '🚀 3-5 Days' },
            { id: '7_DAYS', label: '💎 7 Days' },
          ].map((h) => {
            const active = selectedHorizon === h.id
            return (
              <TouchableOpacity
                key={h.id}
                onPress={() => setSelectedHorizon(h.id as typeof selectedHorizon)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.primaryLight : colors.surface2,
                    borderColor: active ? colors.primary : colors.borderSubtle,
                    borderWidth: colors.borderWidth,
                    borderRadius: colors.borderRadiusSm,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: active ? colors.primary : colors.textMuted, fontWeight: active ? '700' : '500' },
                  ]}
                >
                  {h.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Catalyst Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'ALL', label: 'All Setups' },
            { id: 'WHALE_ACCUMULATION', label: '🐳 Whale Inflow' },
            { id: 'VOLATILITY_SQUEEZE', label: '💥 Squeeze' },
            { id: 'DAILY_GOLDEN_CROSS', label: '📈 Golden Cross' },
            { id: 'OVERSOLD_REVERSAL', label: '🔄 Reversal' },
          ].map((c) => {
            const active = selectedCatalyst === c.id
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedCatalyst(c.id as typeof selectedCatalyst)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.bullishBg : colors.surface2,
                    borderColor: active ? colors.bullishBorder : colors.borderSubtle,
                    borderWidth: colors.borderWidth,
                    borderRadius: colors.borderRadiusSm,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: active ? colors.bullish : colors.textMuted, fontWeight: active ? '700' : '500' },
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Search Input */}
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.surface2,
              borderColor: colors.borderSubtle,
              borderWidth: colors.borderWidth,
              borderRadius: colors.borderRadiusSm,
              color: colors.text,
            },
          ]}
          placeholder="Search by coin (e.g. ETH, SOL, PEPE)..."
          placeholderTextColor={colors.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSubtle }]}>
            Analyzing order flows, compression squeezes & momentum…
          </Text>
        </View>
      )}

      {/* Error state */}
      {errorMsg && (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: colors.bearishBg,
              borderColor: colors.bearishBorder,
              borderWidth: colors.borderWidth,
              borderRadius: colors.borderRadiusSm,
            },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.bearish }]}>{errorMsg}</Text>
        </View>
      )}

      {/* Predictions Card List */}
      {!loading && (
        <View style={styles.listContainer}>
          {filteredPredictions.map((pred) => {
            const isPosting = postingSymbol === pred.symbol
            const isSelected = activeSymbol === pred.symbol

            return (
              <View
                key={`${pred.symbol}-${pred.horizon}`}
                style={[
                  styles.predCard,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: isSelected ? colors.primary : colors.borderSubtle,
                    borderWidth: colors.borderWidth,
                    borderRadius: colors.borderRadius,
                  },
                ]}
              >
                {/* Card Top Row */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.symbolRow}>
                      <Text style={[styles.symbolText, { color: colors.text }]}>{pred.base}</Text>
                      <View
                        style={[
                          styles.horizonTag,
                          {
                            backgroundColor: colors.primaryLight,
                            borderColor: colors.primary,
                            borderWidth: colors.borderWidth,
                            borderRadius: colors.borderRadiusSm,
                          },
                        ]}
                      >
                        <Text style={[styles.horizonTagText, { color: colors.primary }]}>
                          {pred.horizonLabel}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.confTag,
                          {
                            backgroundColor: colors.bullishBg,
                            borderColor: colors.bullishBorder,
                            borderWidth: colors.borderWidth,
                            borderRadius: colors.borderRadiusSm,
                          },
                        ]}
                      >
                        <Text style={[styles.confTagText, { color: colors.bullish }]}>
                          {pred.confidenceScore}% Conf
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.nameText, { color: colors.textSubtle }]}>{pred.name}</Text>
                  </View>

                  <View style={styles.upsideBox}>
                    <Text style={[styles.upsideText, { color: colors.bullish }]}>
                      +{pred.predictedGainPctMin}% ~ +{pred.predictedGainPctMax}%
                    </Text>
                    <Text style={[styles.upsideLabel, { color: colors.textSubtle }]}>Projected Gain</Text>
                  </View>
                </View>

                {/* Key Price Levels */}
                <View style={[styles.levelsGrid, { borderTopColor: colors.borderSubtle }]}>
                  <View style={styles.levelCol}>
                    <Text style={[styles.levelHead, { color: colors.textSubtle }]}>Price</Text>
                    <Text style={[styles.levelVal, { color: colors.text }]}>
                      {formatPrice(pred.currentPrice)}
                    </Text>
                  </View>
                  <View style={styles.levelCol}>
                    <Text style={[styles.levelHead, { color: colors.textSubtle }]}>Target Range</Text>
                    <Text style={[styles.levelVal, { color: colors.bullish }]}>
                      {formatPrice(pred.targetPriceLow)} - {formatPrice(pred.targetPriceHigh)}
                    </Text>
                  </View>
                  <View style={styles.levelCol}>
                    <Text style={[styles.levelHead, { color: colors.textSubtle }]}>Stop Loss</Text>
                    <Text style={[styles.levelVal, { color: colors.bearish }]}>
                      {formatPrice(pred.stopLossPrice)} (-{pred.stopLossPct}%)
                    </Text>
                  </View>
                  <View style={styles.levelCol}>
                    <Text style={[styles.levelHead, { color: colors.textSubtle }]}>R:R</Text>
                    <Text style={[styles.levelVal, { color: colors.text }]}>
                      1 : {pred.riskRewardRatio}
                    </Text>
                  </View>
                </View>

                {/* Thesis & Triggers */}
                <Text style={[styles.thesisText, { color: colors.textMuted }]} numberOfLines={2}>
                  {pred.thesis}
                </Text>

                {/* Action Buttons Row */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => onSelectSymbol?.(pred.symbol)}
                    style={[
                      styles.chartBtn,
                      {
                        backgroundColor: colors.surface3,
                        borderColor: colors.borderSubtle,
                        borderWidth: colors.borderWidth,
                        borderRadius: colors.borderRadiusSm,
                      },
                    ]}
                  >
                    <Text style={[styles.chartBtnText, { color: colors.text }]}>
                      📈 View {pred.base} Chart
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleShareToSquare(pred)}
                    disabled={isPosting}
                    style={[
                      styles.squareBtn,
                      {
                        backgroundColor: colors.warningBg || '#f59e0b15',
                        borderColor: colors.warning || '#f59e0b',
                        borderWidth: colors.borderWidth,
                        borderRadius: colors.borderRadiusSm,
                      },
                    ]}
                  >
                    {isPosting ? (
                      <ActivityIndicator size="small" color={colors.warning} />
                    ) : (
                      <Text style={[styles.squareBtnText, { color: colors.warning }]}>
                        📢 Share to Square
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}

          {filteredPredictions.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: colors.textSubtle }]}>
                No coin setups match current filters. Try selecting &quot;All Horizons&quot;.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '700',
  },
  topPicksScroll: {
    gap: 8,
    paddingBottom: 10,
  },
  pickCard: {
    padding: 10,
    minWidth: 140,
  },
  pickBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pickSymbol: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  pickGain: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  pickTarget: {
    fontSize: 10,
    marginTop: 1,
  },
  filterSection: {
    gap: 8,
    marginBottom: 12,
  },
  filterScroll: {
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterPillText: {
    fontSize: 11,
  },
  searchInput: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 11,
  },
  errorBox: {
    padding: 10,
    marginVertical: 8,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContainer: {
    gap: 12,
  },
  predCard: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  symbolText: {
    fontSize: 16,
    fontWeight: '800',
  },
  horizonTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  horizonTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  confTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  confTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  nameText: {
    fontSize: 11,
    marginTop: 2,
  },
  upsideBox: {
    alignItems: 'flex-end',
  },
  upsideText: {
    fontSize: 14,
    fontWeight: '800',
  },
  upsideLabel: {
    fontSize: 9,
  },
  levelsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  levelCol: {
    flex: 1,
  },
  levelHead: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  levelVal: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  thesisText: {
    fontSize: 11,
    lineHeight: 15,
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  chartBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  squareBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
})
