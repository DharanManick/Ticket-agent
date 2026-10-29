import crypto from 'crypto';

const botDeskPattern = '(?:ITIL Quality Audit Desk|Quality Audit Desk|Incident Empathy Desk|Quality Audit - Activity Log Review|Quality Audit Review - Resolved Ticket|Quality Audit Review)';
const boundaryLookahead = `(?=(?:\\n(?:\\d{4}-\\d{2}-\\d{2}|\\d{2}[-/]\\d{2}[-/]\\d{4})|\\n?\\[\\d{2}[-/]\\d{2}[-/]\\d{4}|\\n?\\[${botDeskPattern}|$))`;

/**
 * Strip out ITIL Quality Audit Desk comments and ServiceNow journal headers
 * from activity logs so that posting an audit verdict does not alter the substantive ticket.
 */
export function cleanAuditorLogs(logs: string): string {
  let text = String(logs || '');
  const auditorPattern = '(?:ITIL Quality Audit Desk|Quality Audit Desk|Quality Audit Review - Resolved Ticket|Quality Audit Review)';

  // 1. ServiceNow author header followed by bot desk tag
  text = text.replace(
    new RegExp('(?:^|\\n)(?:\\d{4}-\\d{2}-\\d{2}|\\d{2}[-/]\\d{2}[-/]\\d{4})\\s+\\d{2}:\\d{2}:\\d{2}(?:\\s*(?:AM|PM))?\\s*-\\s*[^\\n]*\\((?:Work notes|comments)\\)\\s*\\n?\\s*\\[' + auditorPattern + '\\]:[\\s\\S]*?' + boundaryLookahead, 'gi'),
    ''
  );

  // 2. Timestamped bracket Quality Audit Desk
  text = text.replace(
    new RegExp('(?:^|\\n)\\[\\d{2}[-/]\\d{2}[-/]\\d{4}[^\\]]*' + auditorPattern + '\\]:[\\s\\S]*?' + boundaryLookahead, 'gi'),
    ''
  );

  // 3. Standalone tag
  text = text.replace(
    new RegExp('(?:^|\\n)\\[' + auditorPattern + '\\]:[\\s\\S]*?' + boundaryLookahead, 'gi'),
    ''
  );

  return text.trim();
}

/**
 * Strip out Incident Empathy Desk comments and ServiceNow journal headers
 * from activity logs so that posting empathy remarks does not alter the substantive ticket.
 */
export function cleanEmpathyLogs(logs: string): string {
  let text = String(logs || '');
  const empathyPattern = '(?:Incident Empathy Desk|Quality Audit - Activity Log Review)';

  // 1. ServiceNow author header followed by Incident Empathy Desk
  text = text.replace(
    new RegExp('(?:^|\\n)(?:\\d{4}-\\d{2}-\\d{2}|\\d{2}[-/]\\d{2}[-/]\\d{4})\\s+\\d{2}:\\d{2}:\\d{2}(?:\\s*(?:AM|PM))?\\s*-\\s*[^\\n]*\\((?:Work notes|comments)\\)\\s*\\n?\\s*\\[' + empathyPattern + '\\]:[\\s\\S]*?' + boundaryLookahead, 'gi'),
    ''
  );

  // 2. Timestamped bracket Incident Empathy Desk
  text = text.replace(
    new RegExp('(?:^|\\n)\\[\\d{2}[-/]\\d{2}[-/]\\d{4}[^\\]]*' + empathyPattern + '\\]:[\\s\\S]*?' + boundaryLookahead, 'gi'),
    ''
  );

  // 3. Standalone tag
  text = text.replace(
    new RegExp('(?:^|\\n)\\[' + empathyPattern + '\\]:[\\s\\S]*?' + boundaryLookahead, 'gi'),
    ''
  );

  return text.trim();
}

/**
 * Strip out quality audit desk and incident empathy comments from activity logs so that posting
 * an audit or empathy verdict does not alter the substantive ticket fingerprint.
 */
export function cleanLogsForFingerprint(logs: string): string {
  return cleanEmpathyLogs(cleanAuditorLogs(logs));
}

