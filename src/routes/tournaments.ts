import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index';
import { league, tournament } from '../db/schema';
import { requireAuth } from '../middleware/auth';

const createTournamentSchema = z.object({
    name: z.string().min(1),
    date: z.string().date().optional(),
});

export const leagueTournamentsRouter = Router({ mergeParams: true });

leagueTournamentsRouter.get('/', requireAuth, async (req, res, next) => {
    try {
        const { leagueId } = req.params as { leagueId: string };

        const [found] = await db.select().from(league).where(eq(league.id, leagueId));
        if (!found) {
            res.status(404).json({ error: 'League not found' });
            return;
        }

        const tournaments = await db
            .select()
            .from(tournament)
            .where(eq(tournament.leagueId, leagueId));

        res.json(tournaments);
    } catch (err) {
        next(err);
    }
});

leagueTournamentsRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const { leagueId } = req.params as { leagueId: string };

        const [found] = await db.select().from(league).where(eq(league.id, leagueId));
        if (!found) {
            res.status(404).json({ error: 'League not found' });
            return;
        }

        const parsed = createTournamentSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.issues[0].message });
            return;
        }

        const { name, date } = parsed.data;

        const [created] = await db
            .insert(tournament)
            .values({ leagueId, name, date })
            .returning();

        res.status(201).json(created);
    } catch (err) {
        next(err);
    }
});

export const tournamentsRouter = Router();

tournamentsRouter.get('/:tournamentId', requireAuth, async (req, res, next) => {
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

        res.json(found);
    } catch (err) {
        next(err);
    }
});
