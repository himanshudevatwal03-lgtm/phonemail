import twilio from 'twilio';

export async function sendSmsNotification(message: string, to: string) {
  const provider = process.env.SMS_PROVIDER ?? 'mock';

  if (provider === 'mock' || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('[SMS MOCK]', { to, message });
    return { ok: true, provider: 'mock' };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const result = await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });

  return { ok: true, provider: 'twilio', sid: result.sid };
}
