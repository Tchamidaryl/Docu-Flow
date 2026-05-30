import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug")?.toLowerCase().trim();

  if (!slug || slug.length < 2) {
    return ok({ available: false, message: "Slug too short" });
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return ok({ available: false, message: "Invalid characters" });
  }

  const existing = await prisma.organization.findUnique({ where: { slug } });
  return ok({
    available: !existing,
    message:   existing ? "This slug is already taken" : "Slug is available",
  });
}
