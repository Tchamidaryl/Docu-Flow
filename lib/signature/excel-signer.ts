import type { StampData } from "./stamp-generator";

/**
 * Add signature to Excel document
 * This creates a signature sheet to be appended to the Excel workbook
 */
export async function createExcelSignatureSheet(
    signatures: StampData[],
): Promise<Buffer> {
    try {
        // We'll return a simple CSV-style buffer for now
        // In production, use 'xlsx' library to create proper Excel format

        let csvContent = "DOCUMENT APPROVALS\n";
        csvContent += "═".repeat(100) + "\n\n";
        csvContent += "Status,Approver Name,Title,Date & Time,Email,Comment\n";

        for (const signature of signatures) {
            const status =
                signature.action === "APPROVED" ? "APPROVED" : "REJECTED";
            const title = signature.approverTitle || "";
            const dateStr = signature.timestamp.toLocaleString();
            const comment = signature.comment?.replace(/,/g, ";") || "";

            csvContent += `"${status}","${signature.approverName}","${title}","${dateStr}","${signature.approverEmail}","${comment}"\n`;
        }

        return Buffer.from(csvContent, "utf-8");
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        throw new Error(
            `Failed to create Excel signature sheet: ${errorMessage}`,
        );
    }
}

/**
 * Create a comprehensive approval report for Excel
 */
export async function createApprovalReport(data: {
    documentTitle: string;
    documentId: string;
    submittedBy: string;
    submittedDate: Date;
    completedDate?: Date;
    signatures: StampData[];
    documentContent?: string;
}): Promise<Buffer> {
    try {
        let csvContent = "";

        // Header information
        csvContent += "DOCUMENT APPROVAL REPORT\n";
        csvContent += "═".repeat(100) + "\n\n";

        csvContent += "DOCUMENT INFORMATION\n";
        csvContent += `Title,${data.documentTitle}\n`;
        csvContent += `Document ID,${data.documentId}\n`;
        csvContent += `Submitted By,${data.submittedBy}\n`;
        csvContent += `Submitted Date,${data.submittedDate.toLocaleString()}\n`;
        if (data.completedDate) {
            csvContent += `Completed Date,${data.completedDate.toLocaleString()}\n`;
        }
        csvContent += "\n";

        // Approval details
        csvContent += "APPROVAL WORKFLOW\n";
        csvContent += "─".repeat(100) + "\n";
        csvContent += "Action,Approver,Title,Date & Time,Email,Comment\n";

        for (const signature of data.signatures) {
            const action =
                signature.action === "APPROVED" ? "APPROVED" : "REJECTED";
            const title = signature.approverTitle || "N/A";
            const dateStr = signature.timestamp.toLocaleString();
            const comment = signature.comment?.replace(/,/g, ";") || "N/A";

            csvContent += `"${action}","${signature.approverName}","${title}","${dateStr}","${signature.approverEmail}","${comment}"\n`;
        }

        csvContent += "\n";
        csvContent += "SUMMARY\n";
        csvContent += "─".repeat(100) + "\n";
        csvContent += `Total Approvals,${data.signatures.filter((s) => s.action === "APPROVED").length}\n`;
        csvContent += `Total Rejections,${data.signatures.filter((s) => s.action === "REJECTED").length}\n`;
        csvContent += `Final Status,${data.signatures[data.signatures.length - 1]?.action || "N/A"}\n`;

        return Buffer.from(csvContent, "utf-8");
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to create approval report: ${errorMessage}`);
    }
}
