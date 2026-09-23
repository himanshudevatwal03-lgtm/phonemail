export async function handleIvrFlow({ phone, from }: { phone?: string; from?: string }) {
  const provider = process.env.IVR_PROVIDER ?? 'mock';

  if (provider === 'mock') {
    return {
      ok: true,
      provider: 'mock',
      message: 'Mock IVR flow accepted. Connect a real provider with Twilio credentials to enable live account creation.',
      capturedPhone: phone ?? from ?? '',
    };
  }

  return {
    ok: false,
    provider,
    message: 'Real IVR provider is not configured',
  };
}
