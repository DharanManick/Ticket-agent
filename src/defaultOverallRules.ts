import { OverallTicketAuditRule } from './types';

export const defaultOverallRules: OverallTicketAuditRule[] = [
  {
    id: 'overall_rule_1',
    ruleCode: 'AFFECTED_CI_ALIGNMENT',
    name: '1. Affected CI Assignment Group Coupling Audit',
    description: 'affected ci -- based on combination given in CI Combination matrix, as per assignment group affected ci need to be audited.',
    category: 'Configuration Alignment',
    weight: 2,
    isEnabled: true,
    errorMessage: 'Mismatched coupling. Affected Service/CI is not authorized for the assigned group.',
    mappingStrictness: 'Strict'
  },
  {
    id: 'overall_rule_2',
    ruleCode: 'SUSPECTED_CI_EXCEPTIONS',
    name: '2. Suspected CI Dependent Exceptions Audit',
    description: 'suspected ci -- if closure code will be dependent system and it was feed delay or any issues happen due to different application will give their ci not like affected ci. Exception if any issue happen due to any infra then will be same application ci (will be closure code 2 as Infrastructure) other issues happen within application will be same application ci was in affected ci.',
    category: 'Configuration Alignment',
    weight: 2,
    isEnabled: true,
    errorMessage: 'Suspected CI must align with closure criteria code assignments.',
    c1DependentKeywords: 'dependent, delay',
    c2InfrastructureKeywords: 'infrastructure, infra'
  },
  {
    id: 'overall_rule_3',
    ruleCode: 'SYMPTOM_CODE_CORRELATION',
    name: '3. Symptom Code Matrix Coupling Audit',
    description: 'symptom code -- based on combination given in rules grid matrix',
    category: 'Configuration Alignment',
    weight: 2,
    isEnabled: true,
    errorMessage: 'Symptom code mismatch based on keywords found.',
    defaultSymptomFallbackScore: 1
  },
  {
    id: 'overall_rule_4',
    ruleCode: 'REQUIRE_SHORT_DESCRIPTION',
    name: '4. Short Description Quality Verification Audit',
    description: 'short description -- valid details (will validate with help of LLM), will get input help with Resolution Description',
    category: 'Documentation Quality',
    weight: 2,
    isEnabled: true,
    errorMessage: 'Short description is missing or invalid.',
    shortDescMinWords: 5
  },
  {
    id: 'overall_rule_5',
    ruleCode: 'TECH_DESC_MIN_LEN',
    name: '5. Technical Description 50+ Character Audit',
    description: 'technical description -- 50+ character mandatory and valid details (will validate with help of LLM), will get input help with Resolution Description',
    category: 'Documentation Quality',
    weight: 2,
    isEnabled: true,
    minLen: 50,
    errorMessage: 'Technical description must be at least 50 characters.'
  },
  {
    id: 'overall_rule_6',
    ruleCode: 'REQUIRE_SERVICE_IMPACT_CODE',
    name: '6. Service Impact Priority Indicator Warning Audit',
    description: 'service impact description -- ticket priority details (example if priority 3 and urgency low then in INC it will have P3L, priority 3 and urgency medium then in INC it will have P3M, etc. -- keep this as warning not as false audit) valid details (will validate with help of LLM), will get input help with Resolution Description',
    category: 'Documentation Quality',
    weight: 2,
    isEnabled: true,
    errorMessage: 'Missing service impact priority-urgency classification code.',
    serviceImpactMinLen: 15,
    serviceImpactRegex: '[pP][1234][hHmL]'
  },
  {
    id: 'overall_rule_7',
    ruleCode: 'REQUIRE_BUSINESS_IMPACT',
    name: '7. Business Impact Verification Audit',
    description: 'business impact description -- valid details (will validate with help of LLM), will get input help with Resolution Description',
    category: 'Documentation Quality',
    weight: 2,
    isEnabled: true,
    errorMessage: 'Missing business impact explanation statement.',
    businessImpactMinLen: 10
  },
  {
    id: 'overall_rule_8',
    ruleCode: 'ACTIVITY_LOG_STATE_BYPASS',
    name: '8. Activity Logs Daily State Transition Audit',
    description: 'activity logs -- daily updates, if 1 day miss have warnings as now, check all details like chats, mail chain, resolution description details etc. then full score, if no updates more then 2 days then reduce the score half based on audits (will validate with help of LLM) and ticket status need to move like in-progress --> resolved --> closed, if InProgress --> closed without resolved state it is false audit.',
    category: 'Process Compliance',
    weight: 2,
    isEnabled: true,
    errorMessage: 'Transitions missed core checkpoints or bypassed resolved state.',
    activityMaxDaysNoUpdate: 2,
    activityRequiredStates: 'progress, resolved, closed'
  },
  {
    id: 'overall_rule_9',
    ruleCode: 'CLOSURE_CODE_1_ALIGNMENT',
    name: '9. Closure Code 1 Matrix Audit',
    description: 'closure code1 -- based on combination given in rules grid matrix',
    category: 'Configuration Alignment',
    weight: 2,
    isEnabled: true,
    errorMessage: 'Closure code 1 mismatch based on Confluence rules matrix.',
    defaultClosure1FallbackScore: 1
  },
  {
    id: 'overall_rule_10',
    ruleCode: 'CLOSURE_CODE_2_ALIGNMENT',
    name: '10. Closure Code 2 Matrix Audit',
    description: 'closure code2 -- based on combination given in rules grid matrix',
    category: 'Configuration Alignment',
    weight: 2,
    isEnabled: true,
    errorMessage: 'Closure code 2 mismatch based on Confluence rules matrix.',
    defaultClosure2FallbackScore: 1
  },
  {
    id: 'overall_rule_11',
    ruleCode: 'SOLUTION_CODE_ALIGNMENT',
    name: '11. Solution Code Matrix Audit',
    description: 'solution code -- based on combination given in rules grid matrix',
    category: 'Configuration Alignment',
    weight: 2,
    isEnabled: true,
    errorMessage: 'Solution code mismatch based on rules matrix.',
    defaultSolutionFallbackScore: 1
  },
  {
    id: 'overall_rule_12',
    ruleCode: 'KNOWLEDGE_ARTICLE_CITATION',
    name: '12. Mandatory Knowledge Base Article Citation Audit',
    description: 'knowledge article -- not empty',
    category: 'Process Compliance',
    weight: 2,
    isEnabled: true,
    errorMessage: 'Knowledge Article citation registration is mandatory.',
    kbArticlePrefixRule: 'KB'
  },
  {
    id: 'overall_rule_13',
    ruleCode: 'RESOLUTION_DESC_8_POINTS',
    name: '13. Resolution Description Content & Quality Audit',
    description: 'Resolution description content validity verified by LLM against ServiceNow KB Article, activity logs, short description, and technical description. 8-point checklist is advisory (missing checklist gives 1 mark / Amber Warning, valid resolution passes with 2 marks).',
    category: 'Process Compliance',
    weight: 2,
    isEnabled: true,
    errorMessage: 'Resolution description lacks valid technical remediation content or complete diagnostic sequence.',
    resDescMinPointsCount: 8,
    targetAlignmentScore: 60
  }
];
