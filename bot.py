"""
@GorillaCaseBot — Telegram bot for Penalty Rush WebApp.

Usage:
    BOT_TOKEN=<token> WEBAPP_URL=https://your-url python bot.py
"""
import asyncio, logging, os
import aiohttp
from aiogram import Bot, Dispatcher, Router
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
    MenuButtonWebApp,
)

BOT_TOKEN  = os.environ["BOT_TOKEN"]
WEBAPP_URL = os.environ["WEBAPP_URL"]

logging.basicConfig(level=logging.INFO)
router = Router()


def game_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="⚽ Play Penalty Rush",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    ]])


@router.message(CommandStart())
async def cmd_start(message: Message):
    name = message.from_user.first_name or "Player"
    await message.answer(
        f"👋 Welcome, *{name}*\\!\n\n"
        "🥅 *Penalty Rush* is a penalty shootout game\\.\n\n"
        "Pick your stake, choose a corner, and beat the keeper\\.\n"
        "You start with *1\\,000 ★* — good luck\\!\n\n"
        "Commands:\n"
        "/start — show this menu\n"
        "/leaderboard — top 10 players\n"
        "/help — how to play",
        parse_mode="MarkdownV2",
        reply_markup=game_kb(),
    )


@router.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(
        "🎮 *How to Play*\n\n"
        "1\\. Open the game with the button below\n"
        "2\\. Choose your *stake* \\(Rookie → Legend\\)\n"
        "3\\. Pick a corner: ← Left · Centre · Right →\n"
        "4\\. Win to earn stars ★, lose to lose them\\!\n\n"
        "📊 *Stake Tiers*\n"
        "• Rookie  — 200★ → win 300★  \\(70% odds\\)\n"
        "• Amateur — 500★ → win 800★  \\(55% odds\\)\n"
        "• Pro     — 1000★ → win 2000★ \\(40% odds\\)\n"
        "• Legend  — 5000★ → win 10k★  \\(25% odds\\)\n\n"
        "💡 Your balance resets to 1\\,000★ if it drops below 100★\\.",
        parse_mode="MarkdownV2",
        reply_markup=game_kb(),
    )


@router.message(Command("leaderboard"))
async def cmd_leaderboard(message: Message):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{WEBAPP_URL}/leaderboard",
                timeout=aiohttp.ClientTimeout(total=5),
            ) as r:
                data = await r.json()
    except Exception:
        await message.answer("❌ Could not fetch leaderboard\\. Is the server running?", parse_mode="MarkdownV2")
        return

    if not data:
        await message.answer("No games played yet — be the first\\! ⚽", parse_mode="MarkdownV2")
        return

    medals = ["🥇", "🥈", "🥉"]
    lines  = ["🏆 *Top Players*\n"]
    for i, p in enumerate(data):
        medal = medals[i] if i < 3 else f"{i + 1}\\."
        name  = f"@{p['username']}" if p.get("username") else p.get("name", "?")
        shots = p.get("shots", 0)
        lines.append(f"{medal} {name} — {p['balance']:,}★  \\({p['wins']} wins / {shots} shots\\)")

    await message.answer("\n".join(lines), parse_mode="MarkdownV2", reply_markup=game_kb())


async def main():
    bot = Bot(token=BOT_TOKEN)

    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text="⚽ Play", web_app=WebAppInfo(url=WEBAPP_URL))
    )

    dp = Dispatcher()
    dp.include_router(router)
    await dp.start_polling(bot, allowed_updates=["message"])


if __name__ == "__main__":
    asyncio.run(main())
