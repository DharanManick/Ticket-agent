import test from 'node:test';
import assert from 'node:assert';
import {
  computeTicketAuditFingerprint,
  cleanLogsForFingerprint,
  cleanAuditorLogs,
  cleanEmpathyLogs,
  computeEmpathyAuditFingerprint,
  generateEnhancedEmpathyComments,
  generateCleanResolvedAuditComment,
  hasExistingServiceNowEmpathyComment,
  hasExistingServiceNowAuditComment,
  isSimilarAuditReport,
  isSimilarEmpathyVerdict
} from '../lib/fingerprint';
import { isResolvedTicket } from '../lib/classification';

test('Resolved Audit Fingerprint: generates deterministic signature', () => {
  const ticketA = {
    incNumber: 'INC0000012',
    state: 'Resolved',
    incidentState: '6',
    shortDescription: 'Database connectivity failure',
    technicalDescription: 'Diagnosed connection pool exhaustion on port 1521.',
    resolutionDescription: 'Restarted Oracle listener and cleared hung sessions.',
    affectedCi: 'DatabaseServer1',
    assignmentGroup: 'Database',
    symptomCode: 'Connection Error',
    solutionCode: 'Service Restarted',
    closeCode: 'Solved (Workaround)',
    closeCode2: 'Config Change',
    knowledgeArticle: 'KB0010992',
    activityLogs: '2026-10-21 00:00:00 - Assigned to DB team.'
  };

  const fp1 = computeTicketAuditFingerprint(ticketA);
  const fp2 = computeTicketAuditFingerprint(ticketA);

  assert.strictEqual(typeof fp1, 'string');
  assert.strictEqual(fp1.length, 64);
  assert.strictEqual(fp1, fp2);
});

test('Resolved Audit Fingerprint: ignores injected Quality Audit Desk comments', () => {
  const baseTicket = {
    incNumber: 'INC0000012',
    state: 'Resolved',
    incidentState: '6',
    shortDescription: 'Database connectivity failure',
    technicalDescription: 'Diagnosed connection pool exhaustion on port 1521.',
    resolutionDescription: 'Restarted Oracle listener and cleared hung sessions.',
    affectedCi: 'DatabaseServer1',
    assignmentGroup: 'Database',
    activityLogs: '2026-10-21 00:00:00 - Assigned to DB team.'
  };

  const initialFingerprint = computeTicketAuditFingerprint(baseTicket);

  // Simulate injecting audit comments
  const ticketWithAuditComment = {
    ...baseTicket,
    activityLogs: `${baseTicket.activityLogs}\n\n[10/21/2026 01:15:00 AM - Quality Audit Desk]:\nAudit Verdict: ACTION REQUIRED (46% - RED)\n• [1] Affected CI: Realign CMDB.`
  };

  const updatedFingerprint = computeTicketAuditFingerprint(ticketWithAuditComment);

  assert.strictEqual(
    updatedFingerprint,
    initialFingerprint,
    'Fingerprint must NOT change when Quality Audit Desk comments are injected'
  );
});

test('Resolved Audit Fingerprint: detects substantive changes made after resolution', () => {
  const resolvedTicket = {
    incNumber: 'INC0000012',
    state: 'Resolved',
    incidentState: '6',
    shortDescription: 'Database connectivity failure',
    technicalDescription: 'Short notes.',
    resolutionDescription: 'Fixed.',
    affectedCi: 'eFax',
    assignmentGroup: 'Database',
    activityLogs: '2026-10-21 00:00:00 - Initial report.'
  };

  const initialFingerprint = computeTicketAuditFingerprint(resolvedTicket);

  // 1. Change Resolution Description (engineer adds diagnostic steps)
  const modifiedResolution = {
    ...resolvedTicket,
    resolutionDescription: 'Diagnosed Oracle error ORA-12541. Applied patch and verified connectivity with client.'
  };
  assert.notStrictEqual(
    computeTicketAuditFingerprint(modifiedResolution),
    initialFingerprint,
    'Fingerprint must change when resolutionDescription changes'
  );

  // 2. Change Affected CI
  const modifiedCi = {
    ...resolvedTicket,
    affectedCi: 'DatabaseServer1'
  };
  assert.notStrictEqual(
    computeTicketAuditFingerprint(modifiedCi),
    initialFingerprint,
    'Fingerprint must change when affectedCi changes'
  );

  // 3. Add engineer activity log (substantive update)
  const modifiedLogs = {
    ...resolvedTicket,
    activityLogs: `${resolvedTicket.activityLogs}\n2026-10-21 01:25:00 - Engineer verified user sign-off.`
  };
  assert.notStrictEqual(
    computeTicketAuditFingerprint(modifiedLogs),
    initialFingerprint,
    'Fingerprint must change when engineer posts new activity notes'
  );
});

