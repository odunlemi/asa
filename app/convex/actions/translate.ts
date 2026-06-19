"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

export const translate = action({
  args: {
    text: v.string(),
  },
  handler: async (_ctx, { text }): Promise<string> => {
    const backendUrl = process.env.ML_BACKEND_URL;
    if (!backendUrl) {
      throw new Error("ML_BACKEND_URL is not set");
    }

    const response = await fetch(`${backendUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(
        `Translation backend error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const yorubaText: string = data.yoruba;

    if (!yorubaText) {
      throw new Error("No translation returned from backend");
    }

    return yorubaText;
  },
});
