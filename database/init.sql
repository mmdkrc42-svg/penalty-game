-- BlastCrates Database Init
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM (
    'case_open','item_sell','daily_reward','referral_reward',
    'game_bet','game_win','admin_adjust','upgrade'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE case_category AS ENUM ('starter','premium','epic','legendary','limited','event');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE item_rarity AS ENUM ('common','uncommon','rare','epic','legendary','mythic');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE item_status AS ENUM ('active','sold','upgraded','used');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE game_type AS ENUM ('crash','coinflip','upgrade');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE game_result AS ENUM ('win','loss','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;
