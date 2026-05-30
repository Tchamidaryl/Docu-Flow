import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { LanguageCode } from "@/lib/i18n/translations";

/**
 * GET /api/v1/user/language
 * Get user's language preference
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: {
                id: true,
                preferences: true,
                languagePreference: {
                    select: { language: true },
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 },
            );
        }

        const language =
            (user.languagePreference?.language as LanguageCode) ||
            (user.preferences?.language as LanguageCode) ||
            "en";

        return NextResponse.json({
            success: true,
            data: { language, userId: user.id },
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";
        console.error("[GET_LANGUAGE]", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/v1/user/language
 * Save user's language preference
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { language } = await req.json();

        if (!["en", "es", "fr", "de", "pt", "zh", "ar"].includes(language)) {
            return NextResponse.json(
                { error: "Invalid language code" },
                { status: 400 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 },
            );
        }

        // Create or update language preference
        const preference = await prisma.userLanguagePreference.upsert({
            where: { userId: user.id },
            update: { language },
            create: { userId: user.id, language },
        });

        // Also update user preferences JSON
        await prisma.user.update({
            where: { id: user.id },
            data: {
                preferences: {
                    ...((user.preferences as any) || {}),
                    language,
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: preference,
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";
        console.error("[POST_LANGUAGE]", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
