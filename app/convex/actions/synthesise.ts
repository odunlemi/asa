"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Runs detached from orchestrate via the scheduler: TTS takes tens of seconds
 * warm and minutes on a cold container, which is far longer than a phone
 * should sit on an open request. The translation row already exists, so the
 * client renders text immediately and picks up the audio when this patches it.
 */
export const synthesise = action({
  args: {
    translationId: v.id("translations"),
    yorubaText: v.string(),
  },
  handler: async (ctx, { translationId, yorubaText }): Promise<void> => {
    const backendUrl = process.env.ML_BACKEND_URL;
    if (!backendUrl) {
      await ctx.runMutation(api.mutations.attachAudio.attachAudio, {
        translationId,
        audioError: "ML_BACKEND_URL is not set",
      });
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/synthesise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: yorubaText }),
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const { audio_b64: audioB64 } = await response.json();
      if (!audioB64) {
        throw new Error("No audio returned from backend");
      }

      // Stored as a blob rather than on the document: a document caps at 1 MiB
      // and a few seconds of WAV already exceeds that once base64-encoded.
      const audioStorageId = await ctx.storage.store(
        new Blob([Buffer.from(audioB64, "base64")], { type: "audio/wav" }),
      );

      await ctx.runMutation(api.mutations.attachAudio.attachAudio, {
        translationId,
        audioStorageId,
      });
    } catch (err) {
      await ctx.runMutation(api.mutations.attachAudio.attachAudio, {
        translationId,
        audioError: err instanceof Error ? err.message : "Unknown synthesis error",
      });
    }
  },
});
