import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RealtimeService } from '../realtime/realtime.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

const PAGE_SELECT = {
  id: true,
  title: true,
  content: true,
  workspaceId: true,
  parentId: true,
  isHome: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, fullName: true } },
  children: {
    select: {
      id: true, title: true, parentId: true, sortOrder: true, createdAt: true, updatedAt: true, isHome: true,
      children: { select: { id: true, title: true, parentId: true, sortOrder: true, createdAt: true, isHome: true }, orderBy: { sortOrder: 'asc' as const } },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
};

// ─── Static page templates ────────────────────────────────────────────────────

const PAGE_TEMPLATES: Array<{ id: string; name: string; description: string; content: string }> = [
  {
    id: 'iso-procedure',
    name: 'ISO Procedure',
    description: 'Standard operating procedure template for ISO compliance',
    content: `# Procedure Title

## 1. Purpose
Describe the purpose of this procedure.

## 2. Scope
Define who this procedure applies to and what it covers.

## 3. Responsibilities
List the roles and responsibilities involved.

## 4. Procedure
Step-by-step instructions.

### 4.1 Step One
Detail the first step.

### 4.2 Step Two
Detail the second step.

## 5. References
List related standards, documents, or procedures.

## 6. Revision History
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | ${new Date().toISOString().slice(0, 10)} | | Initial draft |`,
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Template for recording meeting minutes and action items',
    content: `# Meeting Notes

**Date:** ${new Date().toISOString().slice(0, 10)}
**Time:**
**Location / Link:**
**Facilitator:**
**Attendees:**

---

## Agenda
1.
2.
3.

## Discussion & Decisions
### Item 1
*Discussion:*

*Decision:*

### Item 2
*Discussion:*

*Decision:*

## Action Items
| Action | Responsible | Due Date | Status |
|--------|-------------|----------|--------|
|  |  |  | Pending |

## Next Meeting
**Date:**
**Agenda:** `,
  },
  {
    id: 'audit-preparation',
    name: 'Audit Preparation Notes',
    description: 'Checklist and notes template for ISO audit preparation',
    content: `# Audit Preparation Notes

**Audit Date:**
**Standard:**
**Scope:**
**Lead Auditor:**

---

## Pre-Audit Checklist
- [ ] Document register is up to date
- [ ] Evidence files are organised and accessible
- [ ] Corrective actions from previous audit are closed
- [ ] Team members are briefed on audit scope
- [ ] Audit schedule is communicated
- [ ] Non-conformities register is current

## Key Documents to Prepare
| Document | Status | Location | Notes |
|----------|--------|----------|-------|
|  |  |  |  |

## Known Risks / Gaps
List any known issues that may be raised during the audit.

1.
2.

## Contacts During Audit
| Role | Name | Area |
|------|------|------|
|  |  |  |

## Post-Audit Actions
*To be filled after the audit.*`,
  },
  {
    id: 'department-home',
    name: 'Department Home',
    description: 'Home page template for a department workspace',
    content: `# Department Workspace

Welcome to the **[Department Name]** workspace.

---

## Overview
Brief description of this department and its role in the organisation.

## Key Contacts
| Role | Name | Email |
|------|------|-------|
| Head of Department |  |  |
| ISO Coordinator |  |  |

## Quick Links
- [Task Lists](#)
- [Documents](#)
- [Audit Checklist](#)

## Important Notices
> Add any important notices or announcements here.

## ISO Responsibilities
List the ISO clauses or areas this department is responsible for.`,
  },
];

@Injectable()
export class PagesService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private realtime: RealtimeService,
    private workspaces: WorkspacesService,
  ) {}

  async findAllForWorkspace(
    workspaceId: string,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ) {
    await this.workspaces.assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId);
    return this.prisma.page.findMany({
      where: { workspaceId, parentId: null },
      select: PAGE_SELECT,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
      select: PAGE_SELECT,
    });
    if (!page) throw new NotFoundException(`Page ${id} not found`);
    return page;
  }

  async create(
    workspaceId: string,
    dto: CreatePageDto,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
    actorPermissions: string[] = [],
  ) {
    await this.workspaces.assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId);
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    if (!isElevated && !actorPermissions.includes('pages.create')) {
      const canCollab = await this.workspaces.canCollaborateInWorkspace(actorId, workspaceId, actorRoles, actorDeptId);
      if (!canCollab) throw new ForbiddenException('Workspace collaboration permission required to create pages');
    }
    const maxOrder = await this.prisma.page.aggregate({
      where: { workspaceId, parentId: dto.parentId ?? null },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const page = await this.prisma.page.create({
      data: {
        workspaceId,
        parentId: dto.parentId ?? null,
        title: dto.title,
        content: dto.content ?? null,
        sortOrder: dto.sortOrder ?? nextOrder,
        createdById: actorId,
        updatedById: actorId,
      },
      select: PAGE_SELECT,
    });

    await this.auditLog.log({
      actorId,
      action: 'CREATED',
      entityType: dto.parentId ? 'SUB_PAGE' : 'PAGE',
      entityId: page.id,
      newValue: { title: dto.title, workspaceId },
    });

    return page;
  }

  async update(
    id: string,
    dto: UpdatePageDto,
    actorId: string,
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
    actorPermissions: string[] = [],
  ) {
    const existing = await this.prisma.page.findUnique({ where: { id }, select: { id: true, title: true, workspaceId: true } });
    if (!existing) throw new NotFoundException(`Page ${id} not found`);
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    if (!isElevated && !actorPermissions.includes('pages.update')) {
      const canCollab = await this.workspaces.canCollaborateInWorkspace(actorId, existing.workspaceId, actorRoles, actorDeptId);
      if (!canCollab) throw new ForbiddenException('Workspace collaboration permission required to edit pages');
    }

    const page = await this.prisma.page.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        updatedById: actorId,
      },
      select: PAGE_SELECT,
    });

    await this.auditLog.log({
      actorId,
      action: 'UPDATED',
      entityType: 'PAGE',
      entityId: id,
      previousValue: { title: existing.title },
      newValue: { title: dto.title },
    });

    this.realtime.emitToWorkspace(page.workspaceId, 'page.updated', {
      id: page.id, workspaceId: page.workspaceId, actorId,
    });

    return page;
  }

  async delete(id: string, actorId: string) {
    const existing = await this.prisma.page.findUnique({
      where: { id },
      select: { id: true, title: true, workspaceId: true, _count: { select: { children: true } } },
    });
    if (!existing) throw new NotFoundException(`Page ${id} not found`);
    if (existing._count.children > 0) {
      throw new ForbiddenException('Cannot delete a page that has sub-pages. Delete sub-pages first.');
    }

    await this.prisma.page.delete({ where: { id } });

    void this.auditLog.log({
      actorId,
      action: 'DELETED',
      entityType: 'PAGE',
      entityId: id,
      previousValue: { title: existing.title },
    });

    this.realtime.emitToWorkspace(existing.workspaceId, 'page.deleted', {
      id, workspaceId: existing.workspaceId, actorId,
    });
  }

  // ─── Templates ───────────────────────────────────────────────────────────────

  getTemplates() {
    return PAGE_TEMPLATES.map(({ id, name, description }) => ({ id, name, description }));
  }

  async createFromTemplate(
    workspaceId: string,
    templateId: string,
    parentId: string | null,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
    actorPermissions: string[] = [],
  ) {
    await this.workspaces.assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId);
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    if (!isElevated && !actorPermissions.includes('pages.create')) {
      const canCollab = await this.workspaces.canCollaborateInWorkspace(actorId, workspaceId, actorRoles, actorDeptId);
      if (!canCollab) throw new ForbiddenException('Workspace collaboration permission required to create pages');
    }

    const template = PAGE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) throw new NotFoundException(`Template "${templateId}" not found`);

    const maxOrder = await this.prisma.page.aggregate({
      where: { workspaceId, parentId: parentId ?? null },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const page = await this.prisma.page.create({
      data: {
        workspaceId,
        parentId: parentId ?? null,
        title: template.name,
        content: template.content,
        sortOrder: nextOrder,
        createdById: actorId,
        updatedById: actorId,
      },
      select: PAGE_SELECT,
    });

    await this.auditLog.log({
      actorId,
      action: 'CREATED',
      entityType: 'PAGE',
      entityId: page.id,
      newValue: { title: page.title, workspaceId, templateId },
    });

    this.realtime.emitToWorkspace(workspaceId, 'page.updated', {
      id: page.id, workspaceId, actorId,
    });

    return page;
  }
}
