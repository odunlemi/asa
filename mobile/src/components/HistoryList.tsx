import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Id } from '../../../app/convex/_generated/dataModel';
import { tokens, type, cardShadow } from '../constants/theme';

export interface HistoryItem {
  _id: Id<'translations'>;
  englishText: string;
  yorubaText: string;
  audioUrl: string | null;
}

interface Props {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}

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
        <Text style={styles.enText} numberOfLines={1}>{item.englishText}</Text>
        <Animated.View style={{ transform: [{ rotate: chevronDeg }] }}>
          <MaterialCommunityIcons name="chevron-down" size={18} color={tokens.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      {open && (
        <View style={styles.expanded}>
          <Text style={styles.yoText}>{item.yorubaText}</Text>
          <TouchableOpacity style={styles.loadBtn} onPress={() => onSelect(item)} activeOpacity={0.8}>
            <MaterialCommunityIcons name="reload" size={13} color={tokens.pillYoText} />
            <Text style={styles.loadText}>Load</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function HistoryList({ items, onSelect, onClear }: Props) {
  if (items.length === 0) return null;

  const confirmClear = () =>
    Alert.alert('Clear recents', 'This deletes every saved translation and its audio.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: onClear },
    ]);

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>RECENT</Text>
        <TouchableOpacity onPress={confirmClear} activeOpacity={0.7} hitSlop={10}>
          <Text style={styles.clear}>CLEAR</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        {items.map((item, index) => (
          <View key={item._id}>
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
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginHorizontal: 4,
  },
  heading: {
    ...type.label,
    color: tokens.textMuted,
  },
  clear: {
    ...type.label,
    color: tokens.accentGold,
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