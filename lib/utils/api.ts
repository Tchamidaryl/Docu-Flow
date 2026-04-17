import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { SystemRole } from "@prisma/client";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { ZodSchema, ZodError } from "zod";

// ─── Response Helpers ─────────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function error(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status }
  );
}

export function unauthorized(message = "Unauthorized") {
  return error(message, 401);
}

export function forbidden(message = "Forbidden") {
  return error(message, 403);
}

export function notFound(resource = "Resource") {
  return error(`${resource} not found`, 404);
}

export function serverError(message = "Internal server error") {
  return error(message, 500);
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────

type RouteHandler = (
  req: NextRequest,
  ctx: { params: any; session: any }
) => Promise<NextResponse>;

export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, ctx: { params: any }) => {
    const session = await auth();
    if (!session?.user) return unauthorized();
    return handler(req, { ...ctx, session });
  };
}

export function withRole(minRole: SystemRole, handler: RouteHandler) {
  return async (req: NextRequest, ctx: { params: any }) => {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const roleLevel: Record<SystemRole, number> = {
      SUPER_ADMIN: 100,
      ADMIN: 80,
      MANAGER: 60,
      APPROVER: 40,
      REVIEWER: 20,
      SUBMITTER: 10,
    };

    if (roleLevel[session.user.systemRole] < roleLevel[minRole]) {
      return forbidden("Insufficient role");
    }

    return handler(req, { ...ctx, session });
  };
}

export function withPermission(
  permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
  handler: RouteHandler
) {
  return async (req: NextRequest, ctx: { params: any }) => {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const customPerms = (session.user.customRoles ?? []).flatMap(
      (r: any) => r.permissions ?? []
    );

    if (!hasPermission(session.user.systemRole, permission, customPerms)) {
      return forbidden(`Missing permission: ${permission}`);
    }

    return handler(req, { ...ctx, session });
  };
}

// ─── Validation Helper ────────────────────────────────────────────────────────

export async function validateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        error: NextResponse.json(
          {
            success: false,
            error: "Validation failed",
            details: err.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 422 }
        ),
      };
    }
    return { error: error("Invalid JSON body") };
  }
}

// ─── Pagination Helper ────────────────────────────────────────────────────────

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return ok({
    items: data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}

// ─── IP & User-Agent Extraction ───────────────────────────────────────────────

export function getClientInfo(req: NextRequest) {
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  return { ipAddress, userAgent };
}
