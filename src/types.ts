export interface Ticket {
  id: string;
  incNumber: string;
  assignee: string;
  assignmentGroup: string;
  assigneeManager: string;
  createdDate: string;
  closedDate: string;
  affectedCi: string;
  suspectedCi: string;
  symptomCode: string;
  shortDescription: string;
  technicalDescription: string;
  serviceImpactDescription: string; // e.g., "P1H", "P3L", or descriptive
  businessImpactDescription: string;
  activityLogs: string; // e.g. "InProgress -> SolvePropose -> SolveConfirm"
  closureCode1: string;
  closureCode2: string;
  solutionCode: string;
  externalReference: string;
  knowledgeArticle: string;
  resolutionDescription: string;
  incidentState?: string;
  previousState?: string;
  acceptedAppCounter?: string;
}

export interface AuditRule {
  id: string;
  keywords: string[];
  closureCode: string;
  closureCode2: string;
  solutionCode: string;
  symptomCode: string;
}

export interface AuditResultDetail {
  score: number; // 0, 1, or 2
  rating: 'Pass' | 'Partial' | 'Fail';
  comment: string;
  embeddingSimilarity?: number;    // Semantic similarity score (0.0 to 1.0)
  embeddingMethod?: 'embeddings' | 'token-jaccard';
  embeddingReferenceText?: string; // What standard/article it was compared to
}

export interface TicketAuditReport {
  ticket: Ticket;
  ksl?: 'Yes' | 'No'; // Deprecated KSL flag
  linkedKbNumber?: string;
  isNetcoolExempt?: boolean;
  audited: 'Yes' | 'No';
  scores: {
    affectedCi: AuditResultDetail;
    suspectedCi: AuditResultDetail;
    symptomCode: AuditResultDetail;
    shortDescription: AuditResultDetail;
    technicalDescription: AuditResultDetail;
    serviceImpactDescription: AuditResultDetail;
    businessImpactDescription: AuditResultDetail;
    activityLogs: AuditResultDetail;
    closureCode1: AuditResultDetail;
    closureCode2: AuditResultDetail;
    solutionCode: AuditResultDetail;
    knowledgeArticle: AuditResultDetail;
    resolutionDescription: AuditResultDetail;
    comments?: AuditResultDetail;
  };
  rawScores?: Record<string, AuditResultDetail>;
  totalScore: number; // Sum of points (max 26)
  percentage: number; // (totalScore / 26) * 100
  statusColor: 'Green' | 'Amber' | 'Red';
  generalComments: string;
  matchedKeyword?: string;
  auditFlowsEvaluated?: Array<{
    flowId: string;
    name: string;
    status: 'Pass' | 'Fail' | 'Partial' | 'Bypassed';
    detail: string;
  }>;
  ragAnalysisDetail?: {
    hasLinkedKa: boolean;
    linkedKaId: string;
    matchedKaTitle?: string;
    similarityScore: number; // e.g. 0.84
    similarityRating: 'Excellent' | 'Good' | 'Weak' | 'None';
    recommendedKaId?: string;
    recommendedKaTitle?: string;
    comments: string;
  };
  closureConfirmationDetail?: {
    hasConfirmation: boolean;
    maxSimilarityScore: number;
    matchedPattern?: string;
    isAiVerified: boolean;
    comments: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  isError?: boolean;
  rawQuery?: string;
  suggestions?: string[];
  contract?: {
    answered: boolean;
    sources_used: string[];
    tools_called: string[];
    needs_followup: boolean;
    followup_reason: string | null;
  };
}

export interface AuditHistoricalRun {
  runId: string;
  timestamp: string;
  monthKey: string;
  auditorName: string;
  totalTickets: number;
  averageScorePercentage: number;
  tickets: TicketAuditReport[];
}

export interface KnowledgeArticle {
  id: string; // e.g., "KA-2048"
  title: string;
  category: string;
  summary: string;
  approvedSteps: string[];
}

export interface CiCombination {
  id: string;
  affectedCi: string;
  suspectedCi: string;
  assignmentGroup: string;
  assigneeManager?: string;
}

export interface OverallTicketAuditRule {
  id: string;
  ruleCode: string; // e.g. "TECH_DESC_MIN_LEN", "AFFECTED_CI_ALIGNMENT", etc.
  name: string;
  description: string;
  category: string;
  weight: number;
  isEnabled: boolean;
  minLen?: number; // customizable min characters rule
  errorMessage: string;
  
