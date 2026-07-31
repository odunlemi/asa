// Zero dependencies — no Paper, no external imports
// Fonts: Ojuju (display) + Hanken Grotesk (UI/body) — see FONT SETUP note below.

export const tokens = {
    bgScreen: '#15110C',
    bgCard: '#1F1912',
    bgCardEn: '#1B1D38',
    bgCardYo: '#2A2013',

    textPrimary: '#F6F1E7',
    textBody: '#E7E4F5',
    textSecondary: '#C9C2B4',
    textMuted: '#9C9182',

    accentGold: '#D6A24B',
    accentGoldLight: '#F3D9A0',
    accentGoldPale: '#F0C878',
    accentIndigo: '#A8ACEE',
    accentAmber: '#E8954A',
    danger: '#E2553D',
    dangerLight: '#3A2018',

    border: '#2A2218',
    borderSubtle: '#221C14',

    pillEnBg: '#272A55',
    pillEnText: '#A8ACEE',
    pillYoBg: '#3D2C14',
    pillYoText: '#F0C878',

    shadowColor: '#000000',
} as const;

// Consistent type scale used across all components.
// Ojuju carries display/headline only — used with restraint, where its weight earns its keep.
// Hanken Grotesk carries everything else.
// NOTE: when fontFamily points to a specific static weight (e.g. Ojuju_800ExtraBold),
// fontWeight must stay 'normal' — RN will double-bold otherwise. See FONT SETUP below.
export const type = {
    display: { fontFamily: 'Ojuju_700Bold', fontSize: 26, fontWeight: 'normal' as const, lineHeight: 36 },
    headline: { fontFamily: 'Ojuju_800ExtraBold', fontSize: 30, fontWeight: 'normal' as const, lineHeight: 36 },
    title: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 17, fontWeight: 'normal' as const, lineHeight: 26 },
    body: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 16, fontWeight: 'normal' as const, lineHeight: 26 },
    label: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, fontWeight: 'normal' as const, letterSpacing: 1.5 },
    caption: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, fontWeight: 'normal' as const, lineHeight: 20 },
} as const;

// Reusable card shadow — dark surfaces need more opacity than light ones to register at all
export const cardShadow = {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
} as const;

/**
 * FONT SETUP (do this once in App.tsx, which wasn't in the src/ you sent me):
 *
 *   npx expo install @expo-google-fonts/ojuju @expo-google-fonts/hanken-grotesk expo-font expo-splash-screen
 *
 *   import { useFonts, Ojuju_700Bold, Ojuju_800ExtraBold } from '@expo-google-fonts/ojuju';
 *   import { HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk';
 *   import * as SplashScreen from 'expo-splash-screen';
 *
 *   SplashScreen.preventAutoHideAsync();
 *
 *   function App() {
 *     const [fontsLoaded] = useFonts({
 *       Ojuju_700Bold, Ojuju_800ExtraBold,
 *       HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold,
 *     });
 *     useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync(); }, [fontsLoaded]);
 *     if (!fontsLoaded) return null;
 *     // ...rest of App
 *   }
 *
 * Until this is wired up, every type.* style falls back silently to the system font.
 */
