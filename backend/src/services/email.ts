import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

export async function sendEmail(payload: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const provider = process.env.EMAIL_PROVIDER ?? 'mock';

  if (provider === 'mock' || !process.env.SMTP_HOST) {
    console.log('[EMAIL MOCK]', payload);
    return { ok: true, provider: 'mock', messageId: 'mock-email-id' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const result = await transporter.sendMail({
    from: process.env.SMTP_USER ?? 'no-reply@phonemail.local',
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html ?? payload.text,
  });

  return { ok: true, provider: 'smtp', messageId: result.messageId };
}
