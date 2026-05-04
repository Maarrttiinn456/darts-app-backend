import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index';
import { league, leagueMember, user } from '../db/schema';
import { requireAuth } from '../middleware/auth';

const router = Router();

const createLeagueSchema = z.object({
    name: z.string().min(1),
    memberIds: z.array(z.string().uuid()).min(1),
});

router.get('/', requireAuth, async (req, res, next) => {
    try {
        const leagues = await db.select().from(league);
        res.json(leagues);
    } catch (err) {
        next(err);
    }
});

router.post('/', requireAuth, async (req, res, next) => {
    try {
        const parsed = createLeagueSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.issues[0].message });
            return;
        }

        const { name, memberIds } = parsed.data;
        const adminId = req.user!.id;

        const [created] = await db
            .insert(league)
            .values({ name, adminId })
            .returning();

        const uniqueIds = [...new Set([adminId, ...memberIds])];
        await db
            .insert(leagueMember)
            .values(
                uniqueIds.map((userId) => ({ leagueId: created.id, userId })),
            );

        res.status(201).json(created);
    } catch (err) {
        next(err);
    }
});

router.get('/:leagueId', requireAuth, async (req, res, next) => {
    try {
        const leagueId = req.params.leagueId as string;

        const [found] = await db
            .select()
            .from(league)
            .where(eq(league.id, leagueId));

        if (!found) {
            res.status(404).json({ error: 'League not found' });
            return;
        }

        const members = await db
            .select({
                id: user.id,
                username: user.username,
                avatarUrl: user.avatarUrl,
                color: user.color,
            })
            .from(leagueMember)
            .innerJoin(user, eq(leagueMember.userId, user.id))
            .where(eq(leagueMember.leagueId, leagueId));

        res.json({ ...found, members });
    } catch (err) {
        next(err);
    }
});

export default router;
