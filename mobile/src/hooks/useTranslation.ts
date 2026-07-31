import { AppStatus } from '../../App';

// Realistic EN→YO pairs (real Yoruba text so the font rendering is testable)
const MOCK_PAIRS: Record<string, string> = {
    'Good morning, how are you?': 'Ẹ káàárọ̀, báwo ni ẹ ṣe wà?',
    'What is your name?': 'Kí ni orúkọ rẹ?',
    'I need help, please.': 'Mo nílò ìrànwọ́, jọwọ.',
    'Where is the hospital?': 'Ibo ni ilé ìwòsàn wà?',
    'Thank you very much.': 'Ẹ ṣéun púpọ̀.',
    'Please speak slowly.': 'Jọwọ sọ̀rọ̀ lọ̀rọ̀.',
    'I do not understand.': 'Mi ò gbọ́.',
    'How much does this cost?': 'Iye owó mélòó ni èyí?',
};

// Fallback when a mock phrase isn't in the table
const FALLBACK_YO = 'Èdè Yorùbá ń sọ̀rọ̀ níbí.';

// Marker string passed as audioB64 so AudioPlayer knows we're in mock mode
export const MOCK_AUDIO_MARKER = '__MOCK_AUDIO__';

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function useTranslation({
    setStatus,
    setYoruba,
    setAudio,
    onComplete,
}: {
    setStatus: (s: AppStatus) => void;
    setYoruba: (t: string) => void;
    setAudio: (a: string) => void;
    onComplete: (en: string, yo: string, audio: string) => void;
}) {
    const runPipeline = async (englishText: string) => {
        try {
            // ── Transcribing (already set by useRecording) ──────────────────
            await delay(900);

            // ── Translating ──────────────────────────────────────────────────
            setStatus('translating');
            await delay(1400);
            const yorubaText = MOCK_PAIRS[englishText] ?? FALLBACK_YO;
            setYoruba(yorubaText);

            // ── Synthesising ─────────────────────────────────────────────────
            setStatus('synthesising');
            await delay(1600);

            setAudio(MOCK_AUDIO_MARKER);
            setStatus('ready');
            onComplete(englishText, yorubaText, MOCK_AUDIO_MARKER);
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    return { runPipeline };
}