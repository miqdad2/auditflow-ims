import 'dotenv/config';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

// ─── Departments ──────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { name: 'IMS / QHSE',          code: 'IMS' },
  { name: 'HR',                   code: 'HR' },
  { name: 'ICT',                  code: 'ICT' },
  { name: 'Maintenance',          code: 'MNT' },
  { name: 'Purchase & Stores',    code: 'PUR' },
  { name: 'Production',           code: 'PRD' },
  { name: 'QC',                   code: 'QC' },
  { name: 'Sales',                code: 'SAL' },
  { name: 'Tender',               code: 'TND' },
  { name: 'Project Site',         code: 'PST' },
];

// ─── Roles ────────────────────────────────────────────────────────────────────

const ROLES = [
  { name: 'SUPER_ADMIN',        displayName: 'Super Admin',         description: 'Full system access including technical administration' },
  { name: 'SUPER_USER',         displayName: 'Super User',          description: 'Full business access without technical admin access' },
  { name: 'IT_ADMIN',           displayName: 'IT Admin',            description: 'User, role, and system configuration' },
  { name: 'ISO_MANAGER',        displayName: 'ISO Manager',         description: 'Full ISO workspace and document control' },
  { name: 'QHSE_USER',          displayName: 'QHSE User',          description: 'ISO tasks, documents, evidence, and corrective actions' },
  { name: 'DEPARTMENT_MANAGER', displayName: 'Department Manager',  description: 'Department-level review and approval' },
  { name: 'DEPARTMENT_USER',    displayName: 'Department User',     description: 'Upload files, update tasks, submit evidence' },
  { name: 'AUDITOR_VIEWER',     displayName: 'Auditor / Viewer',    description: 'Read-only access to approved documents and evidence' },
  { name: 'STAFF',              displayName: 'Staff',               description: 'Basic assigned-task access' },
];

// ─── Permissions ─────────────────────────────────────────────────────────────