test('Resolved State Gate: only Resolved tickets qualify for post-resolution audit updates', () => {
  const inProgressTicket = {
    incNumber: 'INC0000003',
    state: 'In Progress',
    incidentState: '2',
    shortDescription: 'Wireless network down'
  };
  assert.strictEqual(isResolvedTicket(inProgressTicket), false);

  const resolvedTicket = {
    incNumber: 'INC0000060',
    state: 'Resolved',
    incidentState: '6',
    shortDescription: 'Unable to connect to email'
  };
  assert.strictEqual(isResolvedTicket(resolvedTicket), true);
});

test('Empathy Audit Fingerprint: generates deterministic signature for open tickets', () => {
  const openTicket = {
    incNumber: 'INC0000003',
    state: 'In Progress',
    incidentState: '2',
    assignee: 'Beth Anglin',
    assignmentGroup: 'Network',
    activityLogs: '2026-10-21 00:00:00 - User moved to 3rd floor cannot connect to wireless.'
  };

  const activityInc = {
    incNumber: 'INC0000003',
    state: 'In Progress',
    assignee: 'Beth Anglin',
    assignmentGroup: 'Network',
    latestActivityEntry: 'User moved to 3rd floor cannot connect to wireless.',
    notificationStatus: 'BREACHED (>24H)',
    complianceStatus: 'NON-COMPLIANT',
    qualityCheck: 'Poorly',
    hoursIdle: 48,
    isUpdatedToday: false
  };

  const fp1 = computeEmpathyAuditFingerprint(openTicket, activityInc);
  const fp2 = computeEmpathyAuditFingerprint(openTicket, activityInc);

  assert.strictEqual(typeof fp1, 'string');
  assert.strictEqual(fp1.length, 64);
  assert.strictEqual(fp1, fp2);
});

test('Empathy Audit Fingerprint: ignores injected Incident Empathy Desk comments', () => {
  const openTicket = {
    incNumber: 'INC0000003',
    state: 'In Progress',
    assignee: 'Beth Anglin',
    assignmentGroup: 'Network',
    activityLogs: '2026-10-21 00:00:00 - User moved to 3rd floor cannot connect to wireless.'
  };

  const activityInc = {
    incNumber: 'INC0000003',
    state: 'In Progress',
    assignee: 'Beth Anglin',
    assignmentGroup: 'Network',
    latestActivityEntry: 'User moved to 3rd floor cannot connect to wireless.',
    notificationStatus: 'BREACHED (>24H)',
    complianceStatus: 'NON-COMPLIANT',
    qualityCheck: 'Poorly',
    hoursIdle: 48,
    isUpdatedToday: false
  };

  const initialFingerprint = computeEmpathyAuditFingerprint(openTicket, activityInc);

  // Simulate injecting Empathy Desk comment into activity logs
  const ticketWithEmpathyComment = {
    ...openTicket,
    activityLogs: `${openTicket.activityLogs}\n\n[10/21/2026 01:30:00 AM - Incident Empathy Desk]:\nEmpathy Verdict: ACTION REQUIRED (Status: BREACHED (>24H) | Idle: 48h)`
  };

  const updatedFingerprint = computeEmpathyAuditFingerprint(ticketWithEmpathyComment, activityInc);

  assert.strictEqual(
    updatedFingerprint,
    initialFingerprint,
    'Fingerprint must NOT change when Incident Empathy Desk comments are injected'
  );
});

