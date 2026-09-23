import jwt from 'jsonwebtoken';
import { z } from 'zod';

export const authSchema = z.object({
  phone: z.string().min(7),
  otp: z.string().optional(),
  password: z.string().optional(),
});

export const getToken = (userId: string) => {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET ?? 'dev-secret', { expiresIn: '7d' });
};
