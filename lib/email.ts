const RESEND_API_URL = 'https://api.resend.com/emails';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;

  if (!apiKey || !fromEmail) {
    // If email env vars are not configured, skip without failing app logic.
    return { skipped: true };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Email send failed:', err);
      return { skipped: false, ok: false };
    }

    return { skipped: false, ok: true };
  } catch (error) {
    console.error('Email send exception:', error);
    return { skipped: false, ok: false };
  }
}
