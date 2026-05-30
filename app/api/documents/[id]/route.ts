import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await db.document.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true } },
      approvalSteps: {
        include: {
          approver: { select: { id: true, name: true, email: true } },
          signature: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.ownerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await db.document.update({
    where: { id },
    data: {
      title:   body.title   ?? doc.title,
      content: body.content ?? doc.content,
      status:  body.submit  ? "PENDING" : doc.status,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.document.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
