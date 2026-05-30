import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const deptSchema = z.object({
  action: z.enum(["add_dept", "update_member_role"]),
  name:   z.string().optional(),
  userId: z.string().optional(),
  role:   z.enum(["ADMIN", "APPROVER", "OWNER", "VIEWER"]).optional(),
  deptId: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

  const org = await db.organization.findUnique({
    where: { id: session.user.orgId },
    include: {
      members: { select: { id: true, name: true, email: true, role: true, deptId: true, createdAt: true } },
      departments: true,
    },
  });

  return NextResponse.json(org);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.orgId) return NextResponse.json({ error: "No org" }, { status: 400 });
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = deptSchema.parse(await req.json());

  if (body.action === "add_dept" && body.name) {
    const dept = await db.department.create({
      data: { name: body.name, orgId: session.user.orgId },
    });
    return NextResponse.json(dept);
  }

  if (body.action === "update_member_role" && body.userId && body.role) {
    const user = await db.user.update({
      where: { id: body.userId },
      data: { role: body.role, ...(body.deptId ? { deptId: body.deptId } : {}) },
    });
    return NextResponse.json(user);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
