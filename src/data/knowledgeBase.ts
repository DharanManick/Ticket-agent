export interface KnowledgeArticle {
  id: string; // e.g. "KA-2048"
  title: string;
  category: string;
  summary: string;
  approvedSteps: string[];
}

export const defaultKnowledgeArticles: KnowledgeArticle[] = [];

export const approvedClosureConfirmations: string[] = [
  'Confirmed resolved, thank you.',
  'Everything is working fine now. You can close this ticket.',
  'I have verified the fix, and it resolves the deployment routing issue. Thanks!',
  'Yes, the query database latency is resolved. Proceed with ticket closure.',
  'Confirmed, everything is working perfectly. Please proceed with closing this incident.',
  'I am satisfied with the results. You can now close this log.',
  'We tested the upstream feed sync, and the ledger balances match. Closing is approved.',
  'The access token authentication is fully recovered. Thanks, please close this incident.',
  'VPN routing is working perfectly without socket errors. Thank you for your support, close this.',
  'System is up. Closing is fine.'
];

export interface ActivityLogReference {
  id: string;
  text: string;
  quality: 'Excellent' | 'Average' | 'Poorly';
  category: string;
  description: string;
}

export const defaultActivityReferences: ActivityLogReference[] = [];

