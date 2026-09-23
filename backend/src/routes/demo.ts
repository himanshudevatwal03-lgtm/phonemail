import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

export const createDemoRouter = (prisma: PrismaClient) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/users', async (_req, res) => {
    const users = await prisma.user.findMany({ take: 10 });
    res.json({ ok: true, users });
  });

  return router;
};
