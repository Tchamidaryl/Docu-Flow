import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { ok, created, serverError, unauthorized, forbidden, validateBody, parsePagination, paginatedResponse } from "@/lib/utils/api";
import { auth } from "@/auth";

const createSchema = z.object({
  name:         z.string().min(2).max(100),
  email:        z.string().email(),
  password:     z.string().min(8),
  systemRole:   z.enum(["SUPER_ADMIN","ADMIN","MANAGER","APPROVER","REVIEWER","SUBMITTER"]).default("SUBMITTER"),
  jobTitle:     z.string().optional(),
  departmentId: z.string().optional(),
  managerId:    z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const { skip, limit, page } = parsePagination(searchParams);
  const search     = searchParams.get("search");
  const role       = searchParams.get("role");
  const departmentId = searchParams.get("departmentId");

  try {
    const where: any = {
      organizationId: session.user.organizationId!,
      ...(search && {
        OR: [
          { name:  { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(role && { systemRole: role }),
      ...(departmentId && { departmentId }),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true, name: true, email: true, image: true,
          systemRole: true, jobTitle: true, isActive: true, lastLoginAt: true,
          department: { select: { id: true, name: true } },
          manager:    { select: { id: true, name: true } },
          customRoleUsers: {
            include: { customRole: { select: { id: true, name: true, color: true } } },
          },
          _count: { select: { submittedDocuments: true } },
        },
      }),
    ]);

    return paginatedResponse(users, total, page, limit);
  } catch (err) {
    console.error("[USERS_GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.systemRole)) {
    return forbidden("Only admins can create users");
  }

  const validation = await validateBody(req, createSchema);
  if ("error" in validation) return validation.error;
  const body = validation.data;

  try {
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) {
      return ok({ error: "A user with this email already exists" }, 409 as any);
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        name:           body.name,
        email:          body.email,
        passwordHash,
        systemRole:     body.systemRole,
        jobTitle:       body.jobTitle,
        organizationId: session.user.organizationId!,
        departmentId:   body.departmentId || undefined,
        managerId:      body.managerId || undefined,
        isActive:       true,
        emailVerified:  new Date(),
      },
      select: {
        id: true, name: true, email: true, systemRole: true,
        jobTitle: true, createdAt: true,
      },
    });

    return created(user);
  } catch (err) {
    console.error("[USERS_POST]", err);
    return serverError();
  }
}
