import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, created, forbidden, serverError, unauthorized, validateBody } from "@/lib/utils/api";
import { auth } from "@/auth";

const schema = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1),
  color:       z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  try {
    const roles = await prisma.customRole.findMany({
      where: { organizationId: session.user.organizationId! },
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: "desc" },
    });
    return ok(roles);
  } catch (err) {
    console.error("[ROLES_GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.systemRole)) {
    return forbidden("Only admins can create roles");
  }

  const validation = await validateBody(req, schema);
  if ("error" in validation) return validation.error;
  const body = validation.data;

  try {
    const role = await prisma.customRole.create({
      data: {
        organizationId: session.user.organizationId!,
        name:           body.name,
        description:    body.description,
        permissions:    body.permissions,
        color:          body.color,
      },
    });
    return created(role);
  } catch (err) {
    console.error("[ROLES_POST]", err);
    return serverError();
  }
}
