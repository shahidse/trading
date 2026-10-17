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
} from 'react-native'
import { api } from './src/services/api'
import { Candle, ChartPayload, PriceResponse, Signal, TradingStateResponse } from './src/types'
import { colors, formatPercent, formatPrice, formatTime } from './src/theme'
import { MiniCandleChart } from './src/components/MiniCandleChart'
import { SignalCard } from './src/components/SignalCard'
import { IndicatorList } from './src/components/IndicatorList'
import { TradingControls } from './src/components/TradingControls'
import { SignalHistory } from './src/components/SignalHistory'
import { SettingsModal } from './src/components/SettingsModal'

export default function App() {
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
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30_000)
    return () => clearInterval(interval)
  }, [loadData])

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <View>
          <Text style={styles.logoTitle}>ETH SIGNAL</Text>
          <Text style={styles.logoSubtitle}>15m Spot Algorithmic Terminal</Text>
        </View>

        <View style={styles.navActions}>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.settingsBtnText}>⚙ Config</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {errorMsg}</Text>
            <Text style={styles.errorSub}>
              Tap ⚙ Config to configure your Next.js server LAN IP address.
            </Text>
          </View>
        )}

        {/* Live Market Price Cards */}
        <View style={styles.priceRow}>
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Binance Spot</Text>
            <Text style={styles.priceVal}>{formatPrice(priceData?.price)}</Text>
            <Text style={styles.priceSub}>ETH/USDT · 15m</Text>
          </View>

          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Chainlink Oracle</Text>
            <Text style={styles.priceVal}>
              {formatPrice(priceData?.chainlink?.price)}
            </Text>
            <Text style={styles.priceSub}>
              {priceData?.divergencePct != null
                ? `Div: ${formatPercent(priceData.divergencePct)}`
                : 'Decentralized feed'}
            </Text>
          </View>
        </View>

        {/* Interactive Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, analyzing && styles.btnDisabled]}
            onPress={handleRunAnalysis}
            disabled={analyzing}
          >
            {analyzing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryActionBtnText}>▶ Run Analysis Now</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Text style={styles.refreshBtnText}>↻ Refresh</Text>
          </TouchableOpacity>

          <Text style={styles.lastUpdatedText}>
            {formatTime(lastUpdated)}
          </Text>
        </View>

        {/* Interactive Candlestick Chart */}
        {chartData && (
          <MiniCandleChart
            candles={chartData.series?.candles || []}
            levels={latestSignal?.plan?.levels}
            height={240}
          />
        )}

        {/* Active Signal & Plan */}
        {latestSignal ? (
          <SignalCard signal={latestSignal} />
        ) : (
          !loading && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No signals recorded yet.</Text>
              <Text style={styles.emptySub}>
                Tap &ldquo;Run Analysis Now&rdquo; to fetch candles and calculate indicators.
              </Text>
            </View>
          )
        )}

        {/* Trading Controls & Emergency Halt */}
        <TradingControls state={tradingState} onRefresh={loadData} />

        {/* Multi-Indicator breakdown (9 Indicators) */}
        {latestSignal && (
          <IndicatorList indicators={latestSignal.indicators || []} />
        )}

        {/* Historical Signals Stream */}
        <SignalHistory signals={signals} />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.8,
  },
  logoSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    backgroundColor: colors.bearishBg,
    borderColor: colors.bearishBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.bearish,
    fontSize: 12,
    fontWeight: '700',
  },
  errorSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  priceCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceVal: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: 4,
  },
  priceSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  refreshBtn: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  refreshBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  lastUpdatedText: {
    fontSize: 10,
    color: colors.textSubtle,
    marginLeft: 'auto',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  emptyText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
})
