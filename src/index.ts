import type { Context, FilterQuery } from "grammy";
import { questions } from "./middleware.js";
import { Question } from "./question.js";

/**
 * Flavor type that extends grammY's Context with question handling capabilities.
 *
 * This type adds three key methods to your bot's context:
 * - `ask`: Start asking one or more questions to users
 * - `question`: Create a new Question instance with specified filters
 * - `cancelQuestions`: Manually cancel all active questions for the current user
 *
 * @template C - The base Context type from grammY
 *
 * @example
 * ```typescript
 * type MyContext = QuestionsFlavor<Context>;
 * const bot = new Bot<MyContext>("token");
 * bot.use(questions());
 *
 * bot.command("ask", async (ctx) => {
 *   await ctx.ask(
 *     ctx.question("message:text")
 *       .doBefore((ctx) => ctx.reply("What's your name?"))
 *       .thenDo((ctx) => ctx.reply(`Hello ${ctx.message.text}!`))
 *   );
 * });
 * ```
 */
export type QuestionsFlavor<C extends Context> = C & {
  /**
   * Ask one or more questions to the user in an interactive flow.
   *
   * This method registers questions for the current user and stores them in the
   * active questions map. Questions are processed sequentially according to their
   * configured handlers, filters, and repeat logic.
   *
   * When called, it immediately executes the `doBefore` handler of the first question
   * (if present) and then waits for user input matching the question's filter criteria.
   *
   * @template Q - The FilterQuery type for the question
   * @param question - A single `Question` instance to ask the user
   * @returns Promise that resolves when the question flow is complete or canceled
   *
   * @example
   * ```typescript
   * // Ask a single question
   * await ctx.ask(
   *   ctx.question("message:text")
   *     .doBefore((ctx) => ctx.reply("What's your name?"))
   *     .thenDo((ctx) => ctx.reply(`Hello ${ctx.message.text}!`))
   * );
   *
   *  // Ask multiple questions
   * let name: string
   * await ctx.ask([
   *    ctx.question("message:text")
   *      .doBefore((ctx) => ctx.reply("What's your name?"))
   *      .thenDo((ctx) => { name = ctx.message.text; }),
   *    ctx.question("message:text")
   *      .doBefore((ctx) => ctx.reply("How old are you?"))
   *      .thenDo((ctx) => ctx.reply(`${name}!, You're ${ctx.message.text} years old!`))
   * ]);
   * ```
   */
  ask: {
    <Q extends FilterQuery>(question: Question<C, Q>): Promise<void>;

    <QS extends readonly Question<any>[]>(questions: QS): Promise<void>;
  };

  /**
   * Create a new Question instance with the specified filter criteria.
   *
   * This method creates a Question object that can be configured with various
   * handlers and options using the chainable API.
   *
   * @template Q - The FilterQuery type for matching updates
   * @param q - Filter query string or array of filter queries to match user input
   * @returns A new Question instance that can be configured with chainable methods
   *
   * @example
   * ```typescript
   * // Create a question that matches text messages
   * const textQuestion = ctx.question("message:text");
   *
   * // Create a question that matches multiple update types
   * const multiQuestion = ctx.question(["message:text", "callback_query:data"]);
   *
   * // Configure the question
   * await ctx.ask(
   *   textQuestion
   *     .doBefore((ctx) => ctx.reply("Please enter some text:"))
   *     .thenDo((ctx) => ctx.reply(`You said: ${ctx.message.text}`))
   * );
   * ```
   */
  question<Q extends FilterQuery>(q: Q | Q[]): Question<C, Q>;

  /**
   * Cancel all active questions for the current user.
   *
   * This method immediately removes all pending questions from the active
   * questions map for the current user/chat combination. Use this when you
   * need to programmatically end a question flow without waiting for user input.
   *
   * @returns boolean - True if questions were canceled, false if no questions were active
   *
   * @example
   * ```typescript
   * // Cancel questions based on some condition
   * if (someCondition) {
   *   const wasCanceled = ctx.cancelQuestions();
   *   if (wasCanceled) {
   *     await ctx.reply("Question flow canceled.");
   *   }
   * }
   * ```
   */
  cancelQuestions: () => boolean;
};

export { Question, questions };
