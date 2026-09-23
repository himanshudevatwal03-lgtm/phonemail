export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length > 10 && digits.startsWith('1') && digits.length === 11) {
    return digits.slice(1);
  }
  return digits;
}

export function generatePhoneMail(phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error('Invalid phone number');
  }
  return `${normalized}@phonemail.com`;
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
