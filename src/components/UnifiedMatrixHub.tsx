import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Code, 
  Info, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  RefreshCw,
  Layers,
  ArrowRight,
  Database,
  Terminal,
  FileJson
} from 'lucide-react';
import { AuditRule, CiCombination } from '../types';

interface UnifiedMatrixHubProps {
  rules: AuditRule[];
  ciCombinations: CiCombination[];
  onRulesSave: (newRules: AuditRule[]) => void;
  onCombinationsSave: (newCombinations: CiCombination[]) => void;
  triggerPopup: (msg: string, type: 'success' | 'info' | 'warning') => void;
}

export default function UnifiedMatrixHub({
  rules,
  ciCombinations,
  onRulesSave,
  onCombinationsSave,
  triggerPopup
}: UnifiedMatrixHubProps) {
  const [dragActive, setDragActive] = useState(false);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [successLogs, setSuccessLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawJsonPaste, setRawJsonPaste] = useState('');
  const [activeTab, setActiveTab] = useState<'instructions' | 'playground'>('instructions');

  // Case-insensitive cell value locator
  const findValue = (row: any, keysToSearch: string[]): any => {
    const rowKeys = Object.keys(row);
    for (const key of keysToSearch) {
      const matched = rowKeys.find(
        k => k.trim().toLowerCase().replace(/[\s_\/-]/g, '') === key.toLowerCase().replace(/[\s_\/-]/g, '')
      );
      if (matched !== undefined) {
        return row[matched];
      }
    }
    return undefined;
  };

  const handleExportJSON = () => {
    try {
      const unifiedData = {
        rules: rules.map(({ keywords, closureCode, closureCode2, solutionCode, symptomCode }) => ({
          keywords,
          closureCode,
          closureCode2,
          solutionCode,
          symptomCode
        })),
        ciCombinations: ciCombinations.map(({ affectedCi, suspectedCi, assignmentGroup, assigneeManager }) => ({
          affectedCi,
          suspectedCi,
          assignmentGroup,
          assigneeManager
        }))
      };

      const blob = new Blob([JSON.stringify(unifiedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `servicenow-compliance-unified-matrices_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerPopup('Unified JSON configuration matrix downloaded!', 'success');
    } catch (e: any) {
      triggerPopup(`Failed to export JSON: ${e.message}`, 'warning');
    }
  };

  const handleExportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Keyword Rules
      const rulesData = rules.map((r) => ({
        'Resolution Keywords': r.keywords.join(', '),
        'Closure Code': r.closureCode,
        'Closure Code Part 2': r.closureCode2,
        'Solution Code': r.solutionCode,
        'Symptom Code': r.symptomCode
      }));
      const rulesWorksheet = XLSX.utils.json_to_sheet(rulesData);
      XLSX.utils.book_append_sheet(workbook, rulesWorksheet, 'Keyword Rules');

      // Sheet 2: CI Combinations
      const ciData = ciCombinations.map((c) => ({
        'Affected Service / CI': c.affectedCi,
        'Suspected / Causal CI': c.suspectedCi,
        'Assignment Group': c.assignmentGroup,
        'Assignee Manager': c.assigneeManager || ''
      }));
      const ciWorksheet = XLSX.utils.json_to_sheet(ciData);
      XLSX.utils.book_append_sheet(workbook, ciWorksheet, 'CI Combinations');

      // Save spreadsheet
      XLSX.writeFile(workbook, `servicenow-compliance-unified-matrices_${new Date().toISOString().slice(0, 10)}.xlsx`);
      triggerPopup('Unified 2-Tab Excel Matrix Workbook downloaded!', 'success');
    } catch (e: any) {
      triggerPopup(`Failed to export Excel workbook: ${e.message}`, 'warning');
    }
  };

  const handleDownloadTemplateExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Keyword Rules
      const rulesData = [
        {
          'Resolution Keywords': 'database, tablespace, high memory usage',
          'Closure Code': 'Software',
          'Closure Code Part 2': 'Successful',
          'Solution Code': 'Patched DB Instance',
          'Symptom Code': 'Database slow'
        }
      ];
      const rulesWorksheet = XLSX.utils.json_to_sheet(rulesData);
      XLSX.utils.book_append_sheet(workbook, rulesWorksheet, 'Keyword Rules');

      // Sheet 2: CI Combinations
      const ciData = [
        {
          'Affected Service / CI': 'Oracle-Database-Prod',
          'Suspected / Causal CI': 'db-server-04.infra',
          'Assignment Group': 'DBA Core Group',
          'Assignee Manager': 'Sarah Connor'
        }
      ];
      const ciWorksheet = XLSX.utils.json_to_sheet(ciData);
      XLSX.utils.book_append_sheet(workbook, ciWorksheet, 'CI Combinations');

      XLSX.writeFile(workbook, `servicenow-compliance-matrix-blank-template.xlsx`);
      triggerPopup('Blank 2-Tab Excel Template downloaded!', 'success');
    } catch (e: any) {
      triggerPopup(`Failed to download template: ${e.message}`, 'warning');
    }
  };

  const handleDownloadTemplateJson = () => {
    try {
      const sampleTemplate = {
        rules: [
          {
            keywords: ["database", "tablespace", "high memory usage"],
            closureCode: "Software",
            closureCode2: "Successful",
            solutionCode: "Patched DB Instance",
            symptomCode: "Database slow"
          }
        ],
        ciCombinations: [
          {
            affectedCi: "Oracle-Database-Prod",
            suspectedCi: "db-server-04.infra",
            assignmentGroup: "DBA Core Group",
            assigneeManager: "Sarah Connor"
          }
        ]
      };

      const blob = new Blob([JSON.stringify(sampleTemplate, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `servicenow-compliance-matrix-blank-template.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerPopup('Blank JSON Template downloaded!', 'success');
    } catch (e: any) {
      triggerPopup(`Failed to download template: ${e.message}`, 'warning');
    }
  };

  // Main file uploader parser
  const parseUnifiedFile = (file: File) => {
    setErrorLogs([]);
    setSuccessLogs([]);
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          let rulesCount = 0;
          let ciCount = 0;

          if (!data.rules && !data.ciCombinations) {
            throw new Error('JSON format is missing standard root components ("rules" or "ciCombinations").');
          }

          if (data.rules && Array.isArray(data.rules)) {
            const mappedRules: AuditRule[] = data.rules.map((item: any, idx: number) => {
              let parsedKeywords: string[] = [];
              if (Array.isArray(item.keywords)) {
                parsedKeywords = item.keywords.map((k: any) => String(k).trim());
              } else if (typeof item.keywords === 'string') {
                parsedKeywords = item.keywords.split(',').map((k: string) => k.trim());
              } else if (item['Resolution Keywords']) {
                parsedKeywords = String(item['Resolution Keywords']).split(',').map((k: string) => k.trim());
              } else {
                parsedKeywords = ['imported key'];
              }

              return {
                id: item.id || `rule_json_migrated_${idx}_${Date.now()}`,
                keywords: parsedKeywords,
                closureCode: String(item.closureCode || item['Closure Code'] || ''),
                closureCode2: String(item.closureCode2 || item['Closure Code Part 2'] || item['subClosure'] || ''),
                solutionCode: String(item.solutionCode || item['Solution Code'] || ''),
                symptomCode: String(item.symptomCode || item['Symptom Code'] || '')
              };
            });
            onRulesSave(mappedRules);
            rulesCount = mappedRules.length;
          }

          if (data.ciCombinations && Array.isArray(data.ciCombinations)) {
            const mappedCis: CiCombination[] = data.ciCombinations.map((item: any, idx: number) => {
              return {
                id: item.id || `ci_combo_json_migrated_${idx}_${Date.now()}`,
                affectedCi: String(item.affectedCi || item['Affected Service / CI'] || item['Affected CI'] || 'unknown-ci'),
                suspectedCi: String(item.suspectedCi || item['Suspected / Causal CI'] || item['Suspected CI'] || 'unknown-ci'),
                assignmentGroup: String(item.assignmentGroup || item['Assignment Group'] || 'Service Desk Group'),
                assigneeManager: String(item.assigneeManager || item['Assignee Manager'] || '')
              };
            });
            onCombinationsSave(mappedCis);
            ciCount = mappedCis.length;
          }

          const logs: string[] = [];
          if (rulesCount > 0) logs.push(`Successfully synced ${rulesCount} Keyword Rules.`);
          if (ciCount > 0) logs.push(`Successfully synced ${ciCount} CI Compatibility Mappings.`);
          setSuccessLogs(logs);
          triggerPopup(`Synchronized matrices: Loaded ${rulesCount} rules & ${ciCount} CI entries.`, 'success');
        } catch (err: any) {
          setErrorLogs([`JSON Parse Error: ${err.message}`]);
          triggerPopup('File parsing failed. Inspect log report.', 'warning');
        }
      };
      reader.readAsText(file);

    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const binary = e.target?.result;
          if (!binary) throw new Error('Could not read binary file context.');

          const workbook = XLSX.read(binary, { type: 'binary' });
          let importedRules: AuditRule[] = [];
          let importedCis: CiCombination[] = [];

          // Try to locate sheets dynamically by name
          workbook.SheetNames.forEach((sheetName) => {
            const cleanSheetName = sheetName.trim().toLowerCase();
            const sheet = workbook.Sheets[sheetName];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet);

            if (rows.length === 0) return;

            // Sheet 1 Detection: Rules Mapping
            if (cleanSheetName.includes('rule') || cleanSheetName.includes('keyword') || cleanSheetName.includes('matrix')) {
              importedRules = rows.map((row, idx) => {
                const wordsRaw = findValue(row, ['Resolution Keywords', 'keywords', 'Keywords', 'word']);
                let parsedKeys: string[] = [];
                if (typeof wordsRaw === 'string') {
                  parsedKeys = wordsRaw.split(',').map(s => s.trim()).filter(Boolean);
                } else if (Array.isArray(wordsRaw)) {
                  parsedKeys = wordsRaw.map(s => String(s).trim()).filter(Boolean);
                } else if (wordsRaw) {
                  parsedKeys = [String(wordsRaw).trim()];
                } else {
                  parsedKeys = ['restored link'];
                }

                return {
                  id: `rule_excel_migrated_${idx}_${Date.now()}`,
                  keywords: parsedKeys,
                  closureCode: String(findValue(row, ['Closure Code', 'closureCode', 'category']) || ''),
                  closureCode2: String(findValue(row, ['Closure Code Part 2', 'closureCode2', 'subClosure', 'Closure Code (2)']) || ''),
                  solutionCode: String(findValue(row, ['Solution Code', 'solutionCode', 'solution']) || ''),
                  symptomCode: String(findValue(row, ['Symptom Code', 'symptomCode', 'symptom']) || '')
                };
              });
            }

            // Sheet 2 Detection: CI combinations mapping
            if (cleanSheetName.includes('ci') || cleanSheetName.includes('combo') || cleanSheetName.includes('combination') || cleanSheetName.includes('mapping')) {
              importedCis = rows.map((row, idx) => {
                return {
                  id: `ci_excel_migrated_${idx}_${Date.now()}`,
                  affectedCi: String(findValue(row, ['Affected Service / CI', 'affectedCi', 'Affected CI', 'affected_ci']) || 'unknown-ci'),
                  suspectedCi: String(findValue(row, ['Suspected / Causal CI', 'suspectedCi', 'Suspected CI', 'suspected_ci']) || 'unknown-ci'),
                  assignmentGroup: String(findValue(row, ['Assignment Group', 'assignmentGroup', 'assignment_group']) || 'Service Desk Group'),
                  assigneeManager: String(findValue(row, ['Assignee Manager', 'assigneeManager', 'manager']) || '')
                };
              });
            }
          });

          // Fallback if sheets were not recognized by name - evaluate columns dynamically
          if (importedRules.length === 0 && importedCis.length === 0 && workbook.SheetNames.length > 0) {
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const firstRows: any[] = XLSX.utils.sheet_to_json(firstSheet);
            if (firstRows.length > 0) {
              const rowKeys = Object.keys(firstRows[0]).map(k => k.toLowerCase().replace(/[\s_\/-]/g, ''));
              
              const looksLikeRules = rowKeys.some(k => k.includes('keyword') || k.includes('closure') || k.includes('symptom'));
              const looksLikeCis = rowKeys.some(k => k.includes('affected') || k.includes('suspect') || k.includes('assignment'));

              if (looksLikeRules) {
                importedRules = firstRows.map((row, idx) => {
                  const wordsRaw = findValue(row, ['Resolution Keywords', 'keywords', 'Keywords', 'word']);
                  let parsedKeys: string[] = [];
                  if (typeof wordsRaw === 'string') {
                    parsedKeys = wordsRaw.split(',').map(s => s.trim());
                  } else {
                    parsedKeys = [String(wordsRaw || 'restored_link')];
                  }

                  return {
                    id: `rule_excel_migrated_${idx}_${Date.now()}`,
                    keywords: parsedKeys,
                    closureCode: String(findValue(row, ['Closure Code', 'closureCode']) || ''),
                    closureCode2: String(findValue(row, ['Closure Code Part 2', 'closureCode2']) || ''),
                    solutionCode: String(findValue(row, ['Solution Code', 'solutionCode']) || ''),
                    symptomCode: String(findValue(row, ['Symptom Code', 'symptomCode']) || '')
                  };
                });
              } else if (looksLikeCis) {
                importedCis = firstRows.map((row, idx) => ({
                  id: `ci_excel_migrated_${idx}_${Date.now()}`,
                  affectedCi: String(findValue(row, ['Affected Service / CI', 'affectedCi']) || 'unknown-ci'),
                  suspectedCi: String(findValue(row, ['Suspected / Causal CI', 'suspectedCi']) || 'unknown-ci'),
                  assignmentGroup: String(findValue(row, ['Assignment Group', 'assignmentGroup']) || 'Service Desk Group'),
                  assigneeManager: String(findValue(row, ['Assignee Manager', 'assigneeManager']) || '')
                }));
              }
            }
          }

          if (importedRules.length === 0 && importedCis.length === 0) {
            throw new Error('Could not identify valid templates. Verify sheet names contain "Rule" or "CI-combinations" keywords.');
          }

          const logs: string[] = [];
          if (importedRules.length > 0) {
            onRulesSave(importedRules);
            logs.push(`Excel Reader synced ${importedRules.length} Keyword Rules successfully.`);
          }
          if (importedCis.length > 0) {
            onCombinationsSave(importedCis);
            logs.push(`Excel Reader synced ${importedCis.length} CI-Combinations successfully.`);
          }

          setSuccessLogs(logs);
          triggerPopup(`Workbook parsed: Synced ${importedRules.length} rules, ${importedCis.length} CI combinations.`, 'success');
        } catch (err: any) {
          setErrorLogs([`Excel Parse Exception: ${err.message}`]);
          triggerPopup('Excel decoding aborted due to sheet misalignment.', 'warning');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setErrorLogs([`Refused: Unsupported suffix format ".${extension}". Only JSON (.json) and Excel (.xlsx, .xls) are allowed.`]);
      triggerPopup('Rejected file type.', 'warning');
    }
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
      parseUnifiedFile(e.dataTransfer.files[0]);
    }
  };

  const handleManualUploadClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseUnifiedFile(e.target.files[0]);
    }
  };

  const handleApplyPasteJson = () => {
    try {
      const data = JSON.parse(rawJsonPaste);
      let rulesCount = 0;
      let ciCount = 0;

      if (!data.rules && !data.ciCombinations) {
        triggerPopup('JSON missing "rules" or "ciCombinations" elements.', 'warning');
        return;
      }

      if (data.rules && Array.isArray(data.rules)) {
        const mapped = data.rules.map((item: any, idx: number) => ({
          id: item.id || `rule_json_copied_${idx}_${Date.now()}`,
          keywords: Array.isArray(item.keywords) ? item.keywords.map((k: any) => String(k).trim()) : [String(item.keywords || 'keyword')],
          closureCode: String(item.closureCode || ''),
          closureCode2: String(item.closureCode2 || ''),
          solutionCode: String(item.solutionCode || ''),
          symptomCode: String(item.symptomCode || '')
        }));
        onRulesSave(mapped);
        rulesCount = mapped.length;
      }

      if (data.ciCombinations && Array.isArray(data.ciCombinations)) {
        const mapped = data.ciCombinations.map((item: any, idx: number) => ({
          id: item.id || `ci_copied_${idx}_${Date.now()}`,
          affectedCi: String(item.affectedCi || ''),
          suspectedCi: String(item.suspectedCi || ''),
          assignmentGroup: String(item.assignmentGroup || ''),
          assigneeManager: String(item.assigneeManager || '')
        }));
        onCombinationsSave(mapped);
        ciCount = mapped.length;
      }

      triggerPopup(`Past Buffer Synchronized: ${rulesCount} rules and ${ciCount} CI combos populated!`, 'success');
      setRawJsonPaste('');
      setSuccessLogs([`Pasted payload synchronized successfully: rules (${rulesCount}), CI combinations (${ciCount})`]);
    } catch (e: any) {
      triggerPopup(`Failed to parse pasted text: ${e.message}`, 'warning');
    }
  };

  return (
    <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-xl space-y-6" id="unified-matrix-governance-hub">
      
      {/* Visual Identity Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#2A2D35] pb-4 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-600/10 border border-blue-500/30 rounded-lg text-blue-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight uppercase">Unified Governance Migration & Sync Hub</h3>
            <p className="text-[11px] text-gray-500 font-medium">Consolidated bulk export/import manager for Keyword Matrices & CI Coupling</p>
          </div>
        </div>

        {/* Double Export Action Suite */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            id="export-unified-json-btn"
            onClick={handleExportJSON}
            className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 hover:text-white border border-[#2A2D35] text-xs font-semibold text-gray-300 rounded-lg flex items-center space-x-2 transition-all cursor-pointer shadow-md"
          >
            <FileJson className="h-3.5 w-3.5 text-blue-400" />
            <span>Export Consolidated JSON</span>
          </button>
          
          <button
            type="button"
            id="export-unified-xlsx-btn"
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export 2-Tab Excel Workbook</span>
          </button>
        </div>
      </div>

      {/* Two Panes Segment: Info Sheets + Dragger Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Drag & Drop Upload Engine Panel */}
        <div className="space-y-4">
          <div className="text-xs uppercase font-extrabold tracking-widest text-[#94A3B8] flex items-center space-x-2">
            <Upload className="h-3.5 w-3.5 text-blue-400" />
            <span>Ingest Matrices Configuration File</span>
          </div>

          <form 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`h-[210px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-all ${
              dragActive 
                ? 'border-blue-500 bg-blue-600/5' 
                : 'border-[#2A2D35] hover:border-gray-600 bg-[#0C0E12]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            id="matrix-drop-area"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleManualUploadClick}
              accept=".xlsx,.xls,.json"
              className="hidden"
            />
            
            <div className="p-3 bg-gray-800/50 rounded-full border border-gray-700/55 mb-3 text-gray-400">
              <Upload className="h-6 w-6 animate-bounce" />
            </div>

            <p className="text-xs font-bold text-slate-200">
              Drag &amp; drop unified `.xlsx` workbook or `.json` template
            </p>
            <p className="text-[10.5px] text-gray-500 mt-1">
              Or click to navigate local filesystem files
            </p>
            <span className="mt-2.5 px-2 py-0.5 bg-[#1C1F26] border border-[#2A2D35] rounded font-mono text-[9px] text-[#A1A1AA]">
              Accepts: 2-Tab Excel Workbook or Consolidated JSON Schema
            </span>
          </form>

          {/* Feedback logs console */}
          {(successLogs.length > 0 || errorLogs.length > 0) && (
            <div className="bg-[#0A0C0F] border border-[#2A2D35]/70 rounded-lg p-3 space-y-2 font-mono text-[10.5px]">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Migration Core console telemetry</span>
              
              {successLogs.map((log, l) => (
                <div key={l} className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{log}</span>
                </div>
              ))}

              {errorLogs.map((log, l) => (
                <div key={l} className="flex items-center space-x-2 text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Guidelines, Rules & Details Documentation */}
        <div className="bg-[#0C0E12] border border-[#262A33] rounded-2xl p-4 flex flex-col justify-between" id="migration-documentation-panel">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#2A2D35]/50 pb-2.5">
              <div className="flex items-center space-x-2">
                <Info className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs uppercase font-extrabold tracking-wider text-gray-300">Detailed Alignment Schema Guidelines</span>
              </div>
              
              <div className="flex bg-[#12151C] rounded p-0.5 border border-[#2A2D35]/50 text-[10px] font-mono">
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('instructions'); }} 
                  className={`px-2 py-0.5 rounded transition-all ${activeTab === 'instructions' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                >
                  Notes
                </button>
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab('playground'); }} 
                  className={`px-2 py-0.5 rounded transition-all ${activeTab === 'playground' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                >
                  Paste Buffer
                </button>
              </div>
            </div>

            {activeTab === 'instructions' ? (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 text-[11px] leading-relaxed text-gray-400">
                <p>
                  To backup, modify, or sync ServiceNow matrix rules in bulk, you can use a unified spreadsheet or JSON template. The system automatically inspects sheet titles and resolves fields case-insensitively.
                </p>

                {/* Direct Empty Templates Download Header Only Suite */}
                <div className="bg-[#10131A] border border-[#202533] p-2.5 rounded-lg space-y-1.5">
                  <span className="text-white font-bold text-[10px] uppercase tracking-wider block">Get Blank Template with Header Columns Only:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      id="download-blank-xlsx-template-btn"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownloadTemplateExcel(); }}
                      className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Excel (.xlsx) Header Template</span>
                    </button>
                    <button
                      type="button"
                      id="download-blank-json-template-btn"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownloadTemplateJson(); }}
                      className="flex-1 py-1.5 bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-[10px] font-bold rounded flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>JSON Header Template</span>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 border-t border-[#2A2D35]/40 pt-2.5">
                  <div>
                    <span className="text-white font-bold block">1. Keywords combination Matrix (Sheet: "Keyword Rules"):</span>
                    <ul className="list-disc pl-4 space-y-1 text-gray-400 text-[10.5px] mt-1">
                      <li><strong className="text-blue-400">Resolution Keywords:</strong> Words/phrases inside resolution strings (e.g. <code>database slow, latency</code>).</li>
                      <li><strong className="text-slate-300">Closure Code &amp; Code Pt 2:</strong> Targeted SLA category matchers (e.g. <code>Software</code> &amp; <code>Successful</code>).</li>
                      <li><strong className="text-slate-300">Solution/Symptom Code:</strong> Associated codes required to match perfectly for passing audit validations.</li>
                    </ul>
                  </div>

                  <div className="border-t border-[#2A2D35]/20 pt-2">
                    <span className="text-white font-bold block">2. CI Combination Matrix (Sheet: "CI Combinations"):</span>
                    <ul className="list-disc pl-4 space-y-1 text-gray-400 text-[10.5px] mt-1">
                      <li><strong className="text-emerald-400">Affected Service / CI:</strong> Registered inventory device trigger (e.g. <code>Oracle-Database-Prod</code>).</li>
                      <li><strong className="text-slate-300">Suspected Causal CI:</strong> Assigned malfunction source host name.</li>
                      <li><strong className="text-blue-300">Assignment Group:</strong> Explicit group name mapped to this configuration context.</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[10px] text-gray-500 leading-normal">
                  Alternatively, paste your raw unified configurations object directly below and click Apply.
                </p>
                <textarea
                  value={rawJsonPaste}
                  onChange={(e) => setRawJsonPaste(e.target.value)}
                  placeholder={`{\n  "rules": [],\n  "ciCombinations": []\n}`}
                  rows={4}
                  className="w-full bg-[#050608] border border-[#2A2D35] text-xs text-blue-400 font-mono p-2.5 rounded-lg focus:outline-none resize-none"
                />
                <button
                  type="button"
                  onClick={handleApplyPasteJson}
                  disabled={!rawJsonPaste.trim()}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Sync Paste Buffer to Database</span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-2.5 bg-[#12151C]/65 border border-[#2A2D35]/50 p-2.5 rounded-lg flex items-start space-x-2 text-[10.5px] font-mono text-gray-500 leading-normal">
            <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <span className="text-gray-300 font-bold block">Instant Automation Check</span>
              When you upload a validated file, active incident audits on your screen are automatically run with your fresh configuration active immediately!
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
