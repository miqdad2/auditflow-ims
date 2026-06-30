/**
 * RECAFCO AuditFlow ISO — Demo Data Seed
 *
 * Run AFTER the main seed:
 *   cd packages/db
 *   npx ts-node --project tsconfig.json prisma/seed-demo.ts
 *
 * Creates realistic sample data for internal demo / ISO audit readiness presentation.
 * Safe to re-run: all records use upsert/createMany with skipDuplicates where possible.
 * Demo users have mustChangePassword=true so they must reset on first login.
 *
 * ⚠ Do NOT use this data to make official ISO claims to external auditors.
 *    All records are clearly sample data for internal demonstration.
 */

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ─── Demo users ──────────────────────────────────────────────────────────────

const DEMO_USERS = [
  {
    email: 'super.user@recafco.com',
    username: 'super_user',
    fullName: 'Business Super User',
    role: 'SUPER_USER',
    deptCode: 'IMS',
  },
  {
    email: 'iso.manager@recafco.com',
    username: 'iso_manager',
    fullName: 'Ahmed Al-Rashidi',
    role: 'ISO_MANAGER',
    deptCode: 'IMS',
  },
  {
    email: 'qhse@recafco.com',
    username: 'qhse_user',
    fullName: 'Sara Al-Mansoori',
    role: 'QHSE_USER',
    deptCode: 'IMS',
  },
  {
    email: 'hr.manager@recafco.com',
    username: 'hr_manager',
    fullName: 'Fatima Al-Zahra',
    role: 'DEPARTMENT_MANAGER',
    deptCode: 'HR',
  },
  {
    email: 'hr.user@recafco.com',
    username: 'hr_user',
    fullName: 'Mohammed Al-Sulaiman',
    role: 'DEPARTMENT_USER',
    deptCode: 'HR',
  },
  {
    email: 'maintenance.manager@recafco.com',
    username: 'mnt_manager',
    fullName: 'Khalid Al-Harbi',
    role: 'DEPARTMENT_MANAGER',
    deptCode: 'MNT',
  },
  {
    email: 'ict.user@recafco.com',
    username: 'ict_user',
    fullName: 'Omar Al-Otaibi',
    role: 'DEPARTMENT_USER',
    deptCode: 'ICT',
  },
  {
    email: 'auditor@recafco.com',
    username: 'auditor',
    fullName: 'External Auditor',
    role: 'AUDITOR_VIEWER',
    deptCode: null,
  },
  {
    email: 'staff@recafco.com',
    username: 'staff_user',
    fullName: 'Ali Al-Ghamdi',
    role: 'STAFF',
    deptCode: 'PRD',
  },
];