const PERMISSIONS = [
  { key: 'users.manage',       displayName: 'Manage Users',              description: 'Create, update, deactivate users' },
  { key: 'roles.manage',       displayName: 'Manage Roles',              description: 'Assign and configure roles' },
  { key: 'departments.manage', displayName: 'Manage Departments',        description: 'Create and update departments' },
  // ISO Workspace permissions (granular — used by workspaces, task-lists, tasks controllers)
  { key: 'project.read',       displayName: 'View Projects',             description: 'Read ISO workspaces and task lists' },
  { key: 'project.create',     displayName: 'Create Projects',           description: 'Create ISO workspaces and task lists' },
  { key: 'project.update',     displayName: 'Update Projects',           description: 'Update ISO workspaces and task lists' },
  // Legacy coarse-grained ISO permissions (kept for compatibility)
  { key: 'iso.view',           displayName: 'View ISO Workspaces',       description: 'Read ISO projects and task lists' },
  { key: 'iso.manage',         displayName: 'Manage ISO Workspaces',     description: 'Create and manage ISO projects' },
  { key: 'documents.view',     displayName: 'View Documents',            description: 'Browse and download documents' },
  { key: 'documents.manage',   displayName: 'Manage Documents',          description: 'Upload and update documents' },
  { key: 'documents.approve',  displayName: 'Approve Documents',         description: 'Approve, reject, or archive documents' },
  // Page permissions
  { key: 'pages.read',         displayName: 'Read Pages',                description: 'View workspace pages and sub-pages' },
  { key: 'pages.create',       displayName: 'Create Pages',              description: 'Create workspace pages and sub-pages' },
  { key: 'pages.update',       displayName: 'Update Pages',              description: 'Edit workspace page content and title' },
  { key: 'pages.delete',       displayName: 'Delete Pages',              description: 'Delete workspace pages' },
  // Granular document permissions (used by documents controller)
  { key: 'documents.read',     displayName: 'Read Documents',            description: 'View and browse document library' },
  { key: 'documents.create',   displayName: 'Upload Documents',          description: 'Upload new documents' },
  { key: 'documents.update',   displayName: 'Update Documents',          description: 'Update document metadata and upload new versions' },
  { key: 'documents.archive',  displayName: 'Archive Documents',         description: 'Archive approved documents' },
  { key: 'documents.download', displayName: 'Download Documents',        description: 'Download document files' },
  // Task permissions (granular — used by tasks controller and service)
  { key: 'tasks.read',         displayName: 'Read Tasks',                description: 'View tasks, comments, and activity' },
  { key: 'tasks.create',       displayName: 'Create Tasks',              description: 'Create new tasks and subtasks' },
  { key: 'tasks.update',       displayName: 'Update Tasks',              description: 'Update task fields, status, and assignment' },
  { key: 'tasks.delete',       displayName: 'Delete Tasks',              description: 'Delete tasks and subtasks' },
  // Legacy coarse-grained task permissions (kept for compatibility)
  { key: 'tasks.view',         displayName: 'View Tasks',                description: 'See assigned and department tasks' },
  { key: 'tasks.manage',       displayName: 'Manage Tasks',              description: 'Create, update, and assign tasks' },
  { key: 'evidence.submit',    displayName: 'Submit Evidence',           description: 'Upload and submit audit evidence' },
  { key: 'evidence.review',    displayName: 'Review Evidence',           description: 'Approve or reject submitted evidence' },
  // Checklist permissions
  { key: 'checklist.read',     displayName: 'Read Checklists',           description: 'View audit checklists and items' },
  { key: 'checklist.create',   displayName: 'Create Checklists',         description: 'Create audit checklists and items' },
  { key: 'checklist.update',   displayName: 'Update Checklists',         description: 'Edit audit checklist items and assignments' },
  { key: 'checklist.review',   displayName: 'Review Checklists',         description: 'Approve or reject submitted checklist evidence' },
  { key: 'ncr.view',           displayName: 'View NCR/CAPA',             description: 'View corrective action records' },
  { key: 'ncr.manage',         displayName: 'Manage NCR/CAPA',           description: 'Create, update, and close NCR/CAPA records' },
  // Granular NCR/CAPA permissions
  { key: 'ncr.read',           displayName: 'Read NCR/CAPA',             description: 'View NCR/CAPA records and comments' },
  { key: 'ncr.create',         displayName: 'Create NCR/CAPA',           description: 'Raise new NCR/CAPA records' },
  { key: 'ncr.update',         displayName: 'Update NCR/CAPA',           description: 'Edit NCR/CAPA fields, root cause, and actions' },
  { key: 'ncr.verify',         displayName: 'Verify NCR/CAPA',           description: 'Verify corrective actions and close NCR/CAPA records' },
  { key: 'ncr.close',          displayName: 'Close NCR/CAPA',            description: 'Permanently close a verified NCR/CAPA record' },
  { key: 'audit_logs.view',    displayName: 'View Audit Logs',           description: 'Read system audit log entries' },
  { key: 'settings.manage',    displayName: 'Manage Settings',           description: 'System configuration and settings' },
];