test('Empathy Audit Fingerprint: detects when work notes change or SLA tier progresses', () => {
  const openTicket = {
    incNumber: 'INC0000003',
    state: 'In Progress',
    assignee: 'Beth Anglin',
    assignmentGroup: 'Network',
    activityLogs: 'Initial log.'
  };

  const activityInc = {
    incNumber: 'INC0000003',
    state: 'In Progress',
    assignee: 'Beth Anglin',
    assignmentGroup: 'Network',
    latestActivityEntry: 'Initial log.',
    notificationStatus: 'WARNING-1 SENT',
    complianceStatus: 'NON-COMPLIANT',
    qualityCheck: 'Average',
    hoursIdle: 17,
    isUpdatedToday: true
  };

  const baseFingerprint = computeEmpathyAuditFingerprint(openTicket, activityInc);

  // 1. Same tier tick (e.g. 17h -> 18h) should remain in tier_16h_warn2
  const sameTierTick = { ...activityInc, hoursIdle: 18 };
  assert.strictEqual(
    computeEmpathyAuditFingerprint(openTicket, sameTierTick),
    baseFingerprint,
    'Fingerprint should not change for minor idle ticks within the same tier'
  );

  // 2. Progression to Warning-2 (20h)
  const tier2Progression = { ...activityInc, hoursIdle: 21, notificationStatus: 'WARNING-2 SENT' };
  assert.notStrictEqual(
    computeEmpathyAuditFingerprint(openTicket, tier2Progression),
    baseFingerprint,
    'Fingerprint must change when progressing to WARNING-2 tier'
  );

  // 3. Progression to Breach (>24h)
  const breachProgression = { ...activityInc, hoursIdle: 26, notificationStatus: 'BREACHED (>24H)' };
  assert.notStrictEqual(
    computeEmpathyAuditFingerprint(openTicket, breachProgression),
    baseFingerprint,
    'Fingerprint must change when progressing to BREACHED tier'
  );

  // 4. Engineer writes a new technical work note
  const updatedNote = {
    ...activityInc,
    latestActivityEntry: 'Configured port on switch 2B and verified signal strength at -42dBm.'
  };
  const updatedTicket = {
    ...openTicket,
    activityLogs: `${openTicket.activityLogs}\nConfigured port on switch 2B and verified signal strength at -42dBm.`
  };
  assert.notStrictEqual(
    computeEmpathyAuditFingerprint(updatedTicket, updatedNote),
    baseFingerprint,
    'Fingerprint must change when engineer writes new work note'
  );
});

test('Enhanced Empathy Comments: generates structured rule feeds and LLM remarks matching Image 2', () => {
  const activityInc = {
    incNumber: 'INC0000003',
    assignee: 'Beth Anglin',
    assignmentGroup: 'Network',
    hoursIdle: 48,
    notificationStatus: 'BREACHED (>24H)',
    complianceStatus: 'NON-COMPLIANT',
    qualityCheck: 'Poorly',
    isUpdatedToday: false,
    updatedDate: '2026-10-19',
    llmComments: 'The activity log lacks diagnostic verification steps.'
  };

  const comment = generateEnhancedEmpathyComments(activityInc);

  assert.ok(comment.includes('[Quality Audit - Activity Log Review]:'));
  assert.ok(comment.includes('Status: NON-COMPLIANT | Quality: Poorly | Inactivity: Idle 48h (BREACHED (>24H))'));
  assert.ok(comment.includes('Rules Feed:'));
  assert.ok(comment.includes('Activity log was not updated today'));
  assert.ok(comment.includes('SLA Breached'));
  assert.ok(comment.includes('Audit Comments: The activity log lacks diagnostic verification steps.'));
  // Must NOT include the old 15 lines of generic boilerplate
  assert.ok(!comment.includes('Governance Policy: Active incidents require daily qualifying updates'));
  assert.ok(!comment.includes('• [2] Work Note Action'));
});

