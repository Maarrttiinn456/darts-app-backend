import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index';
import { user, refreshToken as refreshTokenTable } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    TokenPayload,
} from '../lib/tokens';

const router = Router();

const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

const registerSchema = z.object({
    username: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
    avatarUrl: z.string().optional(),
    color: z.string().optional(),
});

const loginSchema = z.object({
    email: z.email(),
    password: z.string(),
});

// Sets refresh token as httpOnly cookie and saves it to DB
async function issueRefreshToken(
    res: any,
    userId: string,
    payload: TokenPayload,
) {
    const token = generateRefreshToken(payload);

    await db.insert(refreshTokenTable).values({
        userId,
        token,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
    });

    // httpOnly — not accessible by JS, protects against XSS
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: REFRESH_TOKEN_MAX_AGE,
    });
}

router.post('/register', async (req, res, next) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.issues[0].message });
            return;
        }

        const { username, email, password, avatarUrl, color } = parsed.data;

        const existing = await db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, email));

        if (existing.length > 0) {
            res.status(400).json({ error: 'Email already in use' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const [created] = await db
            .insert(user)
            .values({ username, email, passwordHash, avatarUrl, color })
            .returning();

        const tokenPayload = { id: created.id, email: created.email };

        //issueRefreshToken → vygeneruje NOVÝ token, uloží do DB, nastaví novou cookie
        await issueRefreshToken(res, created.id, tokenPayload);

        res.status(201).json({
            accessToken: generateAccessToken(tokenPayload),
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

        const [found] = await db
            .select()
            .from(user)
            .where(eq(user.email, email));
        if (!found) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const valid = await bcrypt.compare(password, found.passwordHash);
        if (!valid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const tokenPayload = { id: found.id, email: found.email };
        await issueRefreshToken(res, found.id, tokenPayload);

        res.json({
            accessToken: generateAccessToken(tokenPayload),
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

router.post('/refresh', async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            res.status(401).json({ error: 'No refresh token' });
            return;
        }

        let payload: TokenPayload;
        try {
            payload = verifyRefreshToken(token);
        } catch {
            res.status(401).json({ error: 'Invalid or expired refresh token' });
            return;
        }

        // Check DB — token might have been revoked by logout
        const [stored] = await db
            .select()
            .from(refreshTokenTable)
            .where(eq(refreshTokenTable.token, token));

        if (!stored) {
            res.status(401).json({ error: 'Refresh token revoked' });
            return;
        }

        // Token rotation — invalidate old token, issue new one
        await db
            .delete(refreshTokenTable)
            .where(eq(refreshTokenTable.token, token));

        //issueRefreshToken → vygeneruje NOVÝ token, uloží do DB, nastaví novou cookie
        await issueRefreshToken(res, payload.id, {
            id: payload.id,
            email: payload.email,
        });

        res.json({
            accessToken: generateAccessToken({
                id: payload.id,
                email: payload.email,
            }),
        });
    } catch (err) {
        next(err);
    }
});

router.post('/logout', async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;

        if (token) {
            await db
                .delete(refreshTokenTable)
                .where(eq(refreshTokenTable.token, token));
        }

        res.clearCookie('refreshToken');
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.get('/me', requireAuth, async (req, res, next) => {
    try {
        const [found] = await db
            .select()
            .from(user)
            .where(eq(user.id, req.user!.id));
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
