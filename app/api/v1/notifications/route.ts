import { NextRequest } from "next/server";
import { ok, serverError, unauthorized } from "@/lib/utils/api";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: session.user.id,
        ...(unreadOnly && { isRead: false }),
      },
      include: {
        document: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { recipientId: session.user.id, isRead: false },
    });

    return ok({ notifications, unreadCount });
  } catch (err) {
    console.error("[NOTIFICATIONS_GET]", err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  // Mark all as read
  try {
    await prisma.notification.updateMany({
      where: { recipientId: session.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return ok({ success: true });
  } catch (err) {
    console.error("[NOTIFICATIONS_PATCH]", err);
    return serverError();
  }
}
