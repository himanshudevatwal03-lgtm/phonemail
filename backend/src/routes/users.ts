import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { sendSmsNotification } from '../services/sms.js';
import { sendEmail } from '../services/email.js';
import { normalizePhone, generatePhoneMail } from '../utils/phone.js';

export const createUserRouter = (prisma: PrismaClient) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/me', async (req, res) => {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    const aliases = await prisma.alias.findMany({ where: { userId: user.id } });
    res.json({ ok: true, user: { ...user, aliases } });
  });

  router.get('/aliases', async (req, res) => {
    const userId = (req as any).userId;
    const aliases = await prisma.alias.findMany({ where: { userId } });
    res.json({ ok: true, aliases });
  });

  router.post('/aliases', async (req, res) => {
    const schema = z.object({ alias: z.string().min(3).max(50) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, message: 'Invalid alias request' });

    const userId = (req as any).userId;
    const aliasName = parsed.data.alias.replace(/\s+/g, '').toLowerCase();
    if (!aliasName) return res.status(400).json({ ok: false, message: 'Alias cannot be empty' });

    const exists = await prisma.alias.findUnique({ where: { alias: aliasName } });
    if (exists) return res.status(409).json({ ok: false, message: 'Alias already exists' });

    const alias = await prisma.alias.create({
      data: {
        userId,
        alias: aliasName,
      },
    });

    res.status(201).json({ ok: true, alias });
  });

  return router;
};
