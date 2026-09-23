import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

export const createProfileRouter = (prisma: PrismaClient) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/', async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: (req as any).userId } });
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    res.json({ ok: true, user });
  });

  router.patch('/', async (req, res) => {
    const schema = z.object({ displayName: z.string().optional(), language: z.string().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, message: 'Invalid profile update' });

    const updated = await prisma.user.update({
      where: { id: (req as any).userId },
      data: parsed.data,
    });

    res.json({ ok: true, user: updated });
  });

  return router;
};