/**
 * Checks whether the activity logs from ServiceNow already contain an active Empathy / Activity Log
 * review comment for the current notification status/tier, meaning no duplicate update is needed.
 */
export function hasExistingServiceNowEmpathyComment(
  activityLogs: string,
  currentTier?: string,
  currentCompliance?: string
): boolean {
  if (!activityLogs) return false;
  const tagRegex = /\[(?:Incident Empathy Desk|Quality Audit - Activity Log Review)\]/i;
  if (!tagRegex.test(activityLogs)) return false;

  // In ServiceNow, newest note is at the top. If newest is NOT a bot note, a human has updated since
  const latestIsBot = /^\s*(?:\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\s+\d{2}:\d{2}:\d{2}[^\n]*\((?:Work notes|comments)\)\s*\n?\s*\[(?:Incident Empathy Desk|Quality Audit - Activity Log Review)\]/i.test(activityLogs);
  if (!latestIsBot) {
    return false;
  }

  if (currentTier) {
    const tierNorm = currentTier.toUpperCase();
    const match = activityLogs.match(/\[(?:Incident Empathy Desk|Quality Audit - Activity Log Review)\][\s\S]*?(?=(?:\n\d{4}-\d{2}-\d{2}|\n\d{2}[-/]\d{2}[-/]\d{4}|$))/i);
    if (match) {
      const block = match[0].toUpperCase();
      if (tierNorm.includes('BREACH') && (block.includes('BREACHED') || block.includes('>24H'))) {
        return true;
      }
      if (tierNorm.includes('WARNING-3') && block.includes('WARNING-3')) {
        return true;
      }
      if (tierNorm.includes('WARNING-2') && block.includes('WARNING-2')) {
        return true;
      }
      if (tierNorm.includes('NO WARNING') && (block.includes('NO WARNING') || block.includes('HEALTHY') || block.includes('COMPLIANT'))) {
        return true;
      }
      return false;
    }
  }

  return true;
}

/**
 * Checks whether the activity logs from ServiceNow already contain an active Resolution Quality
 * Audit comment, meaning no duplicate update is needed unless a human engineer makes a substantive update.
 */
export function hasExistingServiceNowAuditComment(activityLogs: string): boolean {
  if (!activityLogs) return false;
  const tagRegex = /\[(?:ITIL Quality Audit Desk|Quality Audit Desk|Quality Audit Review - Resolved Ticket|Quality Audit Review)\]/i;
  if (!tagRegex.test(activityLogs)) return false;

  // In ServiceNow, newest note is at the top. If newest is already an audit note, no human has updated since
  const latestIsBot = /^\s*(?:\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\s+\d{2}:\d{2}:\d{2}[^\n]*\((?:Work notes|comments)\)\s*\n?\s*\[(?:ITIL Quality Audit Desk|Quality Audit Desk|Quality Audit Review - Resolved Ticket|Quality Audit Review)\]/i.test(activityLogs);
  return latestIsBot;
}

/**
 * Compute deterministic SHA256 signature of all substantive fields
 * relevant to ITIL resolution governance.
 */
export function computeTicketAuditFingerprint(ticket: any): string {
  if (!ticket) return '';
  const fields = [
    String(ticket.incidentState || ticket.state || '').trim().toLowerCase(),
    String(ticket.shortDescription || '').trim().toLowerCase(),
    String(ticket.technicalDescription || '').trim().toLowerCase(),
    String(ticket.resolutionDescription || '').trim().toLowerCase(),
    String(ticket.affectedCi || '').trim().toLowerCase(),
    String(ticket.assignmentGroup || '').trim().toLowerCase(),
    String(ticket.symptomCode || '').trim().toLowerCase(),
    String(ticket.solutionCode || '').trim().toLowerCase(),
    String(ticket.closureCode1 || ticket.closeCode || '').trim().toLowerCase(),
    String(ticket.closureCode2 || ticket.closeCode2 || '').trim().toLowerCase(),
    String(ticket.knowledgeArticle || '').trim().toLowerCase(),
    cleanLogsForFingerprint(ticket.activityLogs)
  ];
  return crypto.createHash('sha256').update(fields.join('|||')).digest('hex');
}

/**
 * Compute deterministic SHA256 signature of open incident fields
 * relevant to Empathy and SLA idle monitoring.
 */
export function computeEmpathyAuditFingerprint(ticket: any, activityInc?: any): string {
  if (!ticket && !activityInc) return '';
  const fields = [
    String(ticket?.incidentState || ticket?.state || activityInc?.state || '').trim().toLowerCase(),
    String(ticket?.assignee || activityInc?.assignee || '').trim().toLowerCase(),
    String(ticket?.assignmentGroup || activityInc?.assignmentGroup || '').trim().toLowerCase(),
    cleanLogsForFingerprint(ticket?.activityLogs || activityInc?.rawActivityLogs || ''),
    cleanLogsForFingerprint(activityInc?.latestActivityEntry || ''),
    String(activityInc?.notificationStatus || '').trim().toLowerCase(),
    String(activityInc?.complianceStatus || '').trim().toLowerCase(),
    String(activityInc?.qualityCheck || '').trim().toLowerCase(),
    String(activityInc?.isUpdatedToday !== false ? 'today' : 'stale'),
    // Group idle hours into threshold tiers so minor minute ticks don't re-trigger unless an SLA tier boundary is crossed
    String(
      (activityInc?.hoursIdle ?? 0) >= 24 ? 'tier_24h_breached' :
      (activityInc?.hoursIdle ?? 0) >= 20 ? 'tier_20h_warn3' :
      (activityInc?.hoursIdle ?? 0) >= 16 ? 'tier_16h_warn2' : 'tier_healthy'
    )
  ];
  return crypto.createHash('sha256').update(fields.join('|||')).digest('hex');
}

/**
 * Generates a clean, concise, 3-4 line Empathy Verdict comment directly incorporating
 * the exact LLM Comments & Rules Feed (matching Image 2) without verbose boilerplate.
 */
export function generateEnhancedEmpathyComments(activityInc: any, ticket?: any): string {
  const hoursIdle = activityInc.hoursIdle ?? 0;
  const notifStatus = activityInc.notificationStatus || (hoursIdle >= 24 ? "BREACHED (>24H)" : (hoursIdle >= 20 ? "WARNING-3 SENT" : (hoursIdle >= 16 ? "WARNING-2 SENT" : "NO WARNING")));
  const isCompliant = activityInc.complianceStatus === 'COMPLIANT';
  const quality = activityInc.qualityCheck || (isCompliant ? 'Average' : 'Poorly');
  const isUpdatedToday = activityInc.isUpdatedToday !== false;

  // 1. Rules Feed Summary
  const ruleReasons: string[] = [];
  if (!isUpdatedToday) {
    ruleReasons.push(activityInc.dateValidationMessage || `Activity log was not updated today (last updated: ${activityInc.updatedDate || 'stale'})`);
  }
  if (hoursIdle >= 24) {
    ruleReasons.push(`SLA Breached: Idle for ${hoursIdle}h without qualifying progress`);
  } else if (hoursIdle >= 16) {
    ruleReasons.push(`SLA Warning: Idle for ${hoursIdle}h`);
  }
  if (activityInc.hasCopiedEmail) {
    ruleReasons.push('Flagged: Raw email dump detected in work note');
  }
  if (activityInc.hasCopiedChat) {
    ruleReasons.push('Flagged: Raw chat log dump detected in work note');
  }
  if (quality === 'Poorly' || !activityInc.isValid) {
    ruleReasons.push('Quality: Lacks sufficient technical diagnosis');
  } else if (quality === 'Excellent') {
    ruleReasons.push('Quality: Comprehensive technical investigation');
  }

  // 2. Exact LLM Comments & Remarks
  const rawLlm = String(activityInc.llmComments || activityInc.comments || '').trim();
  const llmText = rawLlm.length > 5
    ? rawLlm
    : (isCompliant
        ? 'Technical progress and customer updates meet operational compliance standards.'
        : 'Update lacks sufficient technical diagnosis and progress details. Document diagnostic measures and next steps.');

  const lines = [
    `[Quality Audit - Activity Log Review]:`,
    `• Status: ${isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'} | Quality: ${quality} | Inactivity: Idle ${hoursIdle}h (${notifStatus})`,
    `• Rules Feed: ${ruleReasons.length > 0 ? ruleReasons.join('; ') : 'Within standard operational parameters'}`,
    `• Audit Comments: ${llmText}`
  ];

  return lines.join('\n');
}

/**
 * Generates a clean, concise Resolved Ticket Audit comment for ServiceNow work notes.
 */
export function generateCleanResolvedAuditComment(rep: any): string {
  const inc = rep?.ticket?.incNumber || 'Incident';
  const grp = rep?.ticket?.assignmentGroup || 'General';
  const pct = rep?.percentage ?? 0;
  const tier = rep?.statusColor ? rep.statusColor.toUpperCase() : (pct >= 80 ? 'GREEN' : pct >= 50 ? 'AMBER' : 'RED');
  const pts = rep?.totalPointsAwarded ?? 0;

  if (pct >= 80 || (rep?.suggestedActions && rep.suggestedActions.length === 0)) {
    return [
      `[Quality Audit Review - Resolved Ticket]:`,
      `• Verdict: FULLY COMPLIANT (${pct}% - ${tier} | ${pts}/26 pts)`,
      `• Status: All mandatory ITIL quality standards verified for ${inc} (Group: '${grp}'). Ready for closure.`
    ].join('\n');
  }

  const actions = Array.isArray(rep?.suggestedActions) ? rep.suggestedActions : [];
  const topActions = actions.slice(0, 5).map((a: string, i: number) => `  ${i + 1}. ${a}`).join('\n');
  const overflow = actions.length > 5 ? `\n  ...and ${actions.length - 5} more items` : '';

  return [
    `[Quality Audit Review - Resolved Ticket]:`,
    `• Verdict: ACTION REQUIRED (${pct}% - ${tier} | ${pts}/26 pts)`,
    `• Pending Governance Items (${actions.length} item(s) for Group '${grp}'):`,
    `${topActions}${overflow}`,
    `• Audit Directives: Complete mandatory corrections in ServiceNow prior to final quality approval.`
  ].join('\n');
}

/**
 * Pre-check to determine if a newly computed audit report is the same or similar to an existing record,
 * preventing redundant activity log updates in ServiceNow and local activity logs.
 */
export function isSimilarAuditReport(
  existing: { score?: number; statusColor?: string; lastVerdict?: string; lastHumanLogs?: string } | undefined,
  percentage: number,
  statusColor: string,
  comments?: string
): boolean {
  if (!existing) return false;

  // Exact score and color match
  if (existing.score === percentage && existing.statusColor === statusColor) {
    return true;
  }

  // If general comments match or prefix matches
  if (comments && existing.lastVerdict) {
    const cleanNew = comments.trim();
    const cleanOld = existing.lastVerdict.trim();
    if (cleanNew === cleanOld || cleanNew.slice(0, 100) === cleanOld.slice(0, 100)) {
      return true;
    }
  }

  return false;
}

/**
 * Pre-check to determine if a newly computed empathy evaluation is the same or similar to an existing record,
 * preventing redundant activity log updates for open tickets.
 */
export function isSimilarEmpathyVerdict(
  existing: { notificationStatus?: string; complianceStatus?: string; qualityCheck?: string; lastVerdict?: string; lastHumanLogs?: string } | undefined,
  act: { notificationStatus?: string; complianceStatus?: string; qualityCheck?: string },
  comments?: string
): boolean {
  if (!existing) return false;

  const statusMatch = (existing.notificationStatus || '').toLowerCase() === (act.notificationStatus || '').toLowerCase();
  const compMatch = (existing.complianceStatus || '').toLowerCase() === (act.complianceStatus || '').toLowerCase();
  const qualityMatch = !existing.qualityCheck || !act.qualityCheck || (existing.qualityCheck || '').toLowerCase() === (act.qualityCheck || '').toLowerCase();

  if (statusMatch && compMatch && qualityMatch) {
    return true;
  }

  if (comments && existing.lastVerdict) {
    const cleanNew = comments.trim();
    const cleanOld = existing.lastVerdict.trim();
    if (cleanNew === cleanOld || cleanNew.slice(0, 100) === cleanOld.slice(0, 100)) {
      return true;
    }
  }

  return false;
}
