import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  ok, created, error, serverError, unauthorized,
  withAuth, validateBody, parsePagination, paginatedResponse, getClientInfo,
} from "@/lib/utils/api";
import { auth } from "@/auth";

const createDocumentSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  content: z.string().optional(),
  contentJson: z.any().optional(),
  contentType: z.enum(["RICH_TEXT", "UPLOADED_PDF", "UPLOADED_DOCX", "UPLOADED_XLSX", "UPLOADED_IMAGE", "UPLOADED_OTHER"]).default("RICH_TEXT"),
  templateId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  dueDate: z.string().datetime().optional(),
  isConfidential: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const { skip, limit, page } = parsePagination(searchParams);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");
  const view = searchParams.get("view") ?? "mine"; // mine | pending_my_action | all

  const userId = session.user.id;
  const orgId = session.user.organizationId;
  const role = session.user.systemRole;

  // Build where clause based on role and view
  let where: any = { organizationId: orgId };

  if (view === "mine") {
    where.submittedById = userId;
  } else if (view === "pending_my_action") {
    // Documents where user is the current step's assignee
    where.status = { in: ["PENDING_APPROVAL", "IN_REVIEW"] };
    // We filter in memory after query since workflowSnapshot is JSON
  } else if (view === "all") {
    // Only admins and managers can see all
    if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role)) {
      where.submittedById = userId;
    }
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [total, documents] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          submittedBy: { select: { id: true, name: true, image: true, jobTitle: true } },
          template: { select: { id: true, name: true, category: true } },
          files: { where: { isPrimary: true }, take: 1 },
          _count: { select: { comments: true, files: true } },
        },
      }),
    ]);

    // Filter pending_my_action in memory
    let filtered = documents;
    if (view === "pending_my_action") {
      filtered = documents.filter((doc) => {
        const snapshot = doc.workflowSnapshot as any[];
        if (!snapshot) return false;
        const currentStep = snapshot[doc.currentStepIndex];
        return currentStep?.resolvedAssigneeId === userId;
      });
    }

    return paginatedResponse(filtered, view === "pending_my_action" ? filtered.length : total, page, limit);
  } catch (err) {
    console.error("[DOCUMENTS_GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const validation = await validateBody(req, createDocumentSchema);
  if ("error" in validation) return validation.error;
  const body = validation.data;

  try {
    const document = await prisma.document.create({
      data: {
        organizationId: session.user.organizationId!,
        title: body.title,
        description: body.description,
        content: body.content,
        contentJson: body.contentJson ?? undefined,
        contentType: body.contentType,
        templateId: body.templateId ?? undefined,
        submittedById: session.user.id,
        tags: body.tags,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        isConfidential: body.isConfidential,
        status: "DRAFT",
      },
      include: {
        template: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true, image: true } },
      },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        documentId: document.id,
        actorId: session.user.id,
        action: "CREATED",
        ...getClientInfo(req),
      },
    });

    return created(document);
  } catch (err) {
    console.error("[DOCUMENTS_POST]", err);
    return serverError();
  }
}
