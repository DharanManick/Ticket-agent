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
