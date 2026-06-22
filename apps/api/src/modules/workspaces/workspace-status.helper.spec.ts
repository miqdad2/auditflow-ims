import { computeWorkspaceOperationalStatus, endOfDayKuwait, WorkspaceMetrics } from './workspace-status.helper';

// ── Helper factories ─────────────────────────────────────────────────────────

function activeWorkspace(overrides: Partial<WorkspaceMetrics> = {}): WorkspaceMetrics {
  return {
    lifecycleStatus:            'ACTIVE',
    hasDepartment:              true,
    departmentIsActive:         true,
    operationalMembers:         3,
    openTasks:                  0,
    inProgressTasks:            0,
    unassignedTasks:            0,
    overdueCriticalHighTasks:   0,
    overdueMediumLowTasks:      0,
    waitingReviewTasks:         0,
    returnedTasks:              0,
    completedTasks:             0,
    documentsUnderReview:       0,
    overdueIssues:              0,
    openIssues:                 0,
    issuesWaitingVerification:  0,
    expiredFiles:               0,
    expiringFiles:              0,
    ...overrides,
  };
}

// ── 1. Archived workspace → INACTIVE ─────────────────────────────────────────

describe('INACTIVE', () => {
  it('returns INACTIVE for ARCHIVED lifecycle status', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ lifecycleStatus: 'ARCHIVED' }));
    expect(r.status).toBe('INACTIVE');
    expect(r.reasons).toHaveLength(0);
  });

  it('returns INACTIVE regardless of other metrics when archived', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      lifecycleStatus: 'ARCHIVED',
      expiredFiles: 5, overdueIssues: 3, overdueCriticalHighTasks: 2,
    }));
    expect(r.status).toBe('INACTIVE');
  });
});

// ── 2. SETUP_REQUIRED ────────────────────────────────────────────────────────

describe('SETUP_REQUIRED', () => {
  it('returns SETUP_REQUIRED when department is missing', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ hasDepartment: false }));
    expect(r.status).toBe('SETUP_REQUIRED');
    expect(r.reasons.some((x) => x.code === 'DEPARTMENT_NOT_ASSIGNED')).toBe(true);
  });

  it('returns SETUP_REQUIRED when assigned department is inactive', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ hasDepartment: true, departmentIsActive: false }));
    expect(r.status).toBe('SETUP_REQUIRED');
    expect(r.reasons.some((x) => x.code === 'DEPARTMENT_INACTIVE')).toBe(true);
  });

  it('returns SETUP_REQUIRED when no operational members', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ operationalMembers: 0 }));
    expect(r.status).toBe('SETUP_REQUIRED');
    expect(r.reasons.some((x) => x.code === 'NO_OPERATIONAL_MEMBERS')).toBe(true);
  });

  it('returns SETUP_REQUIRED with multiple reasons when both dept and members missing', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ hasDepartment: false, operationalMembers: 0 }));
    expect(r.status).toBe('SETUP_REQUIRED');
    expect(r.reasons).toHaveLength(2);
  });

  it('SETUP_REQUIRED takes precedence over CRITICAL conditions', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      operationalMembers: 0,
      expiredFiles: 5,
      overdueCriticalHighTasks: 3,
    }));
    expect(r.status).toBe('SETUP_REQUIRED');
  });
});

// ── 3. CRITICAL ──────────────────────────────────────────────────────────────

describe('CRITICAL', () => {
  it('returns CRITICAL when expired files exist', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ expiredFiles: 1 }));
    expect(r.status).toBe('CRITICAL');
    expect(r.reasons.some((x) => x.code === 'EXPIRED_FILES')).toBe(true);
    expect(r.reasons.find((x) => x.code === 'EXPIRED_FILES')?.count).toBe(1);
  });

  it('returns CRITICAL when overdue issues exist', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ overdueIssues: 2, openIssues: 2 }));
    expect(r.status).toBe('CRITICAL');
    expect(r.reasons.some((x) => x.code === 'OVERDUE_ISSUES')).toBe(true);
  });

  it('returns CRITICAL when overdue HIGH/CRITICAL priority tasks exist', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ overdueCriticalHighTasks: 1 }));
    expect(r.status).toBe('CRITICAL');
    expect(r.reasons.some((x) => x.code === 'OVERDUE_HIGH_TASKS')).toBe(true);
  });

  it('accumulates multiple CRITICAL reasons', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      expiredFiles: 3, overdueIssues: 1, overdueCriticalHighTasks: 2,
      openIssues: 1,
    }));
    expect(r.status).toBe('CRITICAL');
    expect(r.reasons).toHaveLength(3);
  });

  it('CRITICAL takes precedence over NEEDS_ATTENTION conditions', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      expiredFiles: 1,
      unassignedTasks: 5, documentsUnderReview: 3,
    }));
    expect(r.status).toBe('CRITICAL');
  });
});

