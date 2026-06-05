export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.TELEGRAM_BOT_USERNAME,
  },
  admin: {
    ids: (process.env.ADMIN_IDS || '').split(',').filter(Boolean).map(Number),
  },
  economy: {
    dailyRewardBase: parseInt(process.env.DAILY_REWARD_BASE, 10) || 100,
    referralReward: parseInt(process.env.REFERRAL_REWARD, 10) || 500,
    startingBalance: parseInt(process.env.STARTING_BALANCE, 10) || 1000,
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
  },
});
