import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, created, serverError, unauthorized, forbidden, validateBody } from "@/lib/utils/api";
import { auth } from "@/auth";

const workflowStepSchema = z.object({
  stepOrder:       z.number().int().min(1),
  name:            z.string().min(1).max(100),
  description:     z.string().optional(),
  actionType:      z.enum(["SEQUENTIAL", "PARALLEL", "ANY_OF"]).default("SEQUENTIAL"),
  assignedUserId:  z.string().optional().nullable(),
  customRoleId:    z.string().optional().nullable(),
  useManagerOf:    z.boolean().default(false),
  useDepartmentHead: z.boolean().default(false),
  isRequired:      z.boolean().default(true),
  timeoutHours:    z.number().int().optional().nullable(),
  canDelegate:     z.boolean().default(true),
  requiresComment: z.boolean().default(false),
});

const createSchema = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().optional(),
  category:    z.string().optional(),
  slaHours:    z.number().int().optional(),
  steps:       z.array(workflowStepSchema).min(1),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  try {
    const templates = await prisma.approvalTemplate.findMany({
      where: {
        organizationId: session.user.organizationId!,
        isActive: true,
      },
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
      orderBy: { createdAt: "desc" },
    });
    return ok(templates);
  } catch (err) {
    console.error("[TEMPLATES_GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.systemRole)) {
    return forbidden("Only managers and admins can create templates");
  }

  const validation = await validateBody(req, createSchema);
  if ("error" in validation) return validation.error;
  const body = validation.data;

  try {
    const template = await prisma.approvalTemplate.create({
      data: {
        organizationId: session.user.organizationId!,
        name:           body.name,
        description:    body.description,
        category:       body.category,
        slaHours:       body.slaHours,
        createdById:    session.user.id,
        steps: {
          create: body.steps.map((step) => ({
            stepOrder:        step.stepOrder,
            name:             step.name,
            description:      step.description,
            actionType:       step.actionType,
            assignedUserId:   step.assignedUserId ?? undefined,
            customRoleId:     step.customRoleId ?? undefined,
            useManagerOf:     step.useManagerOf,
            useDepartmentHead: step.useDepartmentHead,
            isRequired:       step.isRequired,
            timeoutHours:     step.timeoutHours ?? undefined,
            canDelegate:      step.canDelegate,
            requiresComment:  step.requiresComment,
          })),
        },
      },
      include: {
        steps: {
          include: {
            assignedUser: { select: { id: true, name: true, image: true } },
            customRole:   { select: { id: true, name: true, color: true } },
          },
          orderBy: { stepOrder: "asc" },
        },
      },
    });
    return created(template);
  } catch (err) {
    console.error("[TEMPLATES_POST]", err);
    return serverError();
  }
}
