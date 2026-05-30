import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailData {
    to: string;
    subject: string;
    html: string;
    type: NotificationType;
    documentId?: string;
}

/**
 * Send email using Resend API
 */
export async function sendEmail(
    data: EmailData,
): Promise<{ success: boolean; error?: string; resendId?: string }> {
    try {
        const response = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "noreply@docuflow.com",
            to: data.to,
            subject: data.subject,
            html: data.html,
        });

        if (response.error) {
            // Log failed email
            await prisma.emailLog
                .create({
                    data: {
                        recipientEmail: data.to,
                        subject: data.subject,
                        type: data.type,
                        documentId: data.documentId,
                        status: "FAILED",
                        errorMessage: response.error.message,
                    },
                })
                .catch(() => null); // Silently ignore logging errors

            return {
                success: false,
                error: response.error.message,
            };
        }

        // Log successful email
        await prisma.emailLog
            .create({
                data: {
                    recipientEmail: data.to,
                    subject: data.subject,
                    type: data.type,
                    documentId: data.documentId,
                    status: "SENT",
                    resendId: response.data?.id,
                    sentAt: new Date(),
                },
            })
            .catch(() => null); // Silently ignore logging errors

        return {
            success: true,
            resendId: response.data?.id,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

        // Log error
        await prisma.emailLog
            .create({
                data: {
                    recipientEmail: data.to,
                    subject: data.subject,
                    type: data.type,
                    documentId: data.documentId,
                    status: "FAILED",
                    errorMessage,
                },
            })
            .catch(() => null); // Silently ignore logging errors

        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Send approval request email
 */
export async function sendApprovalRequestEmail(data: {
    to: string;
    recipientName: string;
    documentTitle: string;
    documentId: string;
    submitterName: string;
    dueDate?: Date;
    documentUrl: string;
}) {
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px 0; }
          .button { display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Document Approval Request</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p><strong>${data.submitterName}</strong> has submitted a document for your approval:</p>
            <p style="font-size: 16px; font-weight: bold;">${data.documentTitle}</p>
            ${data.dueDate ? `<p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>` : ""}
            <a href="${data.documentUrl}" class="button">Review Document</a>
            <p>Please review and take appropriate action as soon as possible.</p>
          </div>
          <div class="footer">
            <p>DocuFlow - Document Approval System</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

    return sendEmail({
        to: data.to,
        subject: `Document Approval Request: ${data.documentTitle}`,
        html,
        type: "APPROVAL_REQUEST",
        documentId: data.documentId,
    });
}

/**
 * Send approval confirmation email
 */
export async function sendApprovalApprovedEmail(data: {
    to: string;
    recipientName: string;
    documentTitle: string;
    documentId: string;
    approverName: string;
    approverComment?: string;
    nextApproverName?: string;
    documentUrl: string;
}) {
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px 0; }
          .badge { display: inline-block; background-color: #10b981; color: white; padding: 8px 12px; border-radius: 4px; font-weight: bold; }
          .button { display: inline-block; background-color: #11998e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Document Approved ✓</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p><span class="badge">APPROVED</span></p>
            <p><strong>${data.approverName}</strong> has approved the following document:</p>
            <p style="font-size: 16px; font-weight: bold;">${data.documentTitle}</p>
            ${data.approverComment ? `<p><strong>Comment:</strong> ${data.approverComment}</p>` : ""}
            ${data.nextApproverName ? `<p><strong>Next Approver:</strong> ${data.nextApproverName}</p>` : "<p>This document has completed all approval steps.</p>"}
            <a href="${data.documentUrl}" class="button">View Document</a>
          </div>
          <div class="footer">
            <p>DocuFlow - Document Approval System</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

    return sendEmail({
        to: data.to,
        subject: `Document Approved: ${data.documentTitle}`,
        html,
        type: "APPROVED",
        documentId: data.documentId,
    });
}

/**
 * Send rejection email
 */
export async function sendApprovalRejectedEmail(data: {
    to: string;
    recipientName: string;
    documentTitle: string;
    documentId: string;
    rejectorName: string;
    rejectionReason: string;
    documentUrl: string;
}) {
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px 0; }
          .badge { display: inline-block; background-color: #ef4444; color: white; padding: 8px 12px; border-radius: 4px; font-weight: bold; }
          .button { display: inline-block; background-color: #f5576c; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Document Rejected</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p><span class="badge">REJECTED</span></p>
            <p><strong>${data.rejectorName}</strong> has rejected the following document:</p>
            <p style="font-size: 16px; font-weight: bold;">${data.documentTitle}</p>
            <p><strong>Reason:</strong></p>
            <p>${data.rejectionReason}</p>
            <p>Please review the feedback and resubmit the document when ready.</p>
            <a href="${data.documentUrl}" class="button">View Document</a>
          </div>
          <div class="footer">
            <p>DocuFlow - Document Approval System</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

    return sendEmail({
        to: data.to,
        subject: `Document Rejected: ${data.documentTitle}`,
        html,
        type: "REJECTED",
        documentId: data.documentId,
    });
}
