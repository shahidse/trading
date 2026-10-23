import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { ScannedHotCoin, ScannerResult } from '../types'
import { api } from '../services/api'
import { useTheme, formatPrice, formatPercent } from '../theme'

interface Props {
  activeSymbol: string
  onSelectSymbol: (symbol: string) => void
}

function formatVolume(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

export const HotCoinsRadar: React.FC<Props> = ({ activeSymbol, onSelectSymbol }) => {
  const { colors } = useTheme()
  const [data, setData] = useState<ScannerResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'breakout' | 'hot' | 'pre-pump' | 'gainers'>('breakout')
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [expanded, setExpanded] = useState(false)

  async function loadScanner() {
    try {
      const res = await api.getScanner()
      setData(res)
    } catch {
      // Degrade gracefully
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadScanner()
    const timer = setInterval(() => void loadScanner(), 20_000)
    return () => clearInterval(timer)
  }, [])

  const basePool: ScannedHotCoin[] = !data
    ? []
    : data.allCoins || data.hotCoins || []

  const categoryPool: ScannedHotCoin[] =
    filterCategory === 'All'
      ? basePool
      : basePool.filter((c: ScannedHotCoin) =>
          c.category?.toLowerCase().includes(filterCategory.toLowerCase()),
        )

  const sortFn = (a: ScannedHotCoin, b: ScannedHotCoin) =>
    b.heatScore - a.heatScore || b.rangePositionPct - a.rangePositionPct || b.quoteVolume - a.quoteVolume

  const currentList: ScannedHotCoin[] = !data
    ? []
    : activeTab === 'breakout'
    ? (() => {
        const breakouts = categoryPool.filter(
          (c: ScannedHotCoin) => c.signalType === 'BREAKOUT_IMMINENT' || c.signalType === 'MOMENTUM_SURGE',
        )
        return [...(breakouts.length > 0 ? breakouts : categoryPool)].sort(sortFn)
      })()
    : activeTab === 'hot'
    ? [...categoryPool].sort(sortFn)
    : activeTab === 'pre-pump'
    ? (() => {
        const prepumps = categoryPool.filter((c: ScannedHotCoin) => c.signalType === 'PRE_PUMP_ACCUMULATION')
        return [...(prepumps.length > 0 ? prepumps : categoryPool)].sort(sortFn)
      })()
    : [...categoryPool].sort((a: ScannedHotCoin, b: ScannedHotCoin) => b.change24h - a.change24h)

  const filteredCoins = currentList

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
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerIcon}>🔥</Text>
          <Text style={[styles.title, { color: colors.text }]}>Hot Coins & Breakout Radar</Text>
          <View style={[styles.liveBadge, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
            <Text style={[styles.liveBadgeText, { color: colors.warning }]}>AI SCANNER</Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
          Surge detection & breakout prediction across 75+ altcoins & memes
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surface2, borderRadius: colors.borderRadius }]}>
        {[
          { id: 'breakout', label: '⚡ Breakout', key: 'breakout' },
          { id: 'hot', label: '🎯 Top Heat', key: 'hot' },
          { id: 'pre-pump', label: '💎 Accumulation', key: 'pre-pump' },
          { id: 'gainers', label: '🚀 Gainers', key: 'gainers' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id as typeof activeTab)}
              style={[
                styles.tabButton,
                {
                  backgroundColor: isSelected ? colors.primary : 'transparent',
                  borderRadius: colors.borderRadiusSm,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color: isSelected ? '#ffffff' : colors.textMuted,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Category Pills */}
      <View style={styles.categoryPills}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', 'Meme', 'Fan Token', 'AI / Data', 'Layer 1', 'DeFi', 'Layer 2']}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryPillsContent}
          renderItem={({ item }) => {
            const isSelected = filterCategory === item
            return (
              <TouchableOpacity
                onPress={() => setFilterCategory(item)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.surface2,
                    borderColor: isSelected ? colors.primary : colors.borderSubtle,
                    borderWidth: colors.borderWidth,
                    borderRadius: colors.borderRadiusSm,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: isSelected ? colors.primary : colors.textSubtle,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {/* List */}
      {loading && !data ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSubtle }]}>
            Scanning order books & volume surges...
          </Text>
        </View>
      ) : filteredCoins.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSubtle }]}>
            No hot setups found in this category right now.
          </Text>
        </View>
      ) : (
        <View style={styles.cardsContainer}>
          {filteredCoins.slice(0, expanded ? 24 : 8).map((coin, index) => {
            const isSelected = activeSymbol === coin.symbol
            const isPositive = coin.change24h >= 0
            const isTopPick = index === 0

            return (
              <View
                key={coin.symbol}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: isSelected
                      ? colors.primary
                      : isTopPick
                      ? colors.warning
                      : colors.borderSubtle,
                    borderWidth: isTopPick || isSelected ? 2 : colors.borderWidth,
                    borderRadius: colors.borderRadius,
                  },
                ]}
              >
                {/* #1 Top Pump Pick Header */}
                {isTopPick && (
                  <View style={[styles.topPickBanner, { borderBottomColor: colors.borderSubtle }]}>
                    <Text style={[styles.topPickText, { color: colors.warning }]}>
                      👑 #1 TOP PUMP PICK ({coin.heatScore}%)
                    </Text>
                    <Text style={[styles.topPickSub, { color: colors.warning }]}>
                      HIGHEST ODDS
                    </Text>
                  </View>
                )}

                {/* Top: Rank, Symbol, Price, Change */}
                <View style={styles.cardHeader}>
                  <View style={styles.coinMeta}>
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor:
                            coin.rank === 1
                              ? '#f59e0b'
                              : coin.rank === 2
                              ? '#94a3b8'
                              : coin.rank === 3
                              ? '#b45309'
                              : colors.surface3,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankText,
                          { color: coin.rank <= 3 ? '#ffffff' : colors.textMuted },
                        ]}
                      >
                        #{coin.rank}
                      </Text>
                    </View>
                    <View>
                      <View style={styles.symbolRow}>
                        <Text style={[styles.coinBase, { color: colors.text }]}>{coin.base}</Text>
                        <View style={[styles.categoryBadge, { backgroundColor: colors.surface3 }]}>
                          <Text style={[styles.categoryBadgeText, { color: colors.textMuted }]}>
                            {coin.category}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.coinName, { color: colors.textSubtle }]} numberOfLines={1}>
                        {coin.name}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={[styles.priceText, { color: colors.text }]}>
                      {formatPrice(coin.price)}
                    </Text>
                    <Text
                      style={[
                        styles.changeText,
                        { color: isPositive ? colors.bullish : colors.bearish },
                      ]}
                    >
                      {isPositive ? '+' : ''}
                      {coin.change24h}%
                    </Text>
                  </View>
                </View>

                {/* Breakout Probability Bar */}
                <View style={styles.heatBarContainer}>
                  <View style={styles.heatLabelRow}>
                    <Text style={[styles.heatLabel, { color: colors.textSubtle }]}>
                      Breakout Probability
                    </Text>
                    <Text
                      style={[
                        styles.heatScore,
                        {
                          color:
                            coin.heatScore >= 85
                              ? colors.warning
                              : coin.heatScore >= 70
                              ? colors.bullish
                              : colors.primary,
                        },
                      ]}
                    >
                      {coin.heatScore}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.heatTrack,
                      { backgroundColor: colors.surface3, borderRadius: colors.borderRadiusSm },
                    ]}
                  >
                    <View
                      style={[
                        styles.heatFill,
                        {
                          width: `${coin.heatScore}%`,
                          backgroundColor:
                            coin.heatScore >= 85
                              ? colors.warning
                              : coin.heatScore >= 70
                              ? colors.bullish
                              : colors.primary,
                          borderRadius: colors.borderRadiusSm,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Range and Volume */}
                <View style={[styles.statsRow, { borderTopColor: colors.borderSubtle }]}>
                  <Text style={[styles.statsText, { color: colors.textSubtle }]}>
                    24h Range: <Text style={{ color: colors.text, fontWeight: '700' }}>{coin.rangePositionPct}%</Text>
                  </Text>
                  <Text style={[styles.statsText, { color: colors.textSubtle }]}>
                    Vol: <Text style={{ color: colors.text, fontWeight: '700' }}>{formatVolume(coin.quoteVolume)}</Text>
                  </Text>
                </View>

                {/* Expected Pump Timing & Target Expansion */}
                <View
                  style={[
                    styles.pumpMetricsBox,
                    {
                      backgroundColor: colors.surface3,
                      borderColor: colors.borderSubtle,
                      borderRadius: colors.borderRadiusSm,
                    },
                  ]}
                >
                  <View style={styles.pumpMetricRow}>
                    <Text style={[styles.pumpMetricLabel, { color: colors.textSubtle }]}>
                      ⏱️ Expected Window
                    </Text>
                    <View
                      style={[
                        styles.pumpWindowBadge,
                        {
                          backgroundColor:
                            coin.pumpWindow === 'IMMINENT_15M'
                              ? colors.warningBg
                              : coin.pumpWindow === 'SHORT_TERM_1H'
                              ? colors.bullishBg
                              : colors.primaryLight,
                          borderColor:
                            coin.pumpWindow === 'IMMINENT_15M'
                              ? colors.warningBorder
                              : coin.pumpWindow === 'SHORT_TERM_1H'
                              ? colors.bullishBorder
                              : colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pumpWindowBadgeText,
                          {
                            color:
                              coin.pumpWindow === 'IMMINENT_15M'
                                ? colors.warning
                                : coin.pumpWindow === 'SHORT_TERM_1H'
                                ? colors.bullish
                                : colors.primary,
                          },
                        ]}
                      >
                        {coin.expectedPumpTime}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.pumpMetricRow, { marginTop: 4 }]}>
                    <Text style={[styles.pumpMetricLabel, { color: colors.textSubtle }]}>
                      🎯 Target Expansion
                    </Text>
                    <View style={styles.pumpTargetCol}>
                      <Text style={[styles.pumpTargetPercent, { color: colors.bullish }]}>
                        +{coin.predictedUpsidePct}% ~ +{coin.predictedUpsideMaxPct}%
                      </Text>
                      <Text style={[styles.pumpTargetPrice, { color: colors.textMuted }]}>
                        ({formatPrice(coin.targetPrice)})
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.pumpProfitRow,
                      { borderTopColor: colors.borderSubtle },
                    ]}
                  >
                    <Text style={[styles.pumpProfitLabel, { color: colors.textSubtle }]}>
                      Est. Profit / $1k Spot:
                    </Text>
                    <Text style={[styles.pumpProfitValue, { color: colors.text }]}>
                      +${coin.expectedGainPer1k} ~ +${coin.expectedGainMaxPer1k}
                    </Text>
                  </View>
                </View>

                {/* Action & Tag */}
                <View style={styles.cardActions}>
                  <View
                    style={[
                      styles.signalTypeTag,
                      {
                        backgroundColor:
                          coin.signalType === 'BREAKOUT_IMMINENT'
                            ? colors.warningBg
                            : coin.signalType === 'MOMENTUM_SURGE'
                            ? colors.bullishBg
                            : colors.primaryLight,
                        borderColor:
                          coin.signalType === 'BREAKOUT_IMMINENT'
                            ? colors.warningBorder
                            : coin.signalType === 'MOMENTUM_SURGE'
                            ? colors.bullishBorder
                            : colors.primary,
                        borderWidth: colors.borderWidth,
                        borderRadius: colors.borderRadiusSm,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.signalTypeTagText,
                        {
                          color:
                            coin.signalType === 'BREAKOUT_IMMINENT'
                              ? colors.warning
                              : coin.signalType === 'MOMENTUM_SURGE'
                              ? colors.bullish
                              : colors.primary,
                        },
                      ]}
                    >
                      {coin.signalType === 'BREAKOUT_IMMINENT'
                        ? '⚡ Breakout'
                        : coin.signalType === 'MOMENTUM_SURGE'
                        ? '🚀 Surge'
                        : coin.signalType === 'PRE_PUMP_ACCUMULATION'
                        ? '💎 Accum'
                        : '🔄 Dip'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => onSelectSymbol(coin.symbol)}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                        borderWidth: colors.borderWidth,
                        borderRadius: colors.borderRadiusSm,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        {
                          color: isSelected ? '#ffffff' : colors.text,
                          fontWeight: isSelected ? '800' : '600',
                        },
                      ]}
                    >
                      {isSelected ? '✓ Active' : 'Analyze →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
          {filteredCoins.length > 8 && (
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              style={[
                styles.expandBtn,
                {
                  backgroundColor: colors.surface3,
                  borderColor: colors.borderSubtle,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadius,
                },
              ]}
            >
              <Text style={[styles.expandBtnText, { color: colors.text }]}>
                {expanded ? '▲ Collapse Watchlist' : `▼ Show All (${filteredCoins.length}) Breakout Setups`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  liveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 11,
  },
  categoryPills: {
    marginBottom: 12,
  },
  categoryPillsContent: {
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 11,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
  cardsContainer: {
    gap: 10,
  },
  card: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  coinMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 10,
    fontWeight: '800',
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinBase: {
    fontSize: 14,
    fontWeight: '800',
  },
  categoryBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  coinName: {
    fontSize: 11,
    maxWidth: 120,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  heatBarContainer: {
    marginTop: 8,
  },
  heatLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heatLabel: {
    fontSize: 10,
  },
  heatScore: {
    fontSize: 11,
    fontWeight: '900',
  },
  heatTrack: {
    height: 6,
    overflow: 'hidden',
  },
  heatFill: {
    height: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 8,
  },
  statsText: {
    fontSize: 10,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  signalTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  signalTypeTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  actionBtnText: {
    fontSize: 11,
  },
  expandBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  expandBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  topPickBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  topPickText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  topPickSub: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pumpMetricsBox: {
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
  },
  pumpMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pumpMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  pumpWindowBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  pumpWindowBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  pumpTargetCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pumpTargetPercent: {
    fontSize: 11,
    fontWeight: '800',
  },
  pumpTargetPrice: {
    fontSize: 10,
    fontWeight: '600',
  },
  pumpProfitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderStyle: 'dashed',
    paddingTop: 4,
    marginTop: 4,
  },
  pumpProfitLabel: {
    fontSize: 9,
    fontWeight: '500',
  },
  pumpProfitValue: {
    fontSize: 10,
    fontWeight: '700',
  },
})
