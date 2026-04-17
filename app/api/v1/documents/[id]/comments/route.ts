import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, notFound, serverError, unauthorized, forbidden, validateBody } from "@/lib/utils/api";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional(),
  isInternal: z.boolean().default(false),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { id } = await params;

  try {
    const doc = await prisma.document.findUnique({
      where: { id },
      select: { submittedById: true, workflowSnapshot: true },
    });
    if (!doc) return notFound("Document");

    const isApproverRole = ["SUPER_ADMIN", "ADMIN", "MANAGER", "APPROVER"].includes(session.user.systemRole);

    const comments = await prisma.comment.findMany({
      where: {
        documentId: id,
        parentId: null,
        // Non-approvers can't see internal comments
        ...(isApproverRole ? {} : { isInternal: false }),
      },
      include: {
        author: { select: { id: true, name: true, image: true, jobTitle: true } },
        replies: {
          where: isApproverRole ? {} : { isInternal: false },
          include: { author: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(comments);
  } catch (err) {
    console.error("[COMMENTS_GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { id } = await params;
  const validation = await validateBody(req, createCommentSchema);
  if ("error" in validation) return validation.error;
  const body = validation.data;

  // Only approvers can post internal comments
  if (body.isInternal && !["SUPER_ADMIN", "ADMIN", "MANAGER", "APPROVER"].includes(session.user.systemRole)) {
    return forbidden("Only approvers can post internal comments");
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        documentId: id,
        authorId: session.user.id,
        content: body.content,
        parentId: body.parentId,
        isInternal: body.isInternal,
      },
      include: {
        author: { select: { id: true, name: true, image: true, jobTitle: true } },
      },
    });

    return created(comment);
  } catch (err) {
    console.error("[COMMENT_POST]", err);
    return serverError();
  }
}
