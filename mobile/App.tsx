import React, { useCallback, useEffect, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { api } from './src/services/api'
import { Candle, ChartPayload, CoinInfo, PriceResponse, Signal, TradingStateResponse } from './src/types'
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
import { CoinSelectorModal } from './src/components/CoinSelectorModal'
import { HotCoinsRadar } from './src/components/HotCoinsRadar'

function MainScreen() {
  const { colors, colorMode, themeStyle, refreshInterval, showIndicators } = useTheme()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('ETH/USDT')
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1m' | '15m' | '1h' | '4h'>('15m')
  const [coins, setCoins] = useState<CoinInfo[]>([])
  const [showCoinSelector, setShowCoinSelector] = useState(false)
  const [priceData, setPriceData] = useState<PriceResponse | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [chartData, setChartData] = useState<ChartPayload | null>(null)
  const [tradingState, setTradingState] = useState<TradingStateResponse | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())
  const [showSettings, setShowSettings] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Active tab for Neofuturistic tabbed cockpit
  const [activeTab, setActiveTab] = useState<'alpha' | 'radar' | 'chart' | 'indicators' | 'guards' | 'orders'>('alpha')

  const loadData = useCallback(async () => {
    try {
      setErrorMsg(null)
      const [pRes, sRes, cRes, tRes, coinsRes] = await Promise.all([
        api.getPrice(selectedSymbol, selectedTimeframe).catch((e) => {
          console.warn('Price fetch error:', e.message)
          return null
        }),
        api.getSignals(30, selectedSymbol).catch((e) => {
          console.warn('Signals fetch error:', e.message)
          return { signals: [] }
        }),
        api.getChart(50, selectedSymbol, selectedTimeframe).catch((e) => {
          console.warn('Chart fetch error:', e.message)
          return null
        }),
        api.getTrades(selectedSymbol).catch((e) => {
          console.warn('Trades fetch error:', e.message)
          return null
        }),
        api.getCoins().catch(() => null),
      ])

      if (pRes) setPriceData(pRes)
      if (sRes?.signals) setSignals(sRes.signals)
      if (cRes) setChartData(cRes)
      if (tRes) setTradingState(tRes)
      if (coinsRes?.coins) setCoins(coinsRes.coins)

      setLastUpdated(Date.now())
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load data from server')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedSymbol, selectedTimeframe])

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
      await api.runAnalyze(selectedSymbol, selectedTimeframe)
      await loadData()
      Alert.alert(
        'Analysis Complete',
        `Generated new ${selectedTimeframe.toUpperCase()} signal for ${selectedSymbol} with macro trend alignment.`
      )
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
              styles.coinSelectorBtn,
              {
                backgroundColor: colors.surface2,
                borderColor: colors.border,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusSm,
              },
            ]}
            onPress={() => setShowCoinSelector(true)}
          >
            <Text style={[styles.coinSelectorText, { color: colors.primary }]}>
              {selectedSymbol} <Text style={{ color: colors.textSubtle }}>▼</Text>
            </Text>
          </TouchableOpacity>

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

      {/* Strategy Timeframe Bar */}
      <View
        style={[
          styles.timeframeBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderSubtle,
            borderBottomWidth: colors.borderWidth,
          },
        ]}
      >
        {[
          { tf: '1m', label: '1m Scalp', icon: '⚡' },
          { tf: '15m', label: '15m Intraday', icon: '🎯' },
          { tf: '1h', label: '1h Swing', icon: '📈' },
          { tf: '4h', label: '4h Macro', icon: '🏔' },
        ].map(({ tf, icon }) => {
          const isSelected = selectedTimeframe === tf
          return (
            <TouchableOpacity
              key={tf}
              onPress={() => setSelectedTimeframe(tf as any)}
              style={[
                styles.tfButton,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surface2,
                  borderColor: isSelected ? colors.primary : colors.borderSubtle,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadiusSm,
                },
              ]}
            >
              <Text
                style={[
                  styles.tfButtonText,
                  {
                    color: isSelected ? '#ffffff' : colors.textMuted,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {icon} {tf.toUpperCase()}
              </Text>
            </TouchableOpacity>
          )
        })}
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
                <Text style={[styles.tickerLabel, { color: colors.textSubtle }]}>BINANCE {selectedSymbol.split('/')[0]}</Text>
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
                  <Text style={styles.denseActionBtnText}>▶ RUN {selectedTimeframe.toUpperCase()} QUANT PIPELINE</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.denseRefreshBtn, { borderColor: colors.border, backgroundColor: colors.surface2, borderRadius: colors.borderRadiusSm }]}
                onPress={onRefresh}
              >
                <Text style={[styles.denseRefreshText, { color: colors.textMuted }]}>↻</Text>
              </TouchableOpacity>
            </View>

            {/* Hot Coins & Breakout Radar */}
            <HotCoinsRadar
              activeSymbol={selectedSymbol}
              onSelectSymbol={(sym) => setSelectedSymbol(sym)}
            />

            {/* Candlestick Chart High Priority */}
            {chartData && (
              <MiniCandleChart
                candles={chartData.series?.candles || []}
                levels={latestSignal?.plan?.levels}
                height={200}
                symbol={selectedSymbol}
                timeframe={selectedTimeframe}
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
                  <Text style={styles.hudScanBtnText}>⚡ EXECUTE {selectedTimeframe.toUpperCase()} AI CONFLUENCE</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Interactive Segments Bar */}
            <View style={styles.segmentBar}>
              {(['alpha', 'radar', 'chart', 'indicators', 'guards', 'orders'] as const).map((tab) => {
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
            {activeTab === 'radar' && (
              <HotCoinsRadar
                activeSymbol={selectedSymbol}
                onSelectSymbol={(sym) => {
                  setSelectedSymbol(sym)
                  setActiveTab('alpha')
                }}
              />
            )}
            {activeTab === 'chart' && chartData && (
              <MiniCandleChart
                candles={chartData.series?.candles || []}
                levels={latestSignal?.plan?.levels}
                height={260}
                symbol={selectedSymbol}
                timeframe={selectedTimeframe}
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
                  <Text style={styles.playfulTag}>🔥 SIGNAL ALERT · {selectedSymbol}</Text>
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
                    <Text style={styles.playfulCtaText}>🚀 SCAN {selectedTimeframe.toUpperCase()} ALPHA NOW</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Hot Coins Radar */}
            <HotCoinsRadar
              activeSymbol={selectedSymbol}
              onSelectSymbol={(sym) => setSelectedSymbol(sym)}
            />

            {/* Candlestick Chart */}
            {chartData && (
              <MiniCandleChart
                candles={chartData.series?.candles || []}
                levels={latestSignal?.plan?.levels}
                height={230}
                symbol={selectedSymbol}
                timeframe={selectedTimeframe}
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
                {selectedSymbol} SPOT CONFLUENCE PROTOCOL // ACTIVE
              </Text>
            </View>

            {/* Big Heavy Price Box */}
            <View style={[styles.brutalistPriceBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.brutalistPriceTitle, { color: colors.textSubtle }]}>
                SPOT {selectedSymbol}:
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
                  {analyzing ? '[COMPUTING...]' : `[EXECUTE ${selectedTimeframe.toUpperCase()} PIPELINE]`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Hot Coins Radar */}
            <HotCoinsRadar
              activeSymbol={selectedSymbol}
              onSelectSymbol={(sym) => setSelectedSymbol(sym)}
            />

            {/* Chart with thick brutal border */}
            {chartData && (
              <View style={[styles.brutalistChartWrapper, { borderColor: colors.border }]}>
                <MiniCandleChart
                  candles={chartData.series?.candles || []}
                  levels={latestSignal?.plan?.levels}
                  height={220}
                  symbol={selectedSymbol}
                  timeframe={selectedTimeframe}
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

      {/* Coin Selector Modal */}
      <CoinSelectorModal
        visible={showCoinSelector}
        onClose={() => setShowCoinSelector(false)}
        coins={coins}
        selectedSymbol={selectedSymbol}
        onSelectCoin={(sym) => setSelectedSymbol(sym)}
      />
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  coinSelectorBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 6,
  },
  coinSelectorText: {
    fontSize: 11,
    fontWeight: '800',
  },
  timeframeBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tfButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tfButtonText: {
    fontSize: 10,
    letterSpacing: 0.3,
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
