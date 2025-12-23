import type { Context, Filter, FilterQuery } from "grammy";

type MaybePromise<T> = T | Promise<T>;
type MaybeArray<T> = T | T[];

/**
 * Configuration options for the questions middleware.
 *
 * @template C - The Context type extending grammY's Context
 * @template Q - The FilterQuery type for matching updates
 */
export type QuestionsOptions<
  C extends Context,
  Q extends FilterQuery = FilterQuery,
> = {
  /**
   * Global cancellation configuration for all questions.
   * When configured, allows users to cancel any active question using the specified triggers.
   */
  cancel?: {
    /**
     * Filter query to match updates that can trigger cancellation.
     * Examples: "message:text", "callback_query:data", ["message:text", "callback_query:data"]
     */
    has: Q | Q[];

    /**
     * Text patterns or regex to match for cancellation triggers.
     * Can be a string, regex, or array of strings/regexes.
     * Examples: "/cancel", /^cancel$/i, ["/cancel", "/stop"]
     */
    hears?: MaybeArray<string | RegExp>;

    /**
     * Custom filter function to determine if cancellation should occur.
     * Provides more control over when cancellation happens.
     *
     * @param ctx - The filtered context matching the `has` query
     * @returns Promise resolving to true if cancellation should occur
     */
    filter?: (ctx: Filter<C, Q>) => MaybePromise<boolean>;

    /**
     * Handler function called when cancellation is triggered.
     * Use this to notify users or perform cleanup actions.
     *
     * @param ctx - The filtered context matching the `has` query
     * @returns Promise that resolves when cancellation handling is complete
     */
    onCancel(ctx: C): MaybePromise<unknown>;
  };

  /**
   * Custom function to generate unique storage keys for users/chats.
   * By default, uses: `${ctx.me.id}-${ctx.from?.id}-${ctx.chat?.id}`
   *
   * @param ctx - The context object
   * @returns Unique string key for storing questions
   */
  getStorageKey?: (ctx: C) => string;

  /**
   * Global filter function that checks all incoming questions before they are processed.
   *
   * This filter is applied globally to all questions and is evaluated before any
   * question-specific filters. It provides a way to implement global validation
   * or preprocessing logic that applies to all questions in your bot.
   *
   * If the filter returns a falsy value, the question processing is skipped and
   * the middleware continues to the next handler. If it returns a truthy value,
   * the question processing continues with question-specific filters.
   *
   * This is useful for implementing features like:
   * - Global rate limiting
   * - User permission checks
   * - Maintenance mode checks
   * - Global state validation
   *
   * @param ctx - The context object for the incoming update
   * @returns Promise resolving to a truthy value to continue processing, or falsy to skip
   *
   * @example
   * ```typescript
   * // Only process questions from allowed users
   * filter: async (ctx) => {
   *   const userId = ctx.from?.id;
   *   const isAllowed = await isUserAllowed(userId);
   *   return isAllowed;
   * }
   *
   * // Skip questions during maintenance
   * filter: (ctx) => {
   *   return !isMaintenanceMode();
   * }
   *
   * // Implement rate limiting
   * filter: async (ctx) => {
   *   const userId = ctx.from?.id;
   *   const canProceed = await checkRateLimit(userId);
   *   return canProceed;
   * }
   * ```
   */
  filter?: (ctx: C) => MaybePromise<unknown>;
};

export type SerializedQuestion = {
  query: FilterQuery | FilterQuery[];
  implementedDoBefore: boolean;
  implementedHandler: number;
  repeater: number | "infinity" | undefined;
  handler: string | undefined;
  filter: string | undefined;
  doBefore: string | undefined;
  cancelFunc: string | undefined;
  cancelRepeater: string | undefined;
};

export type { MaybePromise, MaybeArray };
