import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, created, serverError, unauthorized, forbidden, validateBody } from "@/lib/utils/api";
import { auth } from "@/auth";

const createSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().optional(),
  parentId:    z.string().optional(),
  headUserId:  z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  try {
    const departments = await prisma.department.findMany({
      where: { organizationId: session.user.organizationId! },
      include: {
        parent: { select: { id: true, name: true } },
        _count:  { select: { users: true } },
      },
      orderBy: { name: "asc" },
    });
    return ok(departments);
  } catch (err) {
    console.error("[DEPARTMENTS_GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.systemRole)) {
    return forbidden("Only admins can create departments");
  }

  const validation = await validateBody(req, createSchema);
  if ("error" in validation) return validation.error;
  const body = validation.data;

  try {
    const dept = await prisma.department.create({
      data: {
        name:           body.name,
        description:    body.description,
        organizationId: session.user.organizationId!,
        parentId:       body.parentId || undefined,
        headUserId:     body.headUserId || undefined,
      },
    });
    return created(dept);
  } catch (err) {
    console.error("[DEPARTMENTS_POST]", err);
    return serverError();
  }
}
