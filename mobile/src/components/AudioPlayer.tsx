import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { MOCK_AUDIO_MARKER } from '../hooks/useTranslation';
import { tokens, type, cardShadow } from '../constants/theme';

export function AudioPlayer({ audioB64 }: { audioB64: string }) {
  if (audioB64 === MOCK_AUDIO_MARKER) {
    return (
      <View style={styles.card}>
        <Text style={[styles.label, { marginBottom: 14 }]}>YORUBA AUDIO</Text>
        <View style={[styles.btn, styles.btnDisabled]}>
          <MaterialCommunityIcons name="volume-mute" size={18} color={tokens.textMuted} />
          <Text style={styles.btnTextDisabled}>Backend not connected</Text>
        </View>
      </View>
    );
  }

  return <RealPlayer audioB64={audioB64} />;
}

function RealPlayer({ audioB64 }: { audioB64: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => { sound?.unloadAsync(); }, [sound]);

  const play = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const path = FileSystem.cacheDirectory + 'yoruba_out.mp3';
      await FileSystem.writeAsStringAsync(path, audioB64, { encoding: FileSystem.EncodingType.Base64 });
      const { sound: s } = await Audio.Sound.createAsync({ uri: path });
      setSound(s); setPlaying(true);
      await s.playAsync();
      s.setOnPlaybackStatusUpdate(st => { if (st.isLoaded && st.didJustFinish) setPlaying(false); });
    } catch (e) { console.error(e); }
  };

  const stop = async () => { await sound?.stopAsync(); setPlaying(false); };

  return (
    <View style={styles.card}>
      <Text style={[styles.label, { marginBottom: 14 }]}>YORUBA AUDIO</Text>
      <TouchableOpacity style={styles.btn} onPress={playing ? stop : play} activeOpacity={0.8}>
        <MaterialCommunityIcons name={playing ? 'stop' : 'play'} size={18} color={tokens.bgScreen} />
        <Text style={styles.btnText}>{playing ? 'Stop' : 'Play Yoruba audio'}</Text>
      </TouchableOpacity>
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