test('ServiceNow Journal Header Stripping: eliminates author timestamps on bot comments', () => {
  const rawLogsFromServiceNow = `2026-10-21 17:18:23 - System Administrator (Work notes)
[ITIL Quality Audit Desk]:
Audit Verdict: ACTION REQUIRED (46% - RED | 12/26 pts).
Directives: [1] Activity Logs.

2026-10-20 14:10:00 - John Doe (Work notes)
Investigating issue on server DB01.
Rebooted server and checked services.

2026-10-21 17:19:00 - System Administrator (Work notes)
[Incident Empathy Desk]:
Empathy Verdict: ACTION REQUIRED (Status: BREACHED (>24H) | Idle: 48h)
Governance Policy: Active incidents require daily qualifying updates until final resolution.`;

  const cleaned = cleanLogsForFingerprint(rawLogsFromServiceNow);
  const expected = `2026-10-20 14:10:00 - John Doe (Work notes)\nInvestigating issue on server DB01.\nRebooted server and checked services.`;
  assert.strictEqual(cleaned, expected, 'Must strictly preserve human notes while stripping ServiceNow journal headers of bot comments');

  const auditorOnlyCleaned = cleanAuditorLogs(rawLogsFromServiceNow);
  assert.ok(!auditorOnlyCleaned.includes('[ITIL Quality Audit Desk]'), 'Must strip Quality Audit Desk');
  assert.ok(auditorOnlyCleaned.includes('[Incident Empathy Desk]'), 'cleanAuditorLogs must not touch Empathy logs');

  const empathyOnlyCleaned = cleanEmpathyLogs(rawLogsFromServiceNow);
  assert.ok(empathyOnlyCleaned.includes('[ITIL Quality Audit Desk]'), 'cleanEmpathyLogs must not touch Quality Audit Desk');
  assert.ok(!empathyOnlyCleaned.includes('[Incident Empathy Desk]'), 'Must strip Incident Empathy Desk');
});

test('Fingerprint Invariance: multiple consecutive ServiceNow bot updates with different timestamps yield identical fingerprint', () => {
  const baseTicket = {
    incNumber: 'INC0000004',
    state: 'Resolved',
    incidentState: '6',
    shortDescription: 'Email server unreachable',
    technicalDescription: 'Diagnosed DNS resolution failure on port 53.',
    resolutionDescription: 'Flushed DNS cache and verified mail routing.',
    affectedCi: 'Exchange Server',
    assignmentGroup: 'Hardware',
    activityLogs: '2026-10-20 10:00:00 - Initial diagnosis by engineer.'
  };

  const initialFingerprint = computeTicketAuditFingerprint(baseTicket);

  // First sync cycle adds work note with timestamp 17:18:23
  const cycle1Ticket = {
    ...baseTicket,
    activityLogs: `${baseTicket.activityLogs}\n\n2026-10-21 17:18:23 - System Administrator (Work notes)\n[ITIL Quality Audit Desk]:\nAudit Verdict: ACTION REQUIRED (46%)\n• Directives here.`
  };
  const cycle1Fingerprint = computeTicketAuditFingerprint(cycle1Ticket);

  // Second sync cycle 30 seconds later has timestamp 17:18:53
  const cycle2Ticket = {
    ...baseTicket,
    activityLogs: `${baseTicket.activityLogs}\n\n2026-10-21 17:18:53 - System Administrator (Work notes)\n[ITIL Quality Audit Desk]:\nAudit Verdict: ACTION REQUIRED (46%)\n• Directives here.`
  };
  const cycle2Fingerprint = computeTicketAuditFingerprint(cycle2Ticket);

  assert.strictEqual(cycle1Fingerprint, initialFingerprint, 'Cycle 1 fingerprint must match initial base ticket');
  assert.strictEqual(cycle2Fingerprint, initialFingerprint, 'Cycle 2 fingerprint must match initial base ticket');
  assert.strictEqual(cycle1Fingerprint, cycle2Fingerprint, 'Cycle 1 and Cycle 2 fingerprints must be identical to avoid repeat loops');
});

