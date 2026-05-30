import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import { generateStampSVG } from "./stamp-generator";
import type { StampData } from "./stamp-generator";

/**
 * Add signature stamp to PDF document
 */
export async function addSignatureToPDF(
    pdfBytes: Buffer,
    stampData: StampData,
    options?: {
        page?: number; // 0-indexed, default is last page
        x?: number;
        y?: number;
        width?: number;
        height?: number;
    },
): Promise<Buffer> {
    try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        // Use specified page or last page
        const pageIndex = options?.page ?? pages.length - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) {
            throw new Error(`Invalid page index: ${pageIndex}`);
        }

        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        // Default position: bottom right
        const stampX = options?.x ?? width - 320;
        const stampY = options?.y ?? 20;
        const stampWidth = options?.width ?? 300;
        const stampHeight = options?.height ?? 200;

        // Generate stamp SVG
        const svgStamp = generateStampSVG(stampData);

        // Create an image from SVG (we'll use a workaround by embedding as text-based visual)
        // For production, consider using a library like sharp to convert SVG to image
        const statusColor =
            stampData.action === "APPROVED" ? [16, 185, 129] : [239, 68, 68]; // RGB values

        // Draw border
        page.drawRectangle({
            x: stampX,
            y: stampY,
            width: stampWidth,
            height: stampHeight,
            borderColor: rgb(
                statusColor[0] / 255,
                statusColor[1] / 255,
                statusColor[2] / 255,
            ),
            borderWidth: 2,
            color: rgb(
                (statusColor[0] / 255) * 0.1,
                (statusColor[1] / 255) * 0.1,
                (statusColor[2] / 255) * 0.1,
            ),
        });

        // Draw content
        const startY = stampY + stampHeight - 20;
        const fontSize = 10;
        const lineHeight = 12;

        // Status icon and label
        page.drawText(stampData.action === "APPROVED" ? "✓" : "✕", {
            x: stampX + stampWidth / 2 - 5,
            y: startY - 30,
            size: 24,
            color: rgb(
                statusColor[0] / 255,
                statusColor[1] / 255,
                statusColor[2] / 255,
            ),
        });

        // Approver name
        page.drawText(`By: ${stampData.approverName}`, {
            x: stampX + 10,
            y: startY - 50,
            size: fontSize,
            color: rgb(0, 0, 0),
        });

        // Title if available
        if (stampData.approverTitle) {
            page.drawText(`${stampData.approverTitle}`, {
                x: stampX + 10,
                y: startY - 50 - lineHeight,
                size: fontSize - 1,
                color: rgb(0.4, 0.4, 0.4),
            });
        }

        // Date
        const dateStr = stampData.timestamp.toLocaleString();
        page.drawText(`Date: ${dateStr}`, {
            x: stampX + 10,
            y:
                startY -
                50 -
                (stampData.approverTitle ? lineHeight * 2 : lineHeight),
            size: fontSize - 1,
            color: rgb(0.4, 0.4, 0.4),
        });

        // Email
        page.drawText(`${stampData.approverEmail}`, {
            x: stampX + 10,
            y:
                startY -
                50 -
                (stampData.approverTitle ? lineHeight * 3 : lineHeight * 2),
            size: fontSize - 1,
            color: rgb(0.4, 0.4, 0.4),
        });

        // Save modified PDF
        const pdfBytes2 = await pdfDoc.save();
        return Buffer.from(pdfBytes2);
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to add signature to PDF: ${errorMessage}`);
    }
}

/**
 * Add multiple signatures to PDF (one per page or stacked)
 */
export async function addMultipleSignaturesToPDF(
    pdfBytes: Buffer,
    signatures: Array<StampData & { page?: number }>,
): Promise<Buffer> {
    let result = pdfBytes;

    for (const signature of signatures) {
        const { page, ...stampData } = signature;
        result = await addSignatureToPDF(result, stampData, { page });
    }

    return result;
}
