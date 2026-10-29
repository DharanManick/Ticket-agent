import test from 'node:test';
import assert from 'node:assert';
import { isIndividualUpn, normalizeTicket } from '../lib/notify';
import { defaultAuditRules } from '../src/defaultRules';
import { defaultOverallRules } from '../src/defaultOverallRules';

test('Characterization: isIndividualUpn identifies individual vs group mailboxes', () => {
  // Distribution lists and group mailboxes
  assert.strictEqual(isIndividualUpn('it-support-dl@company.com'), false);
  assert.strictEqual(isIndividualUpn('helpdesk@company.com'), false);
  assert.strictEqual(isIndividualUpn('alerts-team@company.com'), false);
  assert.strictEqual(isIndividualUpn('admin@company.com'), false);
  assert.strictEqual(isIndividualUpn(''), false);

  // Individual mailboxes
  assert.strictEqual(isIndividualUpn('alice.smith@company.com'), true);
  assert.strictEqual(isIndividualUpn('bob.jones@sub.company.org'), true);
});

test('Characterization: normalizeTicket computes correct colors and defaults', () => {
  // Low score -> Red
  const redTicket = normalizeTicket({
    ticketNumber: 'INC0011223',
    auditScore: 35,
    assigneeName: 'Jane Dev'
  });
  assert.strictEqual(redTicket.ticketNumber, 'INC0011223');
  assert.strictEqual(redTicket.scoreColor, 'Red');
  assert.strictEqual(redTicket.auditScore, 35);
  assert.strictEqual(redTicket.assigneeName, 'Jane Dev');

  // Medium score -> Amber
  const amberTicket = normalizeTicket({
    id: 'INC0099887',
    percentage: 65
  });
  assert.strictEqual(amberTicket.ticketNumber, 'INC0099887');
  assert.strictEqual(amberTicket.scoreColor, 'Amber');
  assert.strictEqual(amberTicket.auditScore, 65);

  // High score -> Green
  const greenTicket = normalizeTicket({
    incNumber: 'INC0044556',
    score: 95
  });
  assert.strictEqual(greenTicket.ticketNumber, 'INC0044556');
  assert.strictEqual(greenTicket.scoreColor, 'Green');
  assert.strictEqual(greenTicket.auditScore, 95);
});

test('Characterization: defaultAuditRules schema conformity', () => {
  assert.ok(defaultAuditRules.length > 0, 'Audit rules should not be empty');
  for (const rule of defaultAuditRules) {
    assert.ok(rule.id, 'Every rule must have an id');
    assert.ok(Array.isArray(rule.keywords) && rule.keywords.length > 0, `Rule ${rule.id} must have keywords`);
    assert.ok(rule.closureCode, `Rule ${rule.id} must have a closureCode`);
  }
});

test('Characterization: defaultOverallRules schema conformity', () => {
  assert.ok(defaultOverallRules.length > 0, 'Overall rules should not be empty');
  for (const rule of defaultOverallRules) {
    assert.ok(rule.id, 'Every overall rule must have an id');
    assert.ok(rule.name, `Overall rule ${rule.id} must have a name`);
    assert.ok(rule.ruleCode, `Overall rule ${rule.id} must have a ruleCode`);
    assert.strictEqual(typeof rule.weight, 'number', `Overall rule ${rule.id} must have a numeric weight`);
  }
});

