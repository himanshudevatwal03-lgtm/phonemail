import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { createAuthRouter } from './routes/auth.js';
import { createUserRouter } from './routes/users.js';
import { createEmailRouter } from './routes/emails.js';
import { createProfileRouter } from './routes/profile.js';
import { createSettingRouter } from './routes/settings.js';
import { createSearchRouter } from './routes/search.js';
import { createDemoRouter } from './routes/demo.js';
import { ensureDemoSeed } from './seed.js';

const env = dotenv.config();
if (env.error) {
  console.warn('No .env file found, using defaults');
}

export const prisma = new PrismaClient();

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: process.env.FRONTEND_URL ?? '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, status: 'healthy', db: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, status: 'database_error' });
  }
});

app.use('/api/auth', createAuthRouter(prisma));
app.use('/api/users', createUserRouter(prisma));
app.use('/api/emails', createEmailRouter(prisma));
app.use('/api/profile', createProfileRouter(prisma));
app.use('/api/settings', createSettingRouter(prisma));
app.use('/api/search', createSearchRouter(prisma));
app.use('/api/demo', createDemoRouter(prisma));

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, message: 'Something went wrong' });
});

(async () => {
  await ensureDemoSeed(prisma);
  app.listen(port, () => {
    console.log(`PhoneMail backend running on http://localhost:${port}`);
  });
})();
