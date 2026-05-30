export interface ApprovalRequestEmailData {
  recipientName: string;
  documentTitle: string;
  documentId: string;
  submitterName: string;
  description?: string;
  dueDate?: Date;
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  approvalLink: string;
}

export function getApprovalRequestEmailTemplate(
  data: ApprovalRequestEmailData
): string {
  const dueDateText = data.dueDate
    ? new Date(data.dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'No deadline';

  const priorityColor = {
    URGENT: '#dc2626',
    HIGH: '#ea580c',
    NORMAL: '#2563eb',
    LOW: '#16a34a',
  }[data.priority || 'NORMAL'];

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 0; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
          .content { background-color: #f9fafb; padding: 40px 20px; }
          .content-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
          .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .button { 
            background-color: #2563eb; 
            color: white; 
            padding: 14px 32px; 
            text-decoration: none; 
            border-radius: 6px; 
            display: inline-block; 
            margin: 20px 0; 
            font-weight: 600;
          }
          .button:hover { background-color: #1d4ed8; }
          .priority-badge { 
            display: inline-block; 
            background-color: ${priorityColor}; 
            color: white; 
            padding: 6px 14px; 
            border-radius: 4px; 
            font-size: 12px; 
            font-weight: 700;
          }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background-color: #f9fafb; font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          td { font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Document Approval Request</h1>
            <p>You have a new document awaiting your approval</p>
          </div>

          <div class="content">
            <p>Hi <strong>${data.recipientName}</strong>,</p>

            <p><strong>${data.submitterName}</strong> has submitted a document for your approval:</p>

            <div class="content-box">
              <table>
                <tr>
                  <th>Document Title</th>
                  <td><strong>${data.documentTitle}</strong></td>
                </tr>
                <tr>
                  <th>Submitted By</th>
                  <td>${data.submitterName}</td>
                </tr>
                <tr>
                  <th>Due Date</th>
                  <td>${dueDateText}</td>
                </tr>
                <tr>
                  <th>Priority</th>
                  <td><span class="priority-badge">${data.priority || 'NORMAL'}</span></td>
                </tr>
              </table>
            </div>

            ${
              data.description
                ? `<div class="content-box">
                <strong>Description:</strong>
                <p style="margin: 10px 0 0 0; font-size: 14px;">${data.description}</p>
              </div>`
                : ''
            }

            <p>Please review the document and take action:</p>

            <center>
              <a href="${data.approvalLink}" class="button">View & Approve Document</a>
            </center>

            <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
              You can approve, reject, or request revisions. If you cannot approve, you can delegate the request to another approver.
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} DocuFlow Approval System. All rights reserved.</p>
            <p>This is an automated message from DocuFlow. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
