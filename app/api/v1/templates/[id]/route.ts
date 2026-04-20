import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, notFound, forbidden, serverError, unauthorized, validateBody } from "@/lib/utils/api";
import { auth } from "@/auth";

const updateSchema = z.object({
  name:        z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  category:    z.string().optional(),
  slaHours:    z.number().int().optional().nullable(),
  isActive:    z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const { id } = await params;

  try {
    const template = await prisma.approvalTemplate.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            assignedUser: { select: { id: true, name: true, image: true } },
            customRole:   { select: { id: true, name: true, color: true } },
          },
          orderBy: { stepOrder: "asc" },
        },
        _count: { select: { documents: true } },
      },
    });
    if (!template) return notFound("Template");
    if (template.organizationId !== session.user.organizationId) return forbidden();
    return ok(template);
  } catch (err) {
    console.error("[TEMPLATE_GET]", err);
    return serverError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.systemRole)) return forbidden();

  const { id } = await params;

  try {
    const template = await prisma.approvalTemplate.findUnique({ where: { id } });
    if (!template) return notFound("Template");
    if (template.organizationId !== session.user.organizationId) return forbidden();

    const body = await req.json();

    // If steps are included, replace them all
    if (body.steps) {
      // Delete existing steps then recreate
      await prisma.workflowStep.deleteMany({ where: { templateId: id } });
      await prisma.workflowStep.createMany({
        data: body.steps.map((s: any) => ({
          templateId:       id,
          stepOrder:        s.stepOrder,
          name:             s.name,
          description:      s.description ?? undefined,
          actionType:       s.actionType ?? "SEQUENTIAL",
          assignedUserId:   s.assignedUserId || undefined,
          useManagerOf:     s.useManagerOf ?? false,
          useDepartmentHead: s.useDepartmentHead ?? false,
          isRequired:       s.isRequired ?? true,
          timeoutHours:     s.timeoutHours ?? undefined,
          canDelegate:      s.canDelegate ?? true,
          requiresComment:  s.requiresComment ?? false,
        })),
      });
    }

    const updated = await prisma.approvalTemplate.update({
      where: { id },
      data: {
        ...(body.name        && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.category    !== undefined && { category: body.category }),
        ...(body.slaHours    !== undefined && { slaHours: body.slaHours }),
        ...(body.isActive    !== undefined && { isActive: body.isActive }),
      },
      include: {
        steps: {
          include: { assignedUser: { select: { id: true, name: true } } },
          orderBy: { stepOrder: "asc" },
        },
        _count: { select: { documents: true } },
      },
    });

    return ok(updated);
  } catch (err) {
    console.error("[TEMPLATE_PATCH]", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.systemRole)) return forbidden();

  const { id } = await params;

  try {
    const template = await prisma.approvalTemplate.findUnique({
      where: { id },
      include: { _count: { select: { documents: true } } },
    });
    if (!template) return notFound("Template");
    if (template.organizationId !== session.user.organizationId) return forbidden();

    // Soft delete — deactivate instead of hard delete if documents use it
    if (template._count.documents > 0) {
      await prisma.approvalTemplate.update({ where: { id }, data: { isActive: false } });
      return ok({ deleted: false, deactivated: true, message: "Template deactivated (documents still reference it)" });
    }

    await prisma.approvalTemplate.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    console.error("[TEMPLATE_DELETE]", err);
    return serverError();
  }
}
