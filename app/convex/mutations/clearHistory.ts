import { mutation } from "../_generated/server";

export const clearHistory = mutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const translations = await ctx.db.query("translations").collect();

    await Promise.all(
      translations.map(async ({ _id, audioStorageId }) => {
        // The synthesised WAV lives in file storage, so deleting the row alone
        // would orphan the blob.
        if (audioStorageId) {
          await ctx.storage.delete(audioStorageId);
        }
        await ctx.db.delete(_id);
      }),
    );

    return translations.length;
  },
});
