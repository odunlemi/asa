"use node";

import { action } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

type OrchestrateResult = {
  translationId: Id<"translations">;
  englishText: string;
  yorubaText: string;
};

type PipelineStage = "transcription" | "translation";

function pipelineError(stage: PipelineStage, err: unknown): ConvexError<{
  stage: PipelineStage;
  message: string;
}> {
  return new ConvexError({
    stage,
    message: err instanceof Error ? err.message : `Unknown ${stage} error`,
  });
}

export const orchestrate = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { storageId }): Promise<OrchestrateResult> => {
    const backendUrl = process.env.ML_BACKEND_URL;
    if (!backendUrl) {
      throw pipelineError("transcription", new Error("ML_BACKEND_URL is not set"));
    }

    // The client uploads audio to Convex storage rather than to AssemblyAI, so
    // the API key never leaves the backend. AssemblyAI fetches the recording
    // from this signed URL itself.
    const audioUrl = await ctx.storage.getUrl(storageId);
    if (!audioUrl) {
      throw pipelineError("transcription", new Error("Uploaded audio not found"));
    }

    let englishText: string;
    try {
      const transcribeResponse = await fetch(`${backendUrl}/transcribe-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_url: audioUrl }),
      });

      if (!transcribeResponse.ok) {
        throw new Error(
          `${transcribeResponse.status} ${transcribeResponse.statusText}`,
        );
      }

      ({ text: englishText } = await transcribeResponse.json());
    } catch (err) {
      throw pipelineError("transcription", err);
    } finally {
      // The transcript is the only artefact worth keeping.
      await ctx.storage.delete(storageId);
    }

    let yorubaText: string;
    try {
      yorubaText = await ctx.runAction(api.actions.translate.translate, {
        text: englishText,
      });
    } catch (err) {
      throw pipelineError("translation", err);
    }

    const translationId: Id<"translations"> = await ctx.runMutation(
      api.mutations.saveTranslation.saveTranslation,
      { englishText, yorubaText },
    );

    await ctx.scheduler.runAfter(0, api.actions.synthesise.synthesise, {
      translationId,
      yorubaText,
    });

    return { translationId, englishText, yorubaText };
  },
});
