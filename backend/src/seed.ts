import { PrismaClient } from '@prisma/client';

export const ensureDemoSeed = async (prisma: PrismaClient) => {
  const users = [
    { phone: '9876543210', displayName: 'Ava', passwordHash: 'password123' },
    { phone: '9123456789', displayName: 'Miles', passwordHash: 'password123' },
    { phone: '9999999999', displayName: 'Demo Admin', passwordHash: 'password123' },
  ];

  for (const userSeed of users) {
    const existing = await prisma.user.findUnique({
      where: { phone: userSeed.phone },
    });

    if (!existing) {
      const normalized = userSeed.phone.replace(/\D/g, '');
      await prisma.user.create({
        data: {
          phone: userSeed.phone,
          phoneNormalized: normalized,
          displayName: userSeed.displayName,
          language: 'en',
          phonemail: `${normalized}@phonemail.com`,
          passwordHash: userSeed.passwordHash,
        },
      });
    }
  }

  const usersList = await prisma.user.findMany();
  if (usersList.length > 0 && (await prisma.message.count()) === 0) {
    const first = usersList[0];
    const second = usersList[1] ?? usersList[0];

    const conversation = await prisma.conversation.create({
      data: {
        subject: 'Launch sync',
        participants: {
          create: [{ userId: first.id }, { userId: second.id }],
        },
        messages: {
          create: [
            {
              senderId: first.id,
              recipientId: second.id,
              senderEmail: first.phonemail,
              recipientEmail: second.phonemail,
              subject: 'Launch sync',
              content: 'Hi! We are finalizing the demo flow and product launch.',
              direction: 'outbound',
            },
            {
              senderId: second.id,
              recipientId: first.id,
              senderEmail: second.phonemail,
              recipientEmail: first.phonemail,
              subject: 'Launch sync',
              content: 'Perfect. I will review the mobile and desktop view.',
              direction: 'inbound',
            },
          ],
        },
      },
    });

    await prisma.draft.create({
      data: {
        userId: first.id,
        to: second.phonemail,
        subject: 'Follow-up',
        content: 'Let us finalize the onboarding copy after the demo.',
      },
    });

    await prisma.notification.create({
      data: {
        userId: second.id,
        type: 'sms',
        payload: `You have received an email from ${first.phonemail}. Subject: Launch sync.`,
      },
    });

    await prisma.message.update({
      where: { id: conversation.messages[0]?.id ?? '' },
      data: { favorite: true },
    }).catch(() => undefined);
  }
};
