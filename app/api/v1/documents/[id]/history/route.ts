import { NextRequest } from "next/server";
import { ok, notFound, serverError, unauthorized, forbidden } from "@/lib/utils/api";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { id } = await params;

  try {
    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, submittedById: true, workflowSnapshot: true },
    });
    if (!doc) return notFound("Document");

    const userId = session.user.id;
    const role = session.user.systemRole;
    const snapshot = (doc.workflowSnapshot as any[]) ?? [];
    const canView =
      doc.submittedById === userId ||
      ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role) ||
      snapshot.some((s: any) => s.resolvedAssigneeId === userId);
    if (!canView) return forbidden();

    const [auditLogs, approvalActions, versions] = await Promise.all([
      prisma.auditLog.findMany({
        where: { documentId: id },
        include: { actor: { select: { id: true, name: true, image: true, jobTitle: true } } },
        orderBy: { timestamp: "asc" },
      }),
      prisma.approvalAction.findMany({
        where: { documentId: id },
        include: { actor: { select: { id: true, name: true, image: true, jobTitle: true } } },
        orderBy: { timestamp: "asc" },
      }),
      prisma.documentVersion.findMany({
        where: { documentId: id },
        orderBy: { version: "asc" },
      }),
    ]);

    return ok({ auditLogs, approvalActions, versions });
  } catch (err) {
    console.error("[DOCUMENT_HISTORY]", err);
    return serverError();
  }
}
