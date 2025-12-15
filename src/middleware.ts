import type { Context, FilterQuery } from "grammy";
import { checkContext, QuestionsMap } from "./helpers.js";
import type { QuestionsFlavor } from "./index.js";
import { Question } from "./question.js";
import type { QuestionsOptions } from "./types.js";

/**
 * Middleware factory that enhances grammY's Context with question handling capabilities.
 *
 * This middleware adds three key methods to your bot's context:
 * - `ctx.ask`: Start asking one or more questions to users
 * - `ctx.question`: Create a new Question instance with specified filters
 * - `ctx.cancelQuestions`: Manually cancel all active questions for the current user
 *
 * The middleware manages question state internally using a Map that stores
 * active questions for each user/chat combination. Questions are processed
 * sequentially and can be configured with various handlers and options.
 *
 * @template C - The Context type extending grammY's Context
 * @param options - Global configuration options for all questions
 *
 * @returns A middleware function compatible with grammY that initializes
 *          question handling capabilities
 *
 * @example
 * ```typescript
 * // Basic usage with default options
 * bot.use(questions());
 *
 * // With global cancellation configuration
 * bot.use(questions({
 *   cancel: {
 *     has: "message:text",
 *     hears: "/cancel",
 *     onCancel: (ctx) => ctx.reply("❌ All questions canceled")
 *   }
 * }));
 *
 * // With custom storage key generation
 * bot.use(questions({
 *   getStorageKey: (ctx) => `user-${ctx.from?.id}`
 * }));
 *
 * // Complete example with question
 * bot.command("survey", async (ctx) => {
 *   await ctx.ask(
 *     ctx.question("message:text")
 *       .doBefore((ctx) => ctx.reply("What's your name?"))
 *       .thenDo((ctx) => ctx.reply(`Hello ${ctx.message.text}!`))
 *   );
 * });
 * ```
 */
export function questions<C extends Context = Context>(
  options?: QuestionsOptions<C>,
) {
  return async (ctx: QuestionsFlavor<C>, next: () => Promise<void>) => {
    const key = options?.getStorageKey
      ? options.getStorageKey(ctx)
      : `${ctx.me.id}-${ctx.from?.id}-${ctx.chat?.id}`;
    ctx.ask = async (questions: Question<C> | Question<C>[]) => {
      const list = Array.isArray(questions) ? questions : [questions];
      const firstQuestion = list[0];
      const firsJob = firstQuestion.get("doBefore") as any | undefined;
      if (firsJob) {
        await firsJob(ctx);
        firstQuestion.implementedDoBefore = true;
      }
      QuestionsMap.set(key, list);
    };

    ctx.question = <Q extends FilterQuery>(q: Q | readonly Q[]) =>
      new Question<C, Q>((Array.isArray(q) ? [...q] : q) as Q | Q[]);

    ctx.cancelQuestions = () => QuestionsMap.delete(key);

    return await checkContext<C>(ctx, key, next, options);
  };
}
