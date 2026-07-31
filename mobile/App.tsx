import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Ojuju_700Bold, Ojuju_800ExtraBold } from '@expo-google-fonts/ojuju';
import {
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { ConvexProvider, ConvexReactClient, useMutation, useQuery } from 'convex/react';

import { api } from '../app/convex/_generated/api';
import { Id } from '../app/convex/_generated/dataModel';

import { RecordButton } from './src/components/RecordButton';
import { StatusDisplay } from './src/components/StatusDisplay';
import { TranslationCard } from './src/components/TranslationCard';
import { AudioPlayer } from './src/components/AudioPlayer';
import { HistoryList } from './src/components/HistoryList';
import { GlassBar } from './src/components/GlassBar';
import { IdleHint } from './src/components/IdleHint';
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
  const [barHeights, setBarHeights] = useState({ header: 0, controls: 0 });
  const insets = useSafeAreaInsets();

  const history = useQuery(api.queries.history.history, { limit: 5 }) ?? [];
  const translation = useQuery(
    api.queries.translation.translation,
    translationId ? { translationId } : 'skip',
  );

  const clearHistory = useMutation(api.mutations.clearHistory.clearHistory);

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

  const handleClear = async () => {
    await clearHistory();
    setEnglish(''); setYoruba(''); setTranslationId(null); setError(null);
    setStatus('idle');
  };

  const showIdleHint = !englishText && !yorubaText && !error;

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Content, scrolling under both glass bars ──────────────────── */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: barHeights.header + 16, paddingBottom: barHeights.controls + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showIdleHint && <IdleHint />}
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
          onClear={handleClear}
        />
      </ScrollView>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <GlassBar
        edge="top"
        style={{ ...styles.header, paddingTop: insets.top + 16 }}
        onLayout={({ nativeEvent: { layout } }) =>
          setBarHeights(h => ({ ...h, header: layout.height }))
        }
      >
        <Text style={styles.wordmark}>Àṣà</Text>
        <Text style={styles.subtitle}>English to Yorùbá</Text>
      </GlassBar>

      {/* ── Controls bar ─────────────────────────────────────────────── */}
      <GlassBar
        edge="bottom"
        style={{ ...styles.controls, paddingBottom: insets.bottom + 20 }}
        onLayout={({ nativeEvent: { layout } }) =>
          setBarHeights(h => ({ ...h, controls: layout.height }))
        }
      >
        <StatusDisplay status={status} />
        <RecordButton status={status} onPress={handleRecord} />
      </GlassBar>
    </View>
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
    paddingBottom: 18,
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
    paddingHorizontal: 16,
    gap: 12,
  },
  error: {
    ...type.caption,
    color: tokens.danger,
    backgroundColor: tokens.dangerLight,
    borderRadius: 12,
    padding: 14,
  },
  controls: {
    paddingTop: 20,
    alignItems: 'center',
    gap: 14,
  },
});
