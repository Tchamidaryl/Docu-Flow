import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    BorderStyle,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
} from "docx";
import { generateStampHTML, generateStampText } from "./stamp-generator";
import type { StampData } from "./stamp-generator";

/**
 * Add signature to Word document
 */
export async function addSignatureToDocx(
    docxBuffer: Buffer,
    stampData: StampData,
    options?: {
        addNewPage?: boolean;
    },
): Promise<Buffer> {
    try {
        // For this implementation, we'll create a document with signature added
        // In production, you would parse the existing DOCX and append to it

        const statusColor =
            stampData.action === "APPROVED" ? "10B981" : "EF4444";
        const statusText =
            stampData.action === "APPROVED" ? "✓ APPROVED" : "✕ REJECTED";

        const stampSection = [
            new Paragraph({
                text: "",
                spacing: { line: 200, lineRule: "auto" },
            }),
            new Paragraph({
                text: "═".repeat(50),
                spacing: { before: 100, after: 100 },
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        cells: [
                            new TableCell({
                                borders: {
                                    top: {
                                        color: statusColor,
                                        space: 1,
                                        style: BorderStyle.SINGLE,
                                        size: 12,
                                    },
                                    bottom: {
                                        color: statusColor,
                                        space: 1,
                                        style: BorderStyle.SINGLE,
                                        size: 12,
                                    },
                                    left: {
                                        color: statusColor,
                                        space: 1,
                                        style: BorderStyle.SINGLE,
                                        size: 12,
                                    },
                                    right: {
                                        color: statusColor,
                                        space: 1,
                                        style: BorderStyle.SINGLE,
                                        size: 12,
                                    },
                                },
                                children: [
                                    new Paragraph({
                                        text: statusText,
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 100, after: 100 },
                                        run: new TextRun({
                                            size: 28,
                                            bold: true,
                                            color: statusColor,
                                        }),
                                    }),
                                    new Paragraph({
                                        text: `Signed By: ${stampData.approverName}`,
                                        spacing: { before: 50, after: 50 },
                                        run: new TextRun({
                                            size: 20,
                                            bold: true,
                                        }),
                                    }),
                                    stampData.approverTitle
                                        ? new Paragraph({
                                              text: `Title: ${stampData.approverTitle}`,
                                              spacing: {
                                                  before: 50,
                                                  after: 50,
                                              },
                                              run: new TextRun({
                                                  size: 18,
                                              }),
                                          })
                                        : null,
                                    new Paragraph({
                                        text: `Date: ${stampData.timestamp.toLocaleString()}`,
                                        spacing: { before: 50, after: 50 },
                                        run: new TextRun({
                                            size: 18,
                                        }),
                                    }),
                                    new Paragraph({
                                        text: `Email: ${stampData.approverEmail}`,
                                        spacing: { before: 50, after: 50 },
                                        run: new TextRun({
                                            size: 18,
                                        }),
                                    }),
                                    stampData.comment
                                        ? new Paragraph({
                                              text: `Comment: ${stampData.comment}`,
                                              spacing: {
                                                  before: 100,
                                                  after: 50,
                                              },
                                              run: new TextRun({
                                                  size: 18,
                                                  italics: true,
                                              }),
                                          })
                                        : null,
                                ].filter(Boolean),
                            }),
                        ],
                    }),
                ],
            }),
            new Paragraph({
                text: "═".repeat(50),
                spacing: { before: 100, after: 100 },
            }),
        ];

        const doc = new Document({
            sections: [
                {
                    children: stampSection,
                },
            ],
        });

        const packer = Packer;
        const buffer = await packer.toBuffer(doc);
        return buffer;
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        throw new Error(
            `Failed to add signature to Word document: ${errorMessage}`,
        );
    }
}

/**
 * Create a signature page for Word document
 */
export async function createDocxSignaturePage(
    signatures: StampData[],
): Promise<Buffer> {
    try {
        const paragraphs: Paragraph[] = [
            new Paragraph({
                text: "DOCUMENT APPROVALS",
                alignment: AlignmentType.CENTER,
                spacing: { before: 100, after: 200 },
                run: new TextRun({
                    size: 32,
                    bold: true,
                    color: "000000",
                }),
            }),
        ];

        for (const signature of signatures) {
            const statusColor =
                signature.action === "APPROVED" ? "10B981" : "EF4444";
            const statusText =
                signature.action === "APPROVED" ? "✓ APPROVED" : "✕ REJECTED";

            paragraphs.push(
                new Paragraph({
                    text: statusText,
                    spacing: { before: 100, after: 50 },
                    run: new TextRun({
                        size: 24,
                        bold: true,
                        color: statusColor,
                    }),
                }),
                new Paragraph({
                    text: `By: ${signature.approverName}`,
                    spacing: { before: 50, after: 25 },
                    run: new TextRun({
                        size: 20,
                        bold: true,
                    }),
                }),
                signature.approverTitle
                    ? new Paragraph({
                          text: `Title: ${signature.approverTitle}`,
                          spacing: { before: 25, after: 25 },
                          run: new TextRun({
                              size: 18,
                          }),
                      })
                    : new Paragraph({ text: "" }),
                new Paragraph({
                    text: `Date: ${signature.timestamp.toLocaleString()}`,
                    spacing: { before: 25, after: 25 },
                    run: new TextRun({
                        size: 18,
                    }),
                }),
                new Paragraph({
                    text: `Email: ${signature.approverEmail}`,
                    spacing: { before: 25, after: 50 },
                    run: new TextRun({
                        size: 18,
                    }),
                }),
                signature.comment
                    ? new Paragraph({
                          text: `Comment: ${signature.comment}`,
                          spacing: { before: 50, after: 100 },
                          run: new TextRun({
                              size: 18,
                              italics: true,
                          }),
                      })
                    : new Paragraph({ text: "" }),
                new Paragraph({
                    text: "─".repeat(60),
                    spacing: { before: 50, after: 50 },
                }),
            );
        }

        const doc = new Document({
            sections: [
                {
                    children: paragraphs,
                },
            ],
        });

        const packer = Packer;
        const buffer = await packer.toBuffer(doc);
        return buffer;
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to create Word document: ${errorMessage}`);
    }
}
