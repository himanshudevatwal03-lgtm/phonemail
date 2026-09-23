import { PrismaClient } from '@prisma/client';
import { hashPassword } from './utils/password.js';
import { normalizePhone, generatePhoneMail } from './utils/phone.js';

export const ensureDemoSeed = async (prisma: PrismaClient) => {
  const demoUsers = [
    { phone: '9876543210', displayName: 'Ava', password: 'password123' },
    { phone: '9123456789', displayName: 'Miles', password: 'password123' },
    { phone: '9999999999', displayName: 'Demo Admin', password: 'password123' },
  ];

  for (const current of demoUsers) {
    const normalized = normalizePhone(current.phone);
    const existing = await prisma.user.findUnique({ where: { phoneNormalized: normalized } });
    if (!existing) {
      await prisma.user.create({
        data: {
          phone: normalized,
          phoneNormalized: normalized,
          displayName: current.displayName,
          phonemail: generatePhoneMail(normalized),
          passwordHash: await hashPassword(current.password),
          language: 'en',
        },
      });
    }
  }

  const users = await prisma.user.findMany();
  if ((await prisma.message.count()) === 0 && users.length >= 2) {
    const [first, second] = users;
    const conversation = await prisma.conversation.create({
      data: {
        subject: 'Launch sync',
        participants: {
          create: [{ userId: first.id }, { userId: second.id }],
        },
      },
    });

    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderId: first.id,
          recipientId: second.id,
          senderEmail: first.phonemail,
          recipientEmail: second.phonemail,
          subject: 'Launch sync',
          content: 'Hi! We are finalizing the product launch and the demo flow.',
          direction: 'outbound',
        },
        {
          conversationId: conversation.id,
          senderId: second.id,
          recipientId: first.id,
          senderEmail: second.phonemail,
          recipientEmail: first.phonemail,
          subject: 'Launch sync',
          content: 'Perfect. I will review the mobile and desktop email layout.',
          direction: 'inbound',
        },
      ],
    });

    await prisma.draft.create({
      data: {
        userId: first.id,
        to: second.phonemail,
        subject: 'Follow-up',
        content: 'Let us prepare the demo flow for the final buildathon check.',
      },
    });
  }
};
