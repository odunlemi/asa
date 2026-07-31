import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

export const saveTranslation = mutation({
  args: {
    englishText: v.string(),
    yorubaText: v.string(),
  },
  handler: async (ctx, { englishText, yorubaText }): Promise<Id<"translations">> => {
    return await ctx.db.insert("translations", {
      englishText,
      yorubaText,
      createdAt: Date.now(),
    });
  },
});
