import React, { useCallback, useEffect, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { api } from './src/services/api'
import { Candle, ChartPayload, PriceResponse, Signal, TradingStateResponse } from './src/types'
import {
  ThemeProvider,
  useTheme,
  formatPercent,
  formatPrice,
  formatTime,
} from './src/theme'
import { MiniCandleChart } from './src/components/MiniCandleChart'
import { SignalCard } from './src/components/SignalCard'
import { IndicatorList } from './src/components/IndicatorList'
import { TradingControls } from './src/components/TradingControls'
import { OrderHistory } from './src/components/OrderHistory'
import { SignalHistory } from './src/components/SignalHistory'
import { SettingsModal } from './src/components/SettingsModal'
import { ThemeSelector } from './src/components/ThemeSelector'

function MainScreen() {
  const { colors, colorMode, themeStyle, refreshInterval, showIndicators } = useTheme()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [priceData, setPriceData] = useState<PriceResponse | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [chartData, setChartData] = useState<ChartPayload | null>(null)
  const [tradingState, setTradingState] = useState<TradingStateResponse | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())
  const [showSettings, setShowSettings] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Active tab for Playful (Social-Fi) and Neofuturistic tabbed cockpit
  const [activeTab, setActiveTab] = useState<'alpha' | 'chart' | 'indicators' | 'guards' | 'orders'>('alpha')

  const loadData = useCallback(async () => {
    try {
      setErrorMsg(null)
      const [pRes, sRes, cRes, tRes] = await Promise.all([
        api.getPrice().catch((e) => {
          console.warn('Price fetch error:', e.message)
          return null
        }),
        api.getSignals(30).catch((e) => {
          console.warn('Signals fetch error:', e.message)
          return { signals: [] }
        }),
        api.getChart(50).catch((e) => {
          console.warn('Chart fetch error:', e.message)
          return null
        }),
        api.getTrades().catch((e) => {
          console.warn('Trades fetch error:', e.message)
          return null
        }),
      ])

      if (pRes) setPriceData(pRes)
      if (sRes?.signals) setSignals(sRes.signals)
      if (cRes) setChartData(cRes)
      if (tRes) setTradingState(tRes)

      setLastUpdated(Date.now())
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load data from server')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    if (refreshInterval > 0) {
      const interval = setInterval(loadData, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [loadData, refreshInterval])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true)
      setErrorMsg(null)
      await api.runAnalyze()
      await loadData()
      Alert.alert('Analysis Complete', 'Generated new 15m signal and evaluated safety guards.')
    } catch (err: any) {
      Alert.alert('Analysis Failed', err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const latestSignal = signals[0] ?? null

  const isDataDriven = themeStyle === 'data-driven'
  const isNeofuturistic = themeStyle === 'neofuturistic'
  const isPlayful = themeStyle === 'playful'
  const isBrutalist = themeStyle === 'brutalist'

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={colorMode === 'dark' ? 'light-content' : 'dark-content'}
      />

      {/* Top Header */}
      <View
        style={[
          styles.navBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: colors.borderWidth,
            paddingVertical: isDataDriven ? 8 : 14,
          },
        ]}
      >
        <View>
          <Text
            style={[
              styles.logoTitle,
              {
                color: colors.text,
                fontFamily: isBrutalist ? 'monospace' : undefined,
                fontWeight: isBrutalist || isPlayful ? '900' : '800',
              },
            ]}
          >
            ETH SIGNAL {isBrutalist ? '■' : isPlayful ? '🚀' : isNeofuturistic ? '◈' : ''}
          </Text>
          <Text style={[styles.logoSubtitle, { color: colors.textMuted }]}>
            {isDataDriven
              ? 'Pro Quant 15m Terminal'
              : isNeofuturistic
              ? 'AI-Synthesized Market Matrix'
              : isPlayful
              ? 'Social-Fi Spot Alpha'
              : 'RAW SPOT PROTOCOL'}
          </Text>
        </View>

        <View style={styles.navActions}>
          <TouchableOpacity
            style={[
              styles.settingsBtn,
              {
                backgroundColor: colors.surface2,
                borderColor: colors.border,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusSm,
              },
            ]}
            onPress={() => setShowSettings(true)}
          >
            <Text style={[styles.settingsBtnText, { color: colors.text }]}>⚙ Config</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            padding: isDataDriven ? 10 : isBrutalist ? 12 : 16,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Error notification banner */}
        {errorMsg && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.bearishBg,
                borderColor: colors.bearishBorder,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadius,
              },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.bearish }]}>⚠ {errorMsg}</Text>
            <Text style={[styles.errorSub, { color: colors.textMuted }]}>
              Tap ⚙ Config to configure your backend endpoint.
            </Text>
          </View>
        )}

        {/* =========================================================================
            ARCHETYPE LAYOUT 1: DATA-DRIVEN PRO (Condensed Compact Quant Terminal)
           ========================================================================= */}
        {isDataDriven && (
          <View style={styles.layoutWrapper}>
            {/* Ultra-dense inline ticker row */}
            <View style={[styles.tickerRowDataDriven, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={styles.tickerItem}>
                <Text style={[styles.tickerLabel, { color: colors.textSubtle }]}>BINANCE ETH</Text>
                <Text style={[styles.tickerVal, { color: colors.text }]}>{formatPrice(priceData?.price)}</Text>
              </View>
              <View style={[styles.tickerDivider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.tickerItem}>
                <Text style={[styles.tickerLabel, { color: colors.textSubtle }]}>CHAINLINK</Text>
                <Text style={[styles.tickerVal, { color: colors.text }]}>{formatPrice(priceData?.chainlink?.price)}</Text>
              </View>
              <View style={[styles.tickerDivider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.tickerItem}>
                <Text style={[styles.tickerLabel, { color: colors.textSubtle }]}>DIVERGENCE</Text>
                <Text style={[styles.tickerVal, { color: colors.primary }]}>{priceData?.divergencePct != null ? `${priceData.divergencePct}%` : '0.0%'}</Text>
              </View>
            </View>

            {/* Quick Trigger Bar */}
            <View style={styles.denseActionBar}>
              <TouchableOpacity
                style={[styles.denseActionBtn, { backgroundColor: colors.primary, borderRadius: colors.borderRadiusSm }]}
                onPress={handleRunAnalysis}
                disabled={analyzing}
              >
                {analyzing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.denseActionBtnText}>▶ RUN 15M QUANT PIPELINE</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.denseRefreshBtn, { borderColor: colors.border, backgroundColor: colors.surface2, borderRadius: colors.borderRadiusSm }]}
                onPress={onRefresh}
              >
                <Text style={[styles.denseRefreshText, { color: colors.textMuted }]}>↻</Text>
              </TouchableOpacity>
            </View>

            {/* Candlestick Chart High Priority */}
            {chartData && (
              <MiniCandleChart
                candles={chartData.series?.candles || []}
                levels={latestSignal?.plan?.levels}
                height={200}
              />
            )}

            {/* Quantitative Signal Analysis */}
            {latestSignal && <SignalCard signal={latestSignal} />}
            <TradingControls state={tradingState} onRefresh={loadData} />
            {tradingState?.orders && (
              <OrderHistory
                orders={tradingState.orders}
                openPosition={tradingState.openPosition}
                realisedPnl24h={tradingState.realisedPnl24h}
              />
            )}
            {showIndicators && latestSignal && <IndicatorList indicators={latestSignal.indicators || []} />}
            <SignalHistory signals={signals} />
          </View>
        )}

        {/* =========================================================================
            ARCHETYPE LAYOUT 2: NEOFUTURISTIC AI (HUD Cockpit with Segmented Matrix)
           ========================================================================= */}
        {isNeofuturistic && (
          <View style={styles.layoutWrapper}>
            {/* Glowing HUD Card Header */}
            <View style={[styles.hudBanner, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: colors.borderWidth, borderRadius: colors.borderRadiusCard }]}>
              <View style={styles.hudTop}>
                <View>
                  <Text style={[styles.hudSub, { color: colors.primary }]}>SYSTEM STATUS: ONLINE</Text>
                  <Text style={[styles.hudPrice, { color: colors.text }]}>{formatPrice(priceData?.price)}</Text>
                </View>
                <View style={styles.hudRight}>
                  <Text style={[styles.hudSub, { color: colors.textSubtle }]}>CONFIDENCE</Text>
                  <Text style={[styles.hudConfidence, { color: colors.bullish }]}>{latestSignal ? `${latestSignal.confidence}%` : '—'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.hudScanBtn, { backgroundColor: colors.primary, borderRadius: colors.borderRadius }]}
                onPress={handleRunAnalysis}
                disabled={analyzing}
              >
                {analyzing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.hudScanBtnText}>⚡ EXECUTE AI CONFLUENCE SYNTHESIS</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Interactive Segments Bar */}
            <View style={styles.segmentBar}>
              {(['alpha', 'chart', 'indicators', 'guards', 'orders'] as const).map((tab) => {
                const active = activeTab === tab
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[
                      styles.segmentTab,
                      {
                        backgroundColor: active ? colors.primaryLight : colors.surface,
                        borderColor: active ? colors.primary : colors.borderSubtle,
                        borderWidth: colors.borderWidth,
                        borderRadius: colors.borderRadiusSm,
                      },
                    ]}
                  >
                    <Text style={[styles.segmentTabText, { color: active ? colors.primary : colors.textMuted, fontWeight: active ? '800' : '600' }]}>
                      {tab.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Segment Content */}
            {activeTab === 'alpha' && latestSignal && <SignalCard signal={latestSignal} />}
            {activeTab === 'chart' && chartData && (
              <MiniCandleChart
                candles={chartData.series?.candles || []}
                levels={latestSignal?.plan?.levels}
                height={260}
              />
            )}
            {activeTab === 'indicators' && latestSignal && (
              <IndicatorList indicators={latestSignal.indicators || []} />
            )}
            {activeTab === 'guards' && (
              <TradingControls state={tradingState} onRefresh={loadData} />
            )}
            {activeTab === 'orders' && (
              <OrderHistory
                orders={tradingState?.orders || []}
                openPosition={tradingState?.openPosition}
                realisedPnl24h={tradingState?.realisedPnl24h}
              />
            )}

            <SignalHistory signals={signals} />
          </View>
        )}

        {/* =========================================================================
            ARCHETYPE LAYOUT 3: PLAYFUL SOCIAL-FI (Card Feed, Action Target First)
           ========================================================================= */}
        {isPlayful && (
          <View style={styles.layoutWrapper}>
            {/* Giant Action Callout Card */}
            {latestSignal ? (
              <View style={[styles.playfulAlphaCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: colors.borderWidth, borderRadius: colors.borderRadiusCard }]}>
                <View style={styles.playfulTopRow}>
                  <Text style={styles.playfulTag}>🔥 SIGNAL ALERT</Text>
                  <Text style={[styles.playfulActionBadge, { color: latestSignal.plan.action === 'BUY' ? colors.bullish : colors.bearish }]}>
                    {latestSignal.plan.action}
                  </Text>
                </View>
                <Text style={[styles.playfulHeadline, { color: colors.text }]}>{latestSignal.plan.headline}</Text>

                <TouchableOpacity
                  style={[styles.playfulCtaBtn, { backgroundColor: colors.primary, borderRadius: colors.borderRadius }]}
                  onPress={handleRunAnalysis}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.playfulCtaText}>🚀 SCAN ALPHA NOW</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Candlestick Chart */}
            {chartData && (
              <MiniCandleChart
                candles={chartData.series?.candles || []}
                levels={latestSignal?.plan?.levels}
                height={230}
              />
            )}

            {latestSignal && <SignalCard signal={latestSignal} />}
            <TradingControls state={tradingState} onRefresh={loadData} />
            {tradingState?.orders && (
              <OrderHistory
                orders={tradingState.orders}
                openPosition={tradingState.openPosition}
                realisedPnl24h={tradingState.realisedPnl24h}
              />
            )}
            {showIndicators && latestSignal && <IndicatorList indicators={latestSignal.indicators || []} />}
            <SignalHistory signals={signals} />
          </View>
        )}

        {/* =========================================================================
            ARCHETYPE LAYOUT 4: HIGH-CONTRAST NEO-BRUTALIST (Editorial Stack)
           ========================================================================= */}
        {isBrutalist && (
          <View style={styles.layoutWrapper}>
            {/* Raw Headline Strip */}
            <View style={[styles.brutalistStrip, { backgroundColor: colors.primary, borderColor: colors.border }]}>
              <Text style={styles.brutalistStripText}>
                ETH SPOT CONFLUENCE PROTOCOL // ACTIVE
              </Text>
            </View>

            {/* Big Heavy Price Box */}
            <View style={[styles.brutalistPriceBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.brutalistPriceTitle, { color: colors.textSubtle }]}>
                SPOT ETH/USDT:
              </Text>
              <Text style={[styles.brutalistPriceValue, { color: colors.text }]}>
                {formatPrice(priceData?.price)}
              </Text>

              <TouchableOpacity
                style={[styles.brutalistBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                onPress={handleRunAnalysis}
                disabled={analyzing}
              >
                <Text style={[styles.brutalistBtnText, { color: colors.text }]}>
                  {analyzing ? '[COMPUTING...]' : '[EXECUTE SIGNAL PIPELINE]'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chart with thick brutal border */}
            {chartData && (
              <View style={[styles.brutalistChartWrapper, { borderColor: colors.border }]}>
                <MiniCandleChart
                  candles={chartData.series?.candles || []}
                  levels={latestSignal?.plan?.levels}
                  height={220}
                />
              </View>
            )}

            {latestSignal && <SignalCard signal={latestSignal} />}
            <TradingControls state={tradingState} onRefresh={loadData} />
            {tradingState?.orders && (
              <OrderHistory
                orders={tradingState.orders}
                openPosition={tradingState.openPosition}
                realisedPnl24h={tradingState.realisedPnl24h}
              />
            )}
            {showIndicators && latestSignal && <IndicatorList indicators={latestSignal.indicators || []} />}
            <SignalHistory signals={signals} />
          </View>
        )}
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}
      >
        <SettingsModal
          onClose={() => {
            setShowSettings(false)
            loadData()
          }}
        />
      </Modal>
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <MainScreen />
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  logoTitle: {
    fontSize: 15,
    letterSpacing: 0.8,
  },
  logoSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  settingsBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  layoutWrapper: {
    gap: 14,
  },
  errorBanner: {
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '700',
  },
  errorSub: {
    fontSize: 10,
    marginTop: 2,
  },

  // 1. Data-Driven Styles
  tickerRowDataDriven: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  tickerItem: {
    alignItems: 'center',
  },
  tickerLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tickerVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  tickerDivider: {
    width: 1,
    height: 18,
  },
  denseActionBar: {
    flexDirection: 'row',
    gap: 6,
  },
  denseActionBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  denseActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  denseRefreshBtn: {
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  denseRefreshText: {
    fontSize: 14,
    fontWeight: '800',
  },

  // 2. Neofuturistic AI Styles
  hudBanner: {
    padding: 14,
  },
  hudTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  hudSub: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  hudPrice: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  hudRight: {
    alignItems: 'flex-end',
  },
  hudConfidence: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  hudScanBtn: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudScanBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  segmentBar: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },

  // 3. Playful Social-Fi Styles
  playfulAlphaCard: {
    padding: 18,
  },
  playfulTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  playfulTag: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ff007a',
  },
  playfulActionBadge: {
    fontSize: 15,
    fontWeight: '900',
  },
  playfulHeadline: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 14,
  },
  playfulCtaBtn: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playfulCtaText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // 4. Neo-Brutalist Styles
  brutalistStrip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 2,
  },
  brutalistStripText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#000',
  },
  brutalistPriceBox: {
    padding: 14,
    borderWidth: 2.5,
  },
  brutalistPriceTitle: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  brutalistPriceValue: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginVertical: 4,
  },
  brutalistBtn: {
    borderWidth: 2,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  brutalistBtnText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  brutalistChartWrapper: {
    borderWidth: 2.5,
    padding: 6,
  },
})
