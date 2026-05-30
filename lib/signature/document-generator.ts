import prisma from "@/lib/prisma";
import { createApprovalReport } from "./excel-signer";
import { createDocxSignaturePage } from "./word-signer";
import { addSignatureToPDF } from "./pdf-signer";
import type { StampData } from "./stamp-generator";

/**
 * Generate signed document for download
 */
export async function generateSignedDocument(
    documentId: string,
    fileType: "pdf" | "docx" | "csv" | "original",
): Promise<{
    data: Buffer;
    filename: string;
    mimeType: string;
}> {
    try {
        // Fetch document with all approvals
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                files: true,
                actions: {
                    include: {
                        actor: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                jobTitle: true,
                            },
                        },
                    },
                    orderBy: {
                        timestamp: "asc",
                    },
                },
                signatures: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
                submittedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!document) {
            throw new Error("Document not found");
        }

        // Get primary file
        const primaryFile =
            document.files.find((f) => f.isPrimary) || document.files[0];
        if (!primaryFile && fileType === "original") {
            throw new Error("No file attached to document");
        }

        // Create stamp data from approval actions
        const stampDataArray: StampData[] = document.actions
            .filter((action) =>
                ["APPROVED", "REJECTED"].includes(action.action),
            )
            .map((action) => ({
                approverName: action.actor.name,
                approverTitle: action.actor.jobTitle || undefined,
                approverEmail: action.actor.email,
                action: action.action as "APPROVED" | "REJECTED",
                timestamp: action.timestamp,
                comment: action.comment || undefined,
            }));

        let outputBuffer: Buffer;
        let mimeType: string;
        let extension: string;

        switch (fileType) {
            case "pdf":
                // If original is PDF, add signatures to it
                if (primaryFile && primaryFile.mimeType === "application/pdf") {
                    // Read file from storage (assuming it's stored somewhere accessible)
                    // For now, we'll create a placeholder
                    outputBuffer = Buffer.alloc(0); // Would be replaced with actual file read
                    if (stampDataArray.length > 0) {
                        // Add signatures to PDF
                        // outputBuffer = await addSignatureToPDF(outputBuffer, stampDataArray[0]);
                    }
                } else {
                    // Create PDF with signatures
                    outputBuffer =
                        await createDocxSignaturePage(stampDataArray);
                }
                mimeType = "application/pdf";
                extension = "pdf";
                break;

            case "docx":
                outputBuffer = await createDocxSignaturePage(stampDataArray);
                mimeType =
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                extension = "docx";
                break;

            case "csv":
                outputBuffer = await createApprovalReport({
                    documentTitle: document.title,
                    documentId: document.id,
                    submittedBy: document.submittedBy.name,
                    submittedDate: document.submittedAt || document.createdAt,
                    completedDate: document.completedAt || undefined,
                    signatures: stampDataArray,
                });
                mimeType = "text/csv";
                extension = "csv";
                break;

            case "original":
                if (!primaryFile) {
                    throw new Error("No original file available");
                }
                // In production, fetch from actual storage
                outputBuffer = Buffer.from("Original file content placeholder");
                mimeType = primaryFile.mimeType;
                extension = primaryFile.fileName.split(".").pop() || "bin";
                break;

            default:
                throw new Error(`Unsupported file type: ${fileType}`);
        }

        const filename = `${document.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${Date.now()}.${extension}`;

        return {
            data: outputBuffer,
            filename,
            mimeType,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to generate signed document: ${errorMessage}`);
    }
}

/**
 * Generate document summary with all approval info
 */
export async function generateDocumentSummary(
    documentId: string,
): Promise<string> {
    try {
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                actions: {
                    include: {
                        actor: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: {
                        timestamp: "asc",
                    },
                },
                submittedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!document) {
            throw new Error("Document not found");
        }

        let summary = `DOCUMENT APPROVAL SUMMARY\n`;
        summary += `${"═".repeat(80)}\n\n`;
        summary += `Title: ${document.title}\n`;
        summary += `Document ID: ${document.id}\n`;
        summary += `Status: ${document.status}\n`;
        summary += `Submitted By: ${document.submittedBy.name} (${document.submittedBy.email})\n`;
        summary += `Submitted Date: ${document.submittedAt?.toLocaleString() || "N/A"}\n`;
        summary += `Completed Date: ${document.completedAt?.toLocaleString() || "In Progress"}\n\n`;

        summary += `APPROVAL WORKFLOW\n`;
        summary += `${"─".repeat(80)}\n`;

        for (const action of document.actions) {
            const actionLabel =
                action.action === "APPROVED"
                    ? "✓ APPROVED"
                    : action.action === "REJECTED"
                      ? "✕ REJECTED"
                      : action.action;
            summary += `\n${actionLabel}\n`;
            summary += `  By: ${action.actor.name} (${action.actor.email})\n`;
            summary += `  Date: ${action.timestamp.toLocaleString()}\n`;
            if (action.comment) {
                summary += `  Comment: ${action.comment}\n`;
            }
        }

        summary += `\n${"═".repeat(80)}\n`;

        return summary;
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to generate document summary: ${errorMessage}`);
    }
}
