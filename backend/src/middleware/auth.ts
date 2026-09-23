import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  try {
    const token = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? 'dev-secret') as { sub: string };
    (req as any).userId = decoded.sub;
    next();
  } catch {
    return res.status(401).json({ ok: false, message: 'Expired session' });
  }
}
