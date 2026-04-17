// lib/email/sender.ts
// Email sender stub — replace with Resend or Nodemailer when ready

export async function sendNotificationEmail(
  to: string,
  type: string,
  data: { documentTitle: string; actorName?: string; comment?: string }
) {
  // Only send if RESEND_API_KEY is configured
  if (!process.env.RESEND_API_KEY) return;

  try {
    const subjects: Record<string, string> = {
      APPROVAL_REQUEST:   `Action Required: "${data.documentTitle}" needs your approval`,
      APPROVED:           `Approved: "${data.documentTitle}" has been approved`,
      REJECTED:           `Rejected: "${data.documentTitle}" was rejected`,
      REVISION_REQUESTED: `Revision needed: "${data.documentTitle}"`,
      DELEGATED:          `Delegated: Approval for "${data.documentTitle}" assigned to you`,
    };

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "DocuFlow <noreply@docuflow.app>",
      to,
      subject: subjects[type] ?? `DocuFlow: Update on "${data.documentTitle}"`,
      html: buildEmailHtml(type, data),
    });
  } catch (err) {
    // Never throw — email is non-critical
    console.error("[EMAIL_SEND]", err);
  }
}

function buildEmailHtml(
  type: string,
  data: { documentTitle: string; actorName?: string; comment?: string }
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1d4ed8;">DocuFlow</h2>
      <p>Hello,</p>
      <p>
        ${type === "APPROVAL_REQUEST" ? `<strong>${data.actorName ?? "Someone"}</strong> submitted a document that requires your review.` : ""}
        ${type === "APPROVED" ? `Your document has been approved.` : ""}
        ${type === "REJECTED" ? `Your document has been rejected.` : ""}
        ${type === "REVISION_REQUESTED" ? `Changes have been requested on your document.` : ""}
        ${type === "DELEGATED" ? `An approval has been delegated to you.` : ""}
      </p>
      <p><strong>Document:</strong> ${data.documentTitle}</p>
      ${data.comment ? `<p><strong>Comment:</strong> ${data.comment}</p>` : ""}
      <a href="${appUrl}/documents" style="display:inline-block;background:#1d4ed8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
        View in DocuFlow
      </a>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">
        You received this email because you are part of a DocuFlow approval workflow.
      </p>
    </div>
  `;
}
