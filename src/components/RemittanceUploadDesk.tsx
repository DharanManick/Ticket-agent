import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Users, 
  ShieldCheck, 
  Layers, 
  Search, 
  Trash2, 
  Save, 
  Info,
  Sliders,
  Database,
  BookOpen,
  Plus,
  HelpCircle
} from 'lucide-react';
import { Ticket, AuditRule, CiCombination, KnowledgeArticle } from '../types';
import UploadSection from './UploadSection';
import UnifiedMatrixHub from './UnifiedMatrixHub';

interface RemittanceUploadDeskProps {
  onTicketsLoaded: (tickets: Ticket[]) => void;
  isAuditing: boolean;
  onTriggerAudit?: (ticketsList: Ticket[]) => Promise<void>;
  
  // Rule matrix
  keywordRules: AuditRule[];
  ciCombinations: CiCombination[];
  onKeywordRulesSave: (newRules: AuditRule[]) => void;
  onCombinationsSave: (newCombs: CiCombination[]) => void;
  
  // Assignee Email Directory
  triggerPopup: (msg: string, type: 'success' | 'info' | 'warning') => void;
}

export default function RemittanceUploadDesk({
  onTicketsLoaded,
  isAuditing,
  onTriggerAudit,
  keywordRules,
  ciCombinations,
  onKeywordRulesSave,
  onCombinationsSave,
  triggerPopup
}: RemittanceUploadDeskProps) {
  const [activeSubTab, setActiveSubTab] = useState<'tickets' | 'matrix' | 'emails' | 'knowledge'>('tickets');
  
  // Assignee emails state inside uploader
  const [assigneeEmailOverrides, setAssigneeEmailOverrides] = useState<Record<string, string>>({});
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Knowledge Base RAG state
  const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeArticle[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [manualId, setManualId] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualSummary, setManualSummary] = useState('');
  const [manualSteps, setManualSteps] = useState('');
  
  // Semantic search test state
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<any[]>([]);
  const [semanticSearching, setSemanticSearching] = useState(false);

  const fetchKnowledgeArticles = async () => {
    try {
      setKbLoading(true);
      const res = await fetch('/api/knowledge-articles');
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('Server returned non-JSON format');
      const data = await res.json();
      if (data.articles) {
        setKnowledgeArticles(data.articles);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge articles:', err);
    } finally {
      setKbLoading(false);
    }
  };

  const handleAddManualKA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId || !manualTitle || !manualSummary || !manualSteps) {
      triggerPopup('Please fill in all mandatory fields.', 'warning');
      return;
    }
    
    try {
      const stepsList = manualSteps
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
        
      const payload = {
        id: manualId.trim().toUpperCase(),
        title: manualTitle.trim(),
        category: manualCategory.trim() || 'General Operations',
        summary: manualSummary.trim(),
        approvedSteps: stepsList
      };
      
      const res = await fetch('/api/knowledge-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('Server returned non-JSON format');
      const data = await res.json();
      if (data.success) {
        triggerPopup(`Successfully registered Knowledge Article ${payload.id}!`, 'success');
        setManualId('');
        setManualTitle('');
        setManualCategory('');
        setManualSummary('');
        setManualSteps('');
        fetchKnowledgeArticles();
      } else {
        triggerPopup(data.error || 'Failed to register knowledge article', 'warning');
      }
    } catch (err: any) {
      triggerPopup(`Error adding Article: ${err.message}`, 'warning');
    }
  };

  const handleDeleteKA = async (id: string) => {
    try {
      const res = await fetch('/api/knowledge-articles/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        triggerPopup(`Deleted Knowledge Article ${id}`, 'info');
        fetchKnowledgeArticles();
      }
    } catch (err: any) {
      triggerPopup(`Failed to delete: ${err.message}`, 'warning');
    }
  };

  const handleSemanticSearchTest = async () => {
    if (!semanticQuery.trim()) return;
    try {
      setSemanticSearching(true);
      const res = await fetch('/api/knowledge-articles/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: semanticQuery })
      });
      const data = await res.json();
      if (data.success) {
        setSemanticResults(data.results);
        triggerPopup(`Found ${data.results.length} semantic matches from Vector DB!`, 'success');
      }
    } catch (err: any) {
      triggerPopup(`Failed to perform semantic search: ${err.message}`, 'warning');
    } finally {
      setSemanticSearching(false);
    }
  };

  const handleUploadKBExcelOrJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        let loaded: any[] = [];
        if (file.name.endsWith('.json')) {
          const content = evt.target?.result as string;
          const parsed = JSON.parse(content);
          loaded = Array.isArray(parsed) ? parsed : [parsed];
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const raw = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];
          loaded = raw.map((row: any) => {
            const mappedId = row.ID || row.Id || row.id || row.ArticleNumber || '';
            const mappedTitle = row.Title || row.title || row.Name || '';
            const mappedCat = row.Category || row.category || 'Excel Import';
            const mappedSum = row.Summary || row.summary || row.Description || '';
            const stepsString = row.ApprovedSteps || row.steps || row.Steps || '';
            return {
              id: String(mappedId).trim(),
              title: String(mappedTitle).trim(),
              category: String(mappedCat).trim(),
              summary: String(mappedSum).trim(),
              approvedSteps: stepsString ? String(stepsString).split(/[;\n]/).map(s => s.trim()).filter(Boolean) : []
            };
          }).filter(k => k.id && k.title);
        } else {
          // Fallback to CSV text
          const content = evt.target?.result as string;
          const lines = content.split('\n');
          for (const line of lines) {
            const cells = line.split(',');
            if (cells.length >= 4 && cells[0].toLowerCase().trim() !== 'id') {
              loaded.push({
                id: cells[0].trim(),
                title: cells[1].trim(),
                category: 'CSV Import',
                summary: cells[2].trim(),
                approvedSteps: cells[3].split(';').map(s => s.trim()).filter(Boolean)
              });
            }
          }
        }

        if (loaded.length === 0) {
          triggerPopup('No valid Knowledge Article records found in file.', 'warning');
          return;
        }

        let addedCount = 0;
        for (const item of loaded) {
          const response = await fetch('/api/knowledge-articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });
          const resJson = await response.json();
          if (resJson.success) addedCount++;
        }

        triggerPopup(`Successfully indexed ${addedCount} Corporate Knowledge Articles into Vector DB!`, 'success');
        fetchKnowledgeArticles();
      } catch (err: any) {
        triggerPopup(`Failed to import knowledge file: ${err.message}`, 'warning');
      }
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDownloadKBSample = () => {
    try {
      const sample = [
        {
          "ID": "KA-1004",
          "Title": "Primary database scale validation instructions",
          "Category": "Database Administration",
          "Summary": "Standard operating procedure to review scale capacity, storage triggers, pool states and transaction locks in PostgreSQL.",
          "ApprovedSteps": "Check connection pooling capacity;Query pg_stat_activity for thread locks;Verify CPU usage on primary node;Review replica stream lag"
        },
        {
          "ID": "KA-1005",
          "Title": "Virtual private cloud networking configuration",
          "Category": "Security Operations",
          "Summary": "Authorized steps to resolve VPC peering routes, subnets allocation, routing tables mismatch and active firewall blockages.",
          "ApprovedSteps": "Verify transit gateway attachment list;Test traceroute connectivity on port 443;Check subnet security group rules;Inspect route propagation state"
        }
      ];
      const worksheet = XLSX.utils.json_to_sheet(sample);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Knowledge Base RAG Ingestion");
      XLSX.writeFile(workbook, "knowledge_base_import_template.xlsx");
      triggerPopup('Sample KB excel template downloaded!', 'success');
    } catch (err: any) {
      triggerPopup(`Failed to download sample: ${err.message}`, 'warning');
    }
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem('governance_assignee_emails');
      if (cached) {
        setAssigneeEmailOverrides(JSON.parse(cached));
      }
    } catch (e) {
      console.error(e);
    }

    // Load initial knowledge articles on mount
    fetchKnowledgeArticles();

    // Listen to automatic background sync events for knowledge base articles
    const handleKbFetched = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail.articles)) {
        setKnowledgeArticles(customEvent.detail.articles);
      }
    };

    window.addEventListener('governance_knowledge_articles_fetched', handleKbFetched);
    return () => {
      window.removeEventListener('governance_knowledge_articles_fetched', handleKbFetched);
    };
  }, []);

  const handleSaveOverrides = (updated: Record<string, string>) => {
    setAssigneeEmailOverrides(updated);
    localStorage.setItem('governance_assignee_emails', JSON.stringify(updated));
  };

  const handleRemoveOverride = (key: string) => {
    const updated = { ...assigneeEmailOverrides };
    delete updated[key];
    handleSaveOverrides(updated);
    triggerPopup(`Removed override for "${key}"`, 'info');
  };

  const downloadSampleEmailsExcel = () => {
    try {
      const data = [
        { "Assignee": "John Doe", "Email": "john.doe@company.com" },
        { "Assignee": "Jane Smith", "Email": "jane.smith@company.com" },
        { "Assignee": "ServiceNow Admin Group", "Email": "sndev-alerts@company.com" },
        { "Assignee": "Capacity Management Desk", "Email": "capacity.alerts@company.com" }
      ];
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Email Directory Overrides");
      XLSX.writeFile(workbook, "assignee_emails_compliance_template.xlsx");
      triggerPopup('Sample email mapping Excel downloaded! Populate it and upload here.', 'success');
    } catch (e: any) {
      triggerPopup(`Failed to generate empty template: ${e.message}`, 'warning');
    }
  };

  const processEmailMapFile = (file: File) => {
    const reader = new FileReader();

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          let newMappings: Record<string, string> = {};
          let count = 0;
          
          rawRows.forEach(row => {
            let assigneeName = '';
            let emailAddress = '';
            
            Object.entries(row).forEach(([colName, colVal]) => {
              const cleanedCol = colName.toLowerCase().trim();
              const valStr = String(colVal).trim();
              if (cleanedCol.includes('assignee') || cleanedCol.includes('name') || cleanedCol === 'user' || cleanedCol.includes('performer')) {
                assigneeName = valStr;
              } else if (cleanedCol.includes('email') || cleanedCol === 'mail') {
                emailAddress = valStr;
              }
            });
            
            if (assigneeName && emailAddress && emailAddress.includes('@')) {
              newMappings[assigneeName] = emailAddress;
              count++;
            }
          });
          
          if (count === 0) {
            triggerPopup('Could not find valid assignee name and email pairs in Excel spreadsheet. Ensure columns exist with headers like "Assignee" and "Email".', 'warning');
            return;
          }
          
          const merged = { ...assigneeEmailOverrides, ...newMappings };
          handleSaveOverrides(merged);
          triggerPopup(`Successfully imported ${count} assignee overrides from Excel!`, 'success');
        } catch (err: any) {
          console.error(err);
          triggerPopup(`Error parsing Excel assignee file: ${err.message}`, 'warning');
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let newMappings: Record<string, string> = {};

        if (file.name.endsWith('.json')) {
          newMappings = JSON.parse(text);
        } else {
          // Fallback parsing CSV text
          const lines = text.split('\n');
          lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 2) {
              const name = parts[0].trim();
              const email = parts[1].trim();
              if (name && email && name.toLowerCase() !== 'assignee' && name.toLowerCase() !== 'name' && email.toLowerCase() !== 'email') {
                newMappings[name] = email;
              }
            }
          });
        }

        // Filter and ensure entry holds valid email address
        const filtered: Record<string, string> = {};
        let count = 0;
        Object.entries(newMappings).forEach(([k, v]) => {
          if (typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim() && v.includes('@')) {
            filtered[k.trim()] = v.trim();
            count++;
          }
        });

        if (count === 0) {
          triggerPopup('Could not find valid assignee name and email pairs in file.', 'warning');
          return;
        }

        const merged = { ...assigneeEmailOverrides, ...filtered };
        handleSaveOverrides(merged);
        triggerPopup(`Successfully imported ${count} assignee overrides from CSV/JSON!`, 'success');
      } catch (err) {
        console.error(err);
        triggerPopup('Error parsing assignee email map file.', 'warning');
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processEmailMapFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processEmailMapFile(file);
  };

  const filteredEmails = Object.entries(assigneeEmailOverrides).filter(([n, em]) => {
    const query = emailSearchQuery.toLowerCase();
    const nameStr = String(n).toLowerCase();
    const mailStr = String(em).toLowerCase();
    return nameStr.includes(query) || mailStr.includes(query);
  });

  return (
    <div className="space-y-6 animate-fadeIn" id="remittance-upload-ingress-hub">
      
      {/* 🛡️ Explanatory Header Banner */}
      <div className="bg-[#15171C] border border-[#2A2D35] p-5 rounded-xl shadow-lg flex items-start space-x-3.5">
        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/15">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold uppercase text-white tracking-wider">remittance & upload control deck</h2>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            Upload incident database streams, excel configuration matrix values, or assignee corporate alias overrides. Select a tab below to manage corresponding ingestion pipelines.
          </p>
        </div>
      </div>

      {/* 🧭 Horizontal Upload Tabs Selection */}
      <div className="bg-[#111318] border border-[#2A2D35] p-1.5 rounded-xl flex space-x-1.5 shadow-md">
        <button
          onClick={() => setActiveSubTab('tickets')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 border cursor-pointer ${
            activeSubTab === 'tickets'
              ? 'bg-blue-600/10 hover:bg-blue-600/15 text-blue-400 border-blue-500/25'
              : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-800/20'
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          <span>1. ServiceNow Incident Logs</span>
        </button>

        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 border cursor-pointer ${
            activeSubTab === 'matrix'
              ? 'bg-[#818CF8]/10 hover:bg-[#818CF8]/15 text-[#818CF8] border-[#818CF8]/25'
              : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-800/20'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>2. Master Rules Matrix Spreadsheets</span>
        </button>

        <button
          onClick={() => setActiveSubTab('emails')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 border cursor-pointer ${
            activeSubTab === 'emails'
              ? 'bg-teal-600/10 hover:bg-teal-600/15 text-teal-400 border-teal-500/25'
              : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-800/20'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>3. Assignee Email Override Map</span>
        </button>

        <button
          onClick={() => setActiveSubTab('knowledge')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 border cursor-pointer ${
            activeSubTab === 'knowledge'
              ? 'bg-[#10B981]/15 hover:bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30'
              : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-800/20'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>4. Corporate Knowledge Base (RAG)</span>
        </button>
      </div>

      {/* Tab Content Display Area */}
      <div className="p-0.5 rounded-xl border border-transparent">
        
        {/* Tab 1: ServiceNow Incident Sheets Ingestion */}
        {activeSubTab === 'tickets' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-blue-500/5 border border-blue-500/10 p-3.5 rounded-xl text-xs text-blue-300 leading-normal">
              <strong>💡 Incident Stream Ingress:</strong> Load fresh ServiceNow production exports in xlsx/csv format here to execute immediate AI quality audit runs. After upload, click the <strong>Start Audit Execution</strong> in the uploader!
            </div>
            <UploadSection 
              onTicketsLoaded={onTicketsLoaded} 
              isLoading={isAuditing} 
              triggerPopup={triggerPopup}
              onTriggerAudit={onTriggerAudit}
            />
          </div>
        )}

        {/* Tab 2: Master Rules Backup Ingestion */}
        {activeSubTab === 'matrix' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-[#818CF8]/5 border border-[#818CF8]/10 p-3.5 rounded-xl text-xs text-indigo-300 leading-normal">
              <strong>💡 Configuration Sync:</strong> Back up, download, or fully override your ServiceNow matrix combinations rules and CI alignments via structured Excel templates from this centralized station.
            </div>
            <UnifiedMatrixHub 
              rules={keywordRules}
              ciCombinations={ciCombinations}
              onRulesSave={onKeywordRulesSave}
              onCombinationsSave={onCombinationsSave}
              triggerPopup={triggerPopup}
            />
          </div>
        )}

        {/* Tab 3: Assignee Email Directory Map */}
        {activeSubTab === 'emails' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            
            {/* Left Column: Drag & Drop Ingress (7 cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Import Email Directory Directory</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Define corporate emails when assignee names cannot automatically derive corporate endpoints.</p>
                </div>

                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`p-5 border border-dashed rounded-lg text-center transition-all relative group cursor-pointer ${
                    isDragOver 
                      ? 'border-teal-500 bg-teal-500/10' 
                      : 'border-[#2A2D35] hover:border-teal-500/35 hover:bg-[#0A0C0F]'
                  }`}
                >
                  <input 
                    type="file" 
                    id="hub-email-uploader" 
                    accept=".xlsx,.xls,.csv,.json,.txt"
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                  <label htmlFor="hub-email-uploader" className="cursor-pointer block space-y-2">
                    <div className="flex justify-center">
                      <span className="px-2.5 py-0.5 bg-teal-500/10 rounded-md text-teal-400 text-[9px] font-mono tracking-wider font-extrabold uppercase">
                        ☁️ INGEST ASSIGNEE EMAIL SPREADSHEETS
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-gray-300">
                      Drag &amp; Drop or Click to Browse File
                    </div>
                    <div className="text-[10px] text-gray-500 max-w-[320px] mx-auto leading-normal">
                      Syncs from <code className="text-teal-400">Excel (.xlsx)</code>, <code className="text-teal-400">CSV</code>, or structured <code className="text-teal-400">JSON</code> overrides directories.
                    </div>
                  </label>
                </div>

                {/* Downloader Button */}
                <button
                  type="button"
                  onClick={downloadSampleEmailsExcel}
                  className="w-full py-2 bg-[#0A0C0F] hover:bg-[#12141A] border border-[#2A2D35] hover:border-teal-500/40 text-xs font-bold text-teal-400 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <span>📥 Download Assignee Emails Excel Import Template (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Right Column: Active Directory Overrides View (6 cols) */}
            <div className="lg:col-span-6">
              <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg flex flex-col h-full max-h-[480px]">
                <div className="flex items-center justify-between pb-3 border-b border-[#2A2D35]/50 mb-3.5">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-white tracking-wider">Active Directory Records Registry</h3>
                    <p className="text-[10px] text-gray-500">Currently parsed registry aliases: <strong className="text-teal-400 font-mono">{Object.keys(assigneeEmailOverrides).length} entries</strong></p>
                  </div>
                </div>

                {/* Quick search */}
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search override directory logs..."
                    value={emailSearchQuery}
                    onChange={(e) => setEmailSearchQuery(e.target.value)}
                    className="w-full bg-[#0A0C0F] border border-[#2A2D35] rounded pl-8 pr-3 py-1 text-xs text-white placeholder-gray-600 font-mono"
                  />
                </div>

                {/* Dynamic List */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-1 text-xs max-h-[220px]">
                  {filteredEmails.length === 0 ? (
                    <div className="p-6 text-center text-gray-600 text-xs font-mono">
                      No matching records override parsed.
                    </div>
                  ) : (
                    filteredEmails.map(([assignee, email]) => (
                      <div key={assignee} className="p-2 bg-[#0A0C0F]/60 hover:bg-[#0A0C0F] border border-[#2A2D35]/40 rounded-lg flex items-center justify-between transition-all group">
                        <div className="truncate pr-2">
                          <p className="font-bold text-gray-300 font-mono truncate text-[11px]">{assignee}</p>
                          <p className="text-[10px] text-teal-400 truncate font-mono mt-0.5">{email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveOverride(assignee)}
                          title="Purge overwrite mapping"
                          className="bg-transparent hover:bg-red-500/10 text-gray-500 hover:text-red-400 p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 4: Corporate Knowledge Base configuration (RAG Setup) */}
        {activeSubTab === 'knowledge' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Action Bar */}
            <div className="bg-[#15171C] border border-[#2A2D35] p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#10B981]" />
                  Active RAG Reference Library
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Upload standard templates or map operational checklists to the Vector DB for live semantic audit scoring.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={handleDownloadKBSample}
                  className="px-3.5 py-1.5 bg-gray-800/60 hover:bg-gray-800 border border-[#2A2D35] text-gray-200 text-xs rounded-lg font-semibold transition-all hover:text-white cursor-pointer"
                >
                  Download Ingestion Template
                </button>
                <label className="px-3.5 py-1.5 bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/30 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5">
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Import Excel / JSON File</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.json,.csv"
                    onChange={handleUploadKBExcelOrJSON}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Panel: Register Manual or Test Semantic similarity queries */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 📝 Manual SOP Entry */}
                <form onSubmit={handleAddManualKA} className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4">
                  <h4 className="text-xs font-extrabold text-gray-300 uppercase tracking-widest border-b border-[#2A2D35]/60 pb-2 flex items-center justify-between">
                    <span>1. Direct Article Creation</span>
                    <Plus className="h-3.5 w-3.5 text-[#10B981]" />
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Article ID *</label>
                      <input
                        type="text"
                        placeholder="e.g. KA-2022"
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        className="w-full bg-[#0A0C0F] border border-[#2A2D35] rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Topic / Category</label>
                      <input
                        type="text"
                        placeholder="e.g. Security"
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value)}
                        className="w-full bg-[#0A0C0F] border border-[#2A2D35] rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-[#10B981] uppercase tracking-wider mb-1">Document Title *</label>
                    <input
                      type="text"
                      placeholder="Database backup scale check"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="w-full bg-[#0A0C0F] border border-[#2A2D35] rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Technical Summary / Baseline *</label>
                    <textarea
                      placeholder="Detailed operational synopsis of what the system does and common root causes..."
                      value={manualSummary}
                      onChange={(e) => setManualSummary(e.target.value)}
                      rows={3}
                      className="w-full bg-[#0A0C0F] border border-[#2A2D35] rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-blue-400 uppercase tracking-wider mb-1">
                      Troubleshooting Sequences Checklist (One Step Per Line) *
                    </label>
                    <textarea
                      placeholder="Retrieve connection details from vaults&#10;Verify query cache state&#10;Restart redundant scale proxies"
                      value={manualSteps}
                      onChange={(e) => setManualSteps(e.target.value)}
                      rows={4}
                      className="w-full bg-[#0A0C0F] border border-[#2A2D35] rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 font-mono resize-none leading-relaxed"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Register into Vector Database</span>
                  </button>
                </form>

                {/* 🔍 Interactive RAG Query Tester */}
                <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4">
                  <h4 className="text-xs font-extrabold text-gray-300 uppercase tracking-widest border-b border-[#2A2D35]/60 pb-2 flex items-center justify-between">
                    <span>2. Semantic Similarity Match Checker</span>
                    <HelpCircle className="h-3.5 w-3.5 text-blue-400" />
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Test the RAG pipeline directly! Write a resolution query state to see which knowledge baseline represents the highest cosine alignment vector.
                  </p>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Restarting the database scale nodes..."
                        value={semanticQuery}
                        onChange={(e) => setSemanticQuery(e.target.value)}
                        className="flex-1 bg-[#0A0C0F] border border-[#2A2D35] rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600"
                      />
                      <button
                        type="button"
                        onClick={handleSemanticSearchTest}
                        disabled={semanticSearching || !semanticQuery.trim()}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs text-white font-bold rounded disabled:opacity-55 transition-all text-center cursor-pointer"
                      >
                        {semanticSearching ? 'Computing...' : 'Test Match'}
                      </button>
                    </div>

                    {semanticResults.length > 0 && (
                      <div className="bg-[#0A0C0F] border border-[#2A2D35] rounded p-3 space-y-2 max-h-[220px] overflow-y-auto">
                        <span className="text-[9px] font-extrabold text-[#10B981] uppercase tracking-wider block">✓ Vector Matches Found</span>
                        {semanticResults.map((res, i) => (
                          <div key={res.id} className="border-b border-[#2A2D35]/40 pb-2 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-gray-400">{res.id} ({res.category})</span>
                              <span className="text-[10px] font-bold text-[#10B981] font-mono bg-[#10B981]/10 px-1 rounded">
                                {(res.similarity * 100).toFixed(0)}% Match
                              </span>
                            </div>
                            <p className="text-[11px] text-white font-medium mt-1">{res.title}</p>
                            <p className="text-[10px] text-gray-500 mt-1 truncate">{res.summary}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
              
              {/* Right Panel: Loaded Reference Articles list */}
              <div className="lg:col-span-7 bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg flex flex-col min-h-[400px]">
                <div className="border-b border-[#2A2D35]/60 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-300 uppercase tracking-widest">
                      3. Live Vector DB Catalog ({knowledgeArticles.length} Articles)
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">Reference pool fetched in real-time from active memory space.</p>
                  </div>
                  
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1.5 h-3 w-3 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Filter articles..."
                      value={kbSearchQuery}
                      onChange={(e) => setKbSearchQuery(e.target.value)}
                      className="w-full bg-[#0A0C0F] border border-[#2A2D35] rounded pl-7 pr-2.5 py-1 text-[11px] text-white placeholder-gray-600"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[560px] space-y-3 mt-4 pr-1">
                  {kbLoading ? (
                    <div className="p-12 text-center text-xs text-gray-500 font-mono">
                      Querying database indexes...
                    </div>
                  ) : knowledgeArticles.length === 0 ? (
                    <div className="p-12 text-center text-xs text-gray-600 font-mono">
                      No corporate Knowledge Articles loaded. Use the direct creation form or drag standard logs to load.
                    </div>
                  ) : (
                    knowledgeArticles
                      .filter(a => 
                        a.id.toLowerCase().includes(kbSearchQuery.toLowerCase()) || 
                        a.title.toLowerCase().includes(kbSearchQuery.toLowerCase()) ||
                        a.category.toLowerCase().includes(kbSearchQuery.toLowerCase()) ||
                        a.summary.toLowerCase().includes(kbSearchQuery.toLowerCase())
                      )
                      .map(a => (
                        <div key={a.id} className="bg-[#0D0F13] border border-[#2A2D35]/80 rounded-xl p-4 space-y-3 relative overflow-hidden group">
                          
                          {/* Banner background header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-extrabold tracking-wider bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono border border-blue-500/15">
                                  {a.id}
                                </span>
                                <span className="text-[10px] text-gray-500 font-extrabold uppercase font-mono tracking-widest">{a.category}</span>
                              </div>
                              <h5 className="text-[12px] font-bold text-white tracking-tight">{a.title}</h5>
                            </div>

                            <button
                              onClick={() => handleDeleteKA(a.id)}
                              title="Delete Article"
                              className="bg-transparent hover:bg-red-500/15 text-gray-600 hover:text-red-400 p-1.5 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="text-[11px] text-gray-400 leading-relaxed bg-[#06080A]/40 border border-[#2A2D35]/20 p-2.5 rounded-lg">
                            <span className="text-[9px] font-extrabold text-gray-500 uppercase block tracking-wider mb-1">Corporate Summary Guideline</span>
                            {a.summary}
                          </div>

                          {a.approvedSteps && a.approvedSteps.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-extrabold text-[#10B981] uppercase block tracking-wider">Troubleshooting Step-by-Step Seq</span>
                              <div className="space-y-1 pl-1">
                                {a.approvedSteps.map((step, idx) => (
                                  <div key={idx} className="flex items-start text-[10px] text-gray-400 font-mono">
                                    <span className="text-[#10B981] font-bold mr-1.5">{idx + 1}.</span>
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
