import { Router } from 'express';
import db from '../db';
import { user } from '../db/schema';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req, res, next) => {
    try {
        const users = await db
            .select({
                id: user.id,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl,
                color: user.color,
                createdAt: user.createdAt,
            })
            .from(user);

        res.json(users);
    } catch (err) {
        next(err);
    }
});

export default router;
