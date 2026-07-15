/**
 * Email sending helper — uses nodemailer with SMTP.
 *
 * Free SMTP options:
 *   - Gmail: 500 emails/day free with App Password (2FA required)
 *   - Outlook/Hotmail: 300 emails/day free
 *   - Brevo (Sendinblue): 300 emails/day free
 *
 * Configuration via env vars:
 *   - SMTP_HOST     — e.g. "smtp.gmail.com"
 *   - SMTP_PORT     — e.g. 465 (SSL) or 587 (STARTTLS)
 *   - SMTP_USER     — e.g. "your-email@gmail.com"
 *   - SMTP_PASS     — App Password (NOT your regular password)
 *   - SMTP_FROM     — e.g. "IEC <your-email@gmail.com>"
 *
 * Dev fallback: if SMTP_HOST is not set, emails are NOT sent — the
 * OTP code is returned as `devCode` in the API response (same pattern
 * as phone OTP dev mode). This lets local development work without
 * SMTP config.
 */
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

/**
 * Get the SMTP transporter. Returns null if SMTP is not configured
 * (dev mode — caller should fall back to returning devCode).
 *
 * Cached as a singleton on globalThis to survive HMR in dev.
 */
function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  if (typeof global !== "undefined" && global.__iecSmtpTransporter) {
    cachedTransporter = global.__iecSmtpTransporter;
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // dev mode — no SMTP configured
  }

  const transporter = nodemailer.createTransport({
    host,
    port: port ? parseInt(port, 10) : 587,
    secure: port === "465",
    auth: { user, pass },
  });

  cachedTransporter = transporter;
  if (typeof global !== "undefined") {
    global.__iecSmtpTransporter = transporter;
  }
  return transporter;
}

declare global {
  // eslint-disable-next-line no-var
  var __iecSmtpTransporter: Transporter | undefined;
}

/** Check if SMTP is configured (for dev-mode detection). */
export function isSmtpConfigured(): boolean {
  return getTransporter() !== null;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  /** Plain text body. */
  text: string;
  /** Optional HTML body. */
  html?: string;
}

/**
 * Send an email. Returns `{ ok: true }` on success, or `{ ok: false,
 * error }` on failure. Never throws — callers handle the return value.
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
}: SendEmailParams): Promise<{ ok: true } | { ok: false; error: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      ok: false,
      error: "SMTP پیکربندی نشده است.",
    };
  }

  const from =
    process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@iec.local";

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html: html ?? text,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای نامشخص SMTP";
    console.error("[iec:email] SMTP send failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Build OTP email content (subject + text + HTML). Used both for
 * sending (via sendEmail) and for dev-mode preview.
 *
 * The HTML is a beautiful, responsive, branded email template that
 * works on all email clients (Gmail, Outlook, Apple Mail, etc.).
 */
export function buildOtpEmailContent(
  code: string,
  siteName: string,
): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `🔑 کد ورود شما به ${siteName}`;
  const text = `${siteName}\n\nکد یک‌بار مصرف شما: ${code}\n\nاین کد تا ۲ دقیقه معتبر است.\nاگر شما این درخواست را انجام نداده‌اید، این پیام را نادیده بگیرید.\n\n© ${new Date().getFullYear()} ${siteName}`;
  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>کد ورود شما</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Vazirmatn', 'Tahoma', 'Segoe UI', sans-serif;
      background: #f0f2f5;
      color: #1d1d1f;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .header {
      background: linear-gradient(135deg, #c1121f 0%, #a30e18 100%);
      padding: 32px 24px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .logo-circle {
      width: 56px;
      height: 56px;
      margin: 0 auto 16px;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      position: relative;
      z-index: 1;
    }
    .header h1 {
      color: #ffffff;
      font-size: 20px;
      font-weight: 700;
      position: relative;
      z-index: 1;
    }
    .header p {
      color: rgba(255,255,255,0.85);
      font-size: 13px;
      margin-top: 6px;
      position: relative;
      z-index: 1;
    }
    .body {
      padding: 32px 24px;
    }
    .code-label {
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      color: #c1121f;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 12px;
    }
    .code-box {
      background: linear-gradient(135deg, rgba(193,18,31,0.04) 0%, rgba(201,169,97,0.04) 100%);
      border: 2px solid rgba(193,18,31,0.12);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
    }
    .code {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #1d1d1f;
      direction: ltr;
      font-family: 'Courier New', monospace;
    }
    .expiry {
      font-size: 12px;
      color: #6e6e73;
      margin-top: 12px;
    }
    .info-box {
      background: #f5f5f7;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .info-box p {
      font-size: 13px;
      color: #6e6e73;
      text-align: center;
    }
    .footer {
      background: #f5f5f7;
      padding: 20px 24px;
      text-align: center;
    }
    .footer p {
      font-size: 11px;
      color: #6e6e73;
    }
    .footer-brand {
      font-weight: 600;
      color: #1d1d1f;
      margin-bottom: 4px;
    }
    @media (max-width: 480px) {
      body { padding: 0; }
      .container { border-radius: 0; }
      .code { font-size: 36px; letter-spacing: 6px; }
      .header { padding: 24px 16px; }
      .body { padding: 24px 16px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-circle">🔑</div>
      <h1>کد ورود شما</h1>
      <p>برای ورود به ${siteName}</p>
    </div>
    <div class="body">
      <div class="code-label">کد یک‌بار مصرف</div>
      <div class="code-box">
        <div class="code">${code}</div>
        <div class="expiry">⏱ این کد تا ۲ دقیقه معتبر است</div>
      </div>
      <div class="info-box">
        <p>اگر شما این درخواست را انجام نداده‌اید، این ایمیل را نادیده بگیرید. هیچ اقدام دیگری لازم نیست.</p>
      </div>
    </div>
    <div class="footer">
      <p class="footer-brand">${siteName}</p>
      <p>© ${new Date().getFullYear()} — تمامی حقوق محفوظ است</p>
    </div>
  </div>
</body>
</html>`;
  return { subject, text, html };
}
