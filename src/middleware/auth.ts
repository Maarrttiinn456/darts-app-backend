import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; email: string };
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string };
        req.user = { id: payload.id, email: payload.email };
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
