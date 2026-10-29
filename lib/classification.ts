/**
 * Ticket classification and state evaluation utilities
 */

/**
 * Evaluates whether an incident is in the ITIL 'Resolved' state.
 * Strictly verifies numeric state 6 or state label 'Resolved', or explicit activity log state transitions.
 * Does NOT classify a ticket as resolved merely because the word 'resolution' appears in a problem description.
 */
export function isResolvedTicket(t: any): boolean {
  if (!t) return false;
  const stateVal = String(t.incidentState || t.state || t.incident_state || '').trim().toLowerCase();
  const prevState = String(t.previousState || t.u_previous_state || '').trim().toLowerCase();
  const logs = String(t.activityLogs || t.comments_and_work_notes || '').toLowerCase();

  // Strict ITIL State matches: Standard ServiceNow 'Resolved' (state 6 or label 'resolved')
  if (
    stateVal === '6' ||
    stateVal === 'resolved' ||
    stateVal.includes('resolved') ||
    prevState === '6' ||
    prevState === 'resolved' ||
    prevState.includes('resolved')
  ) {
    return true;
  }

  // Work note state transitions e.g. "InProgress -> Resolved -> Closed" or "State: Resolved"
  if (
    logs.includes('state: resolved') ||
    logs.includes('-> resolved') ||
    logs.includes('state changed to resolved') ||
    logs.includes('marked resolved')
  ) {
    return true;
  }

  return false;
}

export const isSolveProposeTicket = isResolvedTicket;

/**
 * Checks if a ticket is eligible for empathy analysis (strictly OPEN tickets: New, In Progress, On Hold).
 * Excludes Resolved (6), Closed (7), and Canceled (8).
 */
export function isEmpathyEligibleTicket(t: any): boolean {
  if (!t) return false;
  const stateVal = String(t.incidentState || t.state || (t as any).incident_state || (t as any).status || '').trim().toLowerCase();
  
  // Exclude Resolved states
  const isResolved = (
    stateVal === '6' ||
    stateVal === 'resolved' ||
    stateVal.includes('resolv') ||
    stateVal.includes('solve propose') ||
    stateVal.includes('solve_propose') ||
    stateVal.includes('solution provided')
  );

  // Exclude Closed or Canceled states
  const isClosedOrCanceled = (
    stateVal === '7' ||
    stateVal === '8' ||
    stateVal === 'closed' ||
    stateVal === 'canceled' ||
    stateVal.includes('close') ||
    stateVal.includes('cancel') ||
    stateVal.includes('confirm')
  );

  if (isResolved || isClosedOrCanceled) {
    return false;
  }

  // Work note state transitions to resolved / closed
  const logs = String(t.activityLogs || t.comments_and_work_notes || (t as any).rawActivityLogs || (t as any).latestActivityEntry || '').toLowerCase();
  if (
    logs.includes('incident state: resolved') ||
    logs.includes('incident state resolved') ||
    logs.includes('incident state: solve') ||
    logs.includes('state changed to resolved') ||
    logs.includes('state: resolved') ||
    logs.includes('marked resolved') ||
    logs.includes('solve proposed') ||
    logs.includes('solve proposal') ||
    logs.includes('-> resolved') ||
    logs.includes('incident state: closed') ||
    logs.includes('incident state closed') ||
    logs.includes('state changed to closed') ||
    logs.includes('state: closed') ||
    logs.includes('-> closed')
  ) {
    return false;
  }

  return true;
}

/**
 * Normalizes raw ServiceNow incident states (codes, strings, choice labels)
 * into canonical title-case states: 'Resolved', 'Closed', 'In Progress', 'New', 'On Hold', 'Canceled'.
 */
export function normalizeIncidentState(rawState?: string | number, fallbackLogs?: string): string {
  const s = String(rawState || '').trim().toLowerCase();
  if (
    s === '6' ||
    s === 'resolved' ||
    s.includes('resolved') ||
    s.includes('solve propose') ||
    s.includes('solve_propose') ||
    s.includes('solution provided')
  ) {
    return 'Resolved';
  }
  if (s === '7' || s === 'closed' || s.includes('closed') || s.includes('confirm')) {
    return 'Closed';
  }
  if (s === '1' || s === 'new') {
    return 'New';
  }
  if (s === '2' || s === 'in progress' || s.includes('in progress') || s.includes('in-progress') || s.includes('active')) {
    return 'In Progress';
  }
  if (s === '3' || s === 'on hold' || s.includes('hold') || s.includes('pending')) {
    return 'On Hold';
  }
  if (s === '8' || s === 'canceled' || s.includes('cancel')) {
    return 'Canceled';
  }
  if (fallbackLogs) {
    const l = fallbackLogs.toLowerCase();
    if (
      l.includes('incident state: closed') || 
      l.includes('incident state closed') || 
      l.includes('state: closed') || 
      l.includes('-> closed') || 
      l.includes('state changed to closed')
    ) {
      return 'Closed';
    }
    if (
      l.includes('incident state: resolved') || 
      l.includes('incident state resolved') || 
      l.includes('incident state: solve') ||
      l.includes('state: resolved') || 
      l.includes('-> resolved') || 
      l.includes('state changed to resolved') || 
      l.includes('marked resolved') || 
      l.includes('solve proposed') ||
      l.includes('solve proposal')
    ) {
      return 'Resolved';
    }
  }
  if (rawState) {
    const trimmed = String(rawState).trim();
    if (trimmed.length > 0) {
      return trimmed.replace(/\b\w/g, c => c.toUpperCase());
    }
  }
  return 'In Progress';
}
