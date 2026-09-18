import { AuditHistoricalRun, TicketAuditReport, AuditResultDetail } from '../types';

function createScoreItem(name: string, score: number, comment: string, passed: boolean): AuditResultDetail {
  const rating: 'Pass' | 'Partial' | 'Fail' = score === 2 ? 'Pass' : score === 1 ? 'Partial' : 'Fail';
  return {
    score,
    rating,
    comment
  };
}

function buildReport(
  incNumber: string,
  assignee: string,
  group: string,
  manager: string,
  percentage: number,
  categoryScores: Record<string, { pass: boolean; comment: string }>,
  dateStr: string
): TicketAuditReport {
  let statusColor: 'Green' | 'Amber' | 'Red' = 'Green';
  if (percentage < 70) statusColor = 'Red';
  else if (percentage < 90) statusColor = 'Amber';

  const defaultComment = 'Criteria verified compliant with standard documentation procedures.';

  return {
    ticket: {
      id: `sample_${incNumber}`,
      incNumber,
      assignee,
      assignmentGroup: group,
      assigneeManager: manager,
      createdDate: `${dateStr}T08:00:00Z`,
      closedDate: `${dateStr}T15:30:00Z`,
      affectedCi: `${group.toLowerCase().replace(/\s+/g, '-')}-srv-01`,
      suspectedCi: `${group.toLowerCase().replace(/\s+/g, '-')}-srv-01`,
      symptomCode: 'Configuration Issue',
      shortDescription: `Operational remediation incident ${incNumber} handled by ${assignee}`,
      technicalDescription: categoryScores.technicalDescription?.pass
        ? 'Identified misconfigured socket parameters causing socket exhaustion in connection pool. Reconfigured timeouts to 3000ms.'
        : 'Fixed issue.',
      serviceImpactDescription: 'Severity P3L verified. Minor latency experienced by auxiliary microservices.',
      businessImpactDescription: 'No merchant financial loss reported.',
      activityLogs: categoryScores.activityLogs?.pass
        ? 'InProgress -> SolvePropose -> SolveConfirm'
        : 'InProgress -> SolveConfirm (Direct Bypass)',
      closureCode1: 'Code',
      closureCode2: 'Change related',
      solutionCode: 'Change | Patch | Code Release',
      externalReference: `EXT-${incNumber.replace('INC', '')}`,
      knowledgeArticle: categoryScores.knowledgeArticle?.pass ? 'KA-4091' : '',
      resolutionDescription: '1. Reviewed diagnostic metrics.\n2. Isolated root cause failure.\n3. Applied configuration patch.\n4. Verified recovery in stage.\n5. Deployed to production.\n6. Executed smoke tests.\n7. Confirmed service health.\n8. Completed signoff.'
    },
    ksl: categoryScores.knowledgeArticle?.pass ? 'Yes' : 'No',
    audited: 'Yes',
    scores: {
      affectedCi: createScoreItem('Affected CI', categoryScores.affectedCi?.pass ? 2 : 0, categoryScores.affectedCi?.comment || defaultComment, categoryScores.affectedCi?.pass ?? true),
      suspectedCi: createScoreItem('Suspected CI', categoryScores.suspectedCi?.pass ? 2 : 0, categoryScores.suspectedCi?.comment || defaultComment, categoryScores.suspectedCi?.pass ?? true),
      symptomCode: createScoreItem('Symptom Code', categoryScores.symptomCode?.pass ? 2 : 0, categoryScores.symptomCode?.comment || defaultComment, categoryScores.symptomCode?.pass ?? true),
      shortDescription: createScoreItem('Short Description', categoryScores.shortDescription?.pass ? 2 : 0, categoryScores.shortDescription?.comment || defaultComment, categoryScores.shortDescription?.pass ?? true),
      technicalDescription: createScoreItem('Technical Description', categoryScores.technicalDescription?.pass ? 2 : 0, categoryScores.technicalDescription?.comment || defaultComment, categoryScores.technicalDescription?.pass ?? true),
      serviceImpactDescription: createScoreItem('Service Impact', categoryScores.serviceImpactDescription?.pass ? 2 : 0, categoryScores.serviceImpactDescription?.comment || defaultComment, categoryScores.serviceImpactDescription?.pass ?? true),
      businessImpactDescription: createScoreItem('Business Impact', categoryScores.businessImpactDescription?.pass ? 2 : 0, categoryScores.businessImpactDescription?.comment || defaultComment, categoryScores.businessImpactDescription?.pass ?? true),
      activityLogs: createScoreItem('Activity Logs', categoryScores.activityLogs?.pass ? 2 : 0, categoryScores.activityLogs?.comment || defaultComment, categoryScores.activityLogs?.pass ?? true),
      closureCode1: createScoreItem('Closure Code 1', categoryScores.closureCode1?.pass ? 2 : 0, categoryScores.closureCode1?.comment || defaultComment, categoryScores.closureCode1?.pass ?? true),
      closureCode2: createScoreItem('Closure Code 2', categoryScores.closureCode2?.pass ? 2 : 0, categoryScores.closureCode2?.comment || defaultComment, categoryScores.closureCode2?.pass ?? true),
      solutionCode: createScoreItem('Solution Code', categoryScores.solutionCode?.pass ? 2 : 0, categoryScores.solutionCode?.comment || defaultComment, categoryScores.solutionCode?.pass ?? true),
      knowledgeArticle: createScoreItem('Knowledge Article', categoryScores.knowledgeArticle?.pass ? 2 : 0, categoryScores.knowledgeArticle?.comment || defaultComment, categoryScores.knowledgeArticle?.pass ?? true),
      resolutionDescription: createScoreItem('Resolution Description', categoryScores.resolutionDescription?.pass ? 2 : 0, categoryScores.resolutionDescription?.comment || defaultComment, categoryScores.resolutionDescription?.pass ?? true)
    },
    totalScore: Math.round((percentage / 100) * 26),
    percentage,
    statusColor,
    generalComments: `Compliance Audit for ${incNumber}: Overall rating ${percentage}% (${statusColor}).`
  };
}

