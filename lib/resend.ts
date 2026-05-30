import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "DocuFlow <noreply@docuflow.app>";

// ── Email Templates ───────────────────────────────────────────────────────────

function baseTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f9ff; margin: 0; padding: 24px; }
    .card { background: #ffffff; border-radius: 12px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: #0f2d4a; padding: 28px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header span { color: #06b6d4; }
    .body { padding: 32px; color: #334155; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 12px 24px; font-weight: 600; margin-top: 20px; }
    .footer { padding: 16px 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header"><h1>Docu<span>Flow</span></h1></div>
    <div class="body">${content}</div>
    <div class="footer">DocuFlow — Document Approval Management System. This is an automated message, please do not reply.</div>
  </div>
</body>
</html>`;
}

// ── Send Helpers ──────────────────────────────────────────────────────────────

export async function sendApprovalNeededEmail(opts: {
  to: string;
  approverName: string;
  documentTitle: string;
  ownerName: string;
  documentUrl: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Action Required: "${opts.documentTitle}" needs your approval`,
    html: baseTemplate(`
      <p>Hi <strong>${opts.approverName}</strong>,</p>
      <p><strong>${opts.ownerName}</strong> has submitted a document that requires your approval:</p>
      <p style="font-size:18px;font-weight:600;color:#0f2d4a;">${opts.documentTitle}</p>
      <a href="${opts.documentUrl}" class="btn">Review Document →</a>
    `),
  });
}

export async function sendDocumentApprovedEmail(opts: {
  to: string;
  ownerName: string;
  documentTitle: string;
  approverName: string;
  documentUrl: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `✅ "${opts.documentTitle}" has been approved`,
    html: baseTemplate(`
      <p>Hi <strong>${opts.ownerName}</strong>,</p>
      <p>Great news! Your document has been <strong style="color:#16a34a;">approved</strong> by <strong>${opts.approverName}</strong>.</p>
      <p style="font-size:18px;font-weight:600;color:#0f2d4a;">${opts.documentTitle}</p>
      <a href="${opts.documentUrl}" class="btn">View Document →</a>
    `),
  });
}

export async function sendDocumentRejectedEmail(opts: {
  to: string;
  ownerName: string;
  documentTitle: string;
  approverName: string;
  comment: string;
  documentUrl: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `❌ "${opts.documentTitle}" was rejected`,
    html: baseTemplate(`
      <p>Hi <strong>${opts.ownerName}</strong>,</p>
      <p>Your document has been <strong style="color:#dc2626;">rejected</strong> by <strong>${opts.approverName}</strong>.</p>
      <p style="font-size:18px;font-weight:600;color:#0f2d4a;">${opts.documentTitle}</p>
      ${opts.comment ? `<p><strong>Reason:</strong> ${opts.comment}</p>` : ""}
      <a href="${opts.documentUrl}" class="btn">View Document →</a>
    `),
  });
}

export async function sendRevisionRequestedEmail(opts: {
  to: string;
  ownerName: string;
  documentTitle: string;
  approverName: string;
  comment: string;
  documentUrl: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `🔄 Revision requested for "${opts.documentTitle}"`,
    html: baseTemplate(`
      <p>Hi <strong>${opts.ownerName}</strong>,</p>
      <p><strong>${opts.approverName}</strong> has requested revisions on your document.</p>
      <p style="font-size:18px;font-weight:600;color:#0f2d4a;">${opts.documentTitle}</p>
      ${opts.comment ? `<p><strong>Notes:</strong> ${opts.comment}</p>` : ""}
      <a href="${opts.documentUrl}" class="btn">Edit Document →</a>
    `),
  });
}

export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  orgName: string;
  loginUrl: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Welcome to DocuFlow — ${opts.orgName}`,
    html: baseTemplate(`
      <p>Hi <strong>${opts.name}</strong>,</p>
      <p>You've been added to <strong>${opts.orgName}</strong> on DocuFlow. You can now participate in document approval workflows.</p>
      <a href="${opts.loginUrl}" class="btn">Sign In to DocuFlow →</a>
    `),
  });
}
