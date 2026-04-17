// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding DocuFlow database...");

  // ─── 1. Organization ──────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corporation",
      slug: "acme-corp",
      settings: {},
    },
  });
  console.log("✅ Organization:", org.name);

  // ─── 2. Departments ───────────────────────────────────────────────────────
  let deptAdmin = await prisma.department.findFirst({
    where: { name: "Administration", organizationId: org.id },
  });
  if (!deptAdmin) {
    deptAdmin = await prisma.department.create({
      data: { name: "Administration", organizationId: org.id },
    });
  }

  let deptExec = await prisma.department.findFirst({
    where: { name: "Executive", organizationId: org.id },
  });
  if (!deptExec) {
    deptExec = await prisma.department.create({
      data: { name: "Executive", organizationId: org.id },
    });
  }

  let deptOps = await prisma.department.findFirst({
    where: { name: "Operations", organizationId: org.id },
  });
  if (!deptOps) {
    deptOps = await prisma.department.create({
      data: { name: "Operations", organizationId: org.id },
    });
  }

  let deptEng = await prisma.department.findFirst({
    where: { name: "Engineering", organizationId: org.id },
  });
  if (!deptEng) {
    deptEng = await prisma.department.create({
      data: { name: "Engineering", organizationId: org.id },
    });
  }

  console.log("✅ Departments created");

  // ─── 3. Password hashes ───────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 12);
  const userPassword  = await bcrypt.hash("password123", 12);

  // ─── 4. Users ─────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@docuflow.com" },
    update: {},
    create: {
      name:           "Alex Rivera",
      email:          "admin@docuflow.com",
      passwordHash:   adminPassword,
      systemRole:     "ADMIN",            // ✅ was: role
      jobTitle:       "System Administrator",
      organizationId: org.id,             // ✅ required in new schema
      departmentId:   deptAdmin.id,       // ✅ was: department string
      isActive:       true,
      emailVerified:  new Date(),
    },
  });

  const director = await prisma.user.upsert({
    where: { email: "director@docuflow.com" },
    update: {},
    create: {
      name:           "Diana Chen",
      email:          "director@docuflow.com",
      passwordHash:   userPassword,
      systemRole:     "APPROVER",
      jobTitle:       "Executive Director",
      organizationId: org.id,
      departmentId:   deptExec.id,
      isActive:       true,
      emailVerified:  new Date(),
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@docuflow.com" },
    update: {},
    create: {
      name:           "Marcus Williams",
      email:          "manager@docuflow.com",
      passwordHash:   userPassword,
      systemRole:     "MANAGER",
      jobTitle:       "Operations Manager",
      organizationId: org.id,
      departmentId:   deptOps.id,
      managerId:      director.id,
      isActive:       true,
      emailVerified:  new Date(),
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@docuflow.com" },
    update: {},
    create: {
      name:           "Sarah Kim",
      email:          "supervisor@docuflow.com",
      passwordHash:   userPassword,
      systemRole:     "REVIEWER",
      jobTitle:       "Team Supervisor",
      organizationId: org.id,
      departmentId:   deptOps.id,
      managerId:      manager.id,
      isActive:       true,
      emailVerified:  new Date(),
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@docuflow.com" },
    update: {},
    create: {
      name:           "Jordan Park",
      email:          "employee@docuflow.com",
      passwordHash:   userPassword,
      systemRole:     "SUBMITTER",
      jobTitle:       "Software Engineer",
      organizationId: org.id,
      departmentId:   deptEng.id,
      managerId:      supervisor.id,
      isActive:       true,
      emailVerified:  new Date(),
    },
  });

  console.log("✅ Users created");

  // ─── 5. Approval Templates ────────────────────────────────────────────────
  const hrTemplate = await prisma.approvalTemplate.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "HR Policy Approval" } },
    update: {},
    create: {
      organizationId: org.id,                        // ✅ required in new schema
      name:           "HR Policy Approval",
      description:    "Standard 3-level approval for HR policy documents",
      category:       "HR",
      slaHours:       120,
      createdById:    admin.id,
      steps: {
        create: [
          {
            stepOrder:       1,                      // ✅ was: stepOrder 0
            name:            "Supervisor Review",    // ✅ was: label
            actionType:      "SEQUENTIAL",           // ✅ was: StepActionType.REVIEW
            assignedUserId:  supervisor.id,
            isRequired:      true,
            timeoutHours:    24,
            canDelegate:     true,
            requiresComment: false,
          },
          {
            stepOrder:       2,
            name:            "Manager Approval",
            actionType:      "SEQUENTIAL",
            assignedUserId:  manager.id,
            isRequired:      true,
            timeoutHours:    48,
            canDelegate:     true,
            requiresComment: false,
          },
          {
            stepOrder:       3,
            name:            "Director Sign-off",
            actionType:      "SEQUENTIAL",
            assignedUserId:  director.id,
            isRequired:      true,
            timeoutHours:    72,
            canDelegate:     false,
            requiresComment: true,
          },
        ],
      },
    },
  });

  const financeTemplate = await prisma.approvalTemplate.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Budget Request" } },
    update: {},
    create: {
      organizationId: org.id,
      name:           "Budget Request",
      description:    "Two-level approval for budget and expenditure requests",
      category:       "Finance",
      slaHours:       72,
      createdById:    admin.id,
      steps: {
        create: [
          {
            stepOrder:       1,
            name:            "Manager Approval",
            actionType:      "SEQUENTIAL",
            assignedUserId:  manager.id,
            isRequired:      true,
            timeoutHours:    48,
            canDelegate:     true,
            requiresComment: false,
          },
          {
            stepOrder:       2,
            name:            "Director Final Approval",
            actionType:      "SEQUENTIAL",
            assignedUserId:  director.id,
            isRequired:      true,
            timeoutHours:    72,
            canDelegate:     false,
            requiresComment: true,
          },
        ],
      },
    },
  });

  const simpleTemplate = await prisma.approvalTemplate.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Quick Approval" } },
    update: {},
    create: {
      organizationId: org.id,
      name:           "Quick Approval",
      description:    "Single-level approval for routine requests",
      category:       "General",
      slaHours:       24,
      createdById:    admin.id,
      isDefault:      true,
      steps: {
        create: [
          {
            stepOrder:       1,
            name:            "Manager Approval",
            actionType:      "SEQUENTIAL",
            assignedUserId:  manager.id,
            isRequired:      true,
            timeoutHours:    24,
            canDelegate:     true,
            requiresComment: false,
          },
        ],
      },
    },
  });

  console.log("✅ Templates created");

  // ─── 6. Sample Documents ──────────────────────────────────────────────────

  // Document 1 — IN_REVIEW (step 1 done, waiting on step 2)
  const workflowSnapshot = [
    {
      stepOrder:             1,
      name:                  "Supervisor Review",   // ✅ was: label
      actionType:            "SEQUENTIAL",
      resolvedAssigneeId:    supervisor.id,         // ✅ was: assignedUserId in snapshot
      resolvedAssigneeName:  supervisor.name,       // ✅ was: assignedUserName
      isRequired:            true,
      canDelegate:           true,
      requiresComment:       false,
      status:                "approved",
      completedAt:           new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      completedById:         supervisor.id,
      completedByName:       supervisor.name,
    },
    {
      stepOrder:             2,
      name:                  "Manager Approval",
      actionType:            "SEQUENTIAL",
      resolvedAssigneeId:    manager.id,
      resolvedAssigneeName:  manager.name,
      isRequired:            true,
      canDelegate:           true,
      requiresComment:       false,
      status:                "pending",
    },
    {
      stepOrder:             3,
      name:                  "Director Sign-off",
      actionType:            "SEQUENTIAL",
      resolvedAssigneeId:    director.id,
      resolvedAssigneeName:  director.name,
      isRequired:            true,
      canDelegate:           false,
      requiresComment:       true,
      status:                "pending",
    },
  ];

  const doc1 = await prisma.document.create({
    data: {
      organizationId:   org.id,                    // ✅ required in new schema
      title:            "Remote Work Policy 2025",
      description:      "Updated guidelines for remote work arrangements",
      content:          "<h2>Remote Work Policy</h2><p>This document outlines the updated remote work policy for all employees...</p>",
      contentType:      "RICH_TEXT",
      templateId:       hrTemplate.id,
      submittedById:    employee.id,
      department:       "HR",
      tags:             ["policy", "remote-work", "hr"],
      status:           "IN_REVIEW",
      currentStepIndex: 1,
      workflowSnapshot: workflowSnapshot,
      priority:         "HIGH",
      submittedAt:      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Audit logs for doc1
  await prisma.auditLog.createMany({
    data: [
      {
        documentId: doc1.id,
        actorId:    employee.id,
        action:     "CREATED",
        timestamp:  new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        documentId: doc1.id,
        actorId:    employee.id,
        action:     "SUBMITTED",
        timestamp:  new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        documentId: doc1.id,
        actorId:    supervisor.id,
        action:     "APPROVED",
        details:    { comment: "Content looks good. Passing to manager for final review." },
        timestamp:  new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Notification for manager
  await prisma.notification.create({
    data: {
      recipientId: manager.id,
      documentId:  doc1.id,
      type:        "APPROVAL_REQUEST",
      title:       "Document awaiting your approval",
      message:     `"Remote Work Policy 2025" requires your approval at step: Manager Approval`,
    },
  });

  // Document 2 — DRAFT
  await prisma.document.create({
    data: {
      organizationId: org.id,
      title:          "Q1 Marketing Budget Request",
      description:    "Budget allocation request for Q1 2025 marketing initiatives",
      content:        "<h2>Budget Request</h2><p>Requesting $45,000 for Q1 marketing campaigns...</p>",
      contentType:    "RICH_TEXT",
      templateId:     financeTemplate.id,
      submittedById:  employee.id,
      department:     "Marketing",
      tags:           ["budget", "marketing", "q1"],
      status:         "DRAFT",
      priority:       "NORMAL",
    },
  });

  // Document 3 — APPROVED
  const approvedSnapshot = [
    {
      stepOrder:            1,
      name:                 "Manager Approval",
      actionType:           "SEQUENTIAL",
      resolvedAssigneeId:   manager.id,
      resolvedAssigneeName: manager.name,
      isRequired:           true,
      canDelegate:          true,
      requiresComment:      false,
      status:               "approved",
      completedAt:          new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      completedById:        manager.id,
      completedByName:      manager.name,
    },
  ];

  const doc3 = await prisma.document.create({
    data: {
      organizationId:   org.id,
      title:            "Office Equipment Purchase",
      description:      "Request to purchase standing desks for the engineering team",
      content:          "<p>Requesting 12 standing desks at $800 each = $9,600 total...</p>",
      contentType:      "RICH_TEXT",
      templateId:       simpleTemplate.id,
      submittedById:    employee.id,
      department:       "Engineering",
      tags:             ["equipment", "purchase"],
      status:           "APPROVED",
      currentStepIndex: 1,
      workflowSnapshot: approvedSnapshot,
      priority:         "LOW",
      submittedAt:      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedAt:      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        documentId: doc3.id,
        actorId:    employee.id,
        action:     "CREATED",
        timestamp:  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        documentId: doc3.id,
        actorId:    employee.id,
        action:     "SUBMITTED",
        timestamp:  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      },
      {
        documentId: doc3.id,
        actorId:    manager.id,
        action:     "APPROVED",
        details:    { comment: "Approved. Please proceed with the purchase." },
        timestamp:  new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("✅ Sample documents, audit logs, and notifications created");

  console.log("\n🎉 Seed complete! Login credentials:");
  console.log("────────────────────────────────────────────────────────");
  console.log("  Admin:       admin@docuflow.com      / admin123");
  console.log("  Director:    director@docuflow.com   / password123");
  console.log("  Manager:     manager@docuflow.com    / password123");
  console.log("  Supervisor:  supervisor@docuflow.com / password123");
  console.log("  Employee:    employee@docuflow.com   / password123");
  console.log("────────────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
