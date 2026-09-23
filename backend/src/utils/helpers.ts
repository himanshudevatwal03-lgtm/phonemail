import { normalizePhone, generatePhoneMail } from './phone.js';

export function parseEmailAddressList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((value) => value.includes('@') || value.startsWith('987') || value.startsWith('912'));
}

export function toDisplaySubject(subject?: string | null, fallback = 'No subject') {
  return subject && subject.trim() ? subject : fallback;
}

export function buildPhoneMailIdentity(phone: string) {
  return generatePhoneMail(phone);
}

export function normalizeRecipientList(raw: string | null | undefined) {
  return parseEmailAddressList(raw).map((value) => value.trim());
}

export function isValidPhone(raw: string) {
  const digits = normalizePhone(raw);
  return digits.length >= 10 && digits.length <= 15;
}
