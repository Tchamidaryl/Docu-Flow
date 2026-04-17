import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  ok, error, notFound, forbidden, serverError, unauthorized,
  validateBody, getClientInfo,
} from "@/lib/utils/api";
import { auth } from "@/auth";

const updateDocumentSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  contentJson: z.any().optional(),
  templateId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  isConfidential: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { id } = await params;

  try {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        submittedBy: {
          select: { id: true, name: true, email: true, image: true, jobTitle: true, department: { select: { name: true } } },
        },
        template: {
          include: {
            steps: {
              include: {
                assignedUser: { select: { id: true, name: true, image: true } },
                customRole: { select: { id: true, name: true, color: true } },
              },
              orderBy: { stepOrder: "asc" },
            },
          },
        },
        files: { orderBy: { createdAt: "asc" } },
        comments: {
          where: { parentId: null },
          include: {
            author: { select: { id: true, name: true, image: true, jobTitle: true } },
            replies: {
              include: { author: { select: { id: true, name: true, image: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { comments: true, files: true, versions: true } },
      },
    });

    if (!document) return notFound("Document");

    // Access control
    const userId = session.user.id;
    const role = session.user.systemRole;
    const snapshot = (document.workflowSnapshot as any[]) ?? [];
    const isSubmitter = document.submittedById === userId;
    const isCurrentApprover = snapshot[document.currentStepIndex]?.resolvedAssigneeId === userId;
    const canViewAll = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role);

    if (!isSubmitter && !isCurrentApprover && !canViewAll) {
      // Check if user was ever in the approval chain
      const wasApprover = snapshot.some((s: any) => s.resolvedAssigneeId === userId);
      if (!wasApprover) return forbidden("Access denied");
    }

    // Log view
    await prisma.auditLog.create({
      data: { documentId: id, actorId: userId, action: "VIEWED" },
    });

    return ok(document);
  } catch (err) {
    console.error("[DOCUMENT_GET]", err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { id } = await params;

  const validation = await validateBody(req, updateDocumentSchema);
  if ("error" in validation) return validation.error;
  const body = validation.data;

  try {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) return notFound("Document");

    // Only submitter or admin can edit
    const canEdit =
      document.submittedById === session.user.id ||
      ["SUPER_ADMIN", "ADMIN"].includes(session.user.systemRole);
    if (!canEdit) return forbidden();

    // Can only edit draft or revision_requested
    if (!["DRAFT", "REVISION_REQUESTED"].includes(document.status)) {
      return error("Cannot edit a document that is in approval workflow");
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.contentJson !== undefined && { contentJson: body.contentJson }),
        ...(body.templateId && { templateId: body.templateId }),
        ...(body.tags && { tags: body.tags }),
        ...(body.priority && { priority: body.priority }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
        ...(body.isConfidential !== undefined && { isConfidential: body.isConfidential }),
      },
    });

    return ok(updated);
  } catch (err) {
    console.error("[DOCUMENT_PATCH]", err);
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { id } = await params;

  try {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) return notFound("Document");

    const canDelete =
      (document.submittedById === session.user.id && document.status === "DRAFT") ||
      ["SUPER_ADMIN", "ADMIN"].includes(session.user.systemRole);
    if (!canDelete) return forbidden("Only draft documents can be deleted by their creator");

    await prisma.document.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    console.error("[DOCUMENT_DELETE]", err);
    return serverError();
  }
}