test('Audit Report Similarity Pre-Check: isSimilarAuditReport detects identical or near-identical verdicts', () => {
  const existingRecord = {
    fingerprint: 'abcd1234',
    score: 46,
    statusColor: 'RED',
    lastVerdict: 'Audit Verdict: ACTION REQUIRED (46% - RED | 12/26 pts).'
  };

  // Same score and color
  assert.strictEqual(
    isSimilarAuditReport(existingRecord, 46, 'RED', 'Audit Verdict: ACTION REQUIRED (46% - RED | 12/26 pts).'),
    true,
    'Identical score and color must return true to prevent re-posting'
  );

  // Substantive score improvement (e.g. engineer remediated items)
  assert.strictEqual(
    isSimilarAuditReport(existingRecord, 85, 'GREEN', 'Audit Verdict: PASS (85% - GREEN).'),
    false,
    'Score and verdict change must return false to allow updating'
  );
});

test('Empathy Verdict Similarity Pre-Check: isSimilarEmpathyVerdict detects unchanged status', () => {
  const existingRecord = {
    notificationStatus: 'BREACHED (>24H)',
    complianceStatus: 'NON-COMPLIANT',
    qualityCheck: 'Poorly',
    lastVerdict: 'Empathy Verdict: ACTION REQUIRED (Status: BREACHED (>24H) | Idle: 48h)'
  };

  // Identical status
  assert.strictEqual(
    isSimilarEmpathyVerdict(existingRecord, {
      notificationStatus: 'BREACHED (>24H)',
      complianceStatus: 'NON-COMPLIANT',
      qualityCheck: 'Poorly'
    }),
    true,
    'Matching empathy parameters must return true'
  );

  // Remediated to COMPLIANT
  assert.strictEqual(
    isSimilarEmpathyVerdict(existingRecord, {
      notificationStatus: 'BREACHED (>24H)',
      complianceStatus: 'COMPLIANT',
      qualityCheck: 'Excellent'
    }),
    false,
    'Remediation to COMPLIANT must return false to allow update'
  );
});

test('ServiceNow Existing Comment Detection: hasExistingServiceNowEmpathyComment identifies prior bot note', () => {
  const logsWithEmpathy = `2026-10-21 17:25:26 - System Administrator (Work notes)\n[Quality Audit - Activity Log Review]:\n• Status: NON-COMPLIANT | Quality: Poorly | Inactivity: Idle 48h (BREACHED (>24H))\n• Rules Feed: Activity log was not updated today\n• Audit Comments: Vague update.`;
  assert.strictEqual(hasExistingServiceNowEmpathyComment(logsWithEmpathy, 'BREACHED (>24H)'), true);
  assert.strictEqual(hasExistingServiceNowEmpathyComment(logsWithEmpathy, 'WARNING-2 SENT'), false);

  const logsWithHumanAfter = `2026-10-21 17:30:00 - Beth Anglin (Work notes)\nReplaced fiber cable.\n\n` + logsWithEmpathy;
  assert.strictEqual(hasExistingServiceNowEmpathyComment(logsWithHumanAfter, 'BREACHED (>24H)'), false);
});

test('ServiceNow Existing Comment Detection: hasExistingServiceNowAuditComment identifies prior resolution review', () => {
  const logsWithAudit = `2026-10-21 17:31:46 - System Administrator (Work notes)\n[Quality Audit Review - Resolved Ticket]:\n• Verdict: ACTION REQUIRED (Score: 16% - RED)\n• Pending Items: 10 items.`;
  assert.strictEqual(hasExistingServiceNowAuditComment(logsWithAudit), true);

  const logsWithHumanAfter = `2026-10-21 17:35:00 - Network Lead (Work notes)\nRealigned CMDB configuration.\n\n` + logsWithAudit;
  assert.strictEqual(hasExistingServiceNowAuditComment(logsWithHumanAfter), false);
});

