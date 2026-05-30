import { auth } from '@/auth';
import { sendEmail } from '@/lib/email/mailer';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, html, template, templateData, documentId } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Log email send attempt
    const emailLog = await prisma.emailLog.create({
      data: {
        recipientEmail: to,
        subject,
        template: template || 'custom',
        status: 'PENDING',
        metadata: templateData || {},
        documentId,
      },
    });

    try {
      // Send email
      await sendEmail({
        to,
        subject,
        html,
      });

      // Mark as sent
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        emailLogId: emailLog.id,
      });
    } catch (error) {
      // Mark as failed
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'FAILED',
          failureReason: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      console.error('Email send failed:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const where = documentId ? { documentId } : {};

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.emailLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs,
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error('Failed to fetch email logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
}