  // Custom Easy Configurable parameters for individual rules:
  mappingStrictness?: 'Strict' | 'Loose' | 'AllowAny'; // Rule 1
  c1DependentKeywords?: string; // Rule 2
  c2InfrastructureKeywords?: string; // Rule 2
  defaultSymptomFallbackScore?: number; // Rule 3
  shortDescMinWords?: number; // Rule 4
  serviceImpactMinLen?: number; // Rule 6
  serviceImpactRegex?: string; // Rule 6
  businessImpactMinLen?: number; // Rule 7
  activityMaxDaysNoUpdate?: number; // Rule 8
  activityRequiredStates?: string; // Rule 8
  defaultClosure1FallbackScore?: number; // Rule 9
  defaultClosure2FallbackScore?: number; // Rule 10
  defaultSolutionFallbackScore?: number; // Rule 11
  kbArticlePrefixRule?: string; // Rule 12
  resDescMinPointsCount?: number; // Rule 13
  targetAlignmentScore?: number; // Target alignment score / similarity threshold (e.g. 60 for 60%)
}

export interface ActivityIncident {
  id: string;
  incNumber: string;
  hoursIdle: number;
  notificationStatus: string;
  complianceStatus: 'COMPLIANT' | 'NON-COMPLIANT';
  qualityCheck: 'Excellent' | 'Average' | 'Poorly';
  latestActivityEntry: string;
  assignee: string;
  assignmentGroup: string;
  status?: string;
  incidentState?: string;
  previousState?: string;
  similarityScore?: number;
  matchedReferenceId?: string;
  comments?: string;
  notificationTriggerStatus?: string;
  rawActivityLogs?: string;
  isValid?: boolean;
  llmComments?: string;
  isInformative?: boolean;
  hasCopiedEmail?: boolean;
  hasCopiedChat?: boolean;
  hasNegativeComments?: boolean;
  updatedDate?: string;
  isUpdatedToday?: boolean;
  dateValidationMessage?: string;
}

export interface ActivityLogReference {
  id: string;
  text: string;
  quality: 'Excellent' | 'Average' | 'Poorly';
  category: string;
  description: string;
}

export interface FetchLogEntry {
  id: string;
  timestamp: string;
  triggerType: 'auto' | 'manual';
  tables: string[];
  recordsFetched: number;
  recordsIngested: number;
  status: 'success' | 'error';
  errorMessage?: string;
  details?: string;
}

export interface SmtpConfig {
  host: string;
  port: number | string;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  displayName?: string;
  useSimulator?: boolean;
}

export interface ManagementDigestConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  dispatchTime: string; // e.g. "09:00"
  dispatchDayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  recipients: string;
  ccRecipients: string;
  includeAssignedManagers: boolean;
  minSeverityFilter: 'all' | 'warning' | 'critical';
  includeStaleDateViolations: boolean;
  includeSlaIdleViolations: boolean;
  includeIncompleteResolution: boolean;
  assignmentGroupFilter: string;
  maxInfractionsCount: number;
  subjectTemplate: string;
  executiveIntroNote: string;
  lastDispatchedAt?: string | null;
  lastDispatchStatus?: 'success' | 'failed' | 'simulated' | null;
  lastDispatchSummary?: string | null;
}

export interface DigestDispatchLogEntry {
  id: string;
  timestamp: string;
  triggerType: 'manual_test' | 'scheduled_daily' | 'scheduled_weekly';
  frequency: 'daily' | 'weekly';
  recipientsCount: number;
  infractionsCount: number;
  averageScore: number;
  status: 'sent' | 'simulated' | 'failed';
  smtpHost: string;
  messageId?: string;
  errorMessage?: string;
}

export interface MandatoryMetricDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  weight: number;
}

export interface AssignmentGroupMetricsConfig {
  assignmentGroup: string;
  enabledMetrics: Record<string, boolean>; // metricId -> boolean
  updatedAt?: string;
}

export interface UsageStats {
  llm: {
    totalCalls: number;
    promptTokens: number;
    responseTokens: number;
    estimatedCostUsd: number;
    averageLatencyMs: number;
    successRate: number;
    modelBreakdown: Record<string, number>;
    recentCalls: Array<{
      id: string;
      timestamp: string;
      model: string;
      task: string;
      tokens: number;
      latencyMs: number;
      status: 'Success' | 'Error';
    }>;
  };
  servicenow: {
    totalRequests: number;
    successRequests: number;
    failedRequests: number;
    averageResponseTimeMs: number;
    lastSyncTimestamp: string;
    endpointBreakdown: Record<string, number>;
    recentRequests: Array<{
      id: string;
      timestamp: string;
      method: string;
      endpoint: string;
      statusCode: number;
      responseTimeMs: number;
      recordCount: number;
      status: 'Success' | 'Error';
    }>;
  };
}

export function isSolveProposeTicket(t: any): boolean {
  if (!t) return false;
  const stateVal = String(t.incidentState || t.state || t.incident_state || '').trim().toLowerCase();
  const prevState = String(t.previousState || t.u_previous_state || '').trim().toLowerCase();
  const logs = String(t.activityLogs || t.comments_and_work_notes || '').toLowerCase();
  const desc = String(t.resolutionDescription || t.close_notes || t.technicalDescription || t.description || '').toLowerCase();

  // State matches
  if (
    stateVal.includes('propose') ||
    stateVal.includes('proposed') ||
    stateVal === 'solve propose' ||
    stateVal === 'solve_propose' ||
    stateVal === 'solvepropose' ||
    prevState.includes('propose') ||
    prevState.includes('proposed')
  ) {
    return true;
  }

  // Work note transitions e.g. "InProgress -> SolvePropose -> SolveConfirm" or "solve propose"
  if (
    logs.includes('solve propose') ||
    logs.includes('solve proposed') ||
    logs.includes('solvepropose') ||
    logs.includes('solve_propose') ||
    logs.includes('solved propose') ||
    logs.includes('solved_propose') ||
    logs.includes('propose solve') ||
    logs.includes('proposed solve') ||
    logs.includes('proposed solved') ||
    logs.includes('proposal')
  ) {
    return true;
  }

  // Resolution description matches
  if (
    desc.includes('solve propose') ||
    desc.includes('proposed solve') ||
    desc.includes('proposed solved')
  ) {
    return true;
  }

  return false;
}

