// middleware.ts

import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
    const { nextUrl } = req;

    // ✅ FIX: use req.auth directly
    const isLoggedIn = !!req.auth;

    const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register") ||
        nextUrl.pathname.startsWith("/forgot-password");

    const isApiRoute = nextUrl.pathname.startsWith("/api");

    const isPublicFile =
        nextUrl.pathname.startsWith("/_next") ||
        nextUrl.pathname.startsWith("/favicon");

    // Allow API + static files
    if (isApiRoute || isPublicFile) return NextResponse.next();

    // Root redirect
    if (nextUrl.pathname === "/") {
        return NextResponse.redirect(
            new URL(isLoggedIn ? "/dashboard" : "/login", nextUrl),
        );
    }

    // If logged in → block auth pages
    if (isAuthPage) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return NextResponse.next();
    }

    // If NOT logged in → protect pages
    if (!isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
