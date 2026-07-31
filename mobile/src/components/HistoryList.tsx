import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { tokens, type, cardShadow } from '../constants/theme';

export interface HistoryItem { id: number; en: string; yo: string; audio: string; }

interface Props { items: HistoryItem[]; onSelect: (item: HistoryItem) => void; }

function HistoryRow({ item, onSelect }: { item: HistoryItem; onSelect: (i: HistoryItem) => void }) {
  const [open, setOpen] = useState(false);
  const chevron = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.timing(chevron, { toValue: next ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  };

  const chevronDeg = chevron.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View>
      <TouchableOpacity style={styles.row} onPress={toggle} activeOpacity={0.7}>
        <MaterialCommunityIcons name="history" size={15} color={tokens.textMuted} />
        <Text style={styles.enText} numberOfLines={1}>{item.en}</Text>
        <Animated.View style={{ transform: [{ rotate: chevronDeg }] }}>
          <MaterialCommunityIcons name="chevron-down" size={18} color={tokens.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      {open && (
        <View style={styles.expanded}>
          <Text style={styles.yoText}>{item.yo}</Text>
          <TouchableOpacity style={styles.loadBtn} onPress={() => onSelect(item)} activeOpacity={0.8}>
            <MaterialCommunityIcons name="reload" size={13} color={tokens.pillYoText} />
            <Text style={styles.loadText}>Load</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function HistoryList({ items, onSelect }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>RECENT</Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <View key={item.id}>
            <HistoryRow item={item} onSelect={onSelect} />
            {index < items.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  heading: {
    ...type.label,
    color: tokens.textMuted,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: tokens.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.border,
    overflow: 'hidden',
    ...cardShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  enText: {
    ...type.caption,
    color: tokens.textSecondary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.borderSubtle,
    marginHorizontal: 16,
  },
  expanded: {
    backgroundColor: tokens.bgCardYo,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 10,
  },
  yoText: {
    fontFamily: 'Ojuju_700Bold',
    fontSize: 19,
    color: tokens.accentGoldPale,
    lineHeight: 28,
  },
  loadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: tokens.pillYoBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  loadText: {
    ...type.caption,
    color: tokens.pillYoText,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
});