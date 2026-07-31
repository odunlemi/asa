import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { tokens, type, cardShadow } from '../constants/theme';

interface Props {
  lang: 'EN' | 'YO';
  text: string;
  visible: boolean;
  accent?: boolean;
}

export function TranslationCard({ lang, text, visible, accent }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 280, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: visible ? 0 : 12, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const placeholder = lang === 'EN'
    ? 'Your speech will appear here…'
    : 'Yoruba translation will appear here…';

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <View style={[styles.card, accent ? styles.cardYo : styles.cardEn]}>

        {/* Language pill */}
        <View style={[styles.pill, accent ? styles.pillYo : styles.pillEn]}>
          <Text style={[styles.pillText, accent ? styles.pillTextYo : styles.pillTextEn]}>
            {accent ? 'YORUBA' : 'ENGLISH'}
          </Text>
        </View>

        {/* Content — Yoruba output is large display text */}
        <Text
          style={[
            accent ? styles.textYo : styles.textEn,
            !text && styles.placeholder,
          ]}
        >
          {text || placeholder}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    minHeight: 100,
    borderWidth: 1,
    ...cardShadow,
  },
  cardEn: { backgroundColor: tokens.bgCardEn, borderColor: '#2E2C5E' },
  cardYo: { backgroundColor: tokens.bgCardYo, borderColor: '#4A371C' },

  pill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  pillEn: { backgroundColor: tokens.pillEnBg },
  pillYo: { backgroundColor: tokens.pillYoBg },
  pillText: { ...type.label },
  pillTextEn: { color: tokens.pillEnText },
  pillTextYo: { color: tokens.pillYoText },

  // EN input — clean body size
  textEn: {
    ...type.body,
    color: tokens.textBody,
  },
  // YO output — large display text in Ojuju, the star of the screen
  textYo: {
    ...type.display,
    color: tokens.accentGoldLight,
  },
  placeholder: {
    color: tokens.textMuted,
    fontStyle: 'italic',
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 15,
    lineHeight: 24,
  },
});