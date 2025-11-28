import { conversations } from "@grammyjs/conversations";
import { Bot, type Context } from "grammy";
import { QuestionsFlavor, questions } from "grammy-questions";

# grammy-questions

[![npm version](https://img.shields.io/npm/v/grammy-questions.svg)](https://www.npmjs.com/package/grammy-questions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A simple and intuitive way to handle conversations in your grammY bots

`grammy-questions` is a lightweight wrapper around `@grammyjs/conversations` that provides a more declarative and chainable API for creating interactive conversations in your Telegram bots built with [grammY](https://grammy.dev).

## Features

- 🎯 Simple and intuitive API for creating conversations
- 🔄 Built-in support for repeated questions and cancellation
- 🔄 Seamless integration with grammY's middleware system
- 🛠️ TypeScript support out of the box
- ⚡ Lightweight and dependency-free (only depends on `@grammyjs/conversations`)

## Installation

```bash
npm install grammy-questions
# or
yarn add grammy-questions
# or
bun add grammy-questions
```

## Prerequisites

This library requires:
- Node.js or Bun
- grammY
- @grammyjs/conversations

## Quick Start

```typescript

// QuestionsFlavor also implements ConversationFlavor, so you don't need to extend Context manually.
type MyContext = QuestionsFlavor<Context>;

const bot = new Bot<MyContext>(""); // <-- put your bot token here

// Add questions middleware
bot.use(questions());

// Set up conversations plugin
bot.use(conversations());


// Example command
bot.command("start", async (ctx) => {
  await ctx.ask(
    ctx.question("message:text")
      .doBefore((ctx) => ctx.reply("👋 Welcome! What's your name?"))
      .thenDo((ctx) => {
        const name = ctx.message.text;
        return ctx.reply(`Nice to meet you, ${name}!`);
      })
  );
});

bot.start();
```

## Advanced Usage

### Handling Multiple Questions

```typescript
bot.command("survey", async (ctx) => {
  let name: string;
  await ctx.ask([
    ctx.question("message:text")
      .doBefore((ctx) => ctx.reply("What's your name?"))
      .thenDo(async (ctx, convo) => {
        await convo.external(() => {
          name = ctx.message.text;
        });
      }),
      
    ctx.question("message:text")
      .doBefore((ctx) => ctx.reply("How old are you?"))
      .thenDo((ctx) => {
        return ctx.reply(`Thanks, ${name}! You're ${ctx.message.text} years old.`);
      })
  ]);
});
```

### Repeating Questions

```typescript
bot.command("collect", async (ctx) => {
  const items = [];
  
  await ctx.ask(
    ctx.question("message:text")
      .doBefore((ctx) => ctx.reply("Add an item (or type 'done' to finish):"))
      .thenDo(async (ctx, convo) => {
        await convo.external(() => items.push(ctx.message.text))
        return await ctx.reply(`Added! Current items: ${items.join(', ')}`);
      })
      .repeatUntil(async (ctx) => {
        if (ctx.message?.text?.toLowerCase() === 'done') {
            await ctx.reply(`Collection complete! Final items: ${items.join(', ')}`);
            return true;
        }
        return false;
      })
  );
});
```

## License

MIT ©
