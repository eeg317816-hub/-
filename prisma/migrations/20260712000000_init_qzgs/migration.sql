-- CreateTable
CREATE TABLE "players" (
    "id" BIGSERIAL NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "nickname" VARCHAR(50) NOT NULL,
    "avatar_key" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),
    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cards" (
    "id" BIGSERIAL NOT NULL,
    "card_code" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "game_sessions" (
    "id" BIGSERIAL NOT NULL,
    "player_id" BIGINT NOT NULL,
    "card_id" BIGINT,
    "mode" VARCHAR(30) NOT NULL DEFAULT 'apm_challenge',
    "duration_seconds" INTEGER NOT NULL DEFAULT 30,
    "score" INTEGER NOT NULL DEFAULT 0,
    "rank_level" VARCHAR(10) NOT NULL DEFAULT 'C',
    "rank_title" VARCHAR(50) NOT NULL DEFAULT '新人训练生',
    "apm" INTEGER NOT NULL DEFAULT 0,
    "max_apm" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "mouse_correct" INTEGER NOT NULL DEFAULT 0,
    "mouse_error" INTEGER NOT NULL DEFAULT 0,
    "keyboard_correct" INTEGER NOT NULL DEFAULT 0,
    "keyboard_error" INTEGER NOT NULL DEFAULT 0,
    "max_combo" INTEGER NOT NULL DEFAULT 0,
    "avg_reaction_ms" INTEGER,
    "life_left" INTEGER NOT NULL DEFAULT 0,
    "is_valid" BOOLEAN NOT NULL DEFAULT TRUE,
    "cheat_flag" BOOLEAN NOT NULL DEFAULT FALSE,
    "cheat_reason" TEXT,
    "device_code" VARCHAR(50),
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "game_config" (
    "id" BIGSERIAL NOT NULL,
    "config_key" VARCHAR(100) NOT NULL,
    "config_value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "game_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_users" (
    "id" BIGSERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(30) NOT NULL DEFAULT 'admin',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),
    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "players_phone_key" ON "players"("phone");
CREATE UNIQUE INDEX "players_nickname_key" ON "players"("nickname");
CREATE INDEX "idx_players_phone" ON "players"("phone");

CREATE UNIQUE INDEX "cards_card_code_key" ON "cards"("card_code");
CREATE INDEX "idx_cards_card_code" ON "cards"("card_code");

CREATE UNIQUE INDEX "game_config_config_key_key" ON "game_config"("config_key");
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

CREATE INDEX "idx_game_sessions_player_id" ON "game_sessions"("player_id");
CREATE INDEX "idx_game_sessions_created_at" ON "game_sessions"("created_at");
CREATE INDEX "idx_game_sessions_score" ON "game_sessions"("score" DESC);
CREATE INDEX "idx_game_sessions_valid_score" ON "game_sessions"("is_valid", "score" DESC);
CREATE INDEX "idx_game_sessions_device_code" ON "game_sessions"("device_code");

ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
