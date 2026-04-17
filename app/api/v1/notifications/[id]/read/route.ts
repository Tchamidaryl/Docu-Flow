import { NextRequest } from "next/server";
import { ok, serverError, unauthorized, notFound } from "@/lib/utils/api";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const { id } = await params;

  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return notFound("Notification");
    if (notification.recipientId !== session.user.id) return unauthorized();

    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return ok({ success: true });
  } catch (err) {
    console.error("[NOTIFICATION_READ]", err);
    return serverError();
  }
}
