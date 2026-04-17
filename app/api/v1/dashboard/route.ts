import { NextRequest } from "next/server";
import { ok, serverError, unauthorized } from "@/lib/utils/api";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const userId = session.user.id;
  const orgId = session.user.organizationId!;
  const role = session.user.systemRole;
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role);

  try {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sevenDaysAgo = subDays(new Date(), 7);

    const [
      myDocuments,
      pendingMyAction,
      recentActivity,
      statusBreakdown,
      priorityBreakdown,
      approvalTrend,
      unreadNotifications,
    ] = await Promise.all([
      // My documents counts
      prisma.document.groupBy({
        by: ["status"],
        where: isAdmin
          ? { organizationId: orgId }
          : { submittedById: userId },
        _count: true,
      }),

      // Pending my action
      prisma.document.findMany({
        where: {
          organizationId: orgId,
          status: { in: ["PENDING_APPROVAL", "IN_REVIEW"] },
        },
        select: { id: true, workflowSnapshot: true, currentStepIndex: true },
      }),

      // Recent activity - last 10 audit logs
      prisma.auditLog.findMany({
        where: isAdmin
          ? { document: { organizationId: orgId } }
          : { actorId: userId },
        take: 10,
        orderBy: { timestamp: "desc" },
        include: {
          actor: { select: { id: true, name: true, image: true } },
          document: { select: { id: true, title: true, status: true } },
        },
      }),

      // Status breakdown for chart
      prisma.document.groupBy({
        by: ["status"],
        where: isAdmin
          ? { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } }
          : { submittedById: userId, createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),

      // Priority breakdown
      prisma.document.groupBy({
        by: ["priority"],
        where: isAdmin
          ? { organizationId: orgId, status: { in: ["PENDING_APPROVAL", "IN_REVIEW"] } }
          : { submittedById: userId, status: { in: ["PENDING_APPROVAL", "IN_REVIEW"] } },
        _count: true,
      }),

      // 7-day approval trend
      Promise.all(
        Array.from({ length: 7 }, (_, i) => {
          const day = startOfDay(subDays(new Date(), 6 - i));
          const nextDay = startOfDay(subDays(new Date(), 5 - i));
          return prisma.auditLog.count({
            where: {
              action: "APPROVED",
              timestamp: { gte: day, lt: nextDay },
              ...(isAdmin ? { document: { organizationId: orgId } } : { actorId: userId }),
            },
          }).then((count) => ({ date: day.toISOString().split("T")[0], count }));
        })
      ),

      // Unread notifications
      prisma.notification.count({
        where: { recipientId: userId, isRead: false },
      }),
    ]);

    // Filter pending my action from the JSON field
    const pendingCount = pendingMyAction.filter((doc) => {
      const snapshot = (doc.workflowSnapshot as any[]) ?? [];
      return snapshot[doc.currentStepIndex]?.resolvedAssigneeId === userId;
    }).length;

    // Build stats object
    const statsByStatus: Record<string, number> = {};
    for (const g of myDocuments) {
      statsByStatus[g.status] = g._count;
    }

    return ok({
      overview: {
        totalDocuments: Object.values(statsByStatus).reduce((a, b) => a + b, 0),
        drafts: statsByStatus["DRAFT"] ?? 0,
        pendingApproval: (statsByStatus["PENDING_APPROVAL"] ?? 0) + (statsByStatus["IN_REVIEW"] ?? 0),
        approved: statsByStatus["APPROVED"] ?? 0,
        rejected: statsByStatus["REJECTED"] ?? 0,
        revisionRequested: statsByStatus["REVISION_REQUESTED"] ?? 0,
        pendingMyAction: pendingCount,
        unreadNotifications,
      },
      charts: {
        statusBreakdown: statusBreakdown.map((g) => ({
          status: g.status,
          count: g._count,
        })),
        priorityBreakdown: priorityBreakdown.map((g) => ({
          priority: g.priority,
          count: g._count,
        })),
        approvalTrend,
      },
      recentActivity,
    });
  } catch (err) {
    console.error("[DASHBOARD_STATS]", err);
    return serverError();
  }
}
