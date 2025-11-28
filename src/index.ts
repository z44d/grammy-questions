import {
  type Conversation,
  type ConversationFlavor,
  createConversation,
} from "@grammyjs/conversations";
import type { Context, Filter, FilterQuery } from "grammy";

export type QuestionsFlavor<C extends Context> = ConversationFlavor<C> & {
  /**
   * Ask one or more questions to the user within a conversation.
   *
   * This method registers a question (or an array of questions) for the current user,
   * stores it in the active questions map, and enters the "ask" conversation flow.
   * Each question will be processed according to its handler, doBefore, repeat, and cancel logic.
   *
   * @param questions - A single `Question` instance or an array of `Question` instances
   *                    to ask the user sequentially.
   *
   * @example
   * // Ask a single question
   * const q = ctx.question("text");
   * await ctx.ask(q.thenDo(async (ctx) => ctx.reply("Thanks!")));
   *
   * @example
   * // Ask multiple questions
   * const q1 = ctx.question("message:text");
   * const q2 = ctx.question("message:photo");
   * await ctx.ask([q1, q2]);
   */
  ask: {
    <Q extends FilterQuery>(question: Question<C, Q>): Promise<void>;
    // biome-ignore lint/suspicious/noExplicitAny: allow using any here
    <QS extends readonly Question<any>[]>(questions: QS): Promise<void>;
  };

  question<Q extends FilterQuery>(q: Q | Q[]): Question<C, Q>;
};

type MaybePromise<T> = T | Promise<T>;
type MaybeArray<T> = T | T[];

class Question<
  C extends Context = Context,
  Q extends FilterQuery = FilterQuery,
> {
  private _handler?:
    | ((
        ctx: Filter<C, Q>,
        conversation: Conversation<C>,
      ) => MaybePromise<unknown>)
    | undefined;

  private _doBefore?:
    | ((ctx: C, conversation: Conversation<C>) => MaybePromise<unknown>)
    | undefined;

  private _repeater?: number | "infinity";

  private _cancelFunc?: (
    ctx: Filter<C, Q extends unknown[] ? Q[number] : Q>,
  ) => MaybePromise<boolean>;

  constructor(public query: Q | Q[]) {}

  public get(q: "handler" | "doBefore" | "repeater" | "cancelFunc") {
    return q === "handler"
      ? this._handler
      : q === "doBefore"
        ? this._doBefore
        : q === "repeater"
          ? this._repeater
          : this._cancelFunc;
  }

  public thenDo(
    func:
      | ((
          ctx: Filter<C, Q>,
          conversation: Conversation<C>,
        ) => MaybePromise<unknown>)
      | undefined,
  ) {
    this._handler = func;
    return this;
  }

  public doBefore(
    func:
      | ((ctx: C, conversation: Conversation<C>) => MaybePromise<unknown>)
      | undefined,
  ) {
    this._doBefore = func;
    return this;
  }

  public repeat(n: number) {
    this._repeater = n;
    return this;
  }

  public repeatUntil(
    func: (
      ctx: Filter<C, Q extends unknown[] ? Q[number] : Q>,
    ) => MaybePromise<boolean>,
  ) {
    this._repeater = "infinity";
    this._cancelFunc = func;
    return this;
  }
}

// biome-ignore lint/suspicious/noExplicitAny: allow using any here
const QuestionsMap = new Map<string, { q: Question<any, any>; o?: any }>();

type QuestionsOptions<C extends Context> = {
  hearsToCancel?: MaybeArray<string | RegExp>;
  onCancel?(ctx: C): MaybePromise<unknown>;
};

const waitFor = async <C extends Context>(
  conversation: Conversation<C>,
  context: C,
  query: FilterQuery | FilterQuery[],
  options?: QuestionsOptions<C>,
): Promise<C | undefined> => {
  const userId = context.from?.id as number;

  if (options?.hearsToCancel && options.onCancel) {
    conversation.waitForHears(options.hearsToCancel).then((c) => {
      if (options.onCancel) {
        options.onCancel(c as C);
        return conversation.halt();
      }
    });
  }
  const ctx = await conversation.waitFor(query).andFrom(userId);
  return ctx as C;
};

const ask = async (
  conversation: Conversation<Context>,
  context: Context,
  ids: string[],
) => {
  const contexts: (Context | undefined)[] = [];

  for (const id of ids) {
    const question = QuestionsMap.get(id)?.q as Question;
    const questionOptions = QuestionsMap.get(id)?.o as
      | QuestionsOptions<Context>
      | undefined;
    const times =
      (question.get("repeater") as number | "infinity" | undefined) ?? 1;
    const doBeforeFunction = question.get("doBefore") as
      | ((
          ctx: Context,
          conversation: Conversation<Context>,
        ) => Promise<void>)
      | undefined;
    const cancelFunc = question.get("cancelFunc") as unknown as (
      ctx: Context,
    ) => Promise<boolean>;
    const handlerFunction = question.get("handler") as (
      ctx: Context | undefined,
      conversation: Conversation<Context>,
    ) => Promise<void>;
    if (doBeforeFunction) {
      await doBeforeFunction(
        (contexts.length !== 0 ? contexts.at(-1) : context) as Context,
        conversation,
      );
    }
    let done = 0;
    while (true) {
      const ctx = await waitFor(
        conversation,
        context,
        question.query,
        questionOptions,
      );

      if (cancelFunc && ctx && (await cancelFunc(ctx))) break;

      if (ctx) {
        await handlerFunction(ctx, conversation);
      }

      done++;

      if (times !== "infinity" && done >= times) break;
    }
  }
};

/**
 * Middleware to enhance a context with the `ask` and `question` helpers.
 *
 * Provides:
 * - `ctx.ask`: Ask one or multiple questions in a conversation.
 * - `ctx.question`: Create a new Question instance with the provided filter/query.
 *
 * @param options - Optional configuration for all questions asked in this context
 *                  (e.g., `hearsToCancel` triggers, `onCancel` handlers).
 *
 * @returns A middleware function compatible with GramJS that initializes
 *          conversation handling for questions.
 *
 * @example
 * // Enable questions in a bot
 * bot.use(questions({ hearsToCancel: "/cancel", onCancel: (ctx) => ctx.reply("Cancelled") }));
 *
 * // Ask a single question
 * await ctx.ask(
 *  ctx.question("message:text")
 *    .doBefore((ctx) => ctx.reply("Hi!, What is your name?"))
 *    .thenDo((ctx) => ctx.reply(`Welcome, ${ctx.message.text}!`))
 * );
 */
export function questions<C extends Context = Context>(
  options?: QuestionsOptions<C>,
) {
  return async (
    ctx: C & QuestionsFlavor<C>,
    next: () => Promise<void>,
  ) => {
    ctx.ask = async (questions: Question<C> | Question<C>[]) => {
      const list = Array.isArray(questions) ? questions : [questions];
      const ids = list.map((item) => {
        const id = Math.random().toString(36).slice(2, 10);
        QuestionsMap.set(id, { q: item, o: options });
        return id;
      });

      await ctx.conversation.enter("ask", ids);
    };

    ctx.question = <Q extends FilterQuery>(q: Q | readonly Q[]) =>
      new Question<C, Q>((Array.isArray(q) ? [...q] : q) as Q | Q[]);

    return await createConversation(ask, { id: "ask", parallel: true })(
      ctx,
      next,
    );
  };
}
