import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';
import { sendSmsNotification } from '../services/sms.js';
import { normalizePhone, generatePhoneMail } from '../utils/phone.js';

export const createEmailRouter = (prisma: PrismaClient) => {
  const router = express.Router();

  router.use(requireAuth);

  const asyncUserByEmail = async (email: string) => {
    if (!email) return null;
    return prisma.user.findFirst({ where: { phonemail: email } });
  };

  const findOrCreateConversation = async (senderId: string, recipients: string[]) => {
    const uniqueRecipients = [...new Set(recipients)];
    const userIds = [senderId, ...uniqueRecipients].filter(Boolean);

    const conversations = await prisma.conversation.findMany({
      include: { participants: true },
    });

    if (uniqueRecipients.length === 1) {
      const targetUserId = uniqueRecipients[0];
      for (const conversation of conversations) {
        const participantIds = conversation.participants.map((p) => p.userId).sort();
        if (participantIds.length === 2 && participantIds.includes(senderId) && participantIds.includes(targetUserId)) {
          return conversation;
        }
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        subject: 'New conversation',
        participants: { create: userIds.map((userId) => ({ userId })) },
      },
      include: { participants: true },
    });

    return conversation;
  };

  router.get('/inbox', async (req, res) => {
    const userId = (req as any).userId;
    const messages = await prisma.message.findMany({
      where: {
        recipientId: userId,
        OR: [{ spam: false }, { spam: null }],
        OR: [{ trashed: false }, { trashed: null }],
      },
      include: { sender: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ok: true, messages });
  });

  router.get('/sent', async (req, res) => {
    const userId = (req as any).userId;
    const messages = await prisma.message.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ ok: true, messages });
  });

  router.get('/drafts', async (req, res) => {
    const userId = (req as any).userId;
    const drafts = await prisma.draft.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
    res.json({ ok: true, drafts });
  });

  router.post('/drafts', async (req, res) => {
    const schema = z.object({
      to: z.string().optional(),
      cc: z.string().optional(),
      subject: z.string().optional(),
      content: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, message: 'Invalid draft payload' });

    const draft = await prisma.draft.create({
      data: {
        userId: (req as any).userId,
        to: parsed.data.to ?? '',
        cc: parsed.data.cc ?? '',
        subject: parsed.data.subject ?? '',
        content: parsed.data.content ?? '',
      },
    });

    res.status(201).json({ ok: true, draft });
  });

  router.patch('/drafts/:id', async (req, res) => {
    const draft = await prisma.draft.update({
      where: { id: req.params.id },
      data: { ...req.body },
    });
    res.json({ ok: true, draft });
  });

  router.delete('/drafts/:id', async (req, res) => {
    await prisma.draft.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  });

  router.post('/drafts/:id/send', async (req, res) => {
    const draft = await prisma.draft.findUnique({ where: { id: req.params.id } });
    if (!draft) return res.status(404).json({ ok: false, message: 'Draft not found' });

    const sender = await prisma.user.findUnique({ where: { id: (req as any).userId } });
    if (!sender) return res.status(404).json({ ok: false, message: 'User not found' });

    const recipients = (draft.to ?? '').split(',').map((v) => v.trim()).filter(Boolean);
    const conversation = await findOrCreateConversation(sender.id, recipients);

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: sender.id,
        recipientId: (await asyncUserByEmail(recipients[0]))?.id ?? null,
        senderEmail: sender.phonemail,
        recipientEmail: recipients[0] ?? sender.phonemail,
        subject: draft.subject ?? 'New email',
        content: draft.content,
        direction: 'outbound',
        isRead: true,
      },
    });

    await prisma.draft.delete({ where: { id: draft.id } });
    await sendEmail({ to: recipients[0] ?? sender.phonemail, subject: draft.subject ?? 'New email', text: draft.content });

    res.status(201).json({ ok: true, message });
  });

  router.get('/conversation/:id', async (req, res) => {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: { messages: true, participants: { include: { user: true } } },
    });
    if (!conversation) return res.status(404).json({ ok: false, message: 'Conversation not found' });
    res.json({ ok: true, conversation });
  });

  router.post('/compose', async (req, res) => {
    const schema = z.object({
      to: z.string().min(1),
      cc: z.string().optional(),
      subject: z.string().optional(),
      content: z.string().min(1),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, message: 'Invalid message payload' });

    const sender = await prisma.user.findUnique({ where: { id: (req as any).userId } });
    if (!sender) return res.status(404).json({ ok: false, message: 'User not found' });

    const targetEmail = parsed.data.to.trim();
    const targetUser = await asyncUserByEmail(targetEmail);
    const conversation = await findOrCreateConversation(sender.id, [targetUser?.id ?? targetEmail]);

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: sender.id,
        recipientId: targetUser?.id ?? null,
        senderEmail: sender.phonemail,
        recipientEmail: targetEmail,
        subject: parsed.data.subject ?? 'New email',
        content: parsed.data.content,
        direction: 'outbound',
      },
    });

    await sendEmail({ to: targetEmail, subject: parsed.data.subject ?? 'New email', text: parsed.data.content });

    if (targetUser) {
      const smsMessage = `You have received an email from ${sender.phonemail}. Subject: ${parsed.data.subject ?? 'New email'}.`;
      await sendSmsNotification(smsMessage, targetUser.phone);
    }

    res.status(201).json({ ok: true, message });
  });

  router.post('/:id/favorite', async (req, res) => {
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) return res.status(404).json({ ok: false, message: 'Message not found' });

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { favorite: !message.favorite },
    });

    res.json({ ok: true, message: updated });
  });

  router.post('/:id/spam', async (req, res) => {
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) return res.status(404).json({ ok: false, message: 'Message not found' });
    const updated = await prisma.message.update({ where: { id: req.params.id }, data: { spam: !message.spam } });
    res.json({ ok: true, message: updated });
  });

  router.post('/:id/trash', async (req, res) => {
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) return res.status(404).json({ ok: false, message: 'Message not found' });
    const updated = await prisma.message.update({ where: { id: req.params.id }, data: { trashed: !message.trashed } });
    res.json({ ok: true, message: updated });
  });

  router.post('/:id/reply', async (req, res) => {
    const schema = z.object({ content: z.string().min(1), subject: z.string().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, message: 'Invalid reply payload' });

    const original = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ ok: false, message: 'Original message not found' });

    const sender = await prisma.user.findUnique({ where: { id: (req as any).userId } });
    if (!sender) return res.status(404).json({ ok: false, message: 'Sender not found' });

    const reply = await prisma.message.create({
      data: {
        conversationId: original.conversationId,
        senderId: sender.id,
        recipientId: original.senderId,
        senderEmail: sender.phonemail,
        recipientEmail: original.senderEmail,
        subject: parsed.data.subject ?? `Re: ${original.subject ?? 'Email'}`,
        content: parsed.data.content,
        replyToId: original.id,
        direction: 'outbound',
      },
    });

    res.status(201).json({ ok: true, message: reply });
  });

  return router;
};