// ── 4. NEEDS_ATTENTION ───────────────────────────────────────────────────────

describe('NEEDS_ATTENTION', () => {
  it('returns NEEDS_ATTENTION when unassigned tasks exist', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ unassignedTasks: 2, openTasks: 2 }));
    expect(r.status).toBe('NEEDS_ATTENTION');
    expect(r.reasons.some((x) => x.code === 'UNASSIGNED_TASKS')).toBe(true);
    expect(r.reasons.find((x) => x.code === 'UNASSIGNED_TASKS')?.count).toBe(2);
  });

  it('returns NEEDS_ATTENTION when medium/low priority tasks are overdue', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ overdueMediumLowTasks: 1 }));
    expect(r.status).toBe('NEEDS_ATTENTION');
    expect(r.reasons.some((x) => x.code === 'OVERDUE_TASKS')).toBe(true);
  });

  it('returns NEEDS_ATTENTION when tasks are waiting review', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ waitingReviewTasks: 3 }));
    expect(r.status).toBe('NEEDS_ATTENTION');
    expect(r.reasons.some((x) => x.code === 'WAITING_REVIEW')).toBe(true);
  });

  it('returns NEEDS_ATTENTION when tasks are returned for correction', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ returnedTasks: 1 }));
    expect(r.status).toBe('NEEDS_ATTENTION');
    expect(r.reasons.some((x) => x.code === 'RETURNED_TASKS')).toBe(true);
  });

  it('returns NEEDS_ATTENTION when files are expiring soon', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ expiringFiles: 2 }));
    expect(r.status).toBe('NEEDS_ATTENTION');
    expect(r.reasons.some((x) => x.code === 'EXPIRING_FILES')).toBe(true);
  });

  it('returns NEEDS_ATTENTION when documents under review', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ documentsUnderReview: 1 }));
    expect(r.status).toBe('NEEDS_ATTENTION');
    expect(r.reasons.some((x) => x.code === 'DOCS_UNDER_REVIEW')).toBe(true);
  });

  it('returns NEEDS_ATTENTION when issues waiting verification', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      openIssues: 1, issuesWaitingVerification: 1,
    }));
    expect(r.status).toBe('NEEDS_ATTENTION');
    expect(r.reasons.some((x) => x.code === 'ISSUES_WAITING_VERIFICATION')).toBe(true);
  });

  it('includes OPEN_ISSUES for non-waiting-verification open issues', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      openIssues: 3, issuesWaitingVerification: 1,
    }));
    expect(r.status).toBe('NEEDS_ATTENTION');
    expect(r.reasons.some((x) => x.code === 'OPEN_ISSUES')).toBe(true);
    expect(r.reasons.find((x) => x.code === 'OPEN_ISSUES')?.count).toBe(2);
  });
});

// ── 5. IN_PROGRESS ───────────────────────────────────────────────────────────

describe('IN_PROGRESS', () => {
  it('returns IN_PROGRESS when tasks are in progress with no issues', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ inProgressTasks: 4, openTasks: 4 }));
    expect(r.status).toBe('IN_PROGRESS');
    expect(r.reasons.some((x) => x.code === 'TASKS_IN_PROGRESS')).toBe(true);
    expect(r.reasons.find((x) => x.code === 'TASKS_IN_PROGRESS')?.count).toBe(4);
  });

  it('IN_PROGRESS loses to NEEDS_ATTENTION', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      inProgressTasks: 2, openTasks: 4, unassignedTasks: 1,
    }));
    expect(r.status).toBe('NEEDS_ATTENTION');
  });
});

// ── 6. HEALTHY ───────────────────────────────────────────────────────────────

describe('HEALTHY', () => {
  it('returns HEALTHY when no issues at all', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace());
    expect(r.status).toBe('HEALTHY');
    expect(r.reasons).toHaveLength(0);
  });

  it('returns HEALTHY when all tasks are completed (openTasks=0, inProgressTasks=0)', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ openTasks: 0, inProgressTasks: 0 }));
    expect(r.status).toBe('HEALTHY');
  });
});

// ── 7. Metrics passthrough ───────────────────────────────────────────────────

