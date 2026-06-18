import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  translations: defineTable({
    englishText: v.string(),
    yorubaText: v.string(),
    createdAt: v.number(),
  }),
});
