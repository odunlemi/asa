import {
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioRecorder,
} from 'expo-audio';
import { AppStatus } from '../../App';

export function useRecording({
    setStatus,
}: {
    setStatus: (s: AppStatus) => void;
}) {
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    const startRecording = async (): Promise<boolean> => {
        const { granted } = await AudioModule.requestRecordingPermissionsAsync();
        if (!granted) {
            setStatus('error');
            return false;
        }

        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setStatus('recording');
        return true;
    };

    /** Returns the local .m4a uri, or null if the recording never started. */
    const stopRecording = async (): Promise<string | null> => {
        await recorder.stop();
        // Playback through the earpiece is quiet on iOS while the session is
        // still configured for recording.
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        return recorder.uri;
    };

    return { startRecording, stopRecording };
}
