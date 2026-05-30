import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, notFound, forbidden, serverError, unauthorized, validateBody } from "@/lib/utils/api";
import { auth } from "@/auth";

const updateSchema = z.object({
  name:    z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  try {
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId! },
      include: {
        _count: {
          select: { users: true, departments: true, documents: true },
        },
      },
    });

    if (!org) return notFound("Organization");
    return ok(org);
  } catch (err) {
    console.error("[ORG_GET]", err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.systemRole)) {
    return forbidden("Only admins can update organization settings");
  }

  const validation = await validateBody(req, updateSchema);
  if ("error" in validation) return validation.error;
  const body = validation.data;

  try {
    const updated = await prisma.organization.update({
      where: { id: session.user.organizationId! },
      data: {
        ...(body.name    !== undefined && { name: body.name }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
      },
    });
    return ok(updated);
  } catch (err) {
    console.error("[ORG_PATCH]", err);
    return serverError();
  }
}
