import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, notFound, forbidden, serverError, unauthorized, validateBody } from "@/lib/utils/api";
import { auth } from "@/auth";

const updateSchema = z.object({
  name:         z.string().min(2).optional(),
  systemRole:   z.enum(["SUPER_ADMIN","ADMIN","MANAGER","APPROVER","REVIEWER","SUBMITTER"]).optional(),
  jobTitle:     z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  managerId:    z.string().optional().nullable(),
  isActive:     z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const { id } = await params;

  if (id !== session.user.id && !["SUPER_ADMIN","ADMIN"].includes(session.user.systemRole)) {
    return forbidden();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, image: true,
        systemRole: true, jobTitle: true, isActive: true, lastLoginAt: true,
        department: { select: { id: true, name: true } },
        manager:    { select: { id: true, name: true } },
        customRoleUsers: {
          include: { customRole: { select: { id: true, name: true, color: true, permissions: true } } },
        },
      },
    });
    if (!user) return notFound("User");
    return ok(user);
  } catch (err) {
    console.error("[USER_GET]", err);
    return serverError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const { id } = await params;

  const isSelf  = id === session.user.id;
  const isAdmin = ["SUPER_ADMIN","ADMIN"].includes(session.user.systemRole);
  if (!isSelf && !isAdmin) return forbidden();

  const validation = await validateBody(req, updateSchema);
  if ("error" in validation) return validation.error;
  const body = validation.data;

  // Non-admins cannot escalate roles or change active status
  if (!isAdmin) {
    delete (body as any).systemRole;
    delete (body as any).isActive;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound("User");

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name         !== undefined && { name: body.name }),
        ...(body.systemRole   !== undefined && { systemRole: body.systemRole }),
        ...(body.jobTitle     !== undefined && { jobTitle: body.jobTitle }),
        ...(body.departmentId !== undefined && { departmentId: body.departmentId || null }),
        ...(body.managerId    !== undefined && { managerId: body.managerId || null }),
        ...(body.isActive     !== undefined && { isActive: body.isActive }),
      },
      select: {
        id: true, name: true, email: true, systemRole: true,
        jobTitle: true, isActive: true,
        department: { select: { id: true, name: true } },
      },
    });

    return ok(updated);
  } catch (err) {
    console.error("[USER_PATCH]", err);
    return serverError();
  }
}
