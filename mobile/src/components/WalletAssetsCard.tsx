import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { AssetBalance } from '../types'
import {
  useTheme,
  formatUsd,
  formatPkr,
  usdToPkr,
  formatCurrency,
  DEFAULT_PKR_RATE,
} from '../theme'

export interface WalletAssetsCardProps {
  balances?: AssetBalance[] | null
  testnet?: boolean
  ethPrice?: number | null
  onRefresh?: () => void
  loading?: boolean
  exchangeError?: string | null
}

export const WalletAssetsCard: React.FC<WalletAssetsCardProps> = ({
  balances,
  testnet = true,
  ethPrice = 0,
  onRefresh,
  loading = false,
  exchangeError,
}) => {
  const { colors, currency, pkrRate, toggleCurrency } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const activeBalances = useMemo(
    () => (balances || []).filter((b) => b.total > 0.00001),
    [balances]
  )

  const filteredBalances = useMemo(() => {
    if (!searchQuery.trim()) return activeBalances
    const q = searchQuery.trim().toUpperCase()
    return activeBalances.filter((b) => b.asset.toUpperCase().includes(q))
  }, [activeBalances, searchQuery])

  let totalUsd = 0
  for (const b of activeBalances) {
    if (b.asset === 'USDT' || b.asset === 'BUSD' || b.asset === 'USDC') {
      totalUsd += b.total
    } else if (b.asset === 'ETH' && ethPrice) {
      totalUsd += b.total * ethPrice
    } else if (b.usdValue && Number.isFinite(b.usdValue)) {
      totalUsd += b.usdValue
    }
  }

  const totalPkr = usdToPkr(totalUsd, pkrRate || DEFAULT_PKR_RATE)
  const usdtAsset = activeBalances.find((b) => b.asset === 'USDT')
  const ethAsset = activeBalances.find((b) => b.asset === 'ETH')

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
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.headerIcon}>💰</Text>
            <Text style={[styles.title, { color: colors.text }]}>Spot Wallet Assets</Text>
            <View
              style={[
                styles.envBadge,
                {
                  backgroundColor: testnet ? 'rgba(6, 182, 212, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  borderColor: testnet ? '#06b6d4' : '#10b981',
                },
              ]}
            >
              <Text
                style={[
                  styles.envBadgeText,
                  { color: testnet ? '#06b6d4' : '#10b981' },
                ]}
              >
                {testnet ? 'TESTNET' : 'MAINNET'}
              </Text>
            </View>
          </View>

          {exchangeError ? (
            <Text style={[styles.errorSub, { color: colors.bearish }]}>
              ⚠️ {exchangeError}
            </Text>
          ) : (
            <Text style={[styles.portfolioValuation, { color: colors.textMuted }]}>
              {activeBalances.length > 0 ? (
                currency === 'PKR' ? (
                  <>Est. ~{formatPkr(totalPkr)} ({formatUsd(totalUsd)}) · {activeBalances.length} assets</>
                ) : (
                  <>Est. ~{formatUsd(totalUsd)} ({formatPkr(totalPkr, true)}) · {activeBalances.length} assets</>
                )
              ) : (
                'Configure Binance API in Config to track wallet'
              )}
            </Text>
          )}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleCurrency}
            activeOpacity={0.8}
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.surface2,
                borderColor: colors.borderSubtle,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusSm,
              },
            ]}
          >
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>
              {currency === 'USD' ? '💵 USD' : '🇵🇰 PKR'}
            </Text>
          </TouchableOpacity>

          {onRefresh && (
            <TouchableOpacity
              onPress={onRefresh}
              disabled={loading}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.borderSubtle,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadiusSm,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>↻</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setCollapsed(!collapsed)}
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.surface2,
                borderColor: colors.borderSubtle,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusSm,
              },
            ]}
          >
            <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>
              {collapsed ? '▼' : '▲'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!collapsed && (
        <View style={styles.body}>
          {/* Spotlight Cards: USDT & ETH */}
          <View style={styles.spotlightRow}>
            <View
              style={[
                styles.spotlightCard,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.borderSubtle,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadius,
                },
              ]}
            >
              <Text style={[styles.spotlightLabel, { color: colors.textSubtle }]}>FREE USDT</Text>
              <Text style={[styles.spotlightValue, { color: colors.text }]}>
                {currency === 'PKR'
                  ? formatPkr(usdToPkr(usdtAsset?.free ?? 0, pkrRate))
                  : formatUsd(usdtAsset?.free ?? 0)}
              </Text>
              <Text style={[styles.spotlightDual, { color: colors.textMuted }]}>
                {currency === 'PKR'
                  ? formatUsd(usdtAsset?.free ?? 0)
                  : formatPkr(usdToPkr(usdtAsset?.free ?? 0, pkrRate), true)}
              </Text>
            </View>

            <View
              style={[
                styles.spotlightCard,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.borderSubtle,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadius,
                },
              ]}
            >
              <Text style={[styles.spotlightLabel, { color: colors.textSubtle }]}>ETH HOLDING</Text>
              <Text style={[styles.spotlightValue, { color: colors.text }]}>
                {(ethAsset?.free ?? 0).toFixed(4)} ETH
              </Text>
              <Text style={[styles.spotlightDual, { color: colors.textMuted }]}>
                {currency === 'PKR'
                  ? formatPkr(usdToPkr((ethAsset?.total ?? 0) * (ethPrice || 0), pkrRate), true)
                  : formatUsd((ethAsset?.total ?? 0) * (ethPrice || 0))}
              </Text>
            </View>
          </View>

          {/* Search Filter when multiple assets exist */}
          {activeBalances.length > 3 && (
            <View
              style={[
                styles.searchRow,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.borderSubtle,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadiusSm,
                },
              ]}
            >
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Filter assets (e.g. USDT, ETH)..."
                placeholderTextColor={colors.textSubtle}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={[styles.clearSearch, { color: colors.textSubtle }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Asset List */}
          {filteredBalances.length > 0 ? (
            <ScrollView
              nestedScrollEnabled
              style={styles.assetScroll}
              contentContainerStyle={styles.assetListContent}
            >
              <View
                style={[
                  styles.tableHeader,
                  {
                    borderBottomColor: colors.borderSubtle,
                    backgroundColor: colors.surface2,
                  },
                ]}
              >
                <Text style={[styles.thCell, { flex: 1.2, color: colors.textSubtle }]}>ASSET</Text>
                <Text style={[styles.thCell, { flex: 1, textAlign: 'right', color: colors.textSubtle }]}>
                  FREE
                </Text>
                <Text style={[styles.thCell, { flex: 1, textAlign: 'right', color: colors.textSubtle }]}>
                  LOCKED
                </Text>
                <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right', color: colors.textSubtle }]}>
                  TOTAL
                </Text>
              </View>

              {filteredBalances.map((b) => (
                <View
                  key={b.asset}
                  style={[
                    styles.tableRow,
                    { borderBottomColor: colors.borderSubtle },
                  ]}
                >
                  <View style={[styles.assetCell, { flex: 1.2 }]}>
                    <View style={[styles.assetDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.assetName, { color: colors.text }]}>{b.asset}</Text>
                  </View>
                  <Text style={[styles.numCell, { flex: 1, color: colors.textMuted }]}>
                    {b.free > 1000 ? b.free.toFixed(2) : b.free.toFixed(4)}
                  </Text>
                  <Text style={[styles.numCell, { flex: 1, color: colors.textSubtle }]}>
                    {b.locked > 0 ? (b.locked > 1000 ? b.locked.toFixed(2) : b.locked.toFixed(4)) : '—'}
                  </Text>
                  <Text style={[styles.numCellTotal, { flex: 1.2, color: colors.text }]}>
                    {b.total > 1000 ? b.total.toFixed(2) : b.total.toFixed(4)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.textSubtle }]}>
                {loading
                  ? 'Synchronizing balances from Binance...'
                  : 'No balances detected in this wallet.'}
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
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIcon: {
    fontSize: 14,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
  },
  envBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  envBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorSub: {
    fontSize: 10,
    marginTop: 2,
  },
  portfolioValuation: {
    fontSize: 11,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    marginTop: 10,
  },
  spotlightRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  spotlightCard: {
    flex: 1,
    padding: 8,
  },
  spotlightLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  spotlightValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  spotlightDual: {
    fontSize: 10,
    marginTop: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    padding: 0,
  },
  clearSearch: {
    fontSize: 12,
    paddingHorizontal: 4,
  },
  assetScroll: {
    maxHeight: 180,
  },
  assetListContent: {
    paddingBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  thCell: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
  },
  assetCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assetDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  assetName: {
    fontSize: 11,
    fontWeight: '700',
  },
  numCell: {
    fontSize: 10,
    textAlign: 'right',
  },
  numCellTotal: {
    fontSize: 10.5,
    fontWeight: '700',
    textAlign: 'right',
  },
  emptyWrap: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 11,
  },
})
