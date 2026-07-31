/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_orchestrate from "../actions/orchestrate.js";
import type * as actions_synthesise from "../actions/synthesise.js";
import type * as actions_translate from "../actions/translate.js";
import type * as mutations_attachAudio from "../mutations/attachAudio.js";
import type * as mutations_generateUploadUrl from "../mutations/generateUploadUrl.js";
import type * as mutations_saveTranslation from "../mutations/saveTranslation.js";
import type * as queries_history from "../queries/history.js";
import type * as queries_translation from "../queries/translation.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/orchestrate": typeof actions_orchestrate;
  "actions/synthesise": typeof actions_synthesise;
  "actions/translate": typeof actions_translate;
  "mutations/attachAudio": typeof mutations_attachAudio;
  "mutations/generateUploadUrl": typeof mutations_generateUploadUrl;
  "mutations/saveTranslation": typeof mutations_saveTranslation;
  "queries/history": typeof queries_history;
  "queries/translation": typeof queries_translation;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
