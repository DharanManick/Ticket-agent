import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Ticket } from '../types';
import { 
  UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, Sparkles, Filter, Info, 
  ChevronDown, ChevronUp, BookOpen, Database 
} from 'lucide-react';

interface UploadSectionProps {
  onTicketsLoaded: (tickets: Ticket[]) => void;
  isLoading: boolean;
  triggerPopup: (msg: string, type: 'success' | 'info' | 'warning') => void;
  onTriggerAudit?: (ticketsList: Ticket[]) => Promise<void>;
}

const SCHEMA_COLUMNS = [
  {
    field: "Incident Number",
    required: true,
    candidates: ["Reference Number", "Incident Number", "INC Number", "INC", "Number", "ID", "Ticket"],
    description: "Unique ServiceNow tracking reference. Default sequential placeholder assigned if absent.",
    govRole: "Primary ticket identity alignment"
  },
  {
    field: "Assignment Group",
    required: true,
    candidates: ["Assignment Group", "Group", "Service Group"],
    description: "Departmental team queue. Used to evaluate group SLA and organizational metrics.",
    govRole: "Governance tracking by organizational queue"
  },
  {
    field: "Assigned To (Assignee)",
    required: true,
    candidates: ["Assigned to", "Assignee", "Owner", "Analyst", "Agent"],
    description: "Full name of the engineer of record responsible for the audit assessment score.",
    govRole: "Individual performance accountability logs"
  },
  {
    field: "Previous State",
    required: false,
    candidates: ["Previous State", "Prev State", "Prior State"],
    description: "Used to assess whether ticket skipped mandated 'Resolved' verification stages.",
    govRole: "Bypassed state transition audit"
  },
  {
    field: "Incident State",
    required: true,
    candidates: ["Incident State", "State", "Status", "Stage"],
    description: "Supports automatic 'Resolved' filter categorization, closed duration, etc.",
    govRole: "Lifecycle state validation compliance"
  },
  {
    field: "Affected Service / CI",
    required: true,
    candidates: ["Affected Service/CI", "Affected CI", "Configuration Item", "CI"],
    description: "Operational IT asset or corporate application. Checked against current rules settings.",
    govRole: "Configuration Management database integrity"
  },
  {
    field: "Suspect/Causal CI",
    required: true,
    candidates: ["Suspect/Causal CI", "Suspected CI", "Suspected Item"],
    description: "Root cause asset. Ensures operational teams isolate failed system components correctly.",
    govRole: "Causal CI audit criteria assessment"
  },
  {
    field: "Symptom Code",
    required: true,
    candidates: ["Symptom Code", "Symptom", "Symptom Category"],
    description: "Standard triage categorizer. Audited to avoid standard generic default selections.",
    govRole: "Trouble signature alignment validation"
  },
  {
    field: "Short Description",
    required: true,
    candidates: ["Short Description", "Summary", "Subject", "Title"],
    description: "Brief user-facing summary. Subjected to semantic clarity review.",
    govRole: "Coherence and clear documentation audit"
  },
  {
    field: "Technical Impact Description",
    required: true,
    candidates: ["Technical Impact Description", "Technical Description", "technical_description", "Work Notes", "Tech Notes", "Tech Details"],
    description: "Troubleshooting logs. Requires 50+ chars of operational troubleshooting evidence.",
    govRole: "Technical investigation verification check"
  },
  {
    field: "Service Impact Description",
    required: true,
    candidates: ["Service Impact Description", "Service Impact", "Impact", "service_impact_description"],
    description: "Delineates enterprise blast radius and operational degradation details.",
    govRole: "Service impact & operational SLA enforcement"
  },
  {
    field: "Business Impact Justification",
    required: true,
    candidates: ["Business Impact Justification", "Business Impact Description", "Business Impact", "Justification", "business_impact_justification"],
    description: "Business translation of incident fallout for leadership reports review.",
    govRole: "Business fallout severity certification"
  },
  {
    field: "Activity Logs / Work History",
    required: true,
    candidates: ["Activity Logs / Work History", "Activity Log", "Activity Logs", "Logs", "Transitions", "Audit Trail", "activity_logs"],
    description: "Chronological activity audit trail. Validates active communications & transition checkpoints.",
    govRole: "Chronological work verification audit"
  },
  {
    field: "Closure Code 1",
    required: true,
    candidates: ["Closure Code 1", "Closure Code1", "Closure Code", "Closure", "Resolution Type"],
    description: "High-level classification for resolved issues (e.g. System Restart, Patch Applied).",
    govRole: "Audit category code matching verification"
  },
  {
    field: "Knowledge Article Citation",
    required: true,
    candidates: ["Knowledge Article Citation", "Knowledge Article", "KA", "KB", "Article", "Knowledge Base"],
    description: "Mandatory standard reference number referencing corporate knowledge database entries (e.g., KA001234).",
    govRole: "Citation of standardized standard work procedures"
  },
  {
    field: "Resolution Description",
    required: true,
    candidates: ["Resolution Description", "Resolution Notes", "Closing Notes"],
    description: "Mandatory detailed closing steps. Checked points include systematic 8-stage requirements.",
    govRole: "Critical closing checklist fulfillment"
  }
];

