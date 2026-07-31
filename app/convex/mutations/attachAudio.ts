import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const attachAudio = mutation({
  args: {
    translationId: v.id("translations"),
    audioStorageId: v.optional(v.id("_storage")),
    audioError: v.optional(v.string()),
  },
  handler: async (ctx, { translationId, audioStorageId, audioError }) => {
    await ctx.db.patch(translationId, { audioStorageId, audioError });
  },
});
