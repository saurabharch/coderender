import nodemailer, { type Transporter } from "nodemailer";

const BRAND = "#0d9488";

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
<div style="background:${BRAND};color:#fff;padding:20px 24px;font-size:20px;font-weight:bold">CodeRender · ${title}</div>
<div style="padding:24px;color:#333;font-size:15px;line-height:1.6">${body}</div>
<div style="padding:16px 24px;color:#888;font-size:12px">CodeRender · coderender.in</div>
</div></body></html>`;
}

let transporter: Transporter | null = null;
let previewOnly = false;
let offlineOnly = false;

async function getTransport(): Promise<Transporter> {
  if (transporter) return transporter;
  const { smtpConfig } = await import("./providers");
  const url = smtpConfig().url;
  if (url) {
    transporter = nodemailer.createTransport(url);
    return transporter;
  }
  try {
    const test = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email", port: 587, secure: false,
      auth: { user: test.user, pass: test.pass },
    });
    previewOnly = true;
  } catch {
    // Ethereal unreachable (offline DNS etc.) — login/OTP must not die with
    // it. Buffer the message locally and hand back a log preview instead.
    transporter = nodemailer.createTransport({ streamTransport: true, buffer: true });
    previewOnly = true;
    offlineOnly = true;
  }
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string): Promise<{ preview?: string }> {
  const t = await getTransport();
  const { smtpConfig } = await import("./providers");
  const from = smtpConfig().from;
  const info = await t.sendMail({ from, to, subject, html });
  const url = nodemailer.getTestMessageUrl(info);
  const preview = typeof url === "string" ? url : offlineOnly ? "log-only (ethereal unreachable — check console)" : undefined;
  if (preview) console.log(`[mail/dev-preview] ${to}: ${preview}`);
  else if (offlineOnly) console.log(`[mail/log-only] to=${to} subject=${subject}`);
  return { preview };
}

export function magicLinkMail(link: string): string {
  return shell(
    "Sign in",
    `<p>Your CodeRender admin sign-in link (expires in 15 minutes).</p>
     <p><a href="${link}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Sign in</a></p>
     <p>Didn't ask for this? Ignore this email.</p>`
  );
}

export function dailyReportMail(date: string, rows: { label: string; value: string }[], leads: { name: string; phone: string; businessType: string }[]): string {
  const trs = rows.map((r) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${r.label}</td><td style="padding:8px;border-bottom:1px solid #eee"><b>${r.value}</b></td></tr>`).join("");
  const lis = leads.slice(0, 10).map((l) => `<li>${l.name} · ${l.phone} · ${l.businessType}</li>`).join("") || "<li>No leads in window.</li>";
  return shell(
    "Daily report",
    `<p>CodeRender numbers for <b>${date}</b>.</p>
     <table style="width:100%;border-collapse:collapse">${trs}</table>
     <p><b>Latest leads:</b></p><ul>${lis}</ul>`
  );
}