describe('metrics passthrough', () => {
  it('returns combined overdueTasks count in metrics', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      overdueCriticalHighTasks: 2, overdueMediumLowTasks: 3,
    }));
    expect(r.metrics.overdueTasks).toBe(5);
  });

  it('returns correct operationalMembers in metrics', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ operationalMembers: 7 }));
    expect(r.metrics.operationalMembers).toBe(7);
  });
});

// ── 8. endOfDayKuwait ────────────────────────────────────────────────────────

describe('endOfDayKuwait', () => {
  it('returns a date after the input date (same day end)', () => {
    const d = new Date('2026-06-22T10:00:00Z');
    const eod = endOfDayKuwait(d);
    expect(eod > d).toBe(true);
  });

  it('end-of-day Kuwait is 20:59:59.999 UTC (23:59:59.999 UTC+3)', () => {
    const d = new Date('2026-06-22T10:00:00Z');
    const eod = endOfDayKuwait(d);
    expect(eod.getUTCHours()).toBe(20);
    expect(eod.getUTCMinutes()).toBe(59);
    expect(eod.getUTCSeconds()).toBe(59);
  });
});

// ── 9. Reference task exclusion (engine-level contract) ──────────────────────

describe('reference task exclusion (contract)', () => {
  it('overdueCriticalHighTasks=0 with all reference tasks → does not trigger CRITICAL', () => {
    // The engine receives pre-filtered metrics where reference tasks are excluded.
    // If the service correctly excludes reference tasks, overdueCriticalHighTasks stays 0.
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ overdueCriticalHighTasks: 0 }));
    expect(r.status).not.toBe('CRITICAL');
  });

  it('unassignedTasks=0 with all reference tasks → does not trigger NEEDS_ATTENTION', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ unassignedTasks: 0 }));
    expect(r.status).not.toBe('NEEDS_ATTENTION');
  });
});

// ── 10. Unit 59.2 — Business-reason suppression fix ──────────────────────────
// Verifies that business attention reasons are included even when SETUP_REQUIRED wins.

describe('Unit 59.2 — business reasons preserved under SETUP_REQUIRED', () => {
  it('includes unassigned-tasks reason under SETUP_REQUIRED (no department)', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      hasDepartment: false,
      unassignedTasks: 2,
      openTasks: 3,
    }));
    expect(r.status).toBe('SETUP_REQUIRED');
    // Setup reason present
    expect(r.reasons.some((x) => x.code === 'DEPARTMENT_NOT_ASSIGNED')).toBe(true);
    // Business reason also present — not suppressed
    expect(r.reasons.some((x) => x.code === 'UNASSIGNED_TASKS')).toBe(true);
    expect(r.reasons.find((x) => x.code === 'UNASSIGNED_TASKS')?.count).toBe(2);
  });

  it('includes multiple business reasons under SETUP_REQUIRED (no members)', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      operationalMembers: 0,
      unassignedTasks: 1,
      returnedTasks: 2,
      openTasks: 3,
    }));
    expect(r.status).toBe('SETUP_REQUIRED');
    expect(r.reasons.some((x) => x.code === 'NO_OPERATIONAL_MEMBERS')).toBe(true);
    expect(r.reasons.some((x) => x.code === 'UNASSIGNED_TASKS')).toBe(true);
    expect(r.reasons.some((x) => x.code === 'RETURNED_TASKS')).toBe(true);
  });

  it('shows no business reasons when workspace is setup-incomplete but has no work items', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ hasDepartment: false }));
    expect(r.status).toBe('SETUP_REQUIRED');
    const businessCodes = ['UNASSIGNED_TASKS', 'OVERDUE_TASKS', 'EXPIRED_FILES', 'OPEN_ISSUES'];
    expect(r.reasons.some((x) => businessCodes.includes(x.code))).toBe(false);
  });

  it('SETUP_REQUIRED + overdue critical tasks: status stays SETUP_REQUIRED, business reason present', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      hasDepartment: false,
      overdueCriticalHighTasks: 1,
    }));
    expect(r.status).toBe('SETUP_REQUIRED');
    expect(r.reasons.some((x) => x.code === 'OVERDUE_HIGH_TASKS')).toBe(true);
  });

  it('SETUP_REQUIRED + expiring files: status stays SETUP_REQUIRED, expiring-files reason included', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      operationalMembers: 0,
      expiringFiles: 3,
    }));
    expect(r.status).toBe('SETUP_REQUIRED');
    expect(r.reasons.some((x) => x.code === 'EXPIRING_FILES')).toBe(true);
    expect(r.reasons.find((x) => x.code === 'EXPIRING_FILES')?.count).toBe(3);
  });

  it('setup reasons are always first in the reasons array', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      hasDepartment: false,
      unassignedTasks: 2,
      openTasks: 2,
    }));
    expect(r.status).toBe('SETUP_REQUIRED');
    // First reason must be a setup code
    expect(['DEPARTMENT_NOT_ASSIGNED', 'DEPARTMENT_INACTIVE', 'NO_OPERATIONAL_MEMBERS']).toContain(r.reasons[0]?.code);
  });
});

