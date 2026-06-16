import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { created, error, serverError, validateBody } from "@/lib/utils/api";

const registerSchema = z.object({
  // Organization
  orgName: z.string().min(2, "Organization name must be at least 2 characters").max(100),
  orgSlug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),

  // Admin user
  name:     z.string().min(2, "Your name must be at least 2 characters").max(100),
  email:    z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),

  // Optional first department
  departmentName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const validation = await validateBody(req, registerSchema);
  if ("error" in validation) return validation.error;
  const body = validation.data;

  // Check slug uniqueness
  const existingOrg = await prisma.organization.findUnique({
    where: { slug: body.orgSlug },
  });
  if (existingOrg) {
    return error("This organization slug is already taken. Please choose another.", 409);
  }

  // Check email uniqueness
  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
  });
  if (existingUser) {
    return error("An account with this email already exists.", 409);
  }

  try {
    const passwordHash = await bcrypt.hash(body.password, 12);

    // Transaction: org + department + admin + default template
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name:     body.orgName,
          slug:     body.orgSlug,
          isActive: true,
          settings: {
            allowDelegation:           true,
            requireCommentOnRejection: true,
          },
        },
      });

      const defaultDept = await tx.department.create({
        data: {
          name:           body.departmentName?.trim() || "General",
          description:    "Default department",
          organizationId: org.id,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          name:           body.name,
          email:          body.email,
          passwordHash,
          systemRole:     "ADMIN",
          jobTitle:       "Administrator",
          organizationId: org.id,
          departmentId:   defaultDept.id,
          isActive:       true,
          emailVerified:  new Date(),
        },
      });

      // Default workflow template
      await tx.approvalTemplate.create({
        data: {
          organizationId: org.id,
          name:           "Quick Approval",
          description:    "Single-step approval by direct manager",
          category:       "General",
          slaHours:       48,
          createdById:    adminUser.id,
          isDefault:      true,
          steps: {
            create: [
              {
                stepOrder:       1,
                name:            "Manager Review",
                description:     "Direct manager reviews and approves",
                actionType:      "SEQUENTIAL",
                useManagerOf:    true,
                isRequired:      true,
                timeoutHours:    48,
                canDelegate:     true,
                requiresComment: false,
              },
            ],
          },
        },
      });

      // HR template
      await tx.approvalTemplate.create({
        data: {
          organizationId: org.id,
          name:           "Multi-Level Approval",
          description:    "3-step hierarchical approval workflow",
          category:       "General",
          slaHours:       120,
          createdById:    adminUser.id,
          steps: {
            create: [
              {
                stepOrder:       1,
                name:            "Supervisor Review",
                actionType:      "SEQUENTIAL",
                useManagerOf:    true,
                isRequired:      true,
                timeoutHours:    24,
                canDelegate:     true,
                requiresComment: false,
              },
              {
                stepOrder:       2,
                name:            "Manager Approval",
                actionType:      "SEQUENTIAL",
                useManagerOf:    false,
                assignedUserId:  adminUser.id,
                isRequired:      true,
                timeoutHours:    48,
                canDelegate:     true,
                requiresComment: false,
              },
              {
                stepOrder:       3,
                name:            "Admin Sign-off",
                actionType:      "SEQUENTIAL",
                assignedUserId:  adminUser.id,
                isRequired:      true,
                timeoutHours:    72,
                canDelegate:     false,
                requiresComment: true,
              },
            ],
          },
        },
      });

      return { org, adminUser };
    },
    {
      timeout: 30000, // 30 seconds instead of default 5 seconds
    });

    return created({
      message:          "Organization registered successfully",
      organizationId:   result.org.id,
      organizationName: result.org.name,
      organizationSlug: result.org.slug,
      userId:           result.adminUser.id,
      email:            result.adminUser.email,
    });
  } catch (err) {
    console.error("[REGISTER]", err);
    return serverError("Failed to register organization. Please try again.");
  }
}
