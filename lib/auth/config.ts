import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { SystemRole } from "@prisma/client";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60}, // 8 hours
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing Credentials");
        };

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            organization: { select: { id: true, name: true, slug: true } },
            department: { select: { id: true, name: true } },
            customRoleUsers: {
              include: {
                customRole: {
                  select: { id: true, name: true, permissions: true, color: true },
                },
              },
            },
          },
        });

        if (!user || !user.passwordHash || !user.isActive) {
          throw new Error("Invalid Credential");
        };

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid){
          throw new Error("Invalid Credential");
        };

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          systemRole: user.systemRole,
          organizationId: user.organizationId,
          organizationName: user.organization?.name ?? null,
          departmentId: user.departmentId,
          departmentName: user.department?.name ?? null,
          customRoles: user.customRoleUsers.map((cr) => ({
            id: cr.customRole.id,
            name: cr.customRole.name,
            permissions: cr.customRole.permissions,
            color: cr.customRole.color,
          })),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.systemRole = (user as any).systemRole;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
        token.departmentId = (user as any).departmentId;
        token.departmentName = (user as any).departmentName;
        token.customRoles = (user as any).customRoles;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.systemRole = token.systemRole as SystemRole;
        session.user.organizationId = token.organizationId as string;
        session.user.organizationName = token.organizationName as string;
        session.user.departmentId = token.departmentId as string;
        session.user.departmentName = token.departmentName as string;
        session.user.customRoles = token.customRoles as any[];
      }
      return session;
    },
  }
};
