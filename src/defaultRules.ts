import { AuditRule } from './types';

export const defaultAuditRules: AuditRule[] = [
  {
    id: 'rule_1',
    keywords: ['patch', 'release', 'code change', 'deployment', 'config update'],
    closureCode: 'Code',
    closureCode2: 'Change related',
    solutionCode: 'Change | Patch | Code Release',
    symptomCode: 'Configuration Issue'
  },
  {
    id: 'rule_2',
    keywords: ['performance', 'slow response', 'CPU', 'execution time', 'config tuning'],
    closureCode: 'Code',
    closureCode2: 'App Performance',
    solutionCode: 'Workaround/Not Listed',
    symptomCode: 'Configuration Issue'
  },
  {
    id: 'rule_3',
    keywords: ['logic defect', 'code fix', 'functional gap', 'script update', 'JIRA'],
    closureCode: 'Code',
    closureCode2: 'App coding error, App functional gap',
    solutionCode: 'Change | Patch | Code Release',
    symptomCode: 'Configuration Issue'
  },
  {
    id: 'rule_4',
    keywords: ['false alert', 'monitoring', 'threshold', 'event noise', 'Netcool'],
    closureCode: 'No fault found',
    closureCode2: 'False alert',
    solutionCode: 'No action taken',
    symptomCode: 'Monitoring'
  },
  {
    id: 'rule_5',
    keywords: ['investigation pending', 'analysis', 'root cause unknown', 'training required'],
    closureCode: 'No fault found',
    closureCode2: 'Unknown cases',
    solutionCode: 'Training | Advise',
    symptomCode: 'Not Listed'
  },
  {
    id: 'rule_6',
    keywords: ['expected behavior', 'working as designed', 'user understanding', 'training advise'],
    closureCode: 'No fault found',
    closureCode2: 'No fault found',
    solutionCode: 'Training | Advise',
    symptomCode: 'General Error'
  },
  {
    id: 'rule_7',
    keywords: ['cancelled', 'false alert', 'monitoring', 'no issue found'],
    closureCode: 'Cancelled',
    closureCode2: 'No fault found',
    solutionCode: 'No action taken',
    symptomCode: 'Monitoring'
  },
  {
    id: 'rule_8',
    keywords: ['cancelled', 'insufficient info', 'monitoring gap', 'lack of RCA'],
    closureCode: 'Cancelled',
    closureCode2: 'Lack of information',
    solutionCode: 'No action taken',
    symptomCode: 'Monitoring'
  },
  {
    id: 'rule_9',
    keywords: ['config error', 'mapping', 'validation', 'workflow', 'condition change'],
    closureCode: 'Configuration',
    closureCode2: 'App Config',
    solutionCode: 'Workaround/Not Listed',
    symptomCode: 'Configuration Issue'
  },
  {
    id: 'rule_10',
    keywords: ['function config', 'workflow execution', 'logic mapping', 'condition update', 'Control-M', 'batch rerun', 'job failure'],
    closureCode: 'Configuration',
    closureCode2: 'App Function Config',
    solutionCode: 'Workaround',
    symptomCode: 'Application Function Issue'
  },
  {
    id: 'rule_11',
    keywords: ['function config', 'workflow execution', 'mapping', 'validation', 'condition update'],
    closureCode: 'Configuration',
    closureCode2: 'App Function Config',
    solutionCode: 'Workaround',
    symptomCode: 'Configuration Issue'
  },
  {
    id: 'rule_12',
    keywords: ['schedule', 'Control-M'],
    closureCode: 'Configuration',
    closureCode2: 'App Scheduling',
    solutionCode: 'Workaround/Not Listed',
    symptomCode: 'Configuration Issue'
  },
  {
    id: 'rule_13',
    keywords: ['upstream delay', 'feed missing', 'file not received', 'dependency'],
    closureCode: 'Dependent',
    closureCode2: 'App data delay',
    solutionCode: 'Received delay data',
    symptomCode: 'Batch Issue'
  },
  {
    id: 'rule_14',
    keywords: ['upstream error', 'data mismatch', 'API timeout', 'connection issue', 'communication failure'],
    closureCode: 'Dependent',
    closureCode2: 'App data error, app connectivity',
    solutionCode: 'Workaround/Not Listed',
    symptomCode: 'Connectivity Issue'
  },
  {
    id: 'rule_15',
    keywords: ['API timeout', 'connection issue', 'communication failure', 'network dependency'],
    closureCode: 'Dependent',
    closureCode2: 'App Connectivity',
    solutionCode: 'Workaround',
    symptomCode: 'Connectivity Issue'
  },
  {
    id: 'rule_16',
    keywords: ['manual update', 'incorrect input', 'missing upload', 'user action'],
    closureCode: 'Manual error',
    closureCode2: 'User Error',
    solutionCode: 'Training | Advise',
    symptomCode: 'Data Issue'
  },
  {
    id: 'rule_17',
    keywords: ['IT error', 'script misfire', 'incorrect config', 'manual fix'],
    closureCode: 'Manual error',
    closureCode2: 'IT Error',
    solutionCode: 'Training | Advise / Workaround',
    symptomCode: 'General Error'
  },
  {
    id: 'rule_18',
    keywords: ['storage', 'cleanup', 'archival', 'capacity', 'space issue'],
    closureCode: 'Capacity',
    closureCode2: 'House-Keeping',
    solutionCode: 'House-Keeping',
    symptomCode: 'Performance Issue'
  },
  {
    id: 'rule_19',
    keywords: ['permissions', 'authentication', 'access denied', 'user rights', 'authorization'],
    closureCode: 'User Access',
    closureCode2: 'Permissions',
    solutionCode: 'Permissions Updated /Not Listed',
    symptomCode: 'Access/Authentication'
  },
  {
    id: 'rule_20',
    keywords: ['external vendor', 'downtime', 'release window', 'dependency outage'],
    closureCode: 'External',
    closureCode2: 'Change Related',
    solutionCode: 'Workaround',
    symptomCode: 'Not Listed'
  },
  {
    id: 'rule_21',
    keywords: ['code change', 'workaround applied', 'patch pending', 'release window', 'temporary fix'],
    closureCode: 'Code',
    closureCode2: 'Change Related',
    solutionCode: 'Workaround',
    symptomCode: 'Not Listed'
  },
  {
    id: 'rule_22',
    keywords: ['service request', 'misclassified', 'general error', 'training'],
    closureCode: 'Miscategorised',
    closureCode2: 'Service Request',
    solutionCode: 'Training | Advise',
    symptomCode: 'General Error'
  },
  {
    id: 'rule_23',
    keywords: ['infrastructure dependency', 'server connectivity', 'network issue', 'API timeout', 'communication failure', 'database error', 'ORA error', 'SQL issue', 'resource lock'],
    closureCode: 'Dependent',
    closureCode2: 'Infrastructure',
    solutionCode: 'Workaround',
    symptomCode: 'Connectivity Issue'
  }
];
