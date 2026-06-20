"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

type OrchestrateResult = {
  englishText: string;
  yorubaText: string;
  audioB64: string;
};

export const orchestrate = action({
  args: {
    audioUploadUrl: v.string(),
  },
  handler: async (ctx, { audioUploadUrl }): Promise<OrchestrateResult> => {
    const backendUrl = process.env.ML_BACKEND_URL;
    if (!backendUrl) {
      throw new Error("ML_BACKEND_URL is not set");
    }

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

    const { text: englishText } = await transcribeResponse.json();

    const yorubaText: string = await ctx.runAction(
      api.actions.translate.translate,
      { text: englishText },
    );

    const synthesiseResponse = await fetch(`${backendUrl}/synthesise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: yorubaText }),
    });

    if (!synthesiseResponse.ok) {
      throw new Error(
        `${synthesiseResponse.status} ${synthesiseResponse.statusText}`,
      );
    }

    const { audio_b64: audioB64 } = await synthesiseResponse.json();

    await ctx.runMutation(api.mutations.saveTranslation.saveTranslation, {
      englishText,
      yorubaText,
    });

    return { englishText, yorubaText, audioB64 };
  },
});
