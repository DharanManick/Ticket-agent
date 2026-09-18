import { CiCombination } from './types';

export const defaultCiCombinations: CiCombination[] = [
  {
    id: 'ci_combo_1',
    affectedCi: 'payment-processor-ci',
    suspectedCi: 'payment-processor-ci',
    assignmentGroup: 'Retail Payment Gateway',
    assigneeManager: 'Vikram Seth'
  },
  {
    id: 'ci_combo_2',
    affectedCi: 'mysql-billing-db',
    suspectedCi: 'mysql-billing-db',
    assignmentGroup: 'Database Administration',
    assigneeManager: 'Vikram Seth'
  },
  {
    id: 'ci_combo_3',
    affectedCi: 'billing-reports-app',
    suspectedCi: 'partner-salesforce-api',
    assignmentGroup: 'Data Ingestion Service',
    assigneeManager: 'Sarah Connor'
  },
  {
    id: 'ci_combo_4',
    affectedCi: 'network-switch-01',
    suspectedCi: 'network-switch-01',
    assignmentGroup: 'Network WAN Operations',
    assigneeManager: 'Sarah Connor'
  },
  {
    id: 'ci_combo_5',
    affectedCi: 'Outlook Mail Client',
    suspectedCi: 'Exchange Online Server',
    assignmentGroup: 'SaaS Messaging Support',
    assigneeManager: 'Arnaud Dubois'
  }
];
