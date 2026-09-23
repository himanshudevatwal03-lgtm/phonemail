import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { getToken } from '../lib/auth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateOtp, normalizePhone, generatePhoneMail } from '../utils/phone.js';

export const createAuthRouter = (prisma: PrismaClient) => {
  const router = express.Router();

  const registerSchema = z.object({
    phone: z.string().min(7),
    otp: z.string().optional(),
    password: z.string().optional(),
    displayName: z.string().optional(),
  });

  const loginSchema = z.object({
    phone: z.string().min(7),
    otp: z.string().optional(),
    password: z.string().optional(),
  });

  router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, message: 'Invalid registration payload' });
    }

    const { phone, otp, password, displayName } = parsed.data;
    const normalized = normalizePhone(phone);
    if (!normalized) {
      return res.status(400).json({ ok: false, message: 'Invalid phone number' });
    }

    const existing = await prisma.user.findUnique({ where: { phoneNormalized: normalized } });
    if (existing) {
      return res.status(409).json({ ok: false, message: 'Account already exists' });
    }

    const generatedOtp = otp ?? generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.authCode.create({
      data: {
        phone: normalized,
        code: generatedOtp,
        expiresAt,
      },
    });

    const passwordHash = password ? await hashPassword(password) : null;
    const user = await prisma.user.create({
      data: {
        phone: normalized,
        phoneNormalized: normalized,
        displayName: displayName ?? 'New User',
        language: 'en',
        phonemail: generatePhoneMail(normalized),
        passwordHash,
      },
    });

    const token = getToken(user.id);
    return res.status(201).json({
      ok: true,
      token,
      user: { id: user.id, phone: user.phone, phonemail: user.phonemail, displayName: user.displayName },
      otp: generatedOtp,
    });
  });

  router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, message: 'Invalid login payload' });
    }

    const { phone, otp, password } = parsed.data;
    const normalized = normalizePhone(phone);
    const user = await prisma.user.findUnique({ where: { phoneNormalized: normalized } });
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (otp) {
      const code = await prisma.authCode.findFirst({
        where: { phone: normalized, code: otp, usedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      if (code && new Date(code.expiresAt) > new Date()) {
        await prisma.authCode.update({ where: { id: code.id }, data: { usedAt: new Date() } });
        const token = getToken(user.id);
        return res.json({ ok: true, token, user: { id: user.id, phone: user.phone, phonemail: user.phonemail, displayName: user.displayName } });
      }
      return res.status(401).json({ ok: false, message: 'Invalid OTP' });
    }

    if (password && user.passwordHash) {
      const validPassword = await verifyPassword(password, user.passwordHash);
      if (validPassword) {
        const token = getToken(user.id);
        return res.json({ ok: true, token, user: { id: user.id, phone: user.phone, phonemail: user.phonemail, displayName: user.displayName } });
      }
    }

    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  });

  router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    try {
      const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET ?? 'dev-secret') as { sub: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) {
        return res.status(404).json({ ok: false, message: 'User not found' });
      }

      return res.json({
        ok: true,
        user: { id: user.id, phone: user.phone, phonemail: user.phonemail, displayName: user.displayName, language: user.language },
      });
    } catch {
      return res.status(401).json({ ok: false, message: 'Expired session' });
    }
  });

  return router;
};
