export interface ApprovalApprovedEmailData {
  documentTitle: string;
  documentId: string;
  approverName: string;
  submitterName: string;
  approvalDate: Date;
  documentLink: string;
  comment?: string;
  nextApprover?: string;
}

export function getApprovalApprovedEmailTemplate(
  data: ApprovalApprovedEmailData
): string {
  const approvalDate = new Date(data.approvalDate).toLocaleDateString('en-US', {
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
          .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
          .content { background-color: #f9fafb; padding: 40px 20px; }
          .content-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
          .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .success-icon { font-size: 48px; margin-bottom: 10px; }
          .view-button { 
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✓</div>
            <h1>Document Approved</h1>
            <p>Your document has been successfully approved</p>
          </div>

          <div class="content">
            <p>Hi <strong>${data.submitterName}</strong>,</p>

            <p>Good news! Your document has been approved by <strong>${data.approverName}</strong>.</p>

            <div class="content-box">
              <table>
                <tr>
                  <th>Document Title</th>
                  <td><strong>${data.documentTitle}</strong></td>
                </tr>
                <tr>
                  <th>Approved By</th>
                  <td>${data.approverName}</td>
                </tr>
                <tr>
                  <th>Approval Date</th>
                  <td>${approvalDate}</td>
                </tr>
              </table>
            </div>

            ${
              data.comment
                ? `<div class="content-box">
                <strong>Approver's Comment:</strong>
                <p style="margin: 10px 0 0 0; font-size: 14px; font-style: italic;">"${data.comment}"</p>
              </div>`
                : ''
            }

            ${
              data.nextApprover
                ? `<div class="content-box" style="border-left-color: #f59e0b;">
                <strong style="color: #f59e0b;">⏳ Next in Queue:</strong>
                <p style="margin: 10px 0 0 0; font-size: 14px;">Awaiting approval from: <strong>${data.nextApprover}</strong></p>
              </div>`
                : `<div class="content-box" style="border-left-color: #059669; background-color: #ecfdf5;">
                <strong style="color: #059669;">✓ Final Approval</strong>
                <p style="margin: 10px 0 0 0; font-size: 14px;">This document has completed all approval steps.</p>
              </div>`
            }

            <center>
              <a href="${data.documentLink}" class="view-button">View Document</a>
            </center>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} DocuFlow Approval System. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