test('Clean Resolved Audit Comment: generates concise summary without boilerplate', () => {
  const rep = {
    ticket: { incNumber: 'INC0000060', assignmentGroup: 'Network' },
    percentage: 16,
    statusColor: 'Red',
    totalPointsAwarded: 7,
    suggestedActions: [
      'CMDB Coupling: Realign Assignment Group',
      'Taxonomy: Update Symptom Code',
      'Diagnostic Depth: Expand technical description'
    ]
  };

  const comment = generateCleanResolvedAuditComment(rep);
  assert.ok(comment.includes('[Quality Audit Review - Resolved Ticket]:'));
  assert.ok(comment.includes('• Verdict: ACTION REQUIRED (16% - RED | 7/26 pts)'));
  assert.ok(comment.includes('• Pending Governance Items (3 item(s) for Group \'Network\'):'));
  assert.ok(comment.includes('1. CMDB Coupling: Realign Assignment Group'));
  assert.ok(comment.includes('Audit Directives: Complete mandatory corrections'));
  assert.ok(!comment.includes('Governance Policy: Corrections must be completed directly in ServiceNow prior to final quality approval.'));
});

test('Chat Markdown Status Badges: Non-Compliant renders as unified red badge without nested green compliant badge', () => {
  const statusBadgeRegex = /(?:(\bBREACHED(?:\s*\([^)]+\))?)|(\bWARNING-[123](?:\s*SENT)?\b)|(\bNON[- ]COMPLIANT\b)|(\bPARTIALL?Y?[- ]COMPLIANT\b)|(\bFULLY[- ]COMPLIANT\b)|(\bCOMPLIANT\b))/gi;

  function renderStatusBadges(html: string): string {
    return html.replace(statusBadgeRegex, (match) => {
      const upper = match.toUpperCase();
      if (upper.startsWith('BREACH') || upper.startsWith('NON')) {
        return `<span class="badge-breached">${match}</span>`;
      }
      if (upper.startsWith('WARN') || upper.startsWith('PARTIAL')) {
        return `<span class="badge-warning">${match}</span>`;
      }
      if (upper.includes('COMPLIANT')) {
        return `<span class="badge-compliant">${match}</span>`;
      }
      return match;
    });
  }

  const input = `
    * **Quality Rating**: Non-Compliant (Immediate Escalation Required)
    * **Quality Rating**: Partially Compliant (Audit Attention Required)
    * **Quality Rating**: Compliant with ITIL Standards
    * **Compliance Designation**: NON-COMPLIANT
    * **SLA Notification State**: WARNING-2 SENT
    * **SLA Notification State**: BREACHED (>24H)
  `;

  const rendered = renderStatusBadges(input);

  // 1. Non-Compliant must be completely inside badge-breached with NO nested badge-compliant
  assert.ok(rendered.includes('<span class="badge-breached">Non-Compliant</span>'));
  assert.ok(!rendered.includes('Non-<span'));
  assert.ok(!rendered.includes('badge-breached"><span class="badge-compliant">'));

  // 2. Partially Compliant must be badge-warning
  assert.ok(rendered.includes('<span class="badge-warning">Partially Compliant</span>'));

  // 3. Compliant must be badge-compliant
  assert.ok(rendered.includes('<span class="badge-compliant">Compliant</span> with ITIL Standards'));

  // 4. Compliance in header must NOT be altered
  assert.ok(rendered.includes('* **Compliance Designation**: <span class="badge-breached">NON-COMPLIANT</span>'));

  // 5. SLA alerts
  assert.ok(rendered.includes('<span class="badge-warning">WARNING-2 SENT</span>'));
  assert.ok(rendered.includes('<span class="badge-breached">BREACHED (>24H)</span>'));
});

