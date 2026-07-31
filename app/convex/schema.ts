import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  translations: defineTable({
    englishText: v.string(),
    yorubaText: v.string(),
    createdAt: v.number(),
    // Written by actions/synthesise after the row is already visible to the
    // client, so the phone can render text without waiting on the TTS model.
    audioStorageId: v.optional(v.id("_storage")),
    audioError: v.optional(v.string()),
  }),
});
