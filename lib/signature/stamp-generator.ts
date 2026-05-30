import { format } from "date-fns";

export interface StampData {
    approverName: string;
    approverTitle?: string;
    approverEmail: string;
    action: "APPROVED" | "REJECTED";
    timestamp: Date;
    comment?: string;
}

/**
 * Generate SVG stamp for document signatures
 */
export function generateStampSVG(data: StampData): string {
    const statusColor = data.action === "APPROVED" ? "#10b981" : "#ef4444";
    const statusIcon = data.action === "APPROVED" ? "✓" : "✕";
    const formattedDate = format(data.timestamp, "MMM d, yyyy HH:mm");

    return `
    <svg width="300" height="250" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .stamp-border { fill: none; stroke: ${statusColor}; stroke-width: 2; stroke-dasharray: 5,5; }
          .stamp-icon { fill: ${statusColor}; font-size: 48px; font-weight: bold; }
          .stamp-text { fill: ${statusColor}; font-family: Arial, sans-serif; font-weight: bold; }
          .stamp-detail { fill: #666; font-family: Arial, sans-serif; font-size: 12px; }
          .stamp-comment { fill: #555; font-family: Arial, sans-serif; font-size: 11px; font-style: italic; }
        </style>
      </defs>
      
      <!-- Border -->
      <rect x="10" y="10" width="280" height="230" rx="8" class="stamp-border"/>
      
      <!-- Status Icon -->
      <text x="150" y="60" text-anchor="middle" class="stamp-icon">${statusIcon}</text>
      
      <!-- Status Label -->
      <text x="150" y="90" text-anchor="middle" class="stamp-text" font-size="20">${data.action}</text>
      
      <!-- Approver Name -->
      <text x="150" y="120" text-anchor="middle" class="stamp-text" font-size="14">By: ${data.approverName}</text>
      
      <!-- Approver Title -->
      ${data.approverTitle ? `<text x="150" y="140" text-anchor="middle" class="stamp-detail">${data.approverTitle}</text>` : ""}
      
      <!-- Date -->
      <text x="150" y="${data.approverTitle ? 160 : 150}" text-anchor="middle" class="stamp-detail">${formattedDate}</text>
      
      <!-- Email -->
      <text x="150" y="${data.approverTitle ? 178 : 168}" text-anchor="middle" class="stamp-detail">${data.approverEmail}</text>
      
      <!-- Comment Section -->
      ${
          data.comment
              ? `
          <line x1="20" y1="190" x2="280" y2="190" stroke="#ddd" stroke-width="1"/>
          <text x="25" y="210" class="stamp-comment" font-size="10">Comment:</text>
          <text x="25" y="225" class="stamp-comment" font-size="10">${data.comment.substring(0, 40)}${data.comment.length > 40 ? "..." : ""}</text>
        `
              : ""
      }
    </svg>
  `;
}

/**
 * Generate HTML stamp for document signatures
 */
export function generateStampHTML(data: StampData): string {
    const statusColor = data.action === "APPROVED" ? "#10b981" : "#ef4444";
    const statusIcon = data.action === "APPROVED" ? "✓" : "✕";
    const formattedDate = format(data.timestamp, "MMM d, yyyy HH:mm");

    return `
    <div style="
      border: 2px dashed ${statusColor};
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      background-color: ${statusColor}15;
      max-width: 300px;
      margin: 20px 0;
    ">
      <div style="
        color: ${statusColor};
        font-size: 36px;
        font-weight: bold;
        margin-bottom: 10px;
      ">${statusIcon}</div>
      
      <div style="
        color: ${statusColor};
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
      ">${data.action}</div>
      
      <div style="
        color: #333;
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 5px;
      ">By: ${data.approverName}</div>
      
      ${data.approverTitle ? `<div style="color: #666; font-size: 12px; margin-bottom: 5px;">${data.approverTitle}</div>` : ""}
      
      <div style="
        color: #666;
        font-size: 12px;
        margin-bottom: 5px;
      ">${formattedDate}</div>
      
      <div style="
        color: #666;
        font-size: 12px;
        word-break: break-all;
      ">${data.approverEmail}</div>
      
      ${
          data.comment
              ? `
        <div style="
          border-top: 1px solid #ddd;
          margin-top: 15px;
          padding-top: 10px;
          color: #555;
          font-size: 11px;
          font-style: italic;
          text-align: left;
        ">
          <strong>Comment:</strong><br/>
          ${data.comment}
        </div>
      `
              : ""
      }
    </div>
  `;
}

/**
 * Generate plain text stamp
 */
export function generateStampText(data: StampData): string {
    const formattedDate = format(data.timestamp, "MMM d, yyyy HH:mm");
    const separator = "=".repeat(50);

    return `
${separator}
${data.action}
${separator}
Approved By: ${data.approverName}
${data.approverTitle ? `Title: ${data.approverTitle}\n` : ""}
Date: ${formattedDate}
Email: ${data.approverEmail}
${data.comment ? `\nComment:\n${data.comment}` : ""}
${separator}
  `.trim();
}
