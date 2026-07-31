import { query } from "../_generated/server";
import { v } from "convex/values";

export const history = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 20 }) => {
    const translations = await ctx.db
      .query("translations")
      .order("desc")
      .take(limit);

    return await Promise.all(
      translations.map(async ({ audioStorageId, ...translation }) => ({
        ...translation,
        audioUrl: audioStorageId ? await ctx.storage.getUrl(audioStorageId) : null,
      })),
    );
  },
});
