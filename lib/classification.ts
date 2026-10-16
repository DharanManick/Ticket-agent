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
 * Checks if a ticket is eligible for empathy analysis (Resolved or Closed states).
 */
export function isEmpathyEligibleTicket(t: any): boolean {
  if (!t) return false;
  const stateVal = String(t.incidentState || t.state || '').trim().toLowerCase();
  
  const isResolved = (
    stateVal.includes('resolve') || 
    stateVal.includes('resolved') || 
    stateVal === '6'
  );
  const isSolveConfirmedOrClosed = (
    stateVal.includes('confirm') || 
    stateVal.includes('confirmed') || 
    stateVal.includes('close') || 
    stateVal.includes('closed') || 
    stateVal === '7' ||
    stateVal.includes('solve confirmed')
  );

  return isResolved || isSolveConfirmedOrClosed;
}