// ── 11. Unit 59.2 — Operational member definition ────────────────────────────
// Documents that operationalMembers is passed through transparently from the service layer.
// The engine's NO_OPERATIONAL_MEMBERS fires only when operationalMembers === 0.

describe('Unit 59.2 — operational member count', () => {
  it('operationalMembers=1 → no NO_OPERATIONAL_MEMBERS reason', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ operationalMembers: 1 }));
    expect(r.status).not.toBe('SETUP_REQUIRED');
    expect(r.reasons.some((x) => x.code === 'NO_OPERATIONAL_MEMBERS')).toBe(false);
  });

  it('operationalMembers=0 → SETUP_REQUIRED with NO_OPERATIONAL_MEMBERS', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ operationalMembers: 0 }));
    expect(r.status).toBe('SETUP_REQUIRED');
    expect(r.reasons.some((x) => x.code === 'NO_OPERATIONAL_MEMBERS')).toBe(true);
  });

  it('metrics.operationalMembers is preserved from input', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ operationalMembers: 5 }));
    expect(r.metrics.operationalMembers).toBe(5);
  });
});

// ── 12. Unit 59.2 — Relationship separation (contract documentation) ─────────

describe('Unit 59.2 — relationship separation contracts', () => {
  it('workspace with department, no members: SETUP_REQUIRED for members only', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      hasDepartment: true,
      departmentIsActive: true,
      operationalMembers: 0,
    }));
    expect(r.status).toBe('SETUP_REQUIRED');
    expect(r.reasons.some((x) => x.code === 'NO_OPERATIONAL_MEMBERS')).toBe(true);
    expect(r.reasons.some((x) => x.code === 'DEPARTMENT_NOT_ASSIGNED')).toBe(false);
  });

  it('workspace with members, no department: SETUP_REQUIRED for department only', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({
      hasDepartment: false,
      operationalMembers: 3,
    }));
    expect(r.status).toBe('SETUP_REQUIRED');
    expect(r.reasons.some((x) => x.code === 'DEPARTMENT_NOT_ASSIGNED')).toBe(true);
    expect(r.reasons.some((x) => x.code === 'NO_OPERATIONAL_MEMBERS')).toBe(false);
  });

  it('fully setup workspace with no work items: HEALTHY', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace());
    expect(r.status).toBe('HEALTHY');
    expect(r.reasons).toHaveLength(0);
  });
});

// ── 13. Unit 62.2 — Task summary metrics (completedTasks, totalTasks) ────────

describe('Unit 62.2 — task summary metrics', () => {
  it('62.2-T1: completedTasks is passed through from input', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ completedTasks: 5 }));
    expect(r.metrics.completedTasks).toBe(5);
  });

  it('62.2-T2: totalTasks = openTasks + completedTasks', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ openTasks: 3, completedTasks: 2 }));
    expect(r.metrics.totalTasks).toBe(5);
  });

  it('62.2-T3: totalTasks is 0 when workspace has no tasks', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ openTasks: 0, completedTasks: 0 }));
    expect(r.metrics.totalTasks).toBe(0);
  });

  it('62.2-T4: completedTasks does not affect operational status (HEALTHY when only completed work)', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ completedTasks: 100 }));
    expect(r.status).toBe('HEALTHY');
  });

  it('62.2-T5: completedTasks excluded from openTasks — both preserved as separate counts', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ openTasks: 3, completedTasks: 5 }));
    expect(r.metrics.openTasks).toBe(3);
    expect(r.metrics.completedTasks).toBe(5);
    expect(r.metrics.totalTasks).toBe(8);
  });

  it('62.2-T6: totalTasks correct when completedTasks is 0', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ openTasks: 4, completedTasks: 0 }));
    expect(r.metrics.totalTasks).toBe(4);
  });

  it('62.2-T7: totalTasks correct when openTasks is 0 but completedTasks > 0', () => {
    const r = computeWorkspaceOperationalStatus(activeWorkspace({ openTasks: 0, completedTasks: 3 }));
    expect(r.metrics.totalTasks).toBe(3);
  });
});
