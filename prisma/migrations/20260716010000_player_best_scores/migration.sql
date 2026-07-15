-- CreateTable
CREATE TABLE IF NOT EXISTS "player_best_scores" (
    "id" BIGSERIAL NOT NULL,
    "player_id" BIGINT NOT NULL,
    "board" VARCHAR(10) NOT NULL,
    "period_key" VARCHAR(16) NOT NULL DEFAULT '',
    "score" INTEGER NOT NULL,
    "rank_level" VARCHAR(10) NOT NULL,
    "rank_title" VARCHAR(50) NOT NULL,
    "apm" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "max_combo" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "game_session_id" BIGINT,
    "achieved_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_best_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_player_best_board_period" ON "player_best_scores"("player_id", "board", "period_key");
CREATE INDEX IF NOT EXISTS "idx_player_best_board_score" ON "player_best_scores"("board", "period_key", "score" DESC);

DO $$ BEGIN
  ALTER TABLE "player_best_scores" ADD CONSTRAINT "player_best_scores_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
