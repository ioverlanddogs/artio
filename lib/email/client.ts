import { Resend } from 'resend';

let resend: Resend | null = null;

export function getResendClient(): Resend {
  if (process.env.NODE_ENV === 'test') {
    throw new Error('Resend client must not be called in tests. Use a mock.');
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  if (!resend) {
    resend = new Resend(apiKey);
  }

  return resend;
}
