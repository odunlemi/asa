import { query } from "../_generated/server";
import { v } from "convex/values";

export const history = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 20 }) => {
    return await ctx.db.query("translations").order("desc").take(limit);
  },
});
