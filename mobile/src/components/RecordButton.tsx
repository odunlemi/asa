import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, View, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppStatus } from '../../App';
import { tokens } from '../constants/theme';

const PROCESSING: AppStatus[] = ['transcribing', 'translating', 'synthesising'];
const SIZE = 72;

export function RecordButton({ status, onPress }: { status: AppStatus; onPress: () => void }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(1)).current;

  const isRecording = status === 'recording';
  const isProcessing = PROCESSING.includes(status);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulse, { toValue: 1.06, duration: 800, useNativeDriver: true }),
            Animated.timing(ring, { toValue: 1.55, duration: 800, useNativeDriver: true }),
            Animated.timing(glow, { toValue: 0.45, duration: 800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(ring, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(glow, { toValue: 0.1, duration: 800, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      pulse.stopAnimation(); ring.stopAnimation(); glow.stopAnimation();
      Animated.parallel([
        Animated.spring(pulse, { toValue: 1, useNativeDriver: true }),
        Animated.spring(ring, { toValue: 1, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [isRecording]);

  const bgColor = isRecording ? tokens.danger
    : isProcessing ? '#3A332A'
      : tokens.accentGold;

  const iconColor = isRecording ? '#fff' : isProcessing ? tokens.textMuted : tokens.bgScreen;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            borderColor: isRecording ? tokens.danger : tokens.accentGold,
            opacity: glow,
            transform: [{ scale: ring }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: bgColor }]}
          onPress={onPress}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator color={tokens.textMuted} size="small" />
          ) : (
            <MaterialCommunityIcons
              name={isRecording ? 'stop' : 'microphone'}
              size={30}
              color={iconColor}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: SIZE, height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2.5,
  },
  btn: {
    width: SIZE, height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
});
