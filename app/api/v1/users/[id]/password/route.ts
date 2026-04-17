import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { ok, error, notFound, forbidden, serverError, unauthorized, validateBody } from "@/lib/utils/api";
import { auth } from "@/auth";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword:     z.string().min(8, "New password must be at least 8 characters"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const { id } = await params;

  if (id !== session.user.id) return forbidden("You can only change your own password");

  const validation = await validateBody(req, schema);
  if ("error" in validation) return validation.error;
  const body = validation.data;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.passwordHash) return notFound("User");

    const isValid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!isValid) return error("Current password is incorrect", 400);

    const newHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({ where: { id }, data: { passwordHash: newHash } });

    return ok({ success: true });
  } catch (err) {
    console.error("[PASSWORD_CHANGE]", err);
    return serverError();
  }
}
