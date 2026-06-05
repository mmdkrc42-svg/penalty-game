# BlastCrates — Telegram Mini App

A production-ready Telegram Mini App with case-opening, inventory, mini-games, referrals, and leaderboards.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + TypeScript + TailwindCSS |
| Backend | NestJS + TypeORM |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Deployment | Docker + Docker Compose |

## Quick Start (Docker)

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your TELEGRAM_BOT_TOKEN

# 2. Start everything
make dev
# Or: docker-compose up --build

# 3. Seed initial cases
docker-compose exec backend npm run seed
```

**URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Swagger Docs: http://localhost:3001/api/docs

## Local Development (without Docker)

```bash
# Prerequisites: PostgreSQL + Redis running locally

# Backend
cd backend
npm install
cp ../.env.example .env
npm run start:dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `JWT_SECRET` | Min 32 chars, random string |
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_IDS` | Comma-separated Telegram user IDs |

## Features

### Case Opening
- Multiple case categories (Starter, Premium, Epic, Legendary, Event)
- Weighted probability system with configurable drop rates
- Animated spin reel with reveal
- Item rarity system (Common → Mythic)

### Economy
- Coins balance with transaction history
- XP and level progression system
- Daily rewards with streak bonuses (up to 7x)
- Referral rewards (500 coins per referral)

### Mini Games
- **Crash**: Multiplier rises, cash out before it crashes
- **Coin Flip**: Heads or tails with 1.95x payout
- **Item Upgrade**: Risk items for better ones

### Inventory
- View all items with rarity filtering
- Sell single or multiple items (85% of value)
- Item upgrade game

### Referrals
- Unique referral codes per user
- Automatic reward distribution
- Referral leaderboard

### Leaderboards
- Top Earners
- Most Cases Opened
- Richest Players

### Admin Panel
- User management (ban/unban)
- Balance adjustments
- Case creation and management
- Dashboard statistics

## Production Deployment

```bash
# Build for production
docker-compose -f docker-compose.prod.yml up -d --build

# With a domain + SSL (add certbot)
certbot certonly --nginx -d yourdomain.com
```

## Telegram Bot Setup

1. Create bot with @BotFather: `/newbot`
2. Enable Mini Apps: `/setmenubutton`
3. Set web app URL to your frontend URL
4. Add bot token to `.env`

## API Documentation

Full REST API available at `/api/docs` (Swagger UI) when running.

### Key Endpoints
- `POST /api/v1/auth/telegram` — Authenticate with Telegram
- `GET /api/v1/cases` — List all cases
- `POST /api/v1/cases/:id/open` — Open a case
- `GET /api/v1/inventory` — Get user inventory
- `POST /api/v1/games/crash/bet` — Place crash game bet
- `POST /api/v1/games/coinflip/flip` — Flip a coin
- `GET /api/v1/leaderboard/top-earners` — Top earners

## Architecture

```
blastcrates/
├── backend/           # NestJS API
│   └── src/
│       ├── auth/      # JWT + Telegram auth
│       ├── users/     # User management
│       ├── economy/   # Wallets + transactions
│       ├── cases/     # Case opening logic
│       ├── inventory/ # Item management
│       ├── games/     # Crash, CoinFlip, Upgrade
│       ├── referrals/ # Referral system
│       ├── leaderboard/
│       └── admin/     # Admin panel API
├── frontend/          # Next.js app
│   └── src/
│       ├── app/       # App router pages
│       ├── components/ # Reusable components
│       ├── store/     # Zustand state
│       ├── hooks/     # Custom hooks
│       └── lib/       # API client + utils
├── database/          # Migrations + seeds
├── docker/            # Dockerfiles + nginx
└── docker-compose.yml
```
