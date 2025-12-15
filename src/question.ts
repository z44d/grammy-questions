import type { Context, Filter, FilterQuery } from "grammy";
import type { QuestionsFlavor } from "./index.js";
import type { MaybePromise } from "./types.js";

/**
 * Represents a question in an interactive conversation flow.
 *
 * This class provides a chainable API for configuring how questions behave,
 * including what triggers them, how they're processed, and when they repeat or end.
 *
 * @template C - The Context type, typically QuestionsFlavor<Context>
 * @template Q - The FilterQuery type for matching updates
 *
 * @example
 * ```typescript
 * const question = ctx.question("message:text")
 *   .doBefore((ctx) => ctx.reply("Enter your name:"))
 *   .filter((ctx) => ctx.message.text.length > 2)
 *   .thenDo((ctx) => ctx.reply(`Hello ${ctx.message.text}!`))
 *   .repeatUntil((ctx) => ctx.message.text.toLowerCase() === "stop");
 * ```
 */
export class Question<
  C extends Context = Context,
  Q extends FilterQuery = FilterQuery,
> {
  private _handler?:
    | ((ctx: Filter<QuestionsFlavor<C>, Q>) => MaybePromise<unknown>)
    | undefined;

  private _doBefore?:
    | ((ctx: QuestionsFlavor<C>) => MaybePromise<unknown>)
    | undefined;

  private _repeater?: number | "infinity";

  private _cancelFunc?: (
    ctx: Filter<QuestionsFlavor<C>, Q extends unknown[] ? Q[number] : Q>,
  ) => MaybePromise<boolean>;

  private _cancelRepeater?: (
    ctx: Filter<QuestionsFlavor<C>, Q extends unknown[] ? Q[number] : Q>,
  ) => MaybePromise<boolean>;

  private _filter?: (
    ctx: Filter<QuestionsFlavor<C>, Q extends unknown[] ? Q[number] : Q>,
  ) => MaybePromise<boolean>;

  constructor(
    public query: Q | Q[],
    public implementedDoBefore: boolean = false,
    public implementedHandler: number = 0,
  ) {}

  public get(
    q:
      | "handler"
      | "doBefore"
      | "repeater"
      | "cancelRepeater"
      | "cancelFunc"
      | "filter",
  ) {
    return q === "handler"
      ? this._handler
      : q === "doBefore"
        ? this._doBefore
        : q === "repeater"
          ? this._repeater
          : q === "cancelRepeater"
            ? this._cancelRepeater
            : q === "filter"
              ? this._filter
              : this._cancelFunc;
  }

  /**
   * Set the handler function to execute when a valid answer is received.
   *
   * This handler is called after the filter (if present) passes validation.
   * It's the main callback for processing the user's response.
   *
   * @param func - Handler function that processes the user's answer
   * @returns The same Question instance for method chaining
   *
   * @example
   * ```typescript
   * question.thenDo((ctx) => {
   *   console.log("User answered:", ctx.message.text);
   *   return ctx.reply("Thanks for your answer!");
   * });
   * ```
   */
  public thenDo(
    func:
      | ((ctx: Filter<QuestionsFlavor<C>, Q>) => MaybePromise<unknown>)
      | undefined,
  ) {
    this._handler = func;
    return this;
  }

  /**
   * Set a function to execute before waiting for the user's answer.
   *
   * This is typically used to send the initial prompt or question to the user.
   * The function is executed once when the question is first asked.
   *
   * @param func - Function to execute before waiting for input
   * @returns The same Question instance for method chaining
   *
   * @example
   * ```typescript
   * question.doBefore((ctx) => {
   *   return ctx.reply("Please enter your age:");
   * });
   * ```
   */
  public doBefore(
    func: ((ctx: QuestionsFlavor<C>) => MaybePromise<unknown>) | undefined,
  ) {
    this._doBefore = func;
    return this;
  }

  /**
   * Set the question to repeat a specific number of times.
   *
   * After each valid answer, the question will be asked again until it has
   * been asked the specified number of times. The `doBefore` handler is
   * executed on each repetition.
   *
   * @param n - Number of times to repeat the question
   * @returns The same Question instance for method chaining
   *
   * @example
   * ```typescript
   * // Ask for 3 items
   * question.repeat(3);
   *
   * // Ask indefinitely (same as repeatUntil with false condition)
   * question.repeat(Infinity);
   * ```
   */
  public repeat(n: number) {
    this._repeater = n;
    return this;
  }

  /**
   * Set a filter function to validate user input before processing.
   *
   * This function is called before the `thenDo` handler. If it returns false,
   * the input is ignored and the question continues waiting for a valid response.
   * Use this to validate input format, content, or other criteria.
   *
   * @param func - Filter function that returns true if input is valid
   * @returns The same Question instance for method chaining
   *
   * @example
   * ```typescript
   * // Only accept numeric input
   * question.filter((ctx) => !isNaN(Number(ctx.message.text)));
   *
   * // Only accept messages longer than 5 characters
   * question.filter((ctx) => ctx.message.text.length > 5);
   *
   * // Accept only specific commands
   * question.filter((ctx) => ["yes", "no"].includes(ctx.message.text.toLowerCase()));
   * ```
   */
  public filter(
    func: (
      ctx: Filter<QuestionsFlavor<C>, Q extends unknown[] ? Q[number] : Q>,
    ) => MaybePromise<boolean>,
  ) {
    this._filter = func;
    return this;
  }

  /**
   * Set a custom cancellation handler for this specific question.
   *
   * This function is called before the main question logic to check if
   * the question should be canceled based on the current context.
   * If it returns true, the question is immediately canceled and removed.
   *
   * @param func - Cancellation function that returns true to cancel the question
   * @returns The same Question instance for method chaining
   *
   * @example
   * ```typescript
   * // Cancel on specific callback query
   * question.cancel(async (ctx) => {
   *   if (ctx.callbackQuery?.data === "cancel") {
   *     await ctx.answerCallbackQuery("Canceled!");
   *     await ctx.editMessageText("Operation canceled");
   *     return true;
   *   }
   *   return false;
   * });
   *
   * // Cancel on specific text
   * question.cancel((ctx) => {
   *   return ctx.message?.text?.toLowerCase() === "stop";
   * });
   * ```
   */
  public cancel(
    func: (
      ctx: Filter<QuestionsFlavor<C>, Q extends unknown[] ? Q[number] : Q>,
    ) => MaybePromise<boolean>,
  ) {
    this._cancelFunc = func;
    return this;
  }

  /**
   * Set the question to repeat until a specific condition is met.
   *
   * This method configures the question to repeat indefinitely until the
   * provided function returns true. The function is called after each valid
   * answer to determine if repetition should stop.
   *
   * @param func - Function that returns true to stop repeating
   * @returns The same Question instance for method chaining
   *
   * @example
   * ```typescript
   * // Repeat until user types "done"
   * question.repeatUntil((ctx) => {
   *   return ctx.message?.text?.toLowerCase() === "done";
   * });
   *
   * // Repeat until collected 5 items
   * const items = [];
   * question.repeatUntil((ctx) => {
   *   items.push(ctx.message.text);
   *   return items.length >= 5;
   * });
   *
   * // Repeat forever (never returns true)
   * question.repeatUntil(() => false);
   * ```
   */
  public repeatUntil(
    func: (
      ctx: Filter<QuestionsFlavor<C>, Q extends unknown[] ? Q[number] : Q>,
    ) => MaybePromise<boolean>,
  ) {
    this._repeater = "infinity";
    this._cancelRepeater = func;
    return this;
  }
}
