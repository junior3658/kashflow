/**
 * Resend email delivery adapter.
 *
 * The API key is read only on the server. Never expose it through Vite-prefixed
 * variables, API responses, logs, or source control.
 */
export interface VerificationEmailInput {
  to: string;
  fullName: string;
  code: string;
  expiresInMinutes: number;
}

export async function sendVerificationEmail(input: VerificationEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  if (!apiKey || !from) {
    throw new Error('Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL on the server.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: 'Your KASHFLOW verification code',
      html: `
        <div style="font-family:Arial,sans-serif;background:#f5f7f5;padding:32px;color:#10251f">
          <div style="max-width:520px;margin:auto;background:#fff;border-radius:18px;padding:32px">
            <p style="font-weight:800;letter-spacing:4px;color:#087b58">KASHFLOW</p>
            <h1 style="font-size:24px">Verify your email</h1>
            <p>Hello ${escapeHtml(input.fullName)},</p>
            <p>Use this one-time code to verify your KASHFLOW account:</p>
            <div style="font-size:34px;font-weight:800;letter-spacing:10px;padding:18px 0;color:#087b58">${input.code}</div>
            <p>This code expires in ${input.expiresInMinutes} minutes. If you did not request this, you can ignore this email.</p>
            <p style="font-size:12px;color:#718078">Sent by KASHFLOW · <a href="${escapeHtml(appUrl)}">Open KASHFLOW</a></p>
          </div>
        </div>
      `,
      text: `Hello ${input.fullName}, your KASHFLOW verification code is ${input.code}. It expires in ${input.expiresInMinutes} minutes.`,
    }),
  });

  if (!response.ok) {
    // Do not log the request body, recipient data, or API key.
    const errorBody = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(errorBody?.message || `Email provider rejected the request (HTTP ${response.status}).`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
}
