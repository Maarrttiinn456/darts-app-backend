import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index';
import { game, gameScore } from '../db/schema';
import { requireAuth } from '../middleware/auth';

const updateScoreSchema = z.object({
    points: z.number().int().min(0),
});

export const scoresRouter = Router({ mergeParams: true });

scoresRouter.get('/', requireAuth, async (req, res, next) => {
    try {
        const { gameId } = req.params as { gameId: string };

        const [found] = await db.select().from(game).where(eq(game.id, gameId));
        if (!found) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }

        const scores = await db
            .select()
            .from(gameScore)
            .where(eq(gameScore.gameId, gameId));

        res.json(scores);
    } catch (err) {
        next(err);
    }
});

scoresRouter.patch('/:userId', requireAuth, async (req, res, next) => {
    try {
        const { gameId, userId } = req.params as { gameId: string; userId: string };

        const [found] = await db.select().from(game).where(eq(game.id, gameId));
        if (!found) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }

        if (found.isFinished) {
            res.status(400).json({ error: 'Game is already finished' });
            return;
        }

        const parsed = updateScoreSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.issues[0].message });
            return;
        }

        const [updated] = await db
            .update(gameScore)
            .set({ points: parsed.data.points, updatedAt: new Date() })
            .where(and(eq(gameScore.gameId, gameId), eq(gameScore.userId, userId)))
            .returning();

        if (!updated) {
            res.status(404).json({ error: 'Score record not found' });
            return;
        }

        res.json(updated);
    } catch (err) {
        next(err);
    }
});