function isResolvedClient(t: any): boolean {
  if (!t) return false;
  const stateVal = String(t.incidentState || t.state || t.incident_state || '').trim().toLowerCase();
  const prevState = String(t.previousState || t.u_previous_state || '').trim().toLowerCase();
  const logs = String(t.activityLogs || t.comments_and_work_notes || '').toLowerCase();
  const desc = String(t.resolutionDescription || t.close_notes || t.technicalDescription || t.description || '').toLowerCase();

  // State matches: "resolved", "resolve", "resolv", or state code "6"
  if (
    stateVal === 'resolved' ||
    stateVal === 'resolve' ||
    stateVal === '6' ||
    stateVal.includes('resolv') ||
    prevState.includes('resolv') ||
    prevState === '6'
  ) {
    return true;
  }

  // Work note transitions e.g. "InProgress -> Resolved -> Closed"
  if (
    logs.includes('resolved') ||
    logs.includes('resolve') ||
    logs.includes('marked resolved') ||
    logs.includes('state changed to resolved')
  ) {
    return true;
  }

  // Resolution description matches
  if (
    desc.includes('resolved') ||
    desc.includes('resolution')
  ) {
    return true;
  }

  return false;
}

const isSolveProposeClient = isResolvedClient;

export default function UploadSection({ onTicketsLoaded, isLoading, triggerPopup, onTriggerAudit }: UploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [originalCount, setOriginalCount] = useState<number | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [onlyResolved, setOnlyResolved] = useState(() => {
    const cachedValue = localStorage.getItem('gov_only_resolved') ?? localStorage.getItem('gov_only_solve_propose');
    return cachedValue === 'true';
  });
  const [manualLoadEnabled, setManualLoadEnabled] = useState(() => {
    return localStorage.getItem('gov_snow_manual_load_enabled') === 'true';
  });
  const [rawUnfilteredTickets, setRawUnfilteredTickets] = useState<Ticket[] | null>(null);
  const [pendingTickets, setPendingTickets] = useState<Ticket[] | null>(null);
  const [showSchemaGuide, setShowSchemaGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load backend credentials on mount to ensure server correlation & client parity
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const response = await fetch('/api/servicenow/credentials');
        if (response.ok) {
          const creds = await response.json();
          if (creds) {
            setManualLoadEnabled(creds.manualLoadEnabled === true);
            localStorage.setItem('gov_snow_manual_load_enabled', String(creds.manualLoadEnabled === true));
            const isResolvedActive = creds.onlyResolved !== undefined ? creds.onlyResolved === true : (creds.onlySolvePropose === true);
            setOnlyResolved(isResolvedActive);
            localStorage.setItem('gov_only_resolved', String(isResolvedActive));
          }
        }
      } catch (err) {
        console.error('Failed to fetch credentials in UploadSection:', err);
      }
    };
    fetchCredentials();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setManualLoadEnabled(localStorage.getItem('gov_snow_manual_load_enabled') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('governance_manual_load_changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('governance_manual_load_changed', handleStorageChange);
    };
  }, []);


  const formatToStandardDate = (rawVal: any): string => {
    if (rawVal === undefined || rawVal === null) {
      return new Date().toISOString().substring(0, 19).replace('T', ' ');
    }
    const str = String(rawVal).trim();
    if (!str) {
      return new Date().toISOString().substring(0, 19).replace('T', ' ');
    }

    // Handle Excel Serial Numbers if they are numbers
    if (!isNaN(Number(str))) {
      const serial = Number(str);
      if (serial > 20000 && serial < 100000) { // realistic range for excel dates
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const msPerDay = 24 * 60 * 60 * 1000;
        const d = new Date(excelEpoch.getTime() + (serial * msPerDay));
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
      }
    }

    // Otherwise try normal JS Date parsing
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      }
    } catch (e) {
      // fallback
    }

    return str;
  };

  // Normalize column matching for robust ServiceNow corporate dump dumps
  const findColumnValue = (row: any, candidates: string[]): string => {
    const keys = Object.keys(row);
    for (const cand of candidates) {
      const match = keys.find(k => k.trim().toLowerCase().replace(/[\s_\/-]/g, '') === cand.toLowerCase().replace(/[\s_\/-]/g, ''));
      if (match) {
        return row[match] !== undefined && row[match] !== null ? String(row[match]).trim() : '';
      }
    }
    return '';
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setErrorText(null);
    setParsedCount(null);
    setOriginalCount(null);
    setPendingTickets(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Could not read binary file data.');

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          throw new Error('Spreadsheet worksheet contains zero rows.');
        }

        // --- STRICTOR COLUMN VALIDATION GATES ---
        const allSheetHeaders = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
        const missingRequiredFields: string[] = [];

        SCHEMA_COLUMNS.forEach((col) => {
          if (col.required) {
            const hasMatch = allSheetHeaders.some(headerKey => {
              const cleanedHeader = headerKey.trim().toLowerCase().replace(/[\s_\/-]/g, '');
              return col.candidates.some(cand => {
                const cleanedCandidate = cand.toLowerCase().replace(/[\s_\/-]/g, '');
                return cleanedHeader === cleanedCandidate;
              });
            });
            if (!hasMatch) {
              missingRequiredFields.push(col.field);
            }
          }
        });

        if (missingRequiredFields.length > 0) {
          const detailMsg = `Upload Refused: Spreadsheet is missing critical required audit column${missingRequiredFields.length > 1 ? 's' : ''}: ${missingRequiredFields.join(', ')}. Ensure your columns match standard ServiceNow dump headers.`;
          setErrorText(detailMsg);
          triggerPopup(`Declined: Missing required column${missingRequiredFields.length > 1 ? 's' : ''}! See error logs.`, 'warning');
          return;
        }

        // Map columns to structured incident tickets (Robust candidates)
        const parsedTickets: Ticket[] = rows.map((row, idx) => {
          const logs = findColumnValue(row, [
            'Activity Log',
            'activityLogs',
            'activity_logs',
            'logs',
            'activitylog',
            'transitions',
            'worklog',
            'audit_trail'
          ]);
          const rawState = findColumnValue(row, [
            'Incident State',
            'incident_state',
            'incidentstate',
            'state',
            'status',
            'stage',
            'ticket_state'
          ]);
          const prevState = findColumnValue(row, [
            'Previous State',
            'previous_state',
            'previousstate',
            'prev_state',
            'prevstate',
            'prior_state',
            'priorstate'
          ]);
          const derivedState = rawState || (logs.toLowerCase().includes('confirm') ? 'Closed' : 'Resolved');
          
          return {
            id: `excel_ticket_${idx}_${Date.now()}`,
            incNumber: findColumnValue(row, [
              'Reference Number',
              'incNumber',
              'incidentNumber',
              'inc_number',
              'incident_number',
              'inc',
              'incident',
              'number',
              'id',
              'ticket',
              'ticketnumber',
              'ticket_number',
              'incident_id',
              'incidentid',
              'incident no',
              'incident no.',
              'no',
              'no.',
              'ref',
              'reference',
              'ref_no'
            ]) || `INC-${100000 + idx}`,
            assignee: findColumnValue(row, [
              'Assigned to',
              'assignee',
              'assignedto',
              'assigned_to',
              'owner',
              'analyst',
              'agent',
              'solved_by'
            ]) || 'Unassigned Analyst',
            assignmentGroup: findColumnValue(row, [
              'Assignment Group',
              'assignmentgroup',
              'assignment_group',
              'group',
              'servicegroup',
              'service_group'
            ]) || 'General Support',
            assigneeManager: findColumnValue(row, ['assigneemanager', 'assignee_manager', 'manager', 'managername', 'manager_name', 'lead']) || 'Corporate Manager',
            createdDate: formatToStandardDate(findColumnValue(row, [
              'Created',
              'createddate',
              'created_date',
              'created',
              'opened',
              'openeddate',
              'opened_at'
            ]) || new Date().toISOString()),
            closedDate: formatToStandardDate(findColumnValue(row, ['closeddate', 'closed_date', 'closed', 'resolveddate', 'resolved', 'resolved_at']) || new Date().toISOString()),
            affectedCi: findColumnValue(row, [
              'Affected Service/CI',
              'affectedci',
              'affected_ci',
              'ci',
              'configurationitem',
              'configuration_item',
              'appci'
            ]),
            suspectedCi: findColumnValue(row, [
              'Suspect/Causal CI',
              'suspectedci',
              'suspected_ci',
              'suspected',
              'suspecteditem',
              'suspected_item'
            ]),
            symptomCode: findColumnValue(row, [
              'Symptom Code',
              'symptomcode',
              'symptom_code',
              'symptom',
              'symptomcategory',
              'symptom_category'
            ]),
            shortDescription: findColumnValue(row, [
              'Short Description',
              'shortdescription',
              'short_description',
              'summary',
              'description',
              'subject',
              'title'
            ]),
            technicalDescription: findColumnValue(row, [
              'Technical Impact Description',
              'technicaldescription',
              'technical_description',
              'technotes',
              'worknotes',
              'techdetails',
              'tech_notes',
              'work_notes'
            ]),
            serviceImpactDescription: findColumnValue(row, [
              'Service impact description',
              'serviceimpactdescription',
              'service_impact',
              'impact',
              'serviceimpact',
              'priority',
              'severity',
              'urgency'
            ]),
            businessImpactDescription: findColumnValue(row, [
              'Business impact description',
              'businessimpactdescription',
              'business_impact',
              'businessimpact'
            ]),
            activityLogs: logs,
            closureCode1: findColumnValue(row, [
              'Closure Code',
              'closurecode1',
              'closure_code1',
              'closurecode',
              'closure_code',
              'closure'
            ]),
            closureCode2: findColumnValue(row, [
              'Closure Code 2',
              'closurecode2',
              'closure_code2',
              'subclosure',
              'resolutioncode',
              'resolution_code'
            ]),
            solutionCode: findColumnValue(row, [
              'Solution code',
              'solutioncode',
              'solution_code',
              'solution',
              'resolution_type'
            ]),
            externalReference: findColumnValue(row, ['externalreference', 'external_reference', 'reference', 'jira', 'ref', 'ticket_ref']),
            knowledgeArticle: findColumnValue(row, [
              'Knowledge Article',
              'knowledgearticle',
              'knowledge_article',
              'ka',
              'kb',
              'article',
              'knowledge_base'
            ]),
            resolutionDescription: findColumnValue(row, [
              'Resolution Description',
              'resolutiondescription',
              'resolution_description',
              'resolutionnotes',
              'resolution',
              'closingnotes',
              'close_notes'
            ]),
            acceptedAppCounter: findColumnValue(row, [
              'Accepted App Counter',
              'acceptedappcounter',
              'accepted_app_counter'
            ]),
            incidentState: derivedState,
            previousState: prevState
          };
        });

        setRawUnfilteredTickets(parsedTickets);
        const totalExtracted = parsedTickets.length;
        setOriginalCount(totalExtracted);

        // Apply "Resolved" state filtering on demand
        let finalTickets = parsedTickets;
        if (onlyResolved) {
          finalTickets = parsedTickets.filter(isResolvedClient);
          
          setParsedCount(finalTickets.length);
          if (finalTickets.length === 0) {
            triggerPopup(`Filtered for 'Resolved' states: 0 of ${totalExtracted} records matched.`, 'warning');
          } else {
            triggerPopup(`Ingested ${finalTickets.length} 'Resolved' records successfully (filtered from ${totalExtracted})!`, 'success');
          }
        } else {
          setParsedCount(totalExtracted);
          triggerPopup(`Parsed full database dump of ${totalExtracted} rows.`, 'success');
        }

        setPendingTickets(finalTickets);
      } catch (err: any) {
        console.error('Core Excel Parser error:', err);
        setErrorText(`Excel format error: ${err?.message || 'Verify column titles'}`);
        triggerPopup(`Failed parsing Excel sheet.`, 'warning');
      }
    };

    reader.onerror = () => {
      setErrorText('File reading error occurred.');
      triggerPopup(`Reader IO error on client side.`, 'warning');
    };

    reader.readAsBinaryString(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const toggleOnlyResolved = async () => {
    const newValue = !onlyResolved;
    setOnlyResolved(newValue);
    localStorage.setItem('gov_only_resolved', String(newValue));
    localStorage.setItem('gov_only_solve_propose', String(newValue));
    triggerPopup(
      newValue 
        ? "Active state restricted: 'Resolved' filter is NOW active and saved permanently." 
        : "Relaxed state restriction: Auditing entire incident pool, saved permanently.", 
      'info'
    );

    // 1. Sync state change to server automatically
    try {
      await fetch('/api/servicenow/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onlyResolved: newValue,
          onlySolvePropose: newValue
        })
      });
    } catch (err) {
      console.error('Failed to sync resolved toggle to server:', err);
    }

    // 2. If user uploaded a local file, immediately re-filter and audit
    if (rawUnfilteredTickets && rawUnfilteredTickets.length > 0) {
      let finalTickets = rawUnfilteredTickets;
      if (newValue) {
        finalTickets = rawUnfilteredTickets.filter(isResolvedClient);
      }
      setOriginalCount(rawUnfilteredTickets.length);
      setParsedCount(finalTickets.length);
      setPendingTickets(finalTickets);
      onTicketsLoaded(finalTickets);
      if (onTriggerAudit) {
        triggerPopup(`Audited ${finalTickets.length} records under workspace (${newValue ? "'Resolved' Only" : "All Incidents"}).`, 'info');
        await onTriggerAudit(finalTickets);
      }
      return;
    }

    // 3. Dispatch event for active sync listeners
    window.dispatchEvent(new CustomEvent('governance_force_sync_trigger'));
  };

  const toggleManualLoad = async () => {
    const newValue = !manualLoadEnabled;
    setManualLoadEnabled(newValue);
    localStorage.setItem('gov_snow_manual_load_enabled', String(newValue));
    triggerPopup(
      newValue 
        ? "Manual Load Mode active: direct ServiceNow incident retrieval is now bypassed, keeping your uploaded file datasets intact." 
        : "Manual Load Mode deactivated: automated ServiceNow incident retrieval is re-enabled.", 
      'info'
    );

    // Sync state change to server automatically
    try {
      await fetch('/api/servicenow/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manualLoadEnabled: newValue
        })
      });
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('governance_manual_load_changed'));
    } catch (err) {
      console.error('Failed to sync manual-load toggle to server:', err);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm" id="upload-panel">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-500 rounded-sm"></span>
            Governance Incident Dump Processor & Parser
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Pick up all incident details from your attached excel file automatically to execute a valid audit sweep.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Manual Load Mode Toggle */}
          <button
            type="button"
            onClick={toggleManualLoad}
            className="flex items-center space-x-2 bg-muted/60 hover:bg-muted border border-border hover:border-emerald-500/50 rounded-lg px-3 py-1.5 transition-all text-xs text-foreground cursor-pointer"
            title="When ON, skips background automated incident fetches from ServiceNow, keeping manual uploads active. Knowledge articles are still pulled."
          >
            <Database className={`h-3 w-3 ${manualLoadEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
            <span>Manual Load Mode:</span>
            {manualLoadEnabled ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                <span>ON</span>
              </span>
            ) : (
              <span className="text-muted-foreground font-semibold">OFF</span>
            )}
          </button>

          {/* Resolved Only Filter Toggle */}
          <button
            type="button"
            onClick={toggleOnlyResolved}
            className="flex items-center space-x-2 bg-muted/60 hover:bg-muted border border-border hover:border-blue-500/50 rounded-lg px-3 py-1.5 transition-all text-xs text-foreground cursor-pointer"
          >
            <Filter className={`h-3 w-3 ${onlyResolved ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
            <span>Resolved Only:</span>
            {onlyResolved ? (
              <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center space-x-1">
                <span>ON</span>
              </span>
            ) : (
              <span className="text-muted-foreground font-semibold">OFF</span>
            )}
          </button>
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          dragActive 
            ? 'border-blue-500 bg-blue-500/5' 
            : 'border-border hover:border-blue-400 bg-muted/20 hover:bg-muted/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={handleChange}
        />
        
        <UploadCloud className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">
          Drag & drop your ServiceNow excel dump here, or <span className="text-blue-600 dark:text-blue-400 font-semibold underline">browse local directory</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">Parsed to extract 24 specific parameters for complete alignment checks</p>
        
        {fileName && (
          <div className="mt-4 flex items-center space-x-2 bg-blue-50 dark:bg-muted border border-blue-200 dark:border-border px-3.5 py-1.5 rounded-lg text-xs font-mono text-blue-700 dark:text-blue-400">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>{fileName}</span>
          </div>
        )}
      </div>

      {errorText && (
        <div className="mt-4 flex items-center space-x-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-3 rounded-lg text-xs text-rose-700 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}

      {parsedCount !== null && !errorText && pendingTickets && (
        <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs py-1">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>ServiceNow Spreadsheet Dataset Attached Successfully</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
              Extracted <strong className="text-emerald-600 dark:text-emerald-300 font-bold">{parsedCount}</strong> matching incident rules target logs. {originalCount && originalCount !== parsedCount ? `(Down-sampled from total file index of ${originalCount}).` : ''} All parameters mapped.
            </p>
          </div>
          
          <button
            type="button"
            onClick={async () => {
              const ticketsToLoad = [...pendingTickets];
              onTicketsLoaded(ticketsToLoad);
              setPendingTickets(null); // Clear pending state after dispatching
              triggerPopup('ServiceNow incident dataset ingested successfully!', 'success');
              if (onTriggerAudit) {
                await onTriggerAudit(ticketsToLoad);
              }
            }}
            disabled={isLoading}
            className="shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40 border border-emerald-400/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-slate-950" />
            <span>Trigger ServiceNow Incident Audit Sweep</span>
          </button>
        </div>
      )}

      {/* 📋 Schema specifications Accordion Section */}
      <div className="mt-5 pt-4 border-t border-border" id="schema-mapping-accordion">
        <button
          type="button"
          onClick={() => setShowSchemaGuide(!showSchemaGuide)}
          className="flex items-center justify-between w-full text-left py-2.5 px-4 bg-muted/40 hover:bg-muted/70 border border-border rounded-xl text-xs font-semibold text-foreground transition-all select-none group cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <span className="font-bold text-foreground tracking-wide">Excel/CSV Schema Mapping Guide & Required Columns</span>
              <span className="text-[10px] text-muted-foreground font-normal">Reference list of columns necessary for ServiceNow Audit compliance assessment</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 font-mono text-[10.5px]">
            <span className="text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded border border-border">
              {SCHEMA_COLUMNS.length} Columns Mapped
            </span>
            {showSchemaGuide ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {showSchemaGuide && (
          <div className="mt-3 p-4 bg-muted/30 border border-border rounded-xl space-y-4 animate-fadeIn">
            {/* Quick explanation banner */}
            <div className="flex items-start bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 p-3 rounded-lg text-xs leading-relaxed text-foreground/80">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 mr-2.5 animate-pulse" />
              <div>
                <p className="font-bold text-blue-700 dark:text-blue-300">Fuzzy Header Parsing Support Enabled</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">The analytical dump processor uses fuzzy spelling matching. Cell headers do NOT need to match the titles exactly; capitalization, spaces, underscores, or dashes are automatically normalized to simplify report uploads.</p>
              </div>
            </div>

            {/* Grid structure for columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
              {SCHEMA_COLUMNS.map((col) => (
                <div 
                  key={col.field} 
                  className="bg-card border border-border rounded-lg p-3 space-y-2 hover:border-blue-500/40 hover:shadow-sm transition-all flex flex-col justify-between"
                  id={`schema-field-${col.field.toLowerCase().replace(/[\s_/()]+/g, '-')}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground tracking-tight">{col.field}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                        col.required 
                          ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/15' 
                          : 'text-muted-foreground bg-muted border border-border'
                      }`}>
                        {col.required ? 'Mandatory' : 'Optional'}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                      {col.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border font-mono text-[10px]">
                    <div>
                      <span className="text-muted-foreground font-bold uppercase block text-[8px] tracking-wider mb-0.5">Matched Headers (Excel Candidates):</span>
                      <div className="flex flex-wrap gap-1">
                        {col.candidates.map((cand) => (
                          <span 
                            key={cand} 
                            className="bg-muted border border-border px-1.5 py-0.5 rounded text-foreground font-medium font-mono text-[9px]"
                          >
                            {cand}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
                      <span className="text-[8.5px] uppercase font-bold text-muted-foreground tracking-wider">Evaluation Focus:</span>
                      <span className="text-blue-700 dark:text-blue-300 font-medium font-sans">{col.govRole}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick hint for template download and verification */}
            <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between flex-wrap gap-3">
              <p className="text-[10.5px] text-muted-foreground font-sans">
                💡 <strong>Audit Pre-Check tip:</strong> Export a standard ServiceNow <em>incident.xlsx</em> dump list containing these columns directly, with active <strong>Closed / Resolved</strong> dates, to run an immediately green audit trial.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
