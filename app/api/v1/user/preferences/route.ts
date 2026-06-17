import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { theme, language, timezone } = await req.json();

    // Update user language preference
    const preferences = await prisma.userLanguagePreference.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        language: language || 'EN',
        timezone: timezone || 'UTC',
        theme: theme || 'dark'
      },
      update: {
        ...(language && { language }),
        ...(timezone && { timezone }),
        ...(theme && { theme })
      },
    });

    console.log("Posted in DB", preferences);
    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await prisma.userLanguagePreference.findUnique({
      where: { userId: session.user.id },
    });

    console.log("Fetched from DB", preferences)
    return NextResponse.json(preferences || { language: 'EN', timezone: 'UTC' });
  } catch (error) {
    console.error('Failed to fetch preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}
