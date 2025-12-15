import type { Context } from "grammy";
import type { Question } from "./question.js";
import type { QuestionsOptions } from "./types.js";

export const QuestionsMap = new Map<string, Question<any, any>[]>();

export const clearQuestions = (
  questions: Question<any, any>[],
  key: string,
) => {
  if (questions.length === 1) {
    QuestionsMap.delete(key);
  } else {
    questions.shift();
    QuestionsMap.set(key, questions);
  }
};

export const checkContext = async <C extends Context>(
  ctx: C,
  key: string,
  next: () => Promise<void>,
  options?: QuestionsOptions<C>,
) => {
  const questions = QuestionsMap.get(key);
  if (questions && options?.cancel && ctx.has(options.cancel.has)) {
    if (
      (options.cancel.hears && ctx.hasText(options.cancel.hears)) ||
      (options.cancel.filter && (await options.cancel.filter(ctx))) ||
      (!options.cancel.hears && !options.cancel.filter)
    ) {
      QuestionsMap.delete(key);
      if (options.cancel.onCancel) {
        await options.cancel.onCancel(ctx);
      }
      return;
    }
  }
  if (questions && ctx.has(questions[0].query)) {
    const question = questions[0];
    const doBefore = question.get("doBefore") as any | undefined;
    const handler = question.get("handler") as any;
    const times = (question.get("repeater") ?? 1) as number | "infinity";
    const cancelFunc = question.get("cancelFunc") as any | undefined;
    const cancelRepeater = question.get("cancelRepeater") as
      | any
      | undefined;
    const filter = question.get("filter") as any | undefined;

    if (cancelFunc && (await cancelFunc(ctx))) {
      return QuestionsMap.delete(key);
    }

    if (cancelRepeater && (await cancelRepeater(ctx))) {
      return clearQuestions(questions, key);
    }

    if (!(filter ? await filter(ctx) : true)) {
      return await next();
    }

    if (!question.implementedDoBefore && doBefore) {
      await doBefore(ctx);
      question.implementedDoBefore = true;
    }

    await handler(ctx);
    question.implementedHandler++;

    if (times !== "infinity" && question.implementedHandler >= times) {
      return clearQuestions(questions, key);
    }

    return;
  }

  return await next();
};
