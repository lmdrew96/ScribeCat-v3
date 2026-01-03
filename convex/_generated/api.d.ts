/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as generateNotes from "../generateNotes.js";
import type * as http from "../http.js";
import type * as lectureContext from "../lectureContext.js";
import type * as nuggetChat from "../nuggetChat.js";
import type * as nuggetNotes from "../nuggetNotes.js";
import type * as sessions from "../sessions.js";
import type * as uploadImage from "../uploadImage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  crons: typeof crons;
  generateNotes: typeof generateNotes;
  http: typeof http;
  lectureContext: typeof lectureContext;
  nuggetChat: typeof nuggetChat;
  nuggetNotes: typeof nuggetNotes;
  sessions: typeof sessions;
  uploadImage: typeof uploadImage;
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
