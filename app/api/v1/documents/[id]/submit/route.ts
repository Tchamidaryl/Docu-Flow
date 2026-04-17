import { NextRequest } from "next/server";
import { ok, error, notFound, forbidden, serverError, unauthorized, getClientInfo } from "@/lib/utils/api";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { submitDocument } from "@/lib/workflow/engine";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { id } = await params;
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) return notFound("Document");
    if (document.submittedById !== session.user.id && !["SUPER_ADMIN", "ADMIN"].includes(session.user.systemRole)) {
      return forbidden();
    }
    if (!["DRAFT", "REVISION_REQUESTED"].includes(document.status)) {
      return error(`Document is already in status: ${document.status}`);
    }
    if (!document.templateId) {
      return error("A document must have an approval template before submission");
    }

    const updated = await submitDocument({
      documentId: id,
      actorId: session.user.id,
      ipAddress,
      userAgent,
    });

    return ok(updated);
  } catch (err: any) {
    console.error("[DOCUMENT_SUBMIT]", err);
    if (err.message) return error(err.message);
    return serverError();
  }
}