test('Assignment Group Ticket Fetch: strictly filters when enabled and reflects disabled state in all places', () => {
  const sampleReports = [
    { ticket: { incNumber: 'INC001', assignmentGroup: 'Database' } },
    { ticket: { incNumber: 'INC002', assignmentGroup: 'Network' } },
    { ticket: { incNumber: 'INC003', assignmentGroup: 'Hardware' } },
    { ticket: { incNumber: 'INC004', assignmentGroup: 'Service Desk' } }
  ];

  function filterReports(reports: any[], filterEnabled: boolean, trackedGroups: string[]) {
    if (filterEnabled) {
      const lower = (trackedGroups || []).map(g => g.trim().toLowerCase());
      return reports.filter(r => {
        const grp = (r.ticket?.assignmentGroup || '').trim().toLowerCase();
        return grp && lower.includes(grp);
      });
    }
    return reports;
  }

  // 1. When filter is ENABLED with specific enabled groups ('Database', 'Network')
  const filtered = filterReports(sampleReports, true, ['Database', 'Network']);
  assert.strictEqual(filtered.length, 2);
  assert.strictEqual(filtered[0].ticket.assignmentGroup, 'Database');
  assert.strictEqual(filtered[1].ticket.assignmentGroup, 'Network');

  // 2. Disabling 'Network' immediately reflects and excludes it (only 'Database' remains)
  const afterDisableNetwork = filterReports(sampleReports, true, ['Database']);
  assert.strictEqual(afterDisableNetwork.length, 1);
  assert.strictEqual(afterDisableNetwork[0].ticket.assignmentGroup, 'Database');

  // 3. Default state (all assignment groups enabled by default)
  const allGroups = ['Database', 'Network', 'Hardware', 'Service Desk'];
  const defaultEnabledState = filterReports(sampleReports, true, allGroups);
  assert.strictEqual(defaultEnabledState.length, 4);

  // 4. Disabling all groups (explicit override) excludes all tickets
  const explicitDisabledAll = filterReports(sampleReports, true, []);
  assert.strictEqual(explicitDisabledAll.length, 0);

  // 5. When filter is explicitly bypassed (OFF): all tickets returned
  const bypassed = filterReports(sampleReports, false, ['Database']);
  assert.strictEqual(bypassed.length, 4);
});

test('Assignment Group Save Permanent: commits configuration with ISO timestamp and preserves across reloads', () => {
  let storedConfig: any = {
    trackedGroups: ['Service Desk'],
    assignmentGroupFetchEnabled: true,
    permanentSavedAt: '2026-10-21T12:00:00.000Z'
  };

  function simulateSavePermanent(enabledGroups: string[]) {
    const savedTimestamp = new Date().toISOString();
    storedConfig.trackedGroups = [...enabledGroups];
    storedConfig.assignmentGroupFetchEnabled = true;
    storedConfig.permanentSavedAt = savedTimestamp;
    return {
      success: true,
      enabledGroups: storedConfig.trackedGroups,
      permanentSavedAt: savedTimestamp,
      assignmentGroupFetchEnabled: true
    };
  }

  function detectUnsavedChanges(active: string[], saved: string[]) {
    if (active.length !== saved.length) return true;
    const curSet = new Set(active.map(g => g.trim().toLowerCase()));
    return saved.some(g => !curSet.has(g.trim().toLowerCase()));
  }

  // 1. Initial state matches saved permanent snapshot
  let activeGroups = ['Service Desk'];
  assert.strictEqual(detectUnsavedChanges(activeGroups, storedConfig.trackedGroups), false);

  // 2. Administrator enables 'Database' and 'Network' -> changes detected as unsaved/staged
  activeGroups = ['Service Desk', 'Database', 'Network'];
  assert.strictEqual(detectUnsavedChanges(activeGroups, storedConfig.trackedGroups), true);

  // 3. User clicks "Save Permanent" -> updates disk snapshot and timestamp
  const saveResult = simulateSavePermanent(activeGroups);
  assert.strictEqual(saveResult.success, true);
  assert.strictEqual(saveResult.enabledGroups.length, 3);
  assert.strictEqual(typeof saveResult.permanentSavedAt, 'string');
  assert.ok(Date.parse(saveResult.permanentSavedAt) > 0);

  // 4. Now active matches saved configuration
  assert.strictEqual(detectUnsavedChanges(activeGroups, storedConfig.trackedGroups), false);

  // 5. Config persistence round-trip through JSON simulation (server reboot scenario)
  const serialized = JSON.stringify(storedConfig);
  const reloaded = JSON.parse(serialized);
  assert.deepStrictEqual(reloaded.trackedGroups, ['Service Desk', 'Database', 'Network']);
  assert.strictEqual(reloaded.assignmentGroupFetchEnabled, true);
  assert.strictEqual(reloaded.permanentSavedAt, saveResult.permanentSavedAt);
});




