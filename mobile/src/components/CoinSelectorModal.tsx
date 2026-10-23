import React, { useState, useMemo } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CoinInfo } from '../types'
import { useTheme, formatPrice, formatPercent } from '../theme'

interface Props {
  visible: boolean
  onClose: () => void
  coins: CoinInfo[]
  selectedSymbol: string
  onSelectCoin: (symbol: string) => void
}

const CATEGORIES = ['All', 'Meme', 'Fan Token', 'AI / Data', 'Layer 1', 'DeFi', 'Layer 2']

export const CoinSelectorModal: React.FC<Props> = ({
  visible,
  onClose,
  coins,
  selectedSymbol,
  onSelectCoin,
}) => {
  const { colors } = useTheme()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filteredCoins = useMemo(() => {
    return coins.filter((coin) => {
      const matchSearch =
        coin.symbol.toLowerCase().includes(search.toLowerCase()) ||
        coin.name.toLowerCase().includes(search.toLowerCase())
      const matchCategory =
        selectedCategory === 'All' || coin.category === selectedCategory
      return matchSearch && matchCategory
    })
  }, [coins, search, selectedCategory])

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView
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
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Select Asset</Text>
              <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
                {coins.length} Tradeable Pairs
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: colors.surface2,
                  borderRadius: colors.borderRadiusSm,
                },
              ]}
            >
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.border,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadius,
                  color: colors.text,
                },
              ]}
              placeholder="Search coin (ETH, SOL, PEPE...)"
              placeholderTextColor={colors.textDisabled}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          {/* Categories Horizontal Scroll */}
          <View style={styles.categoryRow}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={CATEGORIES}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.categoryList}
              renderItem={({ item }) => {
                const isSelected = selectedCategory === item
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(item)}
                    style={[
                      styles.categoryChip,
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
                        styles.categoryText,
                        {
                          color: isSelected ? '#ffffff' : colors.textMuted,
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

          {/* Coins List */}
          <FlatList
            data={filteredCoins}
            keyExtractor={(item) => item.symbol}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = selectedSymbol === item.symbol
              const isPos = (item.change24h ?? 0) >= 0

              return (
                <TouchableOpacity
                  onPress={() => {
                    onSelectCoin(item.symbol)
                    onClose()
                  }}
                  style={[
                    styles.coinItem,
                    {
                      backgroundColor: isSelected ? colors.surface2 : 'transparent',
                      borderBottomColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.coinLeft}>
                    <View style={styles.coinTitleRow}>
                      <Text style={[styles.coinSymbol, { color: colors.text }]}>
                        {item.symbol}
                      </Text>
                      {isSelected && (
                        <View
                          style={[
                            styles.activeDot,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.coinSubRow}>
                      <Text style={[styles.coinName, { color: colors.textSubtle }]}>
                        {item.name}
                      </Text>
                      <View
                        style={[
                          styles.categoryBadge,
                          {
                            backgroundColor: colors.surface3,
                            borderRadius: colors.borderRadiusSm,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryBadgeText,
                            { color: colors.textMuted },
                          ]}
                        >
                          {item.category}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.coinRight}>
                    <Text style={[styles.coinPrice, { color: colors.text }]}>
                      {item.price ? formatPrice(item.price) : '---'}
                    </Text>
                    {item.change24h != null && (
                      <Text
                        style={[
                          styles.coinChange,
                          {
                            color: isPos ? colors.bullish : colors.bearish,
                          },
                        ]}
                      >
                        {isPos ? '+' : ''}
                        {formatPercent(item.change24h)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )
            }}
          />
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInput: {
    height: 42,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryRow: {
    paddingVertical: 10,
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryText: {
    fontSize: 12,
  },
  coinItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  coinLeft: {
    flex: 1,
  },
  coinTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinSymbol: {
    fontSize: 15,
    fontWeight: '800',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  coinSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  coinName: {
    fontSize: 12,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  coinRight: {
    alignItems: 'flex-end',
  },
  coinPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  coinChange: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
})
