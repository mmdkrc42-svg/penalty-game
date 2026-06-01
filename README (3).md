# Penalty Rush — Telegram WebApp

A penalty shootout game playable inside Telegram.

## Project structure

```
penalty-game/
├── app.py              # Flask backend  (API + static serving)
├── bot.py              # aiogram bot    (sends the WebApp button)
├── requirements.txt
└── static/
    └── index.html      # Telegram WebApp frontend
```

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Create a bot

1. Open [@BotFather](https://t.me/BotFather) → `/newbot`
2. Copy the token

### 3. Start an ngrok tunnel

```bash
ngrok http 5000
# copy the https://xxxx.ngrok.io URL
```

Telegram WebApps **require HTTPS** — ngrok provides this locally.

### 4. Run Flask

```bash
BOT_TOKEN=<your_token> python app.py
```

### 5. Run the bot (separate terminal)

```bash
BOT_TOKEN=<your_token> WEBAPP_URL=https://xxxx.ngrok.io python bot.py
```

### 6. Open Telegram → your bot → /start → tap "⚽ Play Penalty Rush"

---

## How it works

| What | Where |
|------|-------|
| Telegram sends `initData` to the WebApp on open | `window.Telegram.WebApp.initData` |
| Frontend passes `initData` to `POST /create_user` | `app.py` |
| Flask validates the HMAC signature with `BOT_TOKEN` | `verify_telegram_init_data()` |
| Telegram `user.id` is used as the persistent `user_id` | same user across sessions |
| Bot menu button gives one-tap access | `MenuButtonWebApp` in `bot.py` |

## API endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/create_user` | Create/resume user; accepts `{ initData }` |
| GET  | `/user/<id>` | Fetch stats |
| POST | `/play` | Place bet; `{ user_id, stake, direction }` |
| GET  | `/leaderboard` | Top 5 by balance |
