import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, notFound, forbidden, serverError, unauthorized, validateBody } from "@/lib/utils/api";
import { auth } from "@/auth";

const schema = z.object({
  name:        z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  color:       z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.systemRole)) return forbidden();

  const { id } = await params;
  const validation = await validateBody(req, schema);
  if ("error" in validation) return validation.error;
  const body = validation.data;

  try {
    const role = await prisma.customRole.findUnique({ where: { id } });
    if (!role) return notFound("Role");
    if (role.organizationId !== session.user.organizationId) return forbidden();

    const updated = await prisma.customRole.update({
      where: { id },
      data: {
        ...(body.name        !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.permissions !== undefined && { permissions: body.permissions }),
        ...(body.color       !== undefined && { color: body.color }),
      },
    });
    return ok(updated);
  } catch (err) {
    console.error("[ROLE_PATCH]", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.systemRole)) return forbidden();

  const { id } = await params;

  try {
    const role = await prisma.customRole.findUnique({ where: { id } });
    if (!role) return notFound("Role");
    if (role.organizationId !== session.user.organizationId) return forbidden();
    if (role.isSystem) return forbidden("System roles cannot be deleted");

    await prisma.customRole.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    console.error("[ROLE_DELETE]", err);
    return serverError();
  }
}
