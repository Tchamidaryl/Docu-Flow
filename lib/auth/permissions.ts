import { SystemRole } from "@prisma/client";

// ─── Permission Definitions ──────────────────────────────────────────────────

export const PERMISSIONS = {
  // Documents
  DOCUMENT_CREATE: "document:create",
  DOCUMENT_READ_OWN: "document:read:own",
  DOCUMENT_READ_ALL: "document:read:all",
  DOCUMENT_READ_DEPT: "document:read:dept",
  DOCUMENT_EDIT_OWN: "document:edit:own",
  DOCUMENT_EDIT_ALL: "document:edit:all",
  DOCUMENT_DELETE_OWN: "document:delete:own",
  DOCUMENT_DELETE_ALL: "document:delete:all",
  DOCUMENT_SUBMIT: "document:submit",
  DOCUMENT_CANCEL: "document:cancel:own",
  DOCUMENT_CANCEL_ALL: "document:cancel:all",

  // Approvals
  APPROVAL_APPROVE: "approval:approve",
  APPROVAL_REJECT: "approval:reject",
  APPROVAL_REQUEST_REVISION: "approval:request_revision",
  APPROVAL_DELEGATE: "approval:delegate",
  APPROVAL_BYPASS: "approval:bypass",

  // Templates
  TEMPLATE_CREATE: "template:create",
  TEMPLATE_READ: "template:read",
  TEMPLATE_EDIT: "template:edit",
  TEMPLATE_DELETE: "template:delete",

  // Users
  USER_READ: "user:read",
  USER_INVITE: "user:invite",
  USER_EDIT: "user:edit",
  USER_DEACTIVATE: "user:deactivate",
  USER_ASSIGN_ROLE: "user:assign_role",

  // Roles
  ROLE_CREATE: "role:create",
  ROLE_EDIT: "role:edit",
  ROLE_DELETE: "role:delete",

  // Reports & Analytics
  REPORTS_VIEW: "reports:view",
  AUDIT_VIEW: "audit:view",

  // Organization
  ORG_SETTINGS: "org:settings",
  ORG_DEPARTMENTS: "org:departments",
} as const;

type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── Role → Permission Matrix ────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS) as Permission[],

  ADMIN: [
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ_ALL,
    PERMISSIONS.DOCUMENT_EDIT_ALL,
    PERMISSIONS.DOCUMENT_DELETE_ALL,
    PERMISSIONS.DOCUMENT_SUBMIT,
    PERMISSIONS.DOCUMENT_CANCEL_ALL,
    PERMISSIONS.APPROVAL_APPROVE,
    PERMISSIONS.APPROVAL_REJECT,
    PERMISSIONS.APPROVAL_REQUEST_REVISION,
    PERMISSIONS.APPROVAL_DELEGATE,
    PERMISSIONS.APPROVAL_BYPASS,
    PERMISSIONS.TEMPLATE_CREATE,
    PERMISSIONS.TEMPLATE_READ,
    PERMISSIONS.TEMPLATE_EDIT,
    PERMISSIONS.TEMPLATE_DELETE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_INVITE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_DEACTIVATE,
    PERMISSIONS.USER_ASSIGN_ROLE,
    PERMISSIONS.ROLE_CREATE,
    PERMISSIONS.ROLE_EDIT,
    PERMISSIONS.ROLE_DELETE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.ORG_SETTINGS,
    PERMISSIONS.ORG_DEPARTMENTS,
  ],

  MANAGER: [
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ_DEPT,
    PERMISSIONS.DOCUMENT_EDIT_OWN,
    PERMISSIONS.DOCUMENT_DELETE_OWN,
    PERMISSIONS.DOCUMENT_SUBMIT,
    PERMISSIONS.DOCUMENT_CANCEL,
    PERMISSIONS.APPROVAL_APPROVE,
    PERMISSIONS.APPROVAL_REJECT,
    PERMISSIONS.APPROVAL_REQUEST_REVISION,
    PERMISSIONS.APPROVAL_DELEGATE,
    PERMISSIONS.TEMPLATE_CREATE,
    PERMISSIONS.TEMPLATE_READ,
    PERMISSIONS.TEMPLATE_EDIT,
    PERMISSIONS.USER_READ,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],

  APPROVER: [
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ_OWN,
    PERMISSIONS.DOCUMENT_EDIT_OWN,
    PERMISSIONS.DOCUMENT_SUBMIT,
    PERMISSIONS.DOCUMENT_CANCEL,
    PERMISSIONS.APPROVAL_APPROVE,
    PERMISSIONS.APPROVAL_REJECT,
    PERMISSIONS.APPROVAL_REQUEST_REVISION,
    PERMISSIONS.APPROVAL_DELEGATE,
    PERMISSIONS.TEMPLATE_READ,
    PERMISSIONS.USER_READ,
    PERMISSIONS.AUDIT_VIEW,
  ],

  REVIEWER: [
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ_OWN,
    PERMISSIONS.DOCUMENT_EDIT_OWN,
    PERMISSIONS.DOCUMENT_SUBMIT,
    PERMISSIONS.DOCUMENT_CANCEL,
    PERMISSIONS.TEMPLATE_READ,
    PERMISSIONS.USER_READ,
  ],

  SUBMITTER: [
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ_OWN,
    PERMISSIONS.DOCUMENT_EDIT_OWN,
    PERMISSIONS.DOCUMENT_DELETE_OWN,
    PERMISSIONS.DOCUMENT_SUBMIT,
    PERMISSIONS.DOCUMENT_CANCEL,
    PERMISSIONS.TEMPLATE_READ,
  ],
};

// ─── Permission Checker ──────────────────────────────────────────────────────

export function hasPermission(
  userRole: SystemRole,
  permission: Permission,
  customRolePermissions: string[] = []
): boolean {
  const rolePerms = ROLE_PERMISSIONS[userRole] ?? [];
  return (
    rolePerms.includes(permission) ||
    customRolePermissions.includes(permission)
  );
}

export function hasAnyPermission(
  userRole: SystemRole,
  permissions: Permission[],
  customRolePermissions: string[] = []
): boolean {
  return permissions.some((p) =>
    hasPermission(userRole, p, customRolePermissions)
  );
}

export function hasAllPermissions(
  userRole: SystemRole,
  permissions: Permission[],
  customRolePermissions: string[] = []
): boolean {
  return permissions.every((p) =>
    hasPermission(userRole, p, customRolePermissions)
  );
}

// ─── Role Hierarchy ──────────────────────────────────────────────────────────

const ROLE_LEVEL: Record<SystemRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  MANAGER: 60,
  APPROVER: 40,
  REVIEWER: 20,
  SUBMITTER: 10,
};

export function isRoleAtLeast(userRole: SystemRole, minRole: SystemRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}

export function canApproveDocuments(role: SystemRole): boolean {
  return isRoleAtLeast(role, "APPROVER");
}

export function canManageUsers(role: SystemRole): boolean {
  return isRoleAtLeast(role, "ADMIN");
}

export function canManageTemplates(role: SystemRole): boolean {
  return isRoleAtLeast(role, "MANAGER");
}