test('Incident Classification (CI-01): isResolvedTicket strictly identifies Resolved state incidents', async () => {
  const { isResolvedTicket } = await import('../lib/classification');

  // True Resolved tickets
  assert.strictEqual(isResolvedTicket({ state: '6' }), true);
  assert.strictEqual(isResolvedTicket({ incidentState: 'Resolved' }), true);
  assert.strictEqual(isResolvedTicket({ state: 'resolved' }), true);
  assert.strictEqual(isResolvedTicket({ activityLogs: 'State changed: InProgress -> Resolved' }), true);

  // False / Unresolved tickets (must NOT be classified as resolved merely because the description says 'resolution')
  assert.strictEqual(isResolvedTicket({ state: '2', resolutionDescription: 'Waiting for customer to test the resolution' }), false);
  assert.strictEqual(isResolvedTicket({ state: 'New', description: 'User requires resolution of VPN connectivity' }), false);
  assert.strictEqual(isResolvedTicket({ state: 'In Progress', comments_and_work_notes: 'Working on resolution' }), false);
  assert.strictEqual(isResolvedTicket(null), false);
  assert.strictEqual(isResolvedTicket({}), false);
});

test('Incident Classification (CI-02): normalizeIncidentState maps ServiceNow codes and labels', async () => {
  const { normalizeIncidentState } = await import('../lib/classification');

  assert.strictEqual(normalizeIncidentState('6'), 'Resolved');
  assert.strictEqual(normalizeIncidentState('Resolved'), 'Resolved');
  assert.strictEqual(normalizeIncidentState('resolved'), 'Resolved');
  assert.strictEqual(normalizeIncidentState('Solve Proposed'), 'Resolved');
  assert.strictEqual(normalizeIncidentState('7'), 'Closed');
  assert.strictEqual(normalizeIncidentState('Closed'), 'Closed');
  assert.strictEqual(normalizeIncidentState('2'), 'In Progress');
  assert.strictEqual(normalizeIncidentState('In Progress'), 'In Progress');
  assert.strictEqual(normalizeIncidentState('1'), 'New');
  assert.strictEqual(normalizeIncidentState('3'), 'On Hold');
  assert.strictEqual(normalizeIncidentState('8'), 'Canceled');
  assert.strictEqual(normalizeIncidentState(undefined, 'Incident state Resolved was: Solve Proposed'), 'Resolved');
  assert.strictEqual(normalizeIncidentState(undefined, 'Incident state Closed was: Resolved'), 'Closed');
  assert.strictEqual(normalizeIncidentState(undefined), 'In Progress');
});

test('Incident Classification (CI-03): isEmpathyEligibleTicket strictly identifies OPEN tickets only', async () => {
  const { isEmpathyEligibleTicket } = await import('../lib/classification');

  // Open tickets (Eligible for Empathy Dashboard)
  assert.strictEqual(isEmpathyEligibleTicket({ state: '2' }), true);
  assert.strictEqual(isEmpathyEligibleTicket({ state: 'In Progress' }), true);
  assert.strictEqual(isEmpathyEligibleTicket({ state: '1' }), true);
  assert.strictEqual(isEmpathyEligibleTicket({ state: 'New' }), true);
  assert.strictEqual(isEmpathyEligibleTicket({ state: '3' }), true);
  assert.strictEqual(isEmpathyEligibleTicket({ state: 'On Hold' }), true);

  // Resolved / Closed / Canceled tickets (MUST NOT be eligible for Empathy Dashboard)
  assert.strictEqual(isEmpathyEligibleTicket({ state: '6' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ state: 'Resolved' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ incidentState: 'Resolved' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ state: '7' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ state: 'Closed' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ incidentState: 'Closed' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ state: '8' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ state: 'Canceled' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ activityLogs: 'Incident state Resolved was: Solve Proposed' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ activityLogs: '2026-10-16 10:00 - In Progress -> Resolved' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ activityLogs: 'Technician logged: solve proposal accepted' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ rawActivityLogs: 'State changed: In Progress -> Closed' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ status: 'Resolved', incNumber: 'INC0000012' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ status: 'Closed', incNumber: 'INC0000010' }), false);
  assert.strictEqual(isEmpathyEligibleTicket({ status: 'In Progress', incNumber: 'INC0000059' }), true);
  assert.strictEqual(isEmpathyEligibleTicket(null), false);
  assert.strictEqual(isEmpathyEligibleTicket({}), true); // Default untyped object without closed/resolved indicators
});

