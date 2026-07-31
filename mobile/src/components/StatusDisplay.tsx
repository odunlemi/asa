import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { AppStatus } from '../../App';
import { tokens, type } from '../constants/theme';

interface Cfg { label: string; color: string; pulse?: boolean }

const STATUS_MAP: Record<AppStatus, Cfg> = {
  idle: { label: 'Tap to record', color: tokens.textMuted },
  recording: { label: 'Recording', color: tokens.danger, pulse: true },
  transcribing: { label: 'Transcribing speech', color: tokens.accentAmber, pulse: true },
  translating: { label: 'Translating to Yoruba', color: tokens.accentAmber, pulse: true },
  synthesising: { label: 'Synthesising voice', color: tokens.accentAmber, pulse: true },
  ready: { label: 'Ready', color: tokens.accentGold },
  error: { label: 'Try again', color: tokens.danger },
};

export function StatusDisplay({ status }: { status: AppStatus }) {
  const { label, color, pulse } = STATUS_MAP[status];
  const dotOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulse) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotOpacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
          Animated.timing(dotOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      dotOpacity.stopAnimation();
      dotOpacity.setValue(1);
    }
  }, [pulse]);

  return (
    <View style={styles.row}>
      {pulse && (
        <Animated.View style={[styles.dot, { backgroundColor: color, opacity: dotOpacity }]} />
      )}
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: {
    ...type.caption,
    letterSpacing: 0.3,
  },
});
