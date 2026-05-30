export interface ApprovalRejectedEmailData {
  documentTitle: string;
  documentId: string;
  rejectedBy: string;
  submitterName: string;
  rejectionDate: Date;
  rejectionReason?: string;
  documentLink: string;
}

export function getApprovalRejectedEmailTemplate(
  data: ApprovalRejectedEmailData
): string {
  const rejectionDate = new Date(data.rejectionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 0; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
          .content { background-color: #f9fafb; padding: 40px 20px; }
          .content-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
          .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .rejection-icon { font-size: 48px; margin-bottom: 10px; }
          .action-button { 
            background-color: #2563eb; 
            color: white; 
            padding: 12px 28px; 
            text-decoration: none; 
            border-radius: 6px; 
            display: inline-block; 
            margin: 20px 0; 
            font-weight: 600;
          }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background-color: #f9fafb; font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .reason-box { background-color: #fef2f2; padding: 16px; border-radius: 6px; margin: 15px 0; border: 1px solid #fee2e2; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="rejection-icon">✕</div>
            <h1>Document Rejected</h1>
            <p>Your document requires revisions before resubmission</p>
          </div>

          <div class="content">
            <p>Hi <strong>${data.submitterName}</strong>,</p>

            <p>Your document has been <strong>rejected</strong> by <strong>${data.rejectedBy}</strong>. Please review the reason below and make necessary changes.</p>

            <div class="content-box">
              <table>
                <tr>
                  <th>Document Title</th>
                  <td><strong>${data.documentTitle}</strong></td>
                </tr>
                <tr>
                  <th>Rejected By</th>
                  <td>${data.rejectedBy}</td>
                </tr>
                <tr>
                  <th>Rejection Date</th>
                  <td>${rejectionDate}</td>
                </tr>
              </table>
            </div>

            ${
              data.rejectionReason
                ? `<div class="reason-box">
                <strong style="color: #991b1b;">Reason for Rejection:</strong>
                <p style="margin: 10px 0 0 0; font-size: 14px;">${data.rejectionReason}</p>
              </div>`
                : ''
            }

            <p style="font-weight: 600; color: #374151; margin-top: 20px;">Next Steps:</p>
            <ol style="color: #6b7280; font-size: 14px;">
              <li>Review the rejection reason above</li>
              <li>Make necessary changes to your document</li>
              <li>Resubmit for approval</li>
            </ol>

            <center>
              <a href="${data.documentLink}" class="action-button">Update & Resubmit Document</a>
            </center>

            <p style="color: #6b7280; font-size: 13px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              Need help? Contact your document administrator or the approver directly for clarification.
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} DocuFlow Approval System. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