// ─── Role → Permission mappings ───────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.key),

  SUPER_USER: [
    // Business workspace management
    'project.read', 'project.create', 'project.update',
    'iso.view', 'iso.manage',
    // Pages (kept for data access, not shown in simplified workspace UI)
    'pages.read', 'pages.create', 'pages.update', 'pages.delete',
    // Documents — business access; approval/archive stays with ISO roles
    'documents.view', 'documents.manage',
    'documents.read', 'documents.create', 'documents.update', 'documents.download',
    // Tasks — full business control
    'tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete',
    'tasks.view', 'tasks.manage',
    // Evidence — submit only; review stays with ISO/QHSE roles
    'evidence.submit',
    // Checklist
    'checklist.read', 'checklist.create', 'checklist.update',
    // NCR/CAPA — full business control
    'ncr.view', 'ncr.manage',
    'ncr.read', 'ncr.create', 'ncr.update', 'ncr.verify', 'ncr.close',
    // Users and departments (business master data — NOT IT_ADMIN)
    'users.manage',
    'departments.manage',
    // Audit logs (read-only visibility)
    'audit_logs.view',
    // NOT included: settings.manage, documents.approve, documents.archive, evidence.review
  ],

  IT_ADMIN: [
    'users.manage', 'roles.manage',
    'project.read', 'iso.view',
    'pages.read',
    'documents.view', 'documents.read', 'documents.download',
    'tasks.read', 'tasks.view',
    'ncr.read',
    'audit_logs.view', 'settings.manage',
    // NOTE: departments.manage intentionally excluded — IT_ADMIN manages system, not business master data
  ],

  ISO_MANAGER: [
    'project.read', 'project.create', 'project.update',
    'iso.view', 'iso.manage',
    'pages.read', 'pages.create', 'pages.update', 'pages.delete',
    'documents.view', 'documents.manage', 'documents.approve',
    'documents.read', 'documents.create', 'documents.update', 'documents.archive', 'documents.download',
    'tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete',
    'tasks.view', 'tasks.manage',
    'evidence.submit', 'evidence.review',
    'checklist.read', 'checklist.create', 'checklist.update', 'checklist.review',
    'ncr.view', 'ncr.manage',
    'ncr.read', 'ncr.create', 'ncr.update', 'ncr.verify', 'ncr.close',
    'audit_logs.view',
  ],

  QHSE_USER: [
    'project.read', 'project.create', 'project.update',
    'iso.view', 'iso.manage',
    'pages.read', 'pages.create', 'pages.update',
    'documents.view', 'documents.manage',
    'documents.read', 'documents.create', 'documents.update', 'documents.approve', 'documents.archive', 'documents.download',
    'tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete',
    'tasks.view', 'tasks.manage',
    'evidence.submit', 'evidence.review',
    'checklist.read', 'checklist.create', 'checklist.update', 'checklist.review',
    'ncr.view', 'ncr.manage',
    'ncr.read', 'ncr.create', 'ncr.update', 'ncr.verify', 'ncr.close',
  ],

  DEPARTMENT_MANAGER: [
    'project.read', 'project.update',
    'iso.view',
    'pages.read', 'pages.create', 'pages.update',
    'documents.view', 'documents.manage', 'documents.approve',
    'documents.read', 'documents.create', 'documents.update', 'documents.archive', 'documents.download',
    'tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete',
    'tasks.view', 'tasks.manage',
    'evidence.submit', 'evidence.review',
    'checklist.read', 'checklist.create', 'checklist.update',
    'ncr.view', 'ncr.manage',
    'ncr.read', 'ncr.create', 'ncr.update',
  ],

  DEPARTMENT_USER: [
    'project.read',
    'iso.view',
    'pages.read', 'pages.create', 'pages.update',
    'documents.view', 'documents.manage',
    'documents.read', 'documents.create', 'documents.update', 'documents.download',
    'tasks.read',
    'tasks.view',
    'evidence.submit',
    'checklist.read', 'checklist.create',
    'ncr.view', 'ncr.read', 'ncr.update',
  ],

  AUDITOR_VIEWER: [
    'project.read',
    'iso.view',
    'pages.read',
    'documents.view', 'documents.read', 'documents.download',
    'tasks.read',
    'tasks.view',
    'checklist.read',
    'ncr.view', 'ncr.read',
    'audit_logs.view',
  ],

  STAFF: [
    'project.read',
    'iso.view',
    'pages.read',
    'tasks.read',
    'tasks.view',
    'documents.view', 'documents.read', 'documents.download',
    'evidence.submit',
    'checklist.read',
    'ncr.read',
  ],
};

// ─── Seed runner ──────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding RECAFCO AuditFlow ISO database...\n');

  // Departments
  console.log('→ Departments...');
  for (const dept of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name },
      create: dept,
    });
  }
  console.log(`  ✓ ${DEPARTMENTS.length} departments`);

  // Roles
  console.log('→ Roles...');
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { displayName: role.displayName, description: role.description },
      create: role,
    });
  }
  console.log(`  ✓ ${ROLES.length} roles`);

  // Permissions
  console.log('→ Permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { displayName: perm.displayName, description: perm.description },
      create: perm,
    });
  }
  console.log(`  ✓ ${PERMISSIONS.length} permissions`);

  // Role-permission mappings
  console.log('→ Role-permission assignments...');
  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;
    for (const key of permKeys) {
      const perm = await prisma.permission.findUnique({ where: { key } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
  console.log('  ✓ Role-permission assignments done');

  // Super Admin user
  console.log('→ Initial Super Admin user...');
  const ADMIN_PASSWORD = 'Admin@12345';
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@recafco.com' },
    update: {},
    create: {
      email: 'admin@recafco.com',
      username: 'admin',
      passwordHash,
      fullName: 'System Administrator',
      isActive: true,
      mustChangePassword: true,
    },
  });

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: superAdminRole.id },
    });
  }

  console.log('\n✅ Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Initial Admin Credentials');
  console.log('  Email:    admin@recafco.com');
  console.log('  Username: admin');
  console.log('  Password: Admin@12345');
  console.log('  ⚠️  Change this password immediately after first login!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
