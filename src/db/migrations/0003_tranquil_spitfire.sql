ALTER TABLE "game" DROP CONSTRAINT "game_winner_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "winner_ids" uuid[];--> statement-breakpoint
ALTER TABLE "game" DROP COLUMN "winner_id";