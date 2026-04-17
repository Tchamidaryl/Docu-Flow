import prisma from "@/lib/prisma";
import { AuditAction, DocumentStatus, NotificationType } from "@prisma/client";
import { sendNotificationEmail } from "@/lib/email/sender"; // ✅ now exists

export interface WorkflowStepSnapshot {
  stepOrder: number;
  name: string;
  description?: string | null;
  actionType: string;
  assignedUserId?: string | null;
  customRoleId?: string | null;
  useManagerOf: boolean;
  useDepartmentHead: boolean;
  isRequired: boolean;
  timeoutHours?: number | null;
  canDelegate: boolean;
  requiresComment: boolean;
  resolvedAssigneeId?: string | null;
  resolvedAssigneeName?: string | null;
  completedAt?: string | null;
  completedById?: string | null;
  completedByName?: string | null;
  status?: "pending" | "approved" | "rejected" | "revision_requested" | "skipped";
}

interface WorkflowContext {
  documentId: string;
  actorId: string;
  ipAddress?: string;
  userAgent?: string;
}

// ─── Resolve assignee for a workflow step ────────────────────────────────────

export async function resolveStepAssignee(
  step: any,
  submitterId: string
): Promise<string | null> {
  if (step.assignedUserId) return step.assignedUserId;

  if (step.useManagerOf) {
    const submitter = await prisma.user.findUnique({
      where: { id: submitterId },
      select: { managerId: true },
    });
    return submitter?.managerId ?? null;
  }

  if (step.useDepartmentHead) {
    const submitter = await prisma.user.findUnique({
      where: { id: submitterId },
      include: { department: { select: { headUserId: true } } },
    });
    return submitter?.department?.headUserId ?? null;
  }

  if (step.customRoleId) {
    const roleUser = await prisma.customRoleUser.findFirst({
      where: { customRoleId: step.customRoleId },
      include: { user: { select: { id: true, isActive: true } } },
    });
    return roleUser?.user?.isActive ? roleUser.user.id : null;
  }

  return null;
}

// ─── Submit document for approval ────────────────────────────────────────────

export async function submitDocument(ctx: WorkflowContext) {
  const doc = await prisma.document.findUnique({
    where: { id: ctx.documentId },
    include: {
      template: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
      submittedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!doc) throw new Error("Document not found");
  if (doc.status !== "DRAFT" && doc.status !== "REVISION_REQUESTED") {
    throw new Error(`Cannot submit a document with status: ${doc.status}`);
  }
  if (!doc.template) throw new Error("Document has no approval template assigned");

  // Save version snapshot before submission
  await prisma.documentVersion.create({
    data: {
      documentId:  doc.id,
      version:     doc.version,
      title:       doc.title,
      content:     doc.content,
      contentJson: doc.contentJson ?? undefined,
      snapshot:    doc as any,
      createdById: ctx.actorId,
    },
  });

  // Build workflow snapshot with resolved assignees
  const steps = doc.template.steps;
  const snapshot: WorkflowStepSnapshot[] = await Promise.all(
    steps.map(async (step) => {
      const assigneeId = await resolveStepAssignee(step, doc.submittedById);
      let assigneeName: string | null = null;
      if (assigneeId) {
        const user = await prisma.user.findUnique({
          where: { id: assigneeId },
          select: { name: true },
        });
        assigneeName = user?.name ?? null;
      }
      return {
        stepOrder:            step.stepOrder,
        name:                 step.name,
        description:          step.description,
        actionType:           step.actionType,
        assignedUserId:       step.assignedUserId,
        customRoleId:         step.customRoleId,
        useManagerOf:         step.useManagerOf,
        useDepartmentHead:    step.useDepartmentHead,
        isRequired:           step.isRequired,
        timeoutHours:         step.timeoutHours,
        canDelegate:          step.canDelegate,
        requiresComment:      step.requiresComment,
        resolvedAssigneeId:   assigneeId,
        resolvedAssigneeName: assigneeName,
        status:               "pending" as const,
      };
    })
  );

  const updatedDoc = await prisma.document.update({
    where: { id: doc.id },
    data: {
      status:           "PENDING_APPROVAL",
      currentStepIndex: 0,
      workflowSnapshot: snapshot as any,
      submittedAt:      new Date(),
      version:          { increment: 1 },
    },
  });

  await createAuditLog(ctx, "SUBMITTED");

  const firstStep = snapshot[0];
  if (firstStep?.resolvedAssigneeId) {
    await createNotification({
      recipientId: firstStep.resolvedAssigneeId,
      documentId:  doc.id,
      type:        "APPROVAL_REQUEST",
      title:       "New document awaiting your approval",
      message:     `"${doc.title}" submitted by ${doc.submittedBy.name} requires your approval`,
    });

    // Send email (non-blocking)
    const approverUser = await prisma.user.findUnique({
      where: { id: firstStep.resolvedAssigneeId },
      select: { email: true },
    });
    if (approverUser?.email) {
      sendNotificationEmail(approverUser.email, "APPROVAL_REQUEST", {
        documentTitle: doc.title,
        actorName:     doc.submittedBy.name,
      });
    }
  }

  return updatedDoc;
}

// ─── Process approval action ──────────────────────────────────────────────────

export async function processAction(
  ctx: WorkflowContext,
  action: "APPROVED" | "REJECTED" | "REVISION_REQUESTED",
  comment?: string
) {
  const doc = await prisma.document.findUnique({
    where: { id: ctx.documentId },
    include: {
      submittedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!doc) throw new Error("Document not found");
  if (doc.status !== "PENDING_APPROVAL" && doc.status !== "IN_REVIEW") {
    throw new Error(`Cannot act on document with status: ${doc.status}`);
  }

  const snapshot = (doc.workflowSnapshot as WorkflowStepSnapshot[]) ?? [];
  const currentStep = snapshot[doc.currentStepIndex];
  if (!currentStep) throw new Error("No current workflow step found");

  const isAssigned =
    currentStep.resolvedAssigneeId === ctx.actorId ||
    (await checkDelegation(ctx.actorId, currentStep.resolvedAssigneeId, doc.id));

  if (!isAssigned) throw new Error("You are not authorized to act on this step");

  if (currentStep.requiresComment && !comment?.trim()) {
    throw new Error("A comment is required for this approval step");
  }

  snapshot[doc.currentStepIndex] = {
    ...currentStep,
    status:         action === "APPROVED" ? "approved" : action === "REJECTED" ? "rejected" : "revision_requested",
    completedAt:    new Date().toISOString(),
    completedById:  ctx.actorId,
  };

  await prisma.approvalAction.create({
    data: {
      documentId:   doc.id,
      stepIndex:    doc.currentStepIndex,
      actorId:      ctx.actorId,
      action:       action as AuditAction,
      comment,
      ipAddress:    ctx.ipAddress,
      userAgent:    ctx.userAgent,
    },
  });

  await createAuditLog(ctx, action as AuditAction, { comment, stepIndex: doc.currentStepIndex });

  let newStatus: DocumentStatus;
  let nextStepIndex = doc.currentStepIndex;

  if (action === "APPROVED") {
    const nextIdx = doc.currentStepIndex + 1;

    if (nextIdx >= snapshot.length) {
      newStatus = "APPROVED";
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status:           newStatus,
          currentStepIndex: nextIdx,
          workflowSnapshot: snapshot as any,
          completedAt:      new Date(),
        },
      });

      await createNotification({
        recipientId: doc.submittedById,
        documentId:  doc.id,
        type:        "APPROVED",
        title:       "Your document has been approved! 🎉",
        message:     `"${doc.title}" has been fully approved.`,
      });

      sendNotificationEmail(doc.submittedBy.email, "APPROVED", {
        documentTitle: doc.title,
      });
    } else {
      newStatus     = "IN_REVIEW";
      nextStepIndex = nextIdx;
      const nextStep = snapshot[nextIdx];

      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status:           newStatus,
          currentStepIndex: nextIdx,
          workflowSnapshot: snapshot as any,
        },
      });

      if (nextStep.resolvedAssigneeId) {
        await createNotification({
          recipientId: nextStep.resolvedAssigneeId,
          documentId:  doc.id,
          type:        "APPROVAL_REQUEST",
          title:       "Document awaiting your approval",
          message:     `"${doc.title}" requires your approval at step: ${nextStep.name}`,
        });

        const nextApprover = await prisma.user.findUnique({
          where:  { id: nextStep.resolvedAssigneeId },
          select: { email: true },
        });
        if (nextApprover?.email) {
          sendNotificationEmail(nextApprover.email, "APPROVAL_REQUEST", {
            documentTitle: doc.title,
          });
        }
      }
    }
  } else if (action === "REJECTED") {
    newStatus = "REJECTED";
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        status:           newStatus,
        workflowSnapshot: snapshot as any,
        completedAt:      new Date(),
      },
    });

    await createNotification({
      recipientId: doc.submittedById,
      documentId:  doc.id,
      type:        "REJECTED",
      title:       "Your document has been rejected",
      message:     `"${doc.title}" was rejected${comment ? `: "${comment}"` : ""}`,
    });

    sendNotificationEmail(doc.submittedBy.email, "REJECTED", {
      documentTitle: doc.title,
      comment,
    });
  } else {
    // REVISION_REQUESTED
    newStatus = "REVISION_REQUESTED";
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        status:           newStatus,
        workflowSnapshot: snapshot as any,
      },
    });

    await createNotification({
      recipientId: doc.submittedById,
      documentId:  doc.id,
      type:        "REVISION_REQUESTED",
      title:       "Revision requested for your document",
      message:     `"${doc.title}" requires revision${comment ? `: "${comment}"` : ""}`,
    });

    sendNotificationEmail(doc.submittedBy.email, "REVISION_REQUESTED", {
      documentTitle: doc.title,
      comment,
    });
  }

  return { success: true, status: newStatus, nextStepIndex };
}