export const sampleHistoricalRuns: AuditHistoricalRun[] = [
  {
    runId: 'hist_run_01',
    timestamp: '2026-05-04T10:00:00Z',
    monthKey: '2026-05 (Week 1)',
    auditorName: 'Lead Compliance Officer',
    totalTickets: 12,
    averageScorePercentage: 78,
    tickets: [
      buildReport('INC0084101', 'Arjun Mehta', 'Retail Payment Gateway', 'Vikram Seth', 92, {
        knowledgeArticle: { pass: true, comment: 'Valid KA referenced' },
        activityLogs: { pass: true, comment: 'Mandated state transitions completed' }
      }, '2026-05-03'),
      buildReport('INC0084102', 'Arjun Mehta', 'Retail Payment Gateway', 'Vikram Seth', 96, {
        knowledgeArticle: { pass: true, comment: 'Valid KA referenced' },
        activityLogs: { pass: true, comment: 'Mandated state transitions completed' }
      }, '2026-05-04'),
      buildReport('INC0084103', 'Clara Oswald', 'Database Administration', 'Vikram Seth', 85, {
        knowledgeArticle: { pass: false, comment: 'Missing cited Knowledge Article' },
        activityLogs: { pass: true, comment: 'Valid flow' }
      }, '2026-05-02'),
      buildReport('INC0084104', 'Clara Oswald', 'Database Administration', 'Vikram Seth', 77, {
        knowledgeArticle: { pass: false, comment: 'Missing cited Knowledge Article' },
        technicalDescription: { pass: false, comment: 'Technical description lacks sufficient diagnostic depth' }
      }, '2026-05-03'),
      buildReport('INC0084105', 'David Tennant', 'Data Ingestion Service', 'Sarah Connor', 54, {
        activityLogs: { pass: false, comment: 'Bypassed Solve-Propose stage into closed state' },
        technicalDescription: { pass: false, comment: 'Under 50 characters threshold' },
        knowledgeArticle: { pass: false, comment: 'Missing KA link' }
      }, '2026-05-01'),
      buildReport('INC0084106', 'David Tennant', 'Data Ingestion Service', 'Sarah Connor', 62, {
        activityLogs: { pass: false, comment: 'State progression jump detected' },
        symptomCode: { pass: false, comment: 'Generic symptom code mismatch' }
      }, '2026-05-02'),
      buildReport('INC0084107', 'Elena Rostova', 'Cloud Infrastructure', 'Sarah Connor', 96, {
        knowledgeArticle: { pass: true, comment: 'KA citation accurate' }
      }, '2026-05-03'),
      buildReport('INC0084108', 'Elena Rostova', 'Cloud Infrastructure', 'Sarah Connor', 100, {}, '2026-05-04'),
      buildReport('INC0084109', 'Marcus Vance', 'Network Operations', 'Vikram Seth', 65, {
        technicalDescription: { pass: false, comment: 'Skeletal technical explanation' },
        activityLogs: { pass: false, comment: 'Solve Propose state bypassed' }
      }, '2026-05-02'),
      buildReport('INC0084110', 'Marcus Vance', 'Network Operations', 'Vikram Seth', 73, {
        knowledgeArticle: { pass: false, comment: 'Knowledge article field blank' }
      }, '2026-05-03'),
      buildReport('INC0084111', 'Priya Sharma', 'Security Operations', 'Sarah Connor', 58, {
        affectedCi: { pass: false, comment: 'Configuration Item mismatch against primary CI dictionary' },
        closureCode1: { pass: false, comment: 'Inconsistent closure categorization' },
        activityLogs: { pass: false, comment: 'Bypassed Solve-Propose transition' }
      }, '2026-05-01'),
      buildReport('INC0084112', 'Priya Sharma', 'Security Operations', 'Sarah Connor', 62, {
        affectedCi: { pass: false, comment: 'CI mapping alignment error' },
        knowledgeArticle: { pass: false, comment: 'Uncited resolution article' }
      }, '2026-05-02')
    ]
  },
  {
    runId: 'hist_run_02',
    timestamp: '2026-05-11T10:00:00Z',
    monthKey: '2026-05 (Week 2)',
    auditorName: 'Lead Compliance Officer',
    totalTickets: 12,
    averageScorePercentage: 81,
    tickets: [
      buildReport('INC0084201', 'Arjun Mehta', 'Retail Payment Gateway', 'Vikram Seth', 96, {}, '2026-05-08'),
      buildReport('INC0084202', 'Arjun Mehta', 'Retail Payment Gateway', 'Vikram Seth', 92, {
        closureCode2: { pass: false, comment: 'Secondary closure categorization warning' }
      }, '2026-05-09'),
      buildReport('INC0084203', 'Clara Oswald', 'Database Administration', 'Vikram Seth', 85, {
        knowledgeArticle: { pass: false, comment: 'Article reference missing' }
      }, '2026-05-09'),
      buildReport('INC0084204', 'Clara Oswald', 'Database Administration', 'Vikram Seth', 88, {}, '2026-05-10'),
      buildReport('INC0084205', 'David Tennant', 'Data Ingestion Service', 'Sarah Connor', 58, {
        activityLogs: { pass: false, comment: 'Bypassed solve propose' },
        technicalDescription: { pass: false, comment: 'Skeletal technical log' }
      }, '2026-05-08'),
      buildReport('INC0084206', 'David Tennant', 'Data Ingestion Service', 'Sarah Connor', 65, {
        activityLogs: { pass: false, comment: 'Solve Propose state skipped' }
      }, '2026-05-09'),
      buildReport('INC0084207', 'Elena Rostova', 'Cloud Infrastructure', 'Sarah Connor', 96, {}, '2026-05-10'),
      buildReport('INC0084208', 'Elena Rostova', 'Cloud Infrastructure', 'Sarah Connor', 92, {}, '2026-05-11'),
      buildReport('INC0084209', 'Marcus Vance', 'Network Operations', 'Vikram Seth', 73, {
        technicalDescription: { pass: false, comment: 'Under 50 chars' }
      }, '2026-05-08'),
      buildReport('INC0084210', 'Marcus Vance', 'Network Operations', 'Vikram Seth', 77, {}, '2026-05-10'),
      buildReport('INC0084211', 'Priya Sharma', 'Security Operations', 'Sarah Connor', 65, {
        affectedCi: { pass: false, comment: 'CI mapping alignment issue' }
      }, '2026-05-09'),
      buildReport('INC0084212', 'Priya Sharma', 'Security Operations', 'Sarah Connor', 62, {
        closureCode1: { pass: false, comment: 'Closure code mismatch' }
      }, '2026-05-10')
    ]
  },
  {
    runId: 'hist_run_03',
    timestamp: '2026-05-18T10:00:00Z',
    monthKey: '2026-05 (Week 3)',
    auditorName: 'Senior Audit Specialist',
    totalTickets: 12,
    averageScorePercentage: 83,
    tickets: [
      buildReport('INC0084301', 'Arjun Mehta', 'Retail Payment Gateway', 'Vikram Seth', 92, {}, '2026-05-15'),
      buildReport('INC0084302', 'Arjun Mehta', 'Retail Payment Gateway', 'Vikram Seth', 96, {}, '2026-05-16'),
      buildReport('INC0084303', 'Clara Oswald', 'Database Administration', 'Vikram Seth', 88, {}, '2026-05-16'),
      buildReport('INC0084304', 'Clara Oswald', 'Database Administration', 'Vikram Seth', 85, {
        knowledgeArticle: { pass: false, comment: 'Missing KA link' }
      }, '2026-05-17'),
      buildReport('INC0084305', 'David Tennant', 'Data Ingestion Service', 'Sarah Connor', 62, {
        activityLogs: { pass: false, comment: 'Bypassed solve propose transition' }
      }, '2026-05-15'),
      buildReport('INC0084306', 'David Tennant', 'Data Ingestion Service', 'Sarah Connor', 69, {
        knowledgeArticle: { pass: false, comment: 'Missing resolution KA' }
      }, '2026-05-17'),
      buildReport('INC0084307', 'Elena Rostova', 'Cloud Infrastructure', 'Sarah Connor', 96, {}, '2026-05-16'),
      buildReport('INC0084308', 'Elena Rostova', 'Cloud Infrastructure', 'Sarah Connor', 100, {}, '2026-05-17'),
      buildReport('INC0084309', 'Marcus Vance', 'Network Operations', 'Vikram Seth', 77, {}, '2026-05-15'),
      buildReport('INC0084310', 'Marcus Vance', 'Network Operations', 'Vikram Seth', 81, {}, '2026-05-16'),
      buildReport('INC0084311', 'Priya Sharma', 'Security Operations', 'Sarah Connor', 62, {
        affectedCi: { pass: false, comment: 'CI mapping alignment issue' }
      }, '2026-05-15'),
      buildReport('INC0084312', 'Priya Sharma', 'Security Operations', 'Sarah Connor', 58, {
        activityLogs: { pass: false, comment: 'Direct jump from In Progress to Closed' }
      }, '2026-05-16')
    ]
  },
  {
    runId: 'hist_run_04',
    timestamp: '2026-05-25T10:00:00Z',
    monthKey: '2026-05 (Week 4)',
    auditorName: 'Senior Audit Specialist',
    totalTickets: 12,
    averageScorePercentage: 84,
    tickets: [
      buildReport('INC0084401', 'Arjun Mehta', 'Retail Payment Gateway', 'Vikram Seth', 96, {}, '2026-05-22'),
      buildReport('INC0084402', 'Arjun Mehta', 'Retail Payment Gateway', 'Vikram Seth', 92, {}, '2026-05-23'),
      buildReport('INC0084403', 'Clara Oswald', 'Database Administration', 'Vikram Seth', 88, {}, '2026-05-23'),
      buildReport('INC0084404', 'Clara Oswald', 'Database Administration', 'Vikram Seth', 85, {
        knowledgeArticle: { pass: false, comment: 'Missing KA reference' }
      }, '2026-05-24'),
      buildReport('INC0084405', 'David Tennant', 'Data Ingestion Service', 'Sarah Connor', 62, {
        activityLogs: { pass: false, comment: 'Bypassed solve propose state' }
      }, '2026-05-22'),
      buildReport('INC0084406', 'David Tennant', 'Data Ingestion Service', 'Sarah Connor', 65, {
        technicalDescription: { pass: false, comment: 'Under 50 chars' }
      }, '2026-05-24'),
      buildReport('INC0084407', 'Elena Rostova', 'Cloud Infrastructure', 'Sarah Connor', 96, {}, '2026-05-23'),
      buildReport('INC0084408', 'Elena Rostova', 'Cloud Infrastructure', 'Sarah Connor', 96, {}, '2026-05-24'),
      buildReport('INC0084409', 'Marcus Vance', 'Network Operations', 'Vikram Seth', 81, {}, '2026-05-22'),
      buildReport('INC0084410', 'Marcus Vance', 'Network Operations', 'Vikram Seth', 85, {}, '2026-05-23'),
      buildReport('INC0084411', 'Priya Sharma', 'Security Operations', 'Sarah Connor', 65, {
        closureCode1: { pass: false, comment: 'Inconsistent closure code' }
      }, '2026-05-23'),
      buildReport('INC0084412', 'Priya Sharma', 'Security Operations', 'Sarah Connor', 58, {
        affectedCi: { pass: false, comment: 'CI mapping alignment issue' }
      }, '2026-05-24')
    ]
  }
];
