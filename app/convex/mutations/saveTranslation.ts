import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const saveTranslation = mutation({
  args: {
    englishText: v.string(),
    yorubaText: v.string(),
  },
  handler: async (ctx, { englishText, yorubaText }) => {
    await ctx.db.insert("translations", {
      englishText,
      yorubaText,
      createdAt: Date.now(),
    });
  },
});
