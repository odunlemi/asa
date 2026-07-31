import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Subscribed to by the client while synthesis runs in the background, so the
 * audio URL arrives reactively once actions/synthesise patches the row.
 */
export const translation = query({
  args: {
    translationId: v.id("translations"),
  },
  handler: async (ctx, { translationId }) => {
    const row = await ctx.db.get(translationId);
    if (!row) {
      return null;
    }

    const { audioStorageId, ...translation } = row;

    return {
      ...translation,
      audioUrl: audioStorageId ? await ctx.storage.getUrl(audioStorageId) : null,
    };
  },
});
