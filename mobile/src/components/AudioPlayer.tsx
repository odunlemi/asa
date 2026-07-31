import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { tokens, type, cardShadow } from '../constants/theme';

export function AudioPlayer({
  audioUrl,
  audioError,
}: {
  audioUrl: string | null;
  audioError?: string | null;
}) {
  if (audioError) {
    return (
      <Card>
        <View style={[styles.btn, styles.btnDisabled]}>
          <MaterialCommunityIcons name="volume-off" size={18} color={tokens.textMuted} />
          <Text style={styles.btnTextDisabled}>Audio unavailable</Text>
        </View>
      </Card>
    );
  }

  if (!audioUrl) {
    return (
      <Card>
        <View style={[styles.btn, styles.btnDisabled]}>
          <ActivityIndicator size="small" color={tokens.textMuted} />
          <Text style={styles.btnTextDisabled}>Synthesising audio…</Text>
        </View>
      </Card>
    );
  }

  return <RealPlayer audioUrl={audioUrl} />;
}

function RealPlayer({ audioUrl }: { audioUrl: string }) {
  // Streamed straight from Convex storage — nothing is written to disk.
  const player = useAudioPlayer({ uri: audioUrl });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <Card>
      <TouchableOpacity style={styles.btn} onPress={toggle} activeOpacity={0.8}>
        <MaterialCommunityIcons
          name={status.playing ? 'pause' : 'play'}
          size={18}
          color={tokens.bgScreen}
        />
        <Text style={styles.btnText}>
          {status.playing ? 'Pause' : 'Play Yoruba audio'}
        </Text>
      </TouchableOpacity>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.label, { marginBottom: 14 }]}>YORUBA AUDIO</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.bgCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: tokens.border,
    ...cardShadow,
  },
  label: {
    ...type.label,
    color: tokens.textMuted,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: tokens.accentGold,
    borderRadius: 12,
    paddingVertical: 13,
  },
  btnDisabled: {
    backgroundColor: tokens.borderSubtle,
  },
  btnText: {
    ...type.title,
    color: tokens.bgScreen,
    fontSize: 15,
  },
  btnTextDisabled: {
    ...type.caption,
    color: tokens.textMuted,
  },
});
