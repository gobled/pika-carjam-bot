import { Markup, Telegraf } from 'telegraf';
import type { Context } from 'telegraf';
import type { Update } from 'telegraf/types';
import { recordReferral } from '@/app/lib/referralStorage';

export type BotContext = Context<Update>;

// Local constants - not exported to comply with Next.js API route requirements
const BOT_TOKEN = process.env.BOT_TOKEN ?? '';
const WEBAPP_URL = process.env.WEBAPP_URL ?? 'http://localhost:3000';
const PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN;
const TEST_MODE = process.env.TEST_MODE === 'true';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function registerHandlers(bot: Telegraf<BotContext>) {
  bot.catch((error, ctx) => {
    console.error('Unhandled bot error', {
      updateId: ctx.update.update_id,
      error,
    });
  });

  bot.command('start', async (ctx) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;

    // Check for referral code in the start command
    const startPayload = ctx.message?.text?.split(' ')[1]; // Get parameter after /start

    if (startPayload && userId) {
      // Check if it's an invite referral (format: invite_USERID)
      const inviteMatch = startPayload.match(/^invite_(\d+)$/);
      if (inviteMatch) {
        const referrerId = parseInt(inviteMatch[1], 10);

        if (!isNaN(referrerId) && referrerId !== userId) {
          try {
            const success = await recordReferral(userId, referrerId);
            if (success) {
              console.log(`Referral recorded: User ${userId} was referred by ${referrerId}`);
              // Optionally notify the referrer
              try {
                await ctx.telegram.sendMessage(
                  referrerId,
                  '🎉 Someone joined using your invite link! Check the Referrals tab to claim your reward (3 plays)!'
                );
              } catch (notifyError) {
                // Ignore if we can't notify (user might have blocked bot)
                console.log('Could not notify referrer:', notifyError);
              }
            }
          } catch (error) {
            console.error('Error recording referral:', error);
          }
        }
      }
    }

    const encodedChatId = chatId ? Buffer.from(String(chatId)).toString('base64') : '';
    const webAppUrl = encodedChatId ? `${WEBAPP_URL}?startapp=${encodedChatId}` : WEBAPP_URL;

    await ctx.reply(
      'Welcome to another fantastic fruit slicer bot! 🍉🍓🍍.',
      Markup.inlineKeyboard([
        [Markup.button.url('play now', webAppUrl)]
      ]),
    );
  });

  bot.command('webapp', async (ctx) => {
    const chatId = ctx.chat?.id;
    const encodedChatId = chatId ? Buffer.from(String(chatId)).toString('base64') : '';
    const webAppUrl = encodedChatId ? `${WEBAPP_URL}?startapp=${encodedChatId}` : WEBAPP_URL;

    await ctx.reply(
      'Open the Task Board web app.',
      Markup.inlineKeyboard([[Markup.button.url('Open Task Board', webAppUrl)]]),
    );
  });
}
const globalState = globalThis as typeof globalThis & {
  taskBoardBot?: Telegraf<BotContext>;
};

function getBotInstance(onFirstCreate?: (bot: Telegraf<BotContext>) => void) {
  if (!globalState.taskBoardBot) {
    // Append /test to token when in test mode for Telegram Stars test payments
    const botToken = TEST_MODE ? `${BOT_TOKEN}/test` : BOT_TOKEN;
    console.log(`Initializing Telegram bot in ${TEST_MODE ? 'TEST' : 'PRODUCTION'} mode`);
    const bot = new Telegraf<BotContext>(botToken);
    if (onFirstCreate) {
      onFirstCreate(bot);
    }
    globalState.taskBoardBot = bot;
  }

  return globalState.taskBoardBot;
}

const bot = getBotInstance(registerHandlers);

export async function POST(request: Request) {
  try {
    const update = (await request.json()) as Update;
    await bot.handleUpdate(update);
    return new Response('OK');
  } catch (error) {
    console.error('Error processing webhook update', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function GET() {
  return new Response('Telegram webhook is healthy.', { status: 200 });
}
