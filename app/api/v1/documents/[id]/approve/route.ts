import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, error, notFound, serverError, unauthorized, validateBody, getClientInfo } from "@/lib/utils/api";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { processAction } from "@/lib/workflow/engine";

const schema = z.object({ comment: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { id } = await params;
  const validation = await validateBody(req, schema);
  if ("error" in validation) return validation.error;
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return notFound("Document");

    const result = await processAction(
      { documentId: id, actorId: session.user.id, ipAddress, userAgent },
      "APPROVED",
      validation.data.comment
    );
    return ok(result);
  } catch (err: any) {
    console.error("[DOCUMENT_APPROVE]", err);
    if (err.message) return error(err.message, 400);
    return serverError();
  }
}
