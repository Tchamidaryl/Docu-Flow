import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateStampHTML } from "@/lib/signature/stamp-generator";
import { createDocxSignaturePage } from "@/lib/signature/word-signer";
import { createApprovalReport } from "@/lib/signature/excel-signer";

/**
 * GET /api/v1/documents/[id]/download?format=pdf|docx|csv|original
 * Download document with signatures if approved/rejected
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } },
) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const documentId = params.id;
        const format = (req.nextUrl.searchParams.get("format") ||
            "original") as "pdf" | "docx" | "csv" | "original";

        // Fetch document with all approvals and signatures
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                submittedBy: { select: { id: true, name: true, email: true } },
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
                    orderBy: { timestamp: "asc" },
                },
                signatures: {
                    orderBy: { signedAt: "asc" },
                },
                files: {
                    where: { isPrimary: true },
                    take: 1,
                },
            },
        });

        if (!document) {
            return NextResponse.json(
                { error: "Document not found" },
                { status: 404 },
            );
        }

        // Check user access
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, organizationId: true, systemRole: true },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 },
            );
        }

        const hasAccess =
            document.submittedBy.id === user.id ||
            document.organizationId === user.organizationId ||
            ["ADMIN", "SUPER_ADMIN"].includes(user.systemRole);

        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Only allow download if document is approved or rejected
        if (!["APPROVED", "REJECTED"].includes(document.status)) {
            return NextResponse.json(
                { error: "Document must be approved or rejected to download" },
                { status: 400 },
            );
        }

        let fileBuffer: Buffer;
        let filename: string;
        let mimeType: string;

        switch (format) {
            case "original": {
                // Return original file if exists
                if (!document.files || document.files.length === 0) {
                    return NextResponse.json(
                        { error: "No original file attached" },
                        { status: 400 },
                    );
                }
                // In production, fetch from storage. For now, return placeholder
                fileBuffer = Buffer.from("Original file placeholder");
                filename =
                    document.files[0]?.originalName || `${document.title}.pdf`;
                mimeType = document.files[0]?.mimeType || "application/pdf";
                break;
            }

            case "pdf": {
                // Create PDF with signatures
                const approvalActions = document.actions.filter((a) =>
                    ["APPROVED", "REJECTED"].includes(a.action),
                );

                if (approvalActions.length === 0) {
                    return NextResponse.json(
                        { error: "No approval actions found" },
                        { status: 400 },
                    );
                }

                // Create HTML with approval stamps
                let html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
              .stamp { margin: 20px 0; padding: 20px; background: white; border-radius: 8px; page-break-inside: avoid; }
              .header { background: #f0f0f0; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${document.title}</h1>
              <p>Document ID: ${document.id}</p>
              <p>Status: <strong>${document.status}</strong></p>
              <p>Submitted: ${document.submittedAt ? new Date(document.submittedAt).toLocaleString() : "N/A"}</p>
            </div>
        `;

                for (const action of approvalActions) {
                    const stampHtml = generateStampHTML({
                        approverName: action.actor.name,
                        approverTitle: action.actor.jobTitle || undefined,
                        approverEmail: action.actor.email,
                        action: action.action as "APPROVED" | "REJECTED",
                        timestamp: action.timestamp,
                        comment: action.comment || undefined,
                    });
                    html += `<div class="stamp">${stampHtml}</div>`;
                }

                html += `
          </body>
          </html>
        `;

                fileBuffer = Buffer.from(html, "utf-8");
                filename = `${document.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${Date.now()}.html`;
                mimeType = "text/html";
                break;
            }

            case "docx": {
                // Create Word document with approval page
                const approvalActions = document.actions.filter((a) =>
                    ["APPROVED", "REJECTED"].includes(a.action),
                );

                const stampDataArray = approvalActions.map((action) => ({
                    approverName: action.actor.name,
                    approverTitle: action.actor.jobTitle || undefined,
                    approverEmail: action.actor.email,
                    action: action.action as "APPROVED" | "REJECTED",
                    timestamp: action.timestamp,
                    comment: action.comment || undefined,
                }));

                fileBuffer = await createDocxSignaturePage(stampDataArray);
                filename = `${document.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_signatures_${Date.now()}.docx`;
                mimeType =
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                break;
            }

            case "csv": {
                // Create approval report CSV
                const approvalActions = document.actions.filter((a) =>
                    ["APPROVED", "REJECTED"].includes(a.action),
                );

                const stampDataArray = approvalActions.map((action) => ({
                    approverName: action.actor.name,
                    approverTitle: action.actor.jobTitle || undefined,
                    approverEmail: action.actor.email,
                    action: action.action as "APPROVED" | "REJECTED",
                    timestamp: action.timestamp,
                    comment: action.comment || undefined,
                }));

                fileBuffer = await createApprovalReport({
                    documentTitle: document.title,
                    documentId: document.id,
                    submittedBy: document.submittedBy.name,
                    submittedDate: document.submittedAt || document.createdAt,
                    completedDate: document.completedAt || undefined,
                    signatures: stampDataArray,
                });
                filename = `${document.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_report_${Date.now()}.csv`;
                mimeType = "text/csv";
                break;
            }

            default:
                return NextResponse.json(
                    { error: "Invalid format" },
                    { status: 400 },
                );
        }

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": mimeType,
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        console.error("[DOCUMENT_DOWNLOAD]", errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
