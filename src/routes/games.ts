import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index';
import { game, gameScore, leagueMember, tournament } from '../db/schema';
import { requireAuth } from '../middleware/auth';

const createGameSchema = z.object({
    mode: z.string().min(1),
});

export const tournamentGamesRouter = Router({ mergeParams: true });

tournamentGamesRouter.get('/', requireAuth, async (req, res, next) => {
    try {
        const { tournamentId } = req.params as { tournamentId: string };

        const [found] = await db
            .select()
            .from(tournament)
            .where(eq(tournament.id, tournamentId));

        if (!found) {
            res.status(404).json({ error: 'Tournament not found' });
            return;
        }

        const games = await db
            .select()
            .from(game)
            .where(eq(game.tournamentId, tournamentId));

        res.json(games);
    } catch (err) {
        next(err);
    }
});

tournamentGamesRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const { tournamentId } = req.params as { tournamentId: string };

        const [found] = await db
            .select()
            .from(tournament)
            .where(eq(tournament.id, tournamentId));

        if (!found) {
            res.status(404).json({ error: 'Tournament not found' });
            return;
        }

        const parsed = createGameSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.issues[0].message });
            return;
        }

        const [created] = await db
            .insert(game)
            .values({ tournamentId, mode: parsed.data.mode })
            .returning();

        const members = await db
            .select({ userId: leagueMember.userId })
            .from(leagueMember)
            .where(eq(leagueMember.leagueId, found.leagueId));

        if (members.length > 0) {
            await db.insert(gameScore).values(
                members.map((m) => ({
                    gameId: created.id,
                    userId: m.userId,
                    points: 0,
                })),
            );
        }

        res.status(201).json(created);
    } catch (err) {
        next(err);
    }
});

export const gamesRouter = Router();

gamesRouter.get('/:gameId', requireAuth, async (req, res, next) => {
    try {
        const { gameId } = req.params as { gameId: string };

        const [found] = await db.select().from(game).where(eq(game.id, gameId));

        if (!found) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }

        res.json(found);
    } catch (err) {
        next(err);
    }
});

gamesRouter.patch('/:gameId/finish', requireAuth, async (req, res, next) => {
    try {
        const { gameId } = req.params as { gameId: string };

        const [found] = await db.select().from(game).where(eq(game.id, gameId));

        if (!found) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }

        if (found.isFinished) {
            res.status(400).json({ error: 'Game already finished' });
            return;
        }

        const [updated] = await db
            .update(game)
            .set({ isFinished: true })
            .where(eq(game.id, gameId))
            .returning();

        res.json(updated);
    } catch (err) {
        next(err);
    }
});
