import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { tokens, type } from '../constants/theme';

const STEPS = [
  { icon: 'microphone-outline', text: 'Speak English' },
  { icon: 'translate', text: 'Yorùbá text in seconds' },
  { icon: 'volume-high', text: 'Voice follows shortly after' },
] as const;

export function IdleHint() {
  return (
    <View style={styles.container}>
      <View style={styles.halo}>
        <MaterialCommunityIcons
          name="waveform"
          size={38}
          color={tokens.accentGold}
        />
      </View>

      <Text style={styles.title}>Ready when you are</Text>

      <View style={styles.steps}>
        {STEPS.map(({ icon, text }) => (
          <View key={text} style={styles.step}>
            <MaterialCommunityIcons name={icon} size={15} color={tokens.textMuted} />
            <Text style={styles.stepText}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 44,
    gap: 16,
  },
  halo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.pillYoBg,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  title: {
    ...type.display,
    fontSize: 22,
    lineHeight: 30,
    color: tokens.textPrimary,
  },
  steps: {
    gap: 10,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  stepText: {
    ...type.caption,
    color: tokens.textMuted,
  },
});
