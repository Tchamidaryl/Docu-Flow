import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX = 10 * 1024 * 1024;
const ALLOWED = ["pdf", "docx", "doc", "xlsx", "xls", "png", "jpg", "jpeg"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED.includes(ext)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = path.join(uploadDir, safeName);
  await writeFile(filePath, buffer);

  return NextResponse.json({
    url:      `/uploads/${safeName}`,
    fileName: file.name,
    fileType: ext,
    size:     file.size,
  });
}