async function main() {
  console.log('\n🎬 Seeding RECAFCO AuditFlow ISO demo data...\n');

  // ── 1. Departments (ensure they exist) ───────────────────────────────────

  const deptMap = new Map<string, string>(); // code → id
  const depts = await prisma.department.findMany();
  for (const d of depts) deptMap.set(d.code, d.id);

  if (deptMap.size === 0) {
    console.error('❌ Run the main seed first: npx prisma db seed');
    process.exit(1);
  }

  // ── 2. Demo users ────────────────────────────────────────────────────────

  console.log('→ Demo users...');
  const demoPassword = await bcrypt.hash('Demo@12345', 12);
  const userMap = new Map<string, string>(); // username → id

  for (const du of DEMO_USERS) {
    const deptId = du.deptCode ? (deptMap.get(du.deptCode) ?? null) : null;
    const u = await prisma.user.upsert({
      where: { email: du.email },
      update: {
        fullName: du.fullName,
        departmentId: deptId,
        passwordHash: demoPassword,
        isActive: true,
        mustChangePassword: true,
      },
      create: {
        email: du.email,
        username: du.username,
        passwordHash: demoPassword,
        fullName: du.fullName,
        departmentId: deptId,
        isActive: true,
        mustChangePassword: true,
      },
    });
    userMap.set(du.username, u.id);

    const role = await prisma.role.findUnique({ where: { name: du.role } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: u.id, roleId: role.id } },
        update: {},
        create: { userId: u.id, roleId: role.id },
      });
    }
  }
  console.log(`  ✓ ${DEMO_USERS.length} demo users (password: Demo@12345)`);

  const isoManagerId    = userMap.get('iso_manager')!;
  const qhseId          = userMap.get('qhse_user')!;
  const hrManagerId     = userMap.get('hr_manager')!;
  const hrUserId        = userMap.get('hr_user')!;
  const mntManagerId    = userMap.get('mnt_manager')!;
  const ictUserId       = userMap.get('ict_user')!;
  const adminUser       = await prisma.user.findUnique({ where: { email: 'admin@recafco.com' } });
  const adminId         = adminUser?.id ?? isoManagerId;
  const auditorId       = userMap.get('auditor') ?? null;

  // ── 3. ISO Workspace ──────────────────────────────────────────────────────

  console.log('→ Workspace...');
  let workspace = await prisma.workspace.findFirst({ where: { name: '[SAMPLE] ISO Audit Readiness 2026' } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: '[SAMPLE] ISO Audit Readiness 2026',
        description: 'Sample ISO 9001:2015 / ISO 45001 / ISO 14001 audit preparation workspace for RECAFCO. All data is sample and for internal demonstration only.',
        status: 'ACTIVE',
        visibility: 'PRIVATE',
        ownerId: isoManagerId,
      },
    });
  } else {
    // Correct visibility on existing workspace — PRIVATE means only explicit members can access
    workspace = await prisma.workspace.update({
      where: { id: workspace.id },
      data: { visibility: 'PRIVATE' },
    });
  }
  const wsId = workspace.id;
  console.log('  ✓ Workspace: [SAMPLE] ISO Audit Readiness 2026');

  // ── 3b. Workspace members ─────────────────────────────────────────────────

  console.log('→ Workspace members...');
  const memberDefs: Array<{ userId: string; roleInWorkspace: string }> = [
    { userId: adminId,      roleInWorkspace: 'OWNER' },
    { userId: isoManagerId, roleInWorkspace: 'MANAGER' },
    { userId: hrManagerId,  roleInWorkspace: 'MANAGER' },
    { userId: ictUserId,    roleInWorkspace: 'MEMBER' },
  ];
  if (auditorId) memberDefs.push({ userId: auditorId, roleInWorkspace: 'VIEWER' });

  for (const m of memberDefs) {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: wsId, userId: m.userId } },
      update: { roleInWorkspace: m.roleInWorkspace },
      create: { workspaceId: wsId, userId: m.userId, roleInWorkspace: m.roleInWorkspace },
    });
  }
  console.log(`  ✓ ${memberDefs.length} workspace members`);

  // ── 4. Task Lists ─────────────────────────────────────────────────────────

  console.log('→ Task lists...');
  const taskListDefs = [
    { name: 'IMS / QHSE Management',    deptCode: 'IMS', order: 1 },
    { name: 'HR – Personnel Records',   deptCode: 'HR',  order: 2 },
    { name: 'Maintenance – Calibration',deptCode: 'MNT', order: 3 },
    { name: 'ICT – System Controls',    deptCode: 'ICT', order: 4 },
    { name: 'Purchase & Stores',        deptCode: 'PUR', order: 5 },
  ];

  const tlMap = new Map<string, string>(); // deptCode → taskListId
  for (const tl of taskListDefs) {
    let existing = await prisma.taskList.findFirst({ where: { workspaceId: wsId, name: tl.name } });
    if (!existing) {
      existing = await prisma.taskList.create({
        data: {
          workspaceId: wsId,
          departmentId: deptMap.get(tl.deptCode) ?? null,
          name: tl.name,
          sortOrder: tl.order,
          createdById: isoManagerId,
        },
      });
    }
    tlMap.set(tl.deptCode, existing.id);
  }
  console.log(`  ✓ ${taskListDefs.length} task lists`);

  // ── 5. Tasks ──────────────────────────────────────────────────────────────

  console.log('→ Tasks...');
  const taskDefs = [
    {
      title: '[SAMPLE] Prepare ISO 9001:2015 Scope Statement',
      taskListKey: 'IMS',
      priority: 'HIGH',
      status: 'COMPLETED',
      assigneeId: isoManagerId,
      dueDate: daysAgo(5),
      completedAt: daysAgo(3),
    },
    {
      title: '[SAMPLE] Collect HR Personnel Training Records',
      taskListKey: 'HR',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigneeId: hrUserId,
      dueDate: daysFromNow(3),
    },
    {
      title: '[SAMPLE] Update Maintenance Calibration Register',
      taskListKey: 'MNT',
      priority: 'CRITICAL',
      status: 'TODO',
      assigneeId: mntManagerId,
      dueDate: daysAgo(2),
    },
    {
      title: '[SAMPLE] Audit ICT Access Control Policy',
      taskListKey: 'ICT',
      priority: 'MEDIUM',
      status: 'WAITING_REVIEW',
      assigneeId: ictUserId,
      dueDate: daysFromNow(7),
    },
    {
      title: '[SAMPLE] Review Purchase Order Approval Process',
      taskListKey: 'PUR',
      priority: 'MEDIUM',
      status: 'TODO',
      assigneeId: qhseId,
      dueDate: daysFromNow(10),
    },
    {
      title: '[SAMPLE] Update Emergency Response Procedures',
      taskListKey: 'IMS',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigneeId: qhseId,
      dueDate: daysFromNow(2),
    },
    {
      title: '[SAMPLE] Collect Contractor HSE Induction Records',
      taskListKey: 'IMS',
      priority: 'HIGH',
      status: 'TODO',
      assigneeId: hrManagerId,
      dueDate: daysFromNow(1),
    },
  ];

  for (const td of taskDefs) {
    const tlId = tlMap.get(td.taskListKey);
    if (!tlId) continue;
    const existing = await prisma.task.findFirst({ where: { taskListId: tlId, title: td.title } });
    if (!existing) {
      await prisma.task.create({
        data: {
          workspaceId: wsId,
          taskListId: tlId,
          title: td.title,
          priority: td.priority,
          status: td.status,
          assigneeId: td.assigneeId,
          createdById: isoManagerId,
          dueDate: td.dueDate,
          completedAt: td.completedAt ?? null,
        },
      });
    }
  }
  console.log(`  ✓ ${taskDefs.length} tasks`);

  // ── 6. Pages ──────────────────────────────────────────────────────────────

  console.log('→ Pages...');
  let imsPage = await prisma.page.findFirst({ where: { workspaceId: wsId, title: '[SAMPLE] IMS Overview' } });
  if (!imsPage) {
    imsPage = await prisma.page.create({
      data: {
        workspaceId: wsId,
        title: '[SAMPLE] IMS Overview',
        content: `# ISO Management System Overview\n\nThis page is sample content for the RECAFCO AuditFlow ISO demo.\n\n## Scope\nThis integrated management system covers ISO 9001:2015 (Quality), ISO 45001 (Safety), and ISO 14001 (Environment).\n\n## Key Contacts\n- ISO Manager: Ahmed Al-Rashidi\n- QHSE Lead: Sara Al-Mansoori\n\n## Audit Schedule\nInternal audit planned for Q3 2026.\n\n> Note: This is sample data for demonstration purposes only.`,
        isHome: true,
        sortOrder: 1,
        createdById: isoManagerId,
        updatedById: isoManagerId,
      },
    });
  } else if (!imsPage.isHome) {
    await prisma.page.update({ where: { id: imsPage.id }, data: { isHome: true } });
  }

  let hrPage = await prisma.page.findFirst({ where: { workspaceId: wsId, title: '[SAMPLE] HR Document Requirements' } });
  if (!hrPage) {
    hrPage = await prisma.page.create({
      data: {
        workspaceId: wsId,
        title: '[SAMPLE] HR Document Requirements',
        content: `# HR Document Requirements for ISO Audit\n\nSample checklist of HR documents required for ISO audit evidence.\n\n- Training records (last 12 months)\n- Competency assessments\n- Job descriptions\n- Induction records\n- HSE training certificates\n\n> This is sample content. Replace with actual RECAFCO HR requirements.`,
        sortOrder: 2,
        createdById: hrManagerId,
        updatedById: hrManagerId,
      },
    });

    // Sub-page
    await prisma.page.create({
      data: {
        workspaceId: wsId,
        parentId: hrPage.id,
        title: '[SAMPLE] Training Matrix Template',
        content: `# Training Matrix\n\nSample training matrix for demo purposes.\n\n| Department | Training Topic | Frequency | Last Done | Next Due |\n|---|---|---|---|---|\n| HR | ISO Awareness | Annual | Jan 2026 | Jan 2027 |\n| Maintenance | Calibration SOP | Biannual | Mar 2026 | Sep 2026 |\n\n> Replace with actual RECAFCO training data.`,
        sortOrder: 1,
        createdById: hrManagerId,
        updatedById: hrManagerId,
      },
    });
  }
  console.log('  ✓ 3 pages (including 1 sub-page)');

  // Pin the HR Document Requirements page to the workspace overview
  if (hrPage) {
    await prisma.workspacePinnedItem.upsert({
      where: { workspaceId_entityType_entityId: { workspaceId: wsId, entityType: 'PAGE', entityId: hrPage.id } },
      update: {},
      create: { workspaceId: wsId, entityType: 'PAGE', entityId: hrPage.id, pinnedById: isoManagerId },
    });
    console.log('  ✓ Pinned [SAMPLE] HR Document Requirements to workspace');
  }

  // ── 7. Documents (metadata only — no physical files for seed) ─────────────

  console.log('→ Sample document records...');
  const docDefs = [
    {
      title: '[SAMPLE] QHSE Policy Statement 2026',
      documentNumber: 'QMS-POL-001',
      category: 'POLICY',
      status: 'APPROVED',
      deptCode: 'IMS',
      ownerId: isoManagerId,
    },
    {
      title: '[SAMPLE] ISO 9001 Quality Manual',
      documentNumber: 'QMS-MAN-001',
      category: 'MANUAL',
      status: 'APPROVED',
      deptCode: 'IMS',
      ownerId: isoManagerId,
    },
    {
      title: '[SAMPLE] HR Recruitment Procedure',
      documentNumber: 'HR-PRC-001',
      category: 'PROCEDURE',
      status: 'APPROVED',
      deptCode: 'HR',
      ownerId: hrManagerId,
    },
    {
      title: '[SAMPLE] Calibration Equipment Register',
      documentNumber: 'MNT-REG-001',
      category: 'RECORD',
      status: 'UNDER_REVIEW',
      deptCode: 'MNT',
      ownerId: mntManagerId,
    },
    {
      title: '[SAMPLE] ICT Access Control Policy',
      documentNumber: 'ICT-POL-001',
      category: 'POLICY',
      status: 'DRAFT',
      deptCode: 'ICT',
      ownerId: ictUserId,
    },
    {
      title: '[SAMPLE] Emergency Response Plan',
      documentNumber: 'HSE-PRC-002',
      category: 'PROCEDURE',
      status: 'APPROVED',
      deptCode: 'IMS',
      ownerId: qhseId,
      expiryDate: daysFromNow(90),
    },
    {
      title: '[SAMPLE] Contractor HSE Induction Form',
      documentNumber: 'HSE-FRM-001',
      category: 'FORM',
      status: 'APPROVED',
      deptCode: 'IMS',
      ownerId: qhseId,
    },
  ];

  for (const dd of docDefs) {
    const existing = await prisma.document.findFirst({ where: { documentNumber: dd.documentNumber } });
    if (!existing) {
      const doc = await prisma.document.create({
        data: {
          title: dd.title,
          documentNumber: dd.documentNumber,
          category: dd.category,
          status: dd.status,
          departmentId: deptMap.get(dd.deptCode) ?? null,
          workspaceId: wsId,
          ownerId: dd.ownerId,
          createdById: dd.ownerId,
          expiryDate: dd.expiryDate ?? null,
          description: 'Sample document for demo purposes. No actual file attached.',
        },
      });
      // Fake version record (no physical file — for demo display only)
      const version = await prisma.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          originalFileName: `${dd.documentNumber}-v1-SAMPLE.pdf`,
          storedFileName: `SAMPLE_NO_FILE_${doc.id}.pdf`,
          storagePath: 'SAMPLE_DATA_NO_FILE',
          mimeType: 'application/pdf',
          fileSize: 0,
          uploadedById: dd.ownerId,
        },
      });
      await prisma.document.update({
        where: { id: doc.id },
        data: { currentVersionId: version.id },
      });
    }
  }
  console.log(`  ✓ ${docDefs.length} sample document records (no physical files)`);

  // ── 8. Audit Checklist ─────────────────────────────────────────────────────

  console.log('→ Audit checklist...');
  let checklist = await prisma.auditChecklist.findFirst({ where: { name: '[SAMPLE] ISO 9001:2015 Internal Audit Checklist' } });
  if (!checklist) {
    checklist = await prisma.auditChecklist.create({
      data: {
        name: '[SAMPLE] ISO 9001:2015 Internal Audit Checklist',
        description: 'Sample audit checklist for RECAFCO ISO 9001:2015 internal audit preparation.',
        isoStandard: 'ISO 9001:2015',
        workspaceId: wsId,
        createdById: isoManagerId,
      },
    });
  }
  const clId = checklist.id;

  const checklistItems = [
    {
      title: '[SAMPLE] Clause 4.1 — Understanding the Organization and its Context',
      isoClause: '4.1',
      deptCode: 'IMS',
      responsibleId: isoManagerId,
      reviewerId: isoManagerId,
      evidenceStatus: 'APPROVED',
    },
    {
      title: '[SAMPLE] Clause 4.2 — Interested Parties Requirements',
      isoClause: '4.2',
      deptCode: 'IMS',
      responsibleId: qhseId,
      reviewerId: isoManagerId,
      evidenceStatus: 'SUBMITTED',
    },
    {
      title: '[SAMPLE] Clause 5.1 — Leadership and Commitment',
      isoClause: '5.1',
      deptCode: 'IMS',
      responsibleId: isoManagerId,
      reviewerId: isoManagerId,
      evidenceStatus: 'APPROVED',
    },
    {
      title: '[SAMPLE] Clause 6.1 — Actions to Address Risks and Opportunities',
      isoClause: '6.1',
      deptCode: 'IMS',
      responsibleId: qhseId,
      reviewerId: isoManagerId,
      evidenceStatus: 'MISSING',
    },
    {
      title: '[SAMPLE] Clause 7.1.5 — Monitoring and Measuring Resources (Calibration)',
      isoClause: '7.1.5',
      deptCode: 'MNT',
      responsibleId: mntManagerId,
      reviewerId: qhseId,
      evidenceStatus: 'SUBMITTED',
    },
    {
      title: '[SAMPLE] Clause 7.2 — Competence and Training Records',
      isoClause: '7.2',
      deptCode: 'HR',
      responsibleId: hrManagerId,
      reviewerId: qhseId,
      evidenceStatus: 'APPROVED',
    },
    {
      title: '[SAMPLE] Clause 8.4 — Control of Externally Provided Processes',
      isoClause: '8.4',
      deptCode: 'PUR',
      responsibleId: qhseId,
      reviewerId: isoManagerId,
      evidenceStatus: 'REJECTED',
    },
    {
      title: '[SAMPLE] Clause 9.1 — Monitoring, Measurement, Analysis and Evaluation',
      isoClause: '9.1',
      deptCode: 'IMS',
      responsibleId: qhseId,
      reviewerId: isoManagerId,
      evidenceStatus: 'MISSING',
    },
    {
      title: '[SAMPLE] Clause 10.2 — Nonconformity and Corrective Action',
      isoClause: '10.2',
      deptCode: 'IMS',
      responsibleId: isoManagerId,
      reviewerId: isoManagerId,
      evidenceStatus: 'APPROVED',
    },
  ];

  for (let i = 0; i < checklistItems.length; i++) {
    const ci = checklistItems[i];
    const existing = await prisma.auditChecklistItem.findFirst({
      where: { checklistId: clId, title: ci.title },
    });

    let itemId: string;
    if (!existing) {
      const item = await prisma.auditChecklistItem.create({
        data: {
          checklistId: clId,
          departmentId: deptMap.get(ci.deptCode) ?? null,
          title: ci.title,
          isoClause: ci.isoClause,
          responsibleUserId: ci.responsibleId,
          reviewerId: ci.reviewerId,
          status: ci.evidenceStatus === 'MISSING' ? 'MISSING' : ci.evidenceStatus === 'SUBMITTED' ? 'SUBMITTED' : ci.evidenceStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          dueDate: daysFromNow(14),
          sortOrder: i + 1,
          createdById: isoManagerId,
          rejectionReason: ci.evidenceStatus === 'REJECTED' ? 'Evidence documents provided are incomplete. Please re-submit with all required purchase evaluation records.' : null,
          reviewedAt: ['APPROVED', 'REJECTED'].includes(ci.evidenceStatus) ? daysAgo(2) : null,
        },
      });
      itemId = item.id;
    } else {
      itemId = existing.id;
    }

    // Create evidence if needed
    if (ci.evidenceStatus !== 'MISSING') {
      const evidenceExists = await prisma.checklistEvidence.findFirst({ where: { checklistItemId: itemId } });
      if (!evidenceExists) {
        await prisma.checklistEvidence.create({
          data: {
            checklistItemId: itemId,
            submittedById: ci.responsibleId,
            status: ci.evidenceStatus,
            notes: `[SAMPLE] Evidence submitted for ${ci.isoClause}. Actual documents to be uploaded separately.`,
            reviewerId: ci.evidenceStatus !== 'SUBMITTED' ? ci.reviewerId : null,
            reviewedAt: ['APPROVED', 'REJECTED'].includes(ci.evidenceStatus) ? daysAgo(2) : null,
            rejectionReason: ci.evidenceStatus === 'REJECTED' ? 'Evidence documents provided are incomplete.' : null,
          },
        });
      }
    }
  }
  console.log(`  ✓ ${checklistItems.length} checklist items with evidence records`);

  // ── 9. NCR/CAPA records ──────────────────────────────────────────────────

  console.log('→ NCR/CAPA records...');
  const ncrDefs = [
    {
      ncrNumber: 'NCR-2026-001',
      title: '[SAMPLE] Calibration Records Found Incomplete',
      description: 'During internal audit, several measuring instruments were found without current calibration certificates in the Maintenance department.',
      type: 'NCR',
      severity: 'MAJOR',
      status: 'VERIFIED',
      isoClause: '7.1.5',
      deptCode: 'MNT',
      raisedById: isoManagerId,
      assignedToId: mntManagerId,
      verifiedById: isoManagerId,
      rootCause: 'Calibration tracking spreadsheet was not updated after instrument service. No formal calibration scheduling system in place.',
      correctiveAction: 'All calibration certificates collected and filed. New calibration register created with due date tracking.',
      preventiveAction: 'Monthly calibration status review meeting scheduled. Calibration items added to AuditFlow ISO checklist.',
      dueDate: daysAgo(5),
      verifiedAt: daysAgo(1),
    },
    {
      ncrNumber: 'NCR-2026-002',
      title: '[SAMPLE] Training Records Missing for 3 New Employees',
      description: 'Three employees who joined in Q1 2026 do not have completed ISO awareness training records in the HR file.',
      type: 'NCR',
      severity: 'MINOR',
      status: 'IN_PROGRESS',
      isoClause: '7.2',
      deptCode: 'HR',
      raisedById: qhseId,
      assignedToId: hrManagerId,
      rootCause: null,
      correctiveAction: null,
      preventiveAction: null,
      dueDate: daysFromNow(7),
    },
    {
      ncrNumber: 'NCR-2026-003',
      title: '[SAMPLE] Supplier Evaluation Forms Not Completed for 2 Vendors',
      description: 'Purchase department did not complete supplier evaluation forms for 2 vendors used in Q4 2025 per ISO 8.4 requirements.',
      type: 'NCR',
      severity: 'MAJOR',
      status: 'SUBMITTED',
      isoClause: '8.4',
      deptCode: 'PUR',
      raisedById: isoManagerId,
      assignedToId: qhseId,
      rootCause: 'Supplier evaluation form template was updated but not communicated to Purchase team.',
      correctiveAction: 'Supplier evaluation forms completed for both vendors and filed in Purchase department.',
      preventiveAction: null,
      dueDate: daysFromNow(3),
    },
    {
      ncrNumber: 'CAP-2026-001',
      title: '[SAMPLE] Implement Document Control System',
      description: 'Previous audits noted absence of a formal document control system. AuditFlow ISO is the corrective action to address this finding.',
      type: 'CAPA',
      severity: 'CRITICAL',
      status: 'CLOSED',
      isoClause: '7.5',
      deptCode: 'IMS',
      raisedById: isoManagerId,
      assignedToId: isoManagerId,
      verifiedById: isoManagerId,
      closedById: isoManagerId,
      rootCause: 'No centralized document management system existed. Documents were stored on shared drives without version control.',
      correctiveAction: 'RECAFCO AuditFlow ISO deployed. All ISO documents migrated to controlled document library.',
      preventiveAction: 'Quarterly document library review scheduled. All document uploads require category and department assignment.',
      dueDate: daysAgo(10),
      verifiedAt: daysAgo(5),
      closedAt: daysAgo(3),
    },
    {
      ncrNumber: 'OBS-2026-001',
      title: '[SAMPLE] OBSERVATION: Emergency Exit Signage Update Recommended',
      description: 'Emergency exit signs in the production area are faded and should be replaced for better visibility, although they are still functional.',
      type: 'OBSERVATION',
      severity: 'MINOR',
      status: 'OPEN',
      isoClause: null,
      deptCode: 'IMS',
      raisedById: qhseId,
      assignedToId: mntManagerId,
      rootCause: null,
      correctiveAction: null,
      preventiveAction: null,
      dueDate: daysFromNow(30),
    },
  ];

  for (const nd of ncrDefs) {
    const existing = await prisma.ncrCapa.findFirst({ where: { ncrNumber: nd.ncrNumber } });
    if (!existing) {
      await prisma.ncrCapa.create({
        data: {
          ncrNumber: nd.ncrNumber,
          title: nd.title,
          description: nd.description,
          type: nd.type,
          severity: nd.severity,
          status: nd.status,
          isoClause: nd.isoClause ?? null,
          workspaceId: wsId,
          departmentId: deptMap.get(nd.deptCode) ?? null,
          raisedById: nd.raisedById,
          assignedToId: nd.assignedToId ?? null,
          verifiedById: nd.verifiedById ?? null,
          closedById: nd.closedById ?? null,
          rootCause: nd.rootCause ?? null,
          correctiveAction: nd.correctiveAction ?? null,
          preventiveAction: nd.preventiveAction ?? null,
          dueDate: nd.dueDate,
          verifiedAt: nd.verifiedAt ?? null,
          closedAt: nd.closedAt ?? null,
        },
      });
    }
  }
  console.log(`  ✓ ${ncrDefs.length} NCR/CAPA records`);

  // ── 10. Notifications ────────────────────────────────────────────────────

  console.log('→ Sample notifications...');
  const notifs = [
    {
      recipientId: hrManagerId,
      category: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: 'You have been assigned: [SAMPLE] Collect Contractor HSE Induction Records',
      entityType: 'TASK',
    },
    {
      recipientId: mntManagerId,
      category: 'TASK_OVERDUE',
      title: 'Task Overdue',
      message: '[SAMPLE] Update Maintenance Calibration Register is past its due date.',
      entityType: 'TASK',
    },
    {
      recipientId: isoManagerId,
      category: 'EVIDENCE_SUBMITTED',
      title: 'Evidence Submitted for Review',
      message: 'Sara Al-Mansoori submitted evidence for Clause 4.2 — Interested Parties Requirements.',
      entityType: 'CHECKLIST_EVIDENCE',
    },
    {
      recipientId: isoManagerId,
      category: 'DOCUMENT_REVIEW_PENDING',
      title: 'Document Pending Review',
      message: '[SAMPLE] Calibration Equipment Register has been submitted for your review.',
      entityType: 'DOCUMENT',
    },
    {
      recipientId: mntManagerId,
      category: 'NCR_ASSIGNED',
      title: 'NCR/CAPA Assigned to You',
      message: 'NCR-2026-001: Calibration Records Found Incomplete has been assigned to you.',
      entityType: 'NCR_CAPA',
    },
  ];

  for (const n of notifs) {
    const exists = await prisma.notification.findFirst({
      where: { recipientId: n.recipientId, category: n.category, title: n.title },
    });
    if (!exists) {
      await prisma.notification.create({ data: n });
    }
  }
  console.log(`  ✓ ${notifs.length} sample notifications`);

  // ── 11. Activity events ──────────────────────────────────────────────────

  console.log('→ Activity events...');
  const activities = [
    { entityType: 'WORKSPACE', actorId: isoManagerId, action: 'CREATED', summary: 'created workspace [SAMPLE] ISO Audit Readiness 2026' },
    { entityType: 'DOCUMENT',  actorId: isoManagerId, action: 'UPLOADED', summary: 'uploaded [SAMPLE] QHSE Policy Statement 2026' },
    { entityType: 'DOCUMENT',  actorId: hrManagerId,  action: 'UPLOADED', summary: 'uploaded [SAMPLE] HR Recruitment Procedure' },
    { entityType: 'NCR_CAPA',  actorId: isoManagerId, action: 'CREATED',  summary: 'raised NCR-2026-001: Calibration Records Found Incomplete' },
    { entityType: 'NCR_CAPA',  actorId: isoManagerId, action: 'VERIFIED', summary: 'verified NCR-2026-001 as resolved' },
    { entityType: 'DOCUMENT',  actorId: isoManagerId, action: 'APPROVED', summary: 'approved [SAMPLE] QHSE Policy Statement 2026' },
  ];

  for (const a of activities) {
    await prisma.activityEvent.create({
      data: {
        entityType: a.entityType,
        entityId: wsId,
        actorId: a.actorId,
        action: a.action,
        summary: a.summary,
      },
    });
  }
  console.log(`  ✓ ${activities.length} activity events`);

  // ── 12. Audit logs (drives the workspace Recent Activity feed) ────────────

  console.log('→ Audit log entries...');
  const existingLogCount = await prisma.auditLog.count({ where: { entityType: 'PROJECT', entityId: wsId } });
  if (existingLogCount === 0) {
    const firstTask = await prisma.task.findFirst({ where: { workspaceId: wsId }, orderBy: { createdAt: 'asc' } });
    const firstDoc  = await prisma.document.findFirst({ where: { workspaceId: wsId }, orderBy: { createdAt: 'asc' } });
    const firstNcr  = await prisma.ncrCapa.findFirst({ where: { workspaceId: wsId }, orderBy: { createdAt: 'asc' } });

    type LogDef = { actorId: string; action: string; entityType: string; entityId: string; newValue?: object; previousValue?: object };
    const auditLogDefs: LogDef[] = [
      { actorId: isoManagerId, action: 'CREATE', entityType: 'PROJECT', entityId: wsId,     newValue: { name: workspace!.name } },
      { actorId: isoManagerId, action: 'CREATE', entityType: 'PAGE',    entityId: imsPage!.id, newValue: { title: '[SAMPLE] IMS Overview', isHome: true } },
    ];
    if (hrPage)    auditLogDefs.push({ actorId: hrManagerId,  action: 'CREATE', entityType: 'PAGE',     entityId: hrPage.id,    newValue: { title: '[SAMPLE] HR Document Requirements' } });
    if (firstTask) auditLogDefs.push({ actorId: hrUserId,     action: 'CREATE', entityType: 'TASK',     entityId: firstTask.id, newValue: { title: firstTask.title, status: 'TODO' } });
    if (firstTask) auditLogDefs.push({ actorId: isoManagerId, action: 'UPDATE', entityType: 'TASK',     entityId: firstTask.id, previousValue: { status: 'TODO' }, newValue: { status: 'COMPLETED' } });
    if (firstDoc)  auditLogDefs.push({ actorId: isoManagerId, action: 'APPROVE',entityType: 'DOCUMENT', entityId: firstDoc.id,  newValue: { title: firstDoc.title } });
    if (firstNcr)  auditLogDefs.push({ actorId: isoManagerId, action: 'CREATE', entityType: 'NCR_CAPA', entityId: firstNcr.id,  newValue: { title: firstNcr.title } });

    for (const al of auditLogDefs) {
      await prisma.auditLog.create({
        data: { actorId: al.actorId, action: al.action, entityType: al.entityType, entityId: al.entityId, newValue: al.newValue ?? null, previousValue: al.previousValue ?? null },
      });
    }
    console.log(`  ✓ ${auditLogDefs.length} audit log entries`);
  } else {
    console.log(`  ↩ Audit logs already exist (${existingLogCount} found), skipping`);
  }

  // ── 13. Civil Engineering workspace (for demo: Ali Al-Ghamdi as MEMBER) ─────

  console.log('→ Civil Engineering workspace...');
  const staffId = userMap.get('staff_user')!; // Ali Al-Ghamdi — STAFF + MEMBER
  const civilDeptId = deptMap.get('PST') ?? deptMap.get('PRD') ?? null; // Project Site or Production

  let civilWs = await prisma.workspace.findFirst({ where: { name: '[SAMPLE] Civil Engineering – ISO Audit Readiness' } });
  if (!civilWs) {
    civilWs = await prisma.workspace.create({
      data: {
        name: '[SAMPLE] Civil Engineering – ISO Audit Readiness',
        description: 'Sample ISO audit readiness workspace for the Civil Engineering contracts team. Created for demo purposes.',
        status: 'ACTIVE',
        visibility: 'PRIVATE',
        ownerId: isoManagerId,
      },
    });
  }
  const cwsId = civilWs.id;
  console.log('  ✓ Civil workspace created');

  // Members: ISO Manager = OWNER (auto), hr_manager = MANAGER, staff = MEMBER, auditor = VIEWER
  const civilMemberDefs: Array<{ userId: string; roleInWorkspace: string }> = [
    { userId: isoManagerId, roleInWorkspace: 'OWNER' },
    { userId: hrManagerId,  roleInWorkspace: 'MANAGER' },
    { userId: staffId,      roleInWorkspace: 'MEMBER' },
  ];
  if (auditorId) civilMemberDefs.push({ userId: auditorId, roleInWorkspace: 'VIEWER' });
  for (const m of civilMemberDefs) {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: cwsId, userId: m.userId } },
      update: { roleInWorkspace: m.roleInWorkspace },
      create: { workspaceId: cwsId, userId: m.userId, roleInWorkspace: m.roleInWorkspace },
    });
  }
  console.log(`  ✓ ${civilMemberDefs.length} Civil workspace members (Ali Al-Ghamdi = MEMBER)`);

  // Task lists
  const civilTlDefs = [
    { name: 'Civil Contracts – Documentation', deptCode: 'PST', order: 1 },
    { name: 'Site Operations – HSE', deptCode: 'PRD', order: 2 },
    { name: 'QC / Inspection Records', deptCode: 'QC', order: 3 },
  ];
  const civilTlMap = new Map<string, string>();
  for (const tl of civilTlDefs) {
    let existing = await prisma.taskList.findFirst({ where: { workspaceId: cwsId, name: tl.name } });
    if (!existing) {
      existing = await prisma.taskList.create({
        data: {
          workspaceId: cwsId,
          departmentId: deptMap.get(tl.deptCode) ?? civilDeptId,
          name: tl.name,
          sortOrder: tl.order,
          createdById: isoManagerId,
        },
      });
    }
    civilTlMap.set(tl.deptCode, existing.id);
  }
  console.log('  ✓ 3 Civil task lists');

  // First task list ID for fallback
  const civilTlId = civilTlMap.get('PST') ?? civilTlMap.get('PRD') ?? civilTlMap.get('QC')!;
  const civilTl2Id = civilTlMap.get('PRD') ?? civilTlId;
  const civilTl3Id = civilTlMap.get('QC') ?? civilTlId;

  // Tasks: 1 overdue, 1 high priority, 1 completed, 2 open
  const civilTaskDefs = [
    {
      title: '[SAMPLE] Submit Civil Contract Review Records',
      taskListId: civilTlId,
      priority: 'CRITICAL',
      status: 'TODO',
      assigneeId: staffId,
      dueDate: daysAgo(3), // OVERDUE
    },
    {
      title: '[SAMPLE] Prepare HSE Inspection Checklists',
      taskListId: civilTl2Id,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigneeId: staffId,
      dueDate: daysFromNow(5),
    },
    {
      title: '[SAMPLE] Upload Site Safety Induction Records',
      taskListId: civilTl2Id,
      priority: 'MEDIUM',
      status: 'COMPLETED',
      assigneeId: staffId,
      dueDate: daysAgo(7),
      completedAt: daysAgo(5),
    },
    {
      title: '[SAMPLE] Review QC Inspection Reports – Q1 2026',
      taskListId: civilTl3Id,
      priority: 'HIGH',
      status: 'TODO',
      assigneeId: hrManagerId,
      dueDate: daysFromNow(10),
    },
    {
      title: '[SAMPLE] Audit Civil Subcontractor Approvals',
      taskListId: civilTlId,
      priority: 'MEDIUM',
      status: 'TODO',
      assigneeId: isoManagerId,
      dueDate: daysFromNow(14),
    },
  ];
  for (const td of civilTaskDefs) {
    const exists = await prisma.task.findFirst({ where: { taskListId: td.taskListId, title: td.title } });
    if (!exists) {
      await prisma.task.create({
        data: {
          workspaceId: cwsId,
          taskListId: td.taskListId,
          title: td.title,
          priority: td.priority,
          status: td.status,
          assigneeId: td.assigneeId,
          createdById: isoManagerId,
          dueDate: td.dueDate,
          completedAt: (td as { completedAt?: Date }).completedAt ?? null,
        },
      });
    }
  }
  console.log('  ✓ 5 Civil tasks (1 overdue, 1 high priority, 1 completed)');

  // Pages
  let civilHomePage = await prisma.page.findFirst({ where: { workspaceId: cwsId, title: '[SAMPLE] Civil Contracts – Audit Overview' } });
  if (!civilHomePage) {
    civilHomePage = await prisma.page.create({
      data: {
        workspaceId: cwsId,
        title: '[SAMPLE] Civil Contracts – Audit Overview',
        content: `# Civil Engineering Contracts – ISO Audit Readiness\n\nThis workspace tracks ISO audit readiness for the Civil Engineering Contracts department.\n\n## Key Focus Areas\n- Contract review records\n- Subcontractor approvals and evaluation\n- Site HSE inspection reports\n- QC records and inspection sign-offs\n\n## Team\n- ISO Manager: Ahmed Al-Rashidi (Owner)\n- HR Manager: Fatima Al-Zahra (Manager)\n- Site Coordinator: Ali Al-Ghamdi (Member)\n\n> Sample data for demo purposes only.`,
        isHome: true,
        sortOrder: 1,
        createdById: isoManagerId,
        updatedById: isoManagerId,
      },
    });
  }

  let civilSubPage = await prisma.page.findFirst({ where: { workspaceId: cwsId, title: '[SAMPLE] Subcontractor Approval Checklist' } });
  if (!civilSubPage) {
    civilSubPage = await prisma.page.create({
      data: {
        workspaceId: cwsId,
        parentId: civilHomePage.id,
        title: '[SAMPLE] Subcontractor Approval Checklist',
        content: `# Subcontractor Approval Checklist\n\nRequired for ISO 8.4 compliance.\n\n| Subcontractor | Evaluation Done | Approved | CR No. |\n|---|---|---|---|\n| Al-Faris Construction | Yes | Yes | CR-2026-01 |\n| Gulf Civil Works | Pending | No | — |\n\n> Sample data only.`,
        sortOrder: 1,
        createdById: hrManagerId,
        updatedById: hrManagerId,
      },
    });
  }
  console.log('  ✓ 2 Civil pages (1 home, 1 sub-page)');

  // Documents: 1 approved, 1 under review
  const civilDocDefs = [
    {
      title: '[SAMPLE] Civil Contract Review Procedure',
      documentNumber: 'CIV-PRC-001',
      category: 'PROCEDURE',
      status: 'APPROVED',
      ownerId: hrManagerId,
    },
    {
      title: '[SAMPLE] Subcontractor Evaluation Form',
      documentNumber: 'CIV-FRM-001',
      category: 'FORM',
      status: 'UNDER_REVIEW',
      ownerId: isoManagerId,
    },
  ];
  for (const dd of civilDocDefs) {
    const existing = await prisma.document.findFirst({ where: { documentNumber: dd.documentNumber } });
    if (!existing) {
      const doc = await prisma.document.create({
        data: {
          title: dd.title,
          documentNumber: dd.documentNumber,
          category: dd.category,
          status: dd.status,
          departmentId: civilDeptId,
          workspaceId: cwsId,
          ownerId: dd.ownerId,
          createdById: dd.ownerId,
          description: 'Sample Civil Engineering document for demo.',
        },
      });
      const version = await prisma.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          originalFileName: `${dd.documentNumber}-v1-SAMPLE.pdf`,
          storedFileName: `SAMPLE_NO_FILE_${doc.id}.pdf`,
          storagePath: 'SAMPLE_DATA_NO_FILE',
          mimeType: 'application/pdf',
          fileSize: 0,
          uploadedById: dd.ownerId,
        },
      });
      await prisma.document.update({ where: { id: doc.id }, data: { currentVersionId: version.id } });
    }
  }
  console.log('  ✓ 2 Civil documents (1 approved, 1 under review)');

  // Checklist with 5 items + evidence
  let civilChecklist = await prisma.auditChecklist.findFirst({ where: { name: '[SAMPLE] Civil Contracts ISO Checklist' } });
  if (!civilChecklist) {
    civilChecklist = await prisma.auditChecklist.create({
      data: {
        name: '[SAMPLE] Civil Contracts ISO Checklist',
        description: 'ISO audit checklist for Civil Engineering Contracts team.',
        isoStandard: 'ISO 9001:2015',
        workspaceId: cwsId,
        createdById: isoManagerId,
      },
    });
  }

  const civilChecklistItems = [
    { title: '[SAMPLE] CIV-Cl.4.1 — Organisation Context for Civil Contracts', isoClause: '4.1', evidenceStatus: 'APPROVED', responsibleId: hrManagerId, reviewerId: isoManagerId },
    { title: '[SAMPLE] CIV-Cl.8.4 — Subcontractor Control and Evaluation', isoClause: '8.4', evidenceStatus: 'SUBMITTED', responsibleId: staffId, reviewerId: hrManagerId },
    { title: '[SAMPLE] CIV-Cl.7.5 — Control of Documented Information', isoClause: '7.5', evidenceStatus: 'MISSING', responsibleId: staffId, reviewerId: isoManagerId },
    { title: '[SAMPLE] CIV-Cl.9.1 — QC Monitoring and Measurement', isoClause: '9.1', evidenceStatus: 'MISSING', responsibleId: hrManagerId, reviewerId: isoManagerId },
    { title: '[SAMPLE] CIV-Cl.10.2 — NCR and Corrective Actions', isoClause: '10.2', evidenceStatus: 'APPROVED', responsibleId: isoManagerId, reviewerId: isoManagerId },
  ];

  for (let i = 0; i < civilChecklistItems.length; i++) {
    const ci = civilChecklistItems[i];
    let item = await prisma.auditChecklistItem.findFirst({ where: { checklistId: civilChecklist.id, title: ci.title } });
    if (!item) {
      item = await prisma.auditChecklistItem.create({
        data: {
          checklistId: civilChecklist.id,
          departmentId: civilDeptId,
          title: ci.title,
          isoClause: ci.isoClause,
          responsibleUserId: ci.responsibleId,
          reviewerId: ci.reviewerId,
          status: ci.evidenceStatus === 'MISSING' ? 'MISSING' : ci.evidenceStatus === 'SUBMITTED' ? 'SUBMITTED' : ci.evidenceStatus === 'APPROVED' ? 'APPROVED' : 'MISSING',
          dueDate: daysFromNow(20),
          sortOrder: i + 1,
          createdById: isoManagerId,
          reviewedAt: ci.evidenceStatus === 'APPROVED' ? daysAgo(1) : null,
        },
      });
    }
    if (ci.evidenceStatus !== 'MISSING') {
      const evidenceExists = await prisma.checklistEvidence.findFirst({ where: { checklistItemId: item.id } });
      if (!evidenceExists) {
        await prisma.checklistEvidence.create({
          data: {
            checklistItemId: item.id,
            submittedById: ci.responsibleId,
            status: ci.evidenceStatus,
            notes: `[SAMPLE] Evidence for ${ci.isoClause}. Demo data only.`,
            reviewerId: ci.evidenceStatus === 'APPROVED' ? ci.reviewerId : null,
            reviewedAt: ci.evidenceStatus === 'APPROVED' ? daysAgo(1) : null,
          },
        });
      }
    }
  }
  console.log('  ✓ 5 Civil checklist items (2 approved, 1 submitted, 2 missing)');

  // 1 open NCR/CAPA
  const civilNcrExists = await prisma.ncrCapa.findFirst({ where: { ncrNumber: 'NCR-CIV-001' } });
  if (!civilNcrExists) {
    await prisma.ncrCapa.create({
      data: {
        ncrNumber: 'NCR-CIV-001',
        title: '[SAMPLE] Missing Subcontractor Evaluation Records',
        description: 'Subcontractor evaluation forms were not completed for 2 vendors used on the Q1 2026 civil project as required by ISO 8.4.',
        type: 'NCR',
        severity: 'MAJOR',
        status: 'OPEN',
        isoClause: '8.4',
        workspaceId: cwsId,
        departmentId: civilDeptId,
        raisedById: isoManagerId,
        assignedToId: staffId,
        dueDate: daysFromNow(7),
      },
    });
  }
  console.log('  ✓ 1 open NCR/CAPA for Civil workspace');

  // Audit log entries for Civil workspace
  const civilLogCount = await prisma.auditLog.count({ where: { entityType: 'PROJECT', entityId: cwsId } });
  if (civilLogCount === 0) {
    await prisma.auditLog.createMany({
      data: [
        { actorId: isoManagerId, action: 'CREATE', entityType: 'PROJECT', entityId: cwsId, newValue: { name: civilWs.name } },
        { actorId: staffId,      action: 'CREATE', entityType: 'TASK',    entityId: cwsId, newValue: { title: '[SAMPLE] Prepare HSE Inspection Checklists' } },
        { actorId: hrManagerId,  action: 'APPROVE', entityType: 'DOCUMENT', entityId: cwsId, newValue: { title: '[SAMPLE] Civil Contract Review Procedure' } },
        { actorId: isoManagerId, action: 'CREATE', entityType: 'NCR_CAPA', entityId: cwsId, newValue: { title: '[SAMPLE] Missing Subcontractor Evaluation Records' } },
      ],
    });
  }
  console.log('  ✓ Civil audit log entries');

  // ─── Done ─────────────────────────────────────────────────────────────────

  console.log('\n✅ Demo seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Demo User Credentials (password: Demo@12345)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const u of DEMO_USERS) {
    console.log(`  ${u.role.padEnd(20)} ${u.email}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ⚠ All users must change password on first login.');
  console.log('  ⚠ All records are marked [SAMPLE] and are for demo only.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
