import { useRef } from 'react';
import { Audio } from 'expo-av';
import { AppStatus } from '../../App';

// Cycles through these on each recording so the UI feels varied
const MOCK_TRANSCRIPTS = [
    'Good morning, how are you?',
    'What is your name?',
    'I need help, please.',
    'Where is the hospital?',
    'Thank you very much.',
    'Please speak slowly.',
    'I do not understand.',
    'How much does this cost?',
];

let mockIndex = 0;

export function useRecording({
    setStatus,
    setEnglish,
}: {
    setStatus: (s: AppStatus) => void;
    setEnglish: (t: string) => void;
}) {
    const recordingRef = useRef<Audio.Recording | null>(null);

    const startRecording = async () => {
        const { granted } = await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        if (granted) {
            // Real recording — so the mic indicator lights up on device
            try {
                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                recordingRef.current = recording;
            } catch {
                // Permission physically denied after the dialog — continue anyway
            }
        }

        setStatus('recording');
    };

    const stopRecording = async (): Promise<string | null> => {
        setStatus('transcribing');

        try {
            await recordingRef.current?.stopAndUnloadAsync();
        } catch { }
        recordingRef.current = null;

        // Return the next mock transcript in the cycle
        const transcript = MOCK_TRANSCRIPTS[mockIndex % MOCK_TRANSCRIPTS.length];
        mockIndex++;
        setEnglish(transcript);
        return transcript;
    };

    return { startRecording, stopRecording };
}
