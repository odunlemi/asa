import { useAction, useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from '../../../app/convex/_generated/api';
import { Id } from '../../../app/convex/_generated/dataModel';
import { AppStatus } from '../../App';

export function useTranslation({
    setStatus,
    setEnglish,
    setYoruba,
    setTranslationId,
    setError,
}: {
    setStatus: (s: AppStatus) => void;
    setEnglish: (t: string) => void;
    setYoruba: (t: string) => void;
    setTranslationId: (id: Id<'translations'> | null) => void;
    setError: (message: string | null) => void;
}) {
    const generateUploadUrl = useMutation(
        api.mutations.generateUploadUrl.generateUploadUrl,
    );
    const orchestrate = useAction(api.actions.orchestrate.orchestrate);

    const runPipeline = async (recordingUri: string) => {
        setStatus('transcribing');
        setError(null);

        try {
            const uploadUrl = await generateUploadUrl();

            // uploadAsync streams the file off disk; loading a recording into
            // memory as a blob first is wasteful and flaky on Android.
            const upload = await FileSystem.uploadAsync(uploadUrl, recordingUri, {
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                headers: { 'Content-Type': 'audio/m4a' },
            });

            if (upload.status !== 200) {
                throw new Error(`Upload failed (${upload.status})`);
            }

            const { storageId } = JSON.parse(upload.body) as {
                storageId: Id<'_storage'>;
            };

            const result = await orchestrate({ storageId });

            setEnglish(result.englishText);
            setYoruba(result.yorubaText);
            setTranslationId(result.translationId);
            // Synthesis is scheduled server-side; App subscribes to the row and
            // flips to 'ready' once the audio url (or an error) lands.
            setStatus('synthesising');
        } catch (err) {
            setError(
                err instanceof ConvexError
                    ? `${(err.data as { stage: string }).stage} failed: ${(err.data as { message: string }).message}`
                    : err instanceof Error
                        ? err.message
                        : 'Something went wrong',
            );
            setStatus('error');
        }
    };

    return { runPipeline };
}
