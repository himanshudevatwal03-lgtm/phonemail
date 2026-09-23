import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

export const createSettingRouter = (prisma: PrismaClient) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/account', async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: (req as any).userId } });
    res.json({ ok: true, user: user ? { id: user.id, phone: user.phone, phonemail: user.phonemail, displayName: user.displayName, language: user.language } : null });
  });

  router.post('/logout', async (_req, res) => {
    res.json({ ok: true, message: 'Logged out successfully' });
  });

  return router;
};