// ─── Delegate approval ────────────────────────────────────────────────────────

export async function delegateApproval(
  fromUserId: string,
  toUserId: string,
  documentId: string,
  reason?: string
) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error("Document not found");

  const snapshot    = (doc.workflowSnapshot as WorkflowStepSnapshot[]) ?? [];
  const currentStep = snapshot[doc.currentStepIndex];

  if (currentStep.resolvedAssigneeId !== fromUserId) {
    throw new Error("You are not the current approver");
  }

  snapshot[doc.currentStepIndex] = {
    ...currentStep,
    resolvedAssigneeId: toUserId,
  };

  await prisma.document.update({
    where: { id: documentId },
    data:  { workflowSnapshot: snapshot as any },
  });

  await prisma.delegation.create({
    data: {
      fromUserId,
      toUserId,
      documentId,
      reason,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await createAuditLog(
    { documentId, actorId: fromUserId },
    "DELEGATED",
    { toUserId, reason }
  );

  await createNotification({
    recipientId: toUserId,
    documentId,
    type:        "DELEGATED",
    title:       "Approval delegated to you",
    message:     `An approval for "${doc.title}" has been delegated to you`,
  });
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function checkDelegation(
  actorId: string,
  originalAssigneeId: string | null | undefined,
  documentId: string
): Promise<boolean> {
  if (!originalAssigneeId) return false;
  const delegation = await prisma.delegation.findFirst({
    where: {
      fromUserId: originalAssigneeId,
      toUserId:   actorId,
      OR:         [{ documentId }, { documentId: null }],
      isActive:   true,
      expiresAt:  { gt: new Date() },
    },
  });
  return !!delegation;
}

async function createAuditLog(
  ctx: { documentId: string; actorId: string; ipAddress?: string; userAgent?: string },
  action: AuditAction,
  details?: Record<string, any>
) {
  return prisma.auditLog.create({
    data: {
      documentId: ctx.documentId,
      actorId:    ctx.actorId,
      action,
      details:    details ?? undefined,
      ipAddress:  ctx.ipAddress,
      userAgent:  ctx.userAgent,
    },
  });
}

async function createNotification(data: {
  recipientId: string;
  documentId:  string;
  type:        NotificationType;
  title:       string;
  message:     string;
}) {
  return prisma.notification.create({ data });
}
