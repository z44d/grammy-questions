# grammy-questions

[![npm version](https://img.shields.io/npm/v/grammy-questions.svg)](https://www.npmjs.com/package/grammy-questions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🎯 A simple and intuitive way to handle interactive questions in your grammY bots

`grammy-questions` is a lightweight library that provides a declarative and chainable API for creating interactive questionnaires in your Telegram bots built with [grammY](https://grammy.dev). No need for external conversation plugins!

## ✨ Features

- 🎯 Simple and intuitive API for creating interactive questions
- 🔄 Built-in support for repeated questions and cancellation
- 🔗 Seamless integration with grammY's middleware system
- 🛠️ Full TypeScript support out of the box
- ⚡ Lightweight and dependency-free (only depends on grammY)
- 🎛️ Advanced filtering and validation capabilities
- 📝 Support for multiple question types (text, callbacks, etc.)

## 📦 Installation

```bash
npm install grammy-questions
# or
yarn add grammy-questions
# or
bun add grammy-questions
```


## 📋 Prerequisites

This library requires:
- Node.js or Bun
- grammY
- msgpack-lite

## 🚀 Quick Start

```typescript

// Extend your context with QuestionsFlavor
type MyContext = QuestionsFlavor<Context>;

const bot = new Bot<MyContext>("YOUR_BOT_TOKEN"); // <-- put your bot token here

// Add questions middleware
bot.use(questions());

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

## 🎛️ Advanced Usage

### 🔧 Configuration Options

```typescript
bot.use(
  questions({
    // Optional
    cancel: {
      has: "message:text",
      hears: "/cancel",
      onCancel: (ctx) => ctx.reply("❌ Operation canceled"),
    },
  }),
);
```

### 📝 Handling Multiple Questions

```typescript
bot.command("survey", async (ctx) => {
  let name: string;
  await ctx.ask([
    ctx.question("message:text")
      .doBefore((ctx) => ctx.reply("What's your name?"))
      .thenDo((ctx) => {
        name = ctx.message.text;
        return ctx.reply("Cool name! How old are you?");
      }),
      
    ctx.question("message:text")
      .filter((ctx) => !!Number(ctx.message.text)) // Only accept numeric responses
      .thenDo((ctx) => {
        return ctx.reply(`Thanks, ${name}! You're ${ctx.message.text} years old.`);
      })
  ]);
});
```

### 🔄 Repeating Questions

```typescript
bot.command("collect", async (ctx) => {
  const items: string[] = [];

  await ctx.ask(
    ctx.question("message:text")
      .doBefore((ctx) =>
        ctx.reply("Add an item (or type 'done' to finish):"),
      )
      .thenDo(async (ctx) => {
        items.push(ctx.message.text);
        return await ctx.reply(`Added! Current length: ${items.length}`);
      })
      .repeatUntil(async (ctx) => {
        if (ctx.message?.text?.toLowerCase() === "done") {
          await ctx.reply(
            `✅ Collection complete! Final items: ${items.join(", ")}`,
          );
          return true;
        }
        return false;
      }),
  );
});
```

### 🎮 Handling Callback Queries

```typescript
bot.command("callback", async (ctx) => {
  return await ctx.ask(
    ctx
      .question(["message:text", "callback_query:data"]) // Accept both text and callbacks
      .doBefore((ctx) =>
        ctx.reply(
          "Hello! Send your name please! To stop this operation click on this button",
          {
            reply_markup: new InlineKeyboard().text("Cancel", "cancel"),
          },
        ),
      )
      .filter((ctx) => !!ctx.message?.text) // Only process text messages as answers
      .cancel(async (ctx) => {
        if (ctx.callbackQuery?.data === "cancel") {
          await ctx.answerCallbackQuery({
            text: "Canceled!",
            show_alert: true,
          });
          await ctx.editMessageText("❌ Aborted");
          return true;
        }
        return false;
      })
      .thenDo((ctx) => ctx.reply(`Hello ${ctx.message?.text}!`)),
  );
});
```

### 🔍 Input Validation and Conditional Logic

```typescript
bot.command("validate", async (ctx) => {
  return await ctx.ask(
    ctx
      .question("message:text")
      .doBefore((ctx) =>
        ctx.reply(
          "🔢 Send me only numbers, once you send a non-number this operation will be canceled.",
        ),
      )
      .thenDo((ctx) => {
        if (Number(ctx.message.text)) {
          return ctx.reply(
            "✅ Perfect! This is a number! I will continue with you.",
          );
        } else {
          ctx.cancelQuestions(); // Cancel if input is invalid
          return ctx.reply(
            "❌ That's not a number! I'm not waiting for another number from you!",
          );
        }
      })
      .repeatUntil((_ctx) => false), // Keep repeating indefinitely
  );
});
```

## 📚 API Reference

### `questions(options?)`

Middleware function that enhances your bot context with question handling capabilities.

**Options:**
- `cancel`: Configuration for cancellation behavior
  - `has`: Filter query for cancellation triggers
  - `hears`: String or RegExp to match for cancellation
  - `filter`: Custom filter function for cancellation
  - `onCancel`: Handler function when cancellation occurs

### `ctx.ask(questions)`

Ask one or more questions to the user.

**Parameters:**
- `questions`: A single `Question` instance or an array of `Question` instances

### `ctx.question(query)`

Create a new Question instance with the provided filter/query.

**Parameters:**
- `query`: Filter query string or array of filter queries

### Question Methods

- `.doBefore(handler)`: Execute code before waiting for the answer
- `.thenDo(handler)`: Execute code when a valid answer is received
- `.filter(handler)`: Filter which updates should be considered as answers
- `.cancel(handler)`: Custom cancellation logic for this question
- `.repeat(n)`: Repeat the question n times
- `.repeatUntil(handler)`: Repeat until the handler returns true

### `ctx.cancelQuestions()`

Manually cancel all active questions for the current user.

## 🎯 Best Practices

### 2. Implement Proper Error Handling

Always handle potential errors in your question handlers:

```typescript
bot.command("safe", async (ctx) => {
  await ctx.ask(
    ctx.question("message:text")
      .doBefore((ctx) => ctx.reply("Send me a number:"))
      .thenDo(async (ctx) => {
        try {
          const num = Number(ctx.message.text);
          if (isNaN(num)) {
            await ctx.reply("❌ That's not a valid number!");
            return ctx.cancelQuestions();
          }
          await ctx.reply(`✅ You sent: ${num}`);
        } catch (error) {
          console.error("Error processing answer:", error);
          await ctx.reply("❌ An error occurred. Please try again.");
          return ctx.cancelQuestions();
        }
      })
  );
});
```

### 3. Set Timeouts for Long-running Conversations

Consider implementing timeouts for questions that might be left hanging:

```typescript
// Example with timeout using setTimeout
bot.command("timeout", async (ctx) => {
  const timeoutId = setTimeout(async () => {
    await ctx.cancelQuestions();
    await ctx.reply("⏰ Question timed out. Please start over.");
  }, 60000); // 60 seconds timeout

  await ctx.ask(
    ctx.question("message:text")
      .doBefore((ctx) => ctx.reply("You have 60 seconds to respond:"))
      .thenDo(async (ctx) => {
        clearTimeout(timeoutId);
        await ctx.reply(`✅ Received: ${ctx.message.text}`);
      })
  );
});
```

## 📄 License

MIT © [Zaid](https://github.com/z44d)
