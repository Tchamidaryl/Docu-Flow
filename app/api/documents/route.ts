import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendApprovalNeededEmail } from "@/lib/resend";

const createSchema = z.object({
  title:      z.string().min(1),
  content:    z.string().optional(),
  fileUrl:    z.string().optional(),
  fileType:   z.string().optional(),
  fileName:   z.string().optional(),
  deptId:     z.string().optional(),
  approverIds:z.array(z.string()).min(1),
  submit:     z.boolean().default(false),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  const docs = await db.document.findMany({
    where: {
      orgId: session.user.orgId ?? "__none__",
      ...(status ? { status: status as any } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      approvalSteps: { select: { status: true, order: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(docs);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const doc = await db.document.create({
      data: {
        title:   data.title,
        content: data.content,
        fileUrl: data.fileUrl,
        fileType:data.fileType,
        fileName:data.fileName,
        status:  data.submit ? "PENDING" : "DRAFT",
        ownerId: session.user.id,
        orgId:   session.user.orgId!,
        deptId:  data.deptId || null,
        approvalSteps: {
          create: data.approverIds.map((approverId, index) => ({
            approverId,
            order: index + 1,
            status: "PENDING",
          })),
        },
      },
      include: { approvalSteps: { include: { approver: true } } },
    });

    // Create in-app notification + send email for first approver
    if (data.submit && doc.approvalSteps.length > 0) {
      const firstStep = doc.approvalSteps.find((s) => s.order === 1);
      if (firstStep) {
        await db.notification.create({
          data: {
            userId:  firstStep.approverId,
            title:   "Document awaiting your approval",
            message: `"${doc.title}" has been submitted for approval.`,
            type:    "APPROVAL_NEEDED",
            link:    `/documents/${doc.id}`,
          },
        });

        try {
          await sendApprovalNeededEmail({
            to: firstStep.approver.email,
            approverName: firstStep.approver.name,
            documentTitle: doc.title,
            ownerName: session.user.name,
            documentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/en/documents/${doc.id}`,
          });
        } catch (_) {}
      }
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
