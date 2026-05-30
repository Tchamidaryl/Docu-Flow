import { sendEmail } from './mailer';
import { getApprovalRequestEmailTemplate } from './templates/approvalRequest';
import { getApprovalApprovedEmailTemplate } from './templates/approvalApproved';
import { getApprovalRejectedEmailTemplate } from './templates/approvalRejected';

export async function sendApprovalRequestEmail(
  recipientEmail: string,
  recipientName: string,
  documentTitle: string,
  documentId: string,
  submitterName: string,
  options?: {
    description?: string;
    dueDate?: Date;
    priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  }
) {
  const approvalLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/documents/${documentId}/approve`;

  const html = getApprovalRequestEmailTemplate({
    recipientName,
    documentTitle,
    documentId,
    submitterName,
    description: options?.description,
    dueDate: options?.dueDate,
    priority: options?.priority,
    approvalLink,
  });

  return sendEmail({
    to: recipientEmail,
    subject: `Approval Needed: ${documentTitle}`,
    html,
  });
}

export async function sendApprovalApprovedEmail(
  recipientEmail: string,
  documentTitle: string,
  documentId: string,
  approverName: string,
  submitterName: string,
  comment?: string,
  nextApprover?: string
) {
  const documentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/documents/${documentId}`;

  const html = getApprovalApprovedEmailTemplate({
    documentTitle,
    documentId,
    approverName,
    submitterName,
    approvalDate: new Date(),
    documentLink,
    comment,
    nextApprover,
  });

  return sendEmail({
    to: recipientEmail,
    subject: `✓ Approved: ${documentTitle}`,
    html,
  });
}

export async function sendApprovalRejectedEmail(
  recipientEmail: string,
  documentTitle: string,
  documentId: string,
  rejectedBy: string,
  submitterName: string,
  rejectionReason?: string
) {
  const documentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/documents/${documentId}`;

  const html = getApprovalRejectedEmailTemplate({
    documentTitle,
    documentId,
    rejectedBy,
    submitterName,
    rejectionDate: new Date(),
    rejectionReason,
    documentLink,
  });

  return sendEmail({
    to: recipientEmail,
    subject: `✕ Rejected: ${documentTitle}`,
    html,
  });
}

export async function sendApprovalReviewRequestEmail(
  recipientEmail: string,
  recipientName: string,
  documentTitle: string,
  documentId: string,
  submitterName: string
) {
  const reviewLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/documents/${documentId}/review`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background-color: #3b82f6; color: white; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Document Review Request</h1>
          </div>
          <p>Hi ${recipientName},</p>
          <p>"${documentTitle}" submitted by ${submitterName} is ready for your review.</p>
          <a href="${reviewLink}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Document</a>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: recipientEmail,
    subject: `Document Review Required: ${documentTitle}`,
    html,
  });
}
