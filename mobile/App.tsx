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
import { ConvexProvider, ConvexReactClient, useQuery } from 'convex/react';

import { api } from '../app/convex/_generated/api';
import { Id } from '../app/convex/_generated/dataModel';

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
  const [translationId, setTranslationId] = useState<Id<'translations'> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const history = useQuery(api.queries.history.history, { limit: 5 }) ?? [];
  const translation = useQuery(
    api.queries.translation.translation,
    translationId ? { translationId } : 'skip',
  );

  const { startRecording, stopRecording } = useRecording({ setStatus });
  const { runPipeline } = useTranslation({
    setStatus, setEnglish, setYoruba, setTranslationId, setError,
  });

  // Synthesis runs detached from the request, so the row tells us when it lands.
  useEffect(() => {
    if (status === 'synthesising' && (translation?.audioUrl || translation?.audioError)) {
      setStatus('ready');
    }
  }, [status, translation?.audioUrl, translation?.audioError]);

  const handleRecord = async () => {
    if (status === 'recording') {
      const uri = await stopRecording();
      if (uri) {
        await runPipeline(uri);
      } else {
        setError('Recording failed');
        setStatus('error');
      }
    } else if (['idle', 'ready', 'error'].includes(status)) {
      setEnglish(''); setYoruba(''); setTranslationId(null); setError(null);
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
        {translationId && (
          <AudioPlayer
            audioUrl={translation?.audioUrl ?? null}
            audioError={translation?.audioError}
          />
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        <HistoryList
          items={history}
          onSelect={item => {
            setEnglish(item.englishText); setYoruba(item.yorubaText);
            setTranslationId(item._id); setError(null); setStatus('ready');
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

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

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
    <ConvexProvider client={convex}>
      <SafeAreaProvider>
        <MainScreen />
      </SafeAreaProvider>
    </ConvexProvider>
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
  error: {
    ...type.caption,
    color: tokens.danger,
    backgroundColor: tokens.dangerLight,
    borderRadius: 12,
    padding: 14,
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
