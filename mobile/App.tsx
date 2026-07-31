import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Ojuju_700Bold, Ojuju_800ExtraBold } from '@expo-google-fonts/ojuju';
import {
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import * as SplashScreen from 'expo-splash-screen';

import { RecordButton } from './src/components/RecordButton';
import { StatusDisplay } from './src/components/StatusDisplay';
import { TranslationCard } from './src/components/TranslationCard';
import { AudioPlayer } from './src/components/AudioPlayer';
import { HistoryList, HistoryItem } from './src/components/HistoryList';
import { useRecording } from './src/hooks/useRecording';
import { useTranslation } from './src/hooks/useTranslation';
import { tokens, type } from './src/constants/theme';

export type AppStatus =
  | 'idle' | 'recording' | 'transcribing'
  | 'translating' | 'synthesising' | 'ready' | 'error';

function MainScreen() {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [englishText, setEnglish] = useState('');
  const [yorubaText, setYoruba] = useState('');
  const [audioB64, setAudio] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const { startRecording, stopRecording } = useRecording({ setStatus, setEnglish });
  const { runPipeline } = useTranslation({
    setStatus, setYoruba, setAudio,
    onComplete: (en, yo, audio) =>
      setHistory(h => [{ en, yo, audio, id: Date.now() }, ...h].slice(0, 5)),
  });

  const handleRecord = async () => {
    if (status === 'recording') {
      const t = await stopRecording();
      if (t) await runPipeline(t);
    } else if (['idle', 'ready', 'error'].includes(status)) {
      setEnglish(''); setYoruba(''); setAudio(null);
      await startRecording();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={tokens.bgScreen} />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>Àṣà</Text>
        <Text style={styles.subtitle}>English to Yorùbá</Text>
      </View>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TranslationCard lang="EN" text={englishText} visible={!!englishText} />
        <TranslationCard lang="YO" text={yorubaText} visible={!!yorubaText} accent />
        {audioB64 && <AudioPlayer audioB64={audioB64} />}
        <HistoryList
          items={history}
          onSelect={item => {
            setEnglish(item.en); setYoruba(item.yo);
            setAudio(item.audio); setStatus('ready');
          }}
        />
      </ScrollView>

      {/* ── Controls bar ─────────────────────────────────────────────── */}
      <View style={styles.controls}>
        <StatusDisplay status={status} />
        <RecordButton status={status} onPress={handleRecord} />
      </View>
    </SafeAreaView>
  );
}

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Ojuju_700Bold,
    Ojuju_800ExtraBold,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <MainScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.bgScreen,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  wordmark: {
    ...type.headline,
    color: tokens.accentGoldPale,
  },
  subtitle: {
    ...type.label,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  scroll: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  controls: {
    paddingVertical: 20,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 14,
    backgroundColor: tokens.bgScreen,
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    shadowColor: tokens.shadowColor,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});
