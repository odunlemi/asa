"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

const HF_API_URL =
  "https://api-inference.huggingface.co/models/facebook/nllb-200-distilled-600M";

export const translate = action({
  args: {
    text: v.string(),
  },
  handler: async (_ctx, { text }): Promise<string> => {
    const token = process.env.HF_TOKEN;
    if (!token) {
      throw new Error("HF_TOKEN is not set");
    }

    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          src_lang: "eng_Latn",
          tgt_lang: "yor_Latn",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `HF Inference API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const yorubaText: string = data[0]?.translation_text;

    if (!yorubaText) {
      throw new Error("No translation returned from NLLB-200");
    }

    return yorubaText;
  },
});
