import { SystemRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      systemRole: SystemRole;
      organizationId: string;
      organizationName: string;
      departmentId?: string | null;
      departmentName?: string | null;
      customRoles: {
        id: string;
        name: string;
        permissions: string[];
        color?: string | null;
      }[];
    };
  }

  interface User {
    systemRole?: SystemRole;
    organizationId?: string | null;
    organizationName?: string | null;
    departmentId?: string | null;
    departmentName?: string | null;
    customRoles?: {
      id: string;
      name: string;
      permissions: string[];
      color?: string | null;
    }[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    systemRole?: SystemRole;
    organizationId?: string | null;
    organizationName?: string | null;
    departmentId?: string | null;
    departmentName?: string | null;
    customRoles?: any[];
  }
}
