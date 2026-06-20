"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

type OrchestrateResult = {
  englishText: string;
  yorubaText: string;
  audioB64: string | null;
};

type PipelineStage = "transcription" | "translation" | "synthesis";

class PipelineError extends Error {
  stage: PipelineStage;

  constructor(stage: PipelineStage, message: string) {
    super(message);
    this.stage = stage;
  }
}

export const orchestrate = action({
  args: {
    audioUploadUrl: v.string(),
  },
  handler: async (ctx, { audioUploadUrl }): Promise<OrchestrateResult> => {
    const backendUrl = process.env.ML_BACKEND_URL;
    if (!backendUrl) {
      throw new PipelineError("transcription", "ML_BACKEND_URL is not set");
    }

    let englishText: string;
    try {
      const transcribeResponse = await fetch(`${backendUrl}/transcribe-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_url: audioUploadUrl }),
      });

      if (!transcribeResponse.ok) {
        throw new Error(
          `${transcribeResponse.status} ${transcribeResponse.statusText}`,
        );
      }

      ({ text: englishText } = await transcribeResponse.json());
    } catch (err) {
      throw new PipelineError(
        "transcription",
        err instanceof Error ? err.message : "Unknown transcription error",
      );
    }

    let yorubaText: string;
    try {
      yorubaText = await ctx.runAction(api.actions.translate.translate, {
        text: englishText,
      });
    } catch (err) {
      throw new PipelineError(
        "translation",
        err instanceof Error ? err.message : "Unknown translation error",
      );
    }

    let audioB64: string | null = null;
    try {
      const synthesiseResponse = await fetch(`${backendUrl}/synthesise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: yorubaText }),
      });

      if (synthesiseResponse.ok) {
        const synthesiseData = await synthesiseResponse.json();
        audioB64 = synthesiseData.audio_b64 ?? null;
      }
    } catch {
      // Synthesis failure is non-fatal. audioB64 stays null and
      // englishText/yorubaText are still returned.
      audioB64 = null;
    }

    await ctx.runMutation(api.mutations.saveTranslation.saveTranslation, {
      englishText,
      yorubaText,
    });

    return { englishText, yorubaText, audioB64 };
  },
});
