import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  sendDocumentApprovedEmail,
  sendDocumentRejectedEmail,
  sendRevisionRequestedEmail,
  sendApprovalNeededEmail,
} from "@/lib/resend";

const schema = z.object({
  action:    z.enum(["APPROVED", "REJECTED", "REVISION_REQUESTED"]),
  comment:   z.string().optional(),
  signature: z.string().optional(), // base64 PNG
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = schema.parse(await req.json());

  // Find the active step for this approver
  const step = await db.approvalStep.findFirst({
    where: { documentId: id, approverId: session.user.id, status: "PENDING" },
    include: { document: { include: { owner: true, approvalSteps: { include: { approver: true }, orderBy: { order: "asc" } } } } },
  });

  if (!step) return NextResponse.json({ error: "No pending step for you on this document" }, { status: 403 });

  if (body.action === "APPROVED" && !body.signature) {
    return NextResponse.json({ error: "Signature required to approve" }, { status: 400 });
  }

  // Save signature if provided
  let signatureId: string | null = null;
  if (body.signature) {
    const sig = await db.signature.create({
      data: { userId: session.user.id, imageData: body.signature },
    });
    signatureId = sig.id;
  }

  // Update the step
  await db.approvalStep.update({
    where: { id: step.id },
    data: {
      status:      body.action,
      comment:     body.comment,
      signatureId: signatureId,
      actedAt:     new Date(),
    },
  });

  const doc = step.document;
  const owner = doc.owner;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const docUrl = `${appUrl}/en/documents/${doc.id}`;

  if (body.action === "APPROVED") {
    // Check if there's a next step
    const nextStep = doc.approvalSteps.find((s) => s.order === step.order + 1);

    if (nextStep) {
      // Advance to next step
      await db.document.update({ where: { id: doc.id }, data: { status: "IN_REVIEW" } });
      await db.notification.create({
        data: {
          userId: nextStep.approverId,
          title: "Document awaiting your approval",
          message: `"${doc.title}" needs your review.`,
          type: "APPROVAL_NEEDED",
          link: `/documents/${doc.id}`,
        },
      });
      try {
        await sendApprovalNeededEmail({
          to: nextStep.approver.email,
          approverName: nextStep.approver.name,
          documentTitle: doc.title,
          ownerName: owner.name,
          documentUrl: docUrl,
        });
      } catch (_) {}
    } else {
      // All steps done → APPROVED
      await db.document.update({ where: { id: doc.id }, data: { status: "APPROVED" } });
      await db.notification.create({
        data: {
          userId: owner.id,
          title: "Document approved! 🎉",
          message: `"${doc.title}" has been fully approved.`,
          type: "DOCUMENT_APPROVED",
          link: `/documents/${doc.id}`,
        },
      });
      try {
        await sendDocumentApprovedEmail({
          to: owner.email,
          ownerName: owner.name,
          documentTitle: doc.title,
          approverName: session.user.name,
          documentUrl: docUrl,
        });
      } catch (_) {}
    }
  } else if (body.action === "REJECTED") {
    await db.document.update({ where: { id: doc.id }, data: { status: "REJECTED", rejectedNote: body.comment } });
    await db.notification.create({
      data: {
        userId: owner.id,
        title: "Document rejected",
        message: `"${doc.title}" was rejected.`,
        type: "DOCUMENT_REJECTED",
        link: `/documents/${doc.id}`,
      },
    });
    try {
      await sendDocumentRejectedEmail({
        to: owner.email,
        ownerName: owner.name,
        documentTitle: doc.title,
        approverName: session.user.name,
        comment: body.comment ?? "",
        documentUrl: docUrl,
      });
    } catch (_) {}
  } else if (body.action === "REVISION_REQUESTED") {
    await db.document.update({ where: { id: doc.id }, data: { status: "REVISION_REQUESTED" } });
    await db.notification.create({
      data: {
        userId: owner.id,
        title: "Revision requested",
        message: `"${doc.title}" needs revision.`,
        type: "REVISION_REQUESTED",
        link: `/documents/${doc.id}`,
      },
    });
    try {
      await sendRevisionRequestedEmail({
        to: owner.email,
        ownerName: owner.name,
        documentTitle: doc.title,
        approverName: session.user.name,
        comment: body.comment ?? "",
        documentUrl: docUrl,
      });
    } catch (_) {}
  }

  return NextResponse.json({ success: true });
}
