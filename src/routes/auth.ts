import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from '../db/index';
import { user } from '../db/schema';
import { requireAuth } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
    username: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
});

const loginSchema = z.object({
    email: z.email(),
    password: z.string(),
});

function signToken(id: string, email: string) {
    return jwt.sign({ id, email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

router.post('/register', async (req, res, next) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.issues[0].message });
            return;
        }

        const { username, email, password } = parsed.data;

        const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
        if (existing.length > 0) {
            res.status(400).json({ error: 'Email already in use' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const [created] = await db
            .insert(user)
            .values({ username, email, passwordHash })
            .returning();

        const token = signToken(created.id, created.email);
        res.status(201).json({
            token,
            user: {
                id: created.id,
                username: created.username,
                email: created.email,
                avatarUrl: created.avatarUrl,
                color: created.color,
            },
        });
    } catch (err) {
        next(err);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.issues[0].message });
            return;
        }

        const { email, password } = parsed.data;

        const [found] = await db.select().from(user).where(eq(user.email, email));
        if (!found) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const valid = await bcrypt.compare(password, found.passwordHash);
        if (!valid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const token = signToken(found.id, found.email);
        res.json({
            token,
            user: {
                id: found.id,
                username: found.username,
                email: found.email,
                avatarUrl: found.avatarUrl,
                color: found.color,
            },
        });
    } catch (err) {
        next(err);
    }
});

router.get('/me', requireAuth, async (req, res, next) => {
    try {
        const [found] = await db.select().from(user).where(eq(user.id, req.user!.id));
        if (!found) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({
            id: found.id,
            username: found.username,
            email: found.email,
            avatarUrl: found.avatarUrl,
            color: found.color,
            createdAt: found.createdAt,
        });
    } catch (err) {
        next(err);
    }
});

export default router;
