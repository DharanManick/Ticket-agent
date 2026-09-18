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
    description: "Used to assess whether ticket skipped mandated 'Solve Propose' verification stages.",
    govRole: "Bypassed state transition audit"
  },
  {
    field: "Incident State",
    required: true,
    candidates: ["Incident State", "State", "Status", "Stage"],
    description: "Supports automatic 'Solve Propose' filter categorization, closed duration, etc.",
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

function isSolveProposeClient(t: any): boolean {
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

export default function UploadSection({ onTicketsLoaded, isLoading, triggerPopup, onTriggerAudit }: UploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [originalCount, setOriginalCount] = useState<number | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [onlySolvePropose, setOnlySolvePropose] = useState(() => {
    const cachedValue = localStorage.getItem('gov_only_solve_propose');
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
            if (creds.onlySolvePropose !== undefined) {
              const isEnabled = creds.onlySolvePropose === true;
              setOnlySolvePropose(isEnabled);
              localStorage.setItem('gov_only_solve_propose', String(isEnabled));
            }
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

        // Apply "Solve Propose" state filtering on demand
        let finalTickets = parsedTickets;
        if (onlySolvePropose) {
          finalTickets = parsedTickets.filter(isSolveProposeClient);
          
          setParsedCount(finalTickets.length);
          if (finalTickets.length === 0) {
            triggerPopup(`Filtered for 'Solve Propose' states: 0 of ${totalExtracted} records matched.`, 'warning');
          } else {
            triggerPopup(`Ingested ${finalTickets.length} 'Solve Propose' records successfully (filtered from ${totalExtracted})!`, 'success');
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

  const toggleOnlySolvePropose = async () => {
    const newValue = !onlySolvePropose;
    setOnlySolvePropose(newValue);
    localStorage.setItem('gov_only_solve_propose', String(newValue));
    triggerPopup(
      newValue 
        ? "Active state restricted: 'Solve Propose' filter is NOW active and saved permanently." 
        : "Relaxed state restriction: Auditing entire incident pool, saved permanently.", 
      'info'
    );

    // 1. Sync state change to server automatically
    try {
      await fetch('/api/servicenow/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onlySolvePropose: newValue
        })
      });
    } catch (err) {
      console.error('Failed to sync solve-propose toggle to server:', err);
    }

    // 2. If user uploaded a local file, immediately re-filter and audit
    if (rawUnfilteredTickets && rawUnfilteredTickets.length > 0) {
      let finalTickets = rawUnfilteredTickets;
      if (newValue) {
        finalTickets = rawUnfilteredTickets.filter(isSolveProposeClient);
      }
      setOriginalCount(rawUnfilteredTickets.length);
      setParsedCount(finalTickets.length);
      setPendingTickets(finalTickets);
      onTicketsLoaded(finalTickets);
      if (onTriggerAudit) {
        triggerPopup(`Audited ${finalTickets.length} records under workspace (${newValue ? "'Solve Propose' Only" : "All Incidents"}).`, 'info');
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
    <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg" id="upload-panel">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></span>
            Governance Incident Dump Processor & Parser
          </h4>
          <p className="text-xs text-gray-400 mt-1">
            Pick up all incident details from your attached excel file automatically to execute a valid audit sweep.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Manual Load Mode Toggle */}
          <button
            type="button"
            onClick={toggleManualLoad}
            className="flex items-center space-x-2 bg-[#1A1D24] border border-[#2A2D35] hover:border-[#10B981] rounded-lg px-3 py-1.5 transition-all text-xs text-slate-300 cursor-pointer"
            title="When ON, skips background automated incident fetches from ServiceNow, keeping manual uploads active. Knowledge articles are still pulled."
          >
            <Database className={`h-3 w-3 ${manualLoadEnabled ? 'text-emerald-400' : 'text-gray-500'}`} />
            <span>Manual Load Mode:</span>
            {manualLoadEnabled ? (
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <span>ON</span>
              </span>
            ) : (
              <span className="text-gray-500 font-semibold">OFF</span>
            )}
          </button>

          {/* Solve Propose Only Filter Toggle */}
          <button
            type="button"
            onClick={toggleOnlySolvePropose}
            className="flex items-center space-x-2 bg-[#1A1D24] border border-[#2A2D35] hover:border-gray-600 rounded-lg px-3 py-1.5 transition-all text-xs text-slate-300"
          >
            <Filter className={`h-3 w-3 ${onlySolvePropose ? 'text-blue-400' : 'text-gray-500'}`} />
            <span>Solve Proposes Only:</span>
            {onlySolvePropose ? (
              <span className="text-blue-400 font-bold flex items-center space-x-1">
                <span>ON</span>
              </span>
            ) : (
              <span className="text-gray-500 font-semibold">OFF</span>
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
            : 'border-[#2A2D35] hover:border-gray-600 bg-[#0A0C0F]/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={handleChange}
        />
        
        <UploadCloud className="h-10 w-10 text-gray-500 mb-3" />
        <p className="text-sm font-medium text-[#E0E0E0]">
          Drag & drop your ServiceNow excel dump here, or <span className="text-blue-400 font-semibold underline">browse local directory</span>
        </p>
        <p className="text-[11px] text-gray-500 mt-1">Parsed to extract 24 specific parameters for complete alignment checks</p>
        
        {fileName && (
          <div className="mt-4 flex items-center space-x-2 bg-[#1A1D24] border border-[#2A2D35] px-3.5 py-1.5 rounded-lg text-xs font-mono text-blue-400">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>{fileName}</span>
          </div>
        )}
      </div>

      {errorText && (
        <div className="mt-4 flex items-center space-x-2.5 bg-rose-950/20 border border-rose-900/40 p-3 rounded-lg text-xs text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}

      {parsedCount !== null && !errorText && pendingTickets && (
        <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs py-1">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>ServiceNow Spreadsheet Dataset Attached Successfully</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
              Extracted <strong className="text-emerald-300 font-bold">{parsedCount}</strong> matching incident rules target logs. {originalCount && originalCount !== parsedCount ? `(Down-sampled from total file index of ${originalCount}).` : ''} All parameters mapped.
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
      <div className="mt-5 pt-4 border-t border-[#2A2D35]/50" id="schema-mapping-accordion">
        <button
          type="button"
          onClick={() => setShowSchemaGuide(!showSchemaGuide)}
          className="flex items-center justify-between w-full text-left py-2.5 px-4 bg-[#111317] hover:bg-[#1A1D24] border border-[#2A2D35] rounded-xl text-xs font-semibold text-slate-200 transition-all select-none group cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <BookOpen className="h-4 w-4 text-blue-400 group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-wide">Excel/CSV Schema Mapping Guide & Required Columns</span>
              <span className="text-[10px] text-gray-500 font-normal">Reference list of columns necessary for ServiceNow Audit compliance assessment</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 font-mono text-[10.5px]">
            <span className="text-gray-400 font-medium bg-[#1A1D24] px-2 py-0.5 rounded border border-[#2A2D35]/65">
              {SCHEMA_COLUMNS.length} Columns Mapped
            </span>
            {showSchemaGuide ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>

        {showSchemaGuide && (
          <div className="mt-3 p-4 bg-[#0C0E12] border border-[#22242C] rounded-xl space-y-4 animate-fadeIn">
            {/* Quick explanation banner */}
            <div className="flex items-start bg-blue-500/5 border border-blue-500/10 p-3 rounded-lg text-xs leading-relaxed text-slate-400">
              <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5 mr-2.5 animate-pulse" />
              <div>
                <p className="font-bold text-blue-300">Fuzzy Header Parsing Support Enabled</p>
                <p className="mt-0.5 text-[11px]">The analytical dump processor uses fuzzy spelling matching. Cell headers do NOT need to match the titles exactly; capitalization, spaces, underscores, or dashes are automatically normalized to simplify report uploads.</p>
              </div>
            </div>

            {/* Grid structure for columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
              {SCHEMA_COLUMNS.map((col) => (
                <div 
                  key={col.field} 
                  className="bg-[#15171C] border border-[#2A2D35]/70 rounded-lg p-3 space-y-2 hover:border-[#3A3E4B] transition-all flex flex-col justify-between"
                  id={`schema-field-${col.field.toLowerCase().replace(/[\s_/()]+/g, '-')}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 tracking-tight">{col.field}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                        col.required 
                          ? 'text-rose-400 bg-rose-500/10 border border-rose-500/15' 
                          : 'text-gray-400 bg-gray-500/10 border border-gray-500/15'
                      }`}>
                        {col.required ? 'Mandatory' : 'Optional'}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                      {col.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[#2A2D35]/40 font-mono text-[10px]">
                    <div>
                      <span className="text-gray-500 font-bold uppercase block text-[8px] tracking-wider mb-0.5">Matched Headers (Excel Candidates):</span>
                      <div className="flex flex-wrap gap-1">
                        {col.candidates.map((cand) => (
                          <span 
                            key={cand} 
                            className="bg-[#1C1F26] border border-[#2A2D35]/50 px-1.5 py-0.5 rounded text-gray-300 font-medium font-mono text-[9px]"
                          >
                            {cand}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-blue-400 font-semibold mt-1">
                      <span className="text-[8.5px] uppercase font-bold text-gray-500 tracking-wider">Evaluation Focus:</span>
                      <span className="text-blue-300 font-medium font-sans">{col.govRole}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick hint for template download and verification */}
            <div className="bg-[#111317] border border-[#22242C] p-3 rounded-lg flex items-center justify-between flex-wrap gap-3">
              <p className="text-[10.5px] text-gray-500 font-sans">
                💡 <strong>Audit Pre-Check tip:</strong> Export a standard ServiceNow <em>incident.xlsx</em> dump list containing these columns directly, with active <strong>Closed / Save Proposed</strong> dates, to run an immediately green audit trial.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
