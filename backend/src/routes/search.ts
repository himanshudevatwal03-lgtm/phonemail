import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

export const createSearchRouter = (prisma: PrismaClient) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/', async (req, res) => {
    const query = String(req.query.q ?? '').trim();
    if (!query) {
      return res.json({ ok: true, results: [] });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { content: { contains: query, mode: 'insensitive' } },
          { subject: { contains: query, mode: 'insensitive' } },
          { senderEmail: { contains: query, mode: 'insensitive' } },
          { recipientEmail: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ ok: true, results: messages });
  });

  return router;
};
