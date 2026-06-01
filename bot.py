"""
Telegram bot — sends an "Open Game" WebApp button.

Usage:
    BOT_TOKEN=<token> WEBAPP_URL=https://your-ngrok-url python bot.py

Get a token:  @BotFather → /newbot
Get ngrok URL: ngrok http 5000  →  copy the https:// forwarding URL
"""

import asyncio, logging, os
from aiogram import Bot, Dispatcher, Router
from aiogram.filters import CommandStart
from aiogram.types import (
    Message, InlineKeyboardMarkup, InlineKeyboardButton,
    WebAppInfo, MenuButtonWebApp,
)

BOT_TOKEN  = os.environ["BOT_TOKEN"]          # required
WEBAPP_URL = os.environ["WEBAPP_URL"]         # required  e.g. https://abc123.ngrok.io

logging.basicConfig(level=logging.INFO)
router = Router()

# ── /start ──────────────────────────────────────────────────────────────────
@router.message(CommandStart())
async def cmd_start(message: Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="⚽ Play Penalty Rush",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    ]])
    await message.answer(
        "👋 Welcome to *Penalty Rush*!\n\n"
        "Pick your stake, choose a corner, and beat the keeper.\n"
        "You start with *1 000 ★* — good luck!",
        parse_mode="Markdown",
        reply_markup=kb,
    )

# ── /leaderboard  (optional extra command) ──────────────────────────────────
@router.message(lambda m: m.text and m.text.lower().startswith("/leaderboard"))
async def cmd_leaderboard(message: Message):
    import aiohttp
    async with aiohttp.ClientSession() as s:
        async with s.get(f"{WEBAPP_URL}/leaderboard") as r:
            data = await r.json()
    if not data:
        await message.answer("No games played yet!")
        return
    lines = ["🏆 *Top Players*\n"]
    for i, p in enumerate(data, 1):
        name = f"@{p['username']}" if p.get("username") else p.get("name", "?")
        lines.append(f"{i}. {name} — {p['balance']:,}★ ({p['wins']} wins)")
    await message.answer("\n".join(lines), parse_mode="Markdown")

# ── MAIN ────────────────────────────────────────────────────────────────────
async def main():
    bot = Bot(token=BOT_TOKEN)

    # Set the persistent menu button so the WebApp is one tap away
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text="⚽ Play", web_app=WebAppInfo(url=WEBAPP_URL))
    )

    dp = Dispatcher()
    dp.include_router(router)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
