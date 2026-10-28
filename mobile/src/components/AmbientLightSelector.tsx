import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native'
import { useTheme, LIGHT_MODES, ColorMode } from '../theme'

export interface AmbientLightSelectorProps {
  layout?: 'chips' | 'grid'
  onSelect?: (mode: ColorMode) => void
}

/**
 * Ambient Room Lighting Switcher for Mobile
 * Directly synchronized with the 8 Ambient Light Setups from the Web App.
 */
export const AmbientLightSelector: React.FC<AmbientLightSelectorProps> = ({
  layout = 'chips',
  onSelect,
}) => {
  const { colorMode, setColorMode, colors } = useTheme()

  const handleSelect = (modeId: ColorMode) => {
    setColorMode(modeId)
    onSelect?.(modeId)
  }

  if (layout === 'grid') {
    return (
      <View style={styles.gridContainer}>
        {LIGHT_MODES.map((item) => {
          const isSelected = item.id === colorMode
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => handleSelect(item.id)}
              style={[
                styles.gridCard,
                {
                  backgroundColor: isSelected ? colors.primaryLight : colors.surface2,
                  borderColor: isSelected ? colors.primary : colors.borderSubtle,
                  borderWidth: isSelected ? 2 : colors.borderWidth,
                  borderRadius: colors.borderRadius,
                },
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardDotRow}>
                  <View
                    style={[
                      styles.previewDot,
                      {
                        backgroundColor: item.bgPreview,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  />
                  <Text style={styles.cardIcon}>{item.icon}</Text>
                </View>
                {isSelected && (
                  <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.cardLabel,
                  {
                    color: isSelected ? colors.primary : colors.text,
                    fontWeight: isSelected ? '800' : '700',
                  },
                ]}
              >
                {item.label}
              </Text>
              <Text style={[styles.cardAmbientTitle, { color: colors.textSubtle }]}>
                {item.ambientTitle}
              </Text>
              <Text
                style={[styles.cardDesc, { color: colors.textMuted }]}
                numberOfLines={2}
              >
                {item.desc}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    )
  }

  // Horizontal scrollable chip bar (1-tap toggle for all 8 setups)
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipScroll}
    >
      {LIGHT_MODES.map((item) => {
        const isSelected = item.id === colorMode
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            onPress={() => handleSelect(item.id)}
            style={[
              styles.chipBtn,
              {
                backgroundColor: isSelected ? colors.primaryLight : colors.surface2,
                borderColor: isSelected ? colors.primary : colors.borderSubtle,
                borderWidth: isSelected ? 1.5 : colors.borderWidth,
                borderRadius: colors.borderRadiusSm,
              },
            ]}
          >
            <View
              style={[
                styles.previewDotSm,
                {
                  backgroundColor: item.bgPreview,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            />
            <Text style={styles.chipIcon}>{item.icon}</Text>
            <Text
              style={[
                styles.chipLabel,
                {
                  color: isSelected ? colors.primary : colors.text,
                  fontWeight: isSelected ? '800' : '600',
                },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

export interface AmbientLightModalProps {
  visible: boolean
  onClose: () => void
}

/**
 * Dedicated Ambient Light Setup Selector Modal (Equivalent to Web App AmbientLightMenu)
 */
export const AmbientLightModal: React.FC<AmbientLightModalProps> = ({ visible, onClose }) => {
  const { colors, activeLightMode, cycleLightMode } = useTheme()

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: colors.borderWidth,
              borderRadius: colors.borderRadiusCard,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                AMBIENT ROOM LIGHTING (8 SETUPS)
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Adjust screen illumination to match your room lighting
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.modalCloseBtn,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.borderSubtle,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadiusSm,
                },
              ]}
            >
              <Text style={[styles.modalCloseText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Current Mode & Quick Cycle */}
          <View style={[styles.cycleRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <View
                style={[
                  styles.previewDotSm,
                  {
                    backgroundColor: activeLightMode.bgPreview,
                    borderColor: colors.border,
                  },
                ]}
              />
              <Text style={[styles.cycleLabel, { color: colors.textSubtle }]}>
                Active: {activeLightMode.icon} {activeLightMode.label} · {activeLightMode.ambientTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={cycleLightMode}>
              <Text style={[styles.cycleAction, { color: colors.primary }]}>↻ Cycle Next</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <AmbientLightSelector layout="grid" onSelect={() => onClose()} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

export interface AmbientLightMenuButtonProps {
  onPress: () => void
  onLongPress?: () => void
}

/**
 * Ambient Light Navbar Dropdown/Menu Button
 */
export const AmbientLightMenuButton: React.FC<AmbientLightMenuButtonProps> = ({
  onPress,
  onLongPress,
}) => {
  const { colors, activeLightMode, isLightTone, cycleLightMode } = useTheme()

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.menuButton,
        {
          backgroundColor: isLightTone ? colors.primaryLight : colors.surface2,
          borderColor: isLightTone ? colors.primary : colors.border,
          borderWidth: colors.borderWidth,
          borderRadius: colors.borderRadiusSm,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress || cycleLightMode}
    >
      <View
        style={[
          styles.previewDotSm,
          {
            backgroundColor: activeLightMode.bgPreview,
            borderColor: colors.border,
          },
        ]}
      />
      <Text style={styles.chipIcon}>{activeLightMode.icon}</Text>
      <Text style={[styles.menuButtonText, { color: colors.text }]}>
        {activeLightMode.label}
      </Text>
      <Text style={[styles.menuDropdownArrow, { color: colors.textSubtle }]}>▼</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chipScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 5,
  },
  previewDotSm: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  chipIcon: {
    fontSize: 12,
  },
  chipLabel: {
    fontSize: 11,
  },

  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  menuButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  menuDropdownArrow: {
    fontSize: 9,
  },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCard: {
    width: '48.5%',
    padding: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  cardIcon: {
    fontSize: 15,
  },
  activeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  cardAmbientTitle: {
    fontSize: 9.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 9,
    lineHeight: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalCloseText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  cycleLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  cycleAction: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalScroll: {
    maxHeight: 460,
  },
})
