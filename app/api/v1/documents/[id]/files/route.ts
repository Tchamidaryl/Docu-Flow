import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { error, serverError, ok, unauthorized } from "@/lib/utils/api";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } },
) {
    const session = await auth();
    if (!session?.user?.email) {
        return unauthorized("You must be logged in to upload files");
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return error("No file provided", 400);
        }

        // Get document
        const document = await prisma.document.findUnique({
            where: { id: params.id },
            include: { createdBy: true },
        });

        if (!document) {
            return error("Document not found", 404);
        }

        // Get current user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return unauthorized("User not found");
        }

        // Check access: User must be in the same organization
        if (
            document.organizationId !== user.organizationId &&
            document.createdById !== user.id &&
            user.systemRole !== "ADMIN"
        ) {
            return unauthorized(
                "You don't have permission to upload files for this document",
            );
        }

        // Store file
        const buffer = await file.arrayBuffer();
        const fileUrl = await uploadToStorage(buffer, file.name, document.id);

        // Create file record in database
        const uploadedFile = await prisma.documentFile.create({
            data: {
                documentId: document.id,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileUrl,
                uploadedBy: user.id,
                uploadedAt: new Date(),
            },
        });

        return ok({
            message: "File uploaded successfully",
            file: uploadedFile,
        });
    } catch (err) {
        console.error("[UPLOAD_FILE]", err);
        return serverError("Failed to upload file");
    }
}

async function uploadToStorage(
    buffer: ArrayBuffer,
    fileName: string,
    documentId: string,
): Promise<string> {
    // TODO: Implement storage upload (S3, Cloudinary, etc.)
    return `https://storage.example.com/${documentId}/${fileName}`;
}
