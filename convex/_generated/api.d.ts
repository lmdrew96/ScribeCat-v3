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
import type * as audioCleanup from "../audioCleanup.js";
import type * as audioStorage from "../audioStorage.js";
import type * as authHelpers from "../authHelpers.js";
import type * as blocks from "../blocks.js";
import type * as citations from "../citations.js";
import type * as config from "../config.js";
import type * as crons from "../crons.js";
import type * as friends from "../friends.js";
import type * as generateNotes from "../generateNotes.js";
import type * as http from "../http.js";
import type * as lectureContext from "../lectureContext.js";
import type * as messaging from "../messaging.js";
import type * as messagingHelpers from "../messagingHelpers.js";
import type * as nuggetChat from "../nuggetChat.js";
import type * as nuggetNotes from "../nuggetNotes.js";
import type * as productivity from "../productivity.js";
import type * as prompts from "../prompts.js";
import type * as reportBug from "../reportBug.js";
import type * as roomNotes from "../roomNotes.js";
import type * as scrubTranscript from "../scrubTranscript.js";
import type * as sessionSharing from "../sessionSharing.js";
import type * as sessions from "../sessions.js";
import type * as studyGames from "../studyGames.js";
import type * as studyQuest from "../studyQuest.js";
import type * as studyRooms from "../studyRooms.js";
import type * as studyToolPrompts from "../studyToolPrompts.js";
import type * as studyTools from "../studyTools.js";
import type * as transcription from "../transcription.js";
import type * as uploadImage from "../uploadImage.js";
import type * as userProfiles from "../userProfiles.js";
import type * as xpUtils from "../xpUtils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  audioCleanup: typeof audioCleanup;
  audioStorage: typeof audioStorage;
  authHelpers: typeof authHelpers;
  blocks: typeof blocks;
  citations: typeof citations;
  config: typeof config;
  crons: typeof crons;
  friends: typeof friends;
  generateNotes: typeof generateNotes;
  http: typeof http;
  lectureContext: typeof lectureContext;
  messaging: typeof messaging;
  messagingHelpers: typeof messagingHelpers;
  nuggetChat: typeof nuggetChat;
  nuggetNotes: typeof nuggetNotes;
  productivity: typeof productivity;
  prompts: typeof prompts;
  reportBug: typeof reportBug;
  roomNotes: typeof roomNotes;
  scrubTranscript: typeof scrubTranscript;
  sessionSharing: typeof sessionSharing;
  sessions: typeof sessions;
  studyGames: typeof studyGames;
  studyQuest: typeof studyQuest;
  studyRooms: typeof studyRooms;
  studyToolPrompts: typeof studyToolPrompts;
  studyTools: typeof studyTools;
  transcription: typeof transcription;
  uploadImage: typeof uploadImage;
  userProfiles: typeof userProfiles;
  xpUtils: typeof xpUtils;
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
