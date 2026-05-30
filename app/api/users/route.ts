import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name:    z.string().min(2),
  email:   z.string().email(),
  password:z.string().min(6),
  orgName: z.string().min(2).optional(),
  joinOrg: z.string().optional(), // org slug to join
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

    const hashed = await bcrypt.hash(data.password, 12);

    let orgId: string | null = null;
    let role: "ADMIN" | "VIEWER" = "VIEWER";

    if (data.orgName) {
      // Create new org
      const slug = slugify(data.orgName);
      const slugExists = await db.organization.findUnique({ where: { slug } });
      const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

      // Create user first (admin)
      const user = await db.user.create({
        data: { name: data.name, email: data.email, password: hashed, role: "ADMIN" },
      });
      const org = await db.organization.create({
        data: { name: data.orgName, slug: finalSlug, adminId: user.id },
      });
      await db.user.update({ where: { id: user.id }, data: { orgId: org.id } });

      return NextResponse.json({ success: true });
    }

    if (data.joinOrg) {
      const org = await db.organization.findUnique({ where: { slug: data.joinOrg } });
      if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      orgId = org.id;
    }

    await db.user.create({
      data: { name: data.name, email: data.email, password: hashed, role, orgId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Registration failed" }, { status: 500 });
  }
}
