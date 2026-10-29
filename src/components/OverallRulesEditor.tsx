import React, { useState, useEffect } from 'react';
import { OverallTicketAuditRule, AuditRule, CiCombination } from '../types';
import { 
  ShieldCheck, 
  Info, 
  Sparkles, 
  MessageSquare, 
  Save, 
  RotateCcw, 
  CheckCircle,
  Copy,
  Lightbulb,
  Cpu,
  Terminal,
  Sliders,
  AlertCircle,
  FileText,
  Layers,
  ListTodo,
  FileSpreadsheet,
  Settings,
  HelpCircle,
  TrendingUp,
  Server,
  Key,
  Clock,
  CheckSquare,
  ToggleLeft,
  ToggleRight,
  Users,
  RefreshCw,
  Trash2,
  Plus,
  Search,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  Mail
} from 'lucide-react';

import RulesEditor from './RulesEditor';
import CiMatrixEditor from './CiMatrixEditor';
import ResolutionConfigEditor from './ResolutionConfigEditor';

// Helper to convert OverallTicketAuditRule[] to human readable text format
export function formatRulesToText(rules: OverallTicketAuditRule[]): string {
  return rules.map(rule => {
    let text = `=== RULE CODE: ${rule.ruleCode} ===\n`;
    text += `Name: ${rule.name}\n`;
    text += `Category: ${rule.category}\n`;
    text += `Weight: ${rule.weight}\n`;
    text += `Enabled: ${rule.isEnabled ? 'Yes' : 'No'}\n`;
    if (rule.minLen !== undefined) {
      text += `Min Length: ${rule.minLen}\n`;
    }
    text += `Error Message: ${rule.errorMessage}\n`;
    text += `Description: ${rule.description.replace(/\r?\n/g, ' ')}\n`;
    return text;
  }).join('\n');
}

// Helper to parse human readable text back to OverallTicketAuditRule[]
export function parseTextToRules(text: string, currentRulesList: OverallTicketAuditRule[]): { rules: OverallTicketAuditRule[], error?: string } {
  const blocks = text.split(/===\s*RULE CODE:\s*([A-Z0-9_]+)\s*===/gi);
  if (blocks.length < 3) {
    return { rules: [], error: 'Could not find any rule headers matching standard protocol "=== RULE CODE: RULE_NAME ===".' };
  }

  const parsedRules: OverallTicketAuditRule[] = [];

  for (let i = 1; i < blocks.length; i += 2) {
    const ruleCode = blocks[i].trim().toUpperCase();
    const content = blocks[i+1];

    if (!ruleCode) continue;

    const baseline = currentRulesList.find(r => r.ruleCode.toUpperCase() === ruleCode) || {
      id: `overall_${ruleCode.toLowerCase()}`,
      ruleCode: ruleCode,
      name: ruleCode,
      category: 'General',
      weight: 2,
      isEnabled: true,
      description: '',
      errorMessage: 'Verification failed.'
    } as OverallTicketAuditRule;

    let name = baseline.name;
    let category = baseline.category;
    let weight = baseline.weight;
    let enabled = baseline.isEnabled;
    let minLen = baseline.minLen;
    let errorMessage = baseline.errorMessage;
    let description = baseline.description;

    const lines = content.split('\n');
    lines.forEach(line => {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        const key = line.substring(0, idx).trim().toLowerCase();
        const val = line.substring(idx + 1).trim();

        if (key === 'name') {
          name = val;
        } else if (key === 'category') {
          category = val;
        } else if (key === 'weight') {
          const parsedWeight = parseInt(val, 10);
          if (!isNaN(parsedWeight)) weight = parsedWeight;
        } else if (key === 'enabled') {
          enabled = val.toLowerCase() === 'yes' || val.toLowerCase() === 'true' || val === '1';
        } else if (key === 'min length' || key === 'minlength') {
          const parsedNum = parseInt(val, 10);
          if (!isNaN(parsedNum)) minLen = parsedNum;
        } else if (key === 'error message' || key === 'errormessage') {
          errorMessage = val;
        } else if (key === 'description') {
          description = val;
        }
      }
    });

    parsedRules.push({
      ...baseline,
      name,
      category,
      weight,
      isEnabled: enabled,
      minLen: baseline.minLen !== undefined ? minLen : undefined,
      errorMessage,
      description,
    });
  }

  return { rules: parsedRules };
}

interface OverallRulesEditorProps {
  // Main 13 Audit Rules Props
  rules: OverallTicketAuditRule[];
  onRulesSave: (newRules: OverallTicketAuditRule[]) => Promise<void>;
  defaultRules: OverallTicketAuditRule[];

  // Keywords Mapping Props (consolidated from rules tab)
  keywordRules: AuditRule[];
  onKeywordRulesSave: (newRules: AuditRule[]) => Promise<void>;
  onResetKeywordRules: () => void;

  // CI Matrices Props (consolidated from ciMatrix tab)
  ciCombinations: CiCombination[];
  onCombinationsSave: (newCombinations: CiCombination[]) => Promise<void>;
  onResetCombinations: () => void;

  // Resolution 8 points Props (consolidated from resolutionConfig tab)
  resolutionQuestions: string[];
  onSaveResolutionQuestions: (newQuestions: string[]) => Promise<void>;
  onResetResolutionQuestions: () => void;

  triggerPopup: (msg: string, type: 'success' | 'warning' | 'info') => void;
}

export default function OverallRulesEditor({
  rules,
  onRulesSave,
  defaultRules,
  keywordRules,
  onKeywordRulesSave,
  onResetKeywordRules,
  ciCombinations,
  onCombinationsSave,
  onResetCombinations,
  resolutionQuestions,
  onSaveResolutionQuestions,
  onResetResolutionQuestions,
  triggerPopup
}: OverallRulesEditorProps) {
  // Active config page sub-tab controller
  const [currentTab, setCurrentTab] = useState<'audit_rules' | 'keyword_mappings' | 'assignment_group_cis' | 'resolution_checklist'>('keyword_mappings');
  const [localRules, setLocalRules] = useState<OverallTicketAuditRule[]>(() => JSON.parse(JSON.stringify(rules)));
  const [subView, setSubView] = useState<'visual' | 'raw'>('visual');
  const [jsonText, setJsonText] = useState('');
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<{ explanation?: string; proposedRules?: OverallTicketAuditRule[] } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Group CIs state fetched from ServiceNow CMDB
  const [groupCisMap, setGroupCisMap] = useState<Record<string, Array<{ name: string; sysId?: string; category?: string; className?: string }>>>({});
  const [groupCisLoading, setGroupCisLoading] = useState(false);
  const [groupCisSearch, setGroupCisSearch] = useState('');
  const [selectedCiGroup, setSelectedCiGroup] = useState<string | null>(null);

  const fetchGroupCisFromBackend = async () => {
    try {
      setGroupCisLoading(true);
      const res = await fetch('/api/servicenow/group-cis');
      if (res.ok) {
        const data = await res.json();
        if (data.groupCis) {
          setGroupCisMap(data.groupCis);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch group CIs:', err);
    } finally {
      setGroupCisLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupCisFromBackend();
  }, []);

  const handleSyncGroupCisLive = async () => {
    try {
      setGroupCisLoading(true);
      const res = await fetch('/api/servicenow/sync-group-cis', { method: 'POST' });
      const data = await res.json();
      if (data.groupCis) {
        setGroupCisMap(data.groupCis);
        triggerPopup(data.message || 'ServiceNow Configuration Items (CIs) fetched and synchronized successfully!', 'success');
      }
    } catch (err: any) {
      triggerPopup('Failed to sync live CIs from ServiceNow: ' + (err?.message || String(err)), 'warning');
    } finally {
      setGroupCisLoading(false);
    }
  };

  // Local changes revert history cache
  const [historyLog, setHistoryLog] = useState<OverallTicketAuditRule[][]>([]);
  const [expandedConfigRuleId, setExpandedConfigRuleId] = useState<string | null>(null);

  // Synchronized ServiceNow Flow Configurations
  const [flows, setFlows] = useState<Array<{ id: string; name: string; steps: string[]; description: string; isEnabled: boolean }>>(() => {
    const cached = localStorage.getItem('servicenow_custom_flows');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return [
      {
        id: 'flow_1',
        name: '1. Core Keywords & Classification Pipeline',
        steps: ['Res. Desc Checkpoints', 'Closure Code 1', 'Closure Code 2', 'Solution Code', 'Symptom Code'],
        description: 'Verifies if the resolution description keywords deterministically map to selection states in rules matrix.',
        isEnabled: true,
      },
      {
        id: 'flow_2',
        name: '2. Text Alignment & Validation Flow',
        steps: ['Res. Description', 'Short Desc', 'Technical Description'],
        description: 'Generative LLM cross-examines description entries to verify accuracy and structural completeness.',
        isEnabled: true,
      },
      {
        id: 'flow_3',
        name: '3. Cohere Troubleshooting Verification',
        steps: ['Res. Description', 'Technical Description (50+ Chars)'],
        description: 'Assures that the active technical actions taken match closely to general troubleshooting steps.',
        isEnabled: true,
      },
      {
        id: 'flow_4',
        name: '4. Resource Coupling Assignment Verification',
        steps: ['Assignment Group', 'Affected Service / CI'],
        description: 'Enforces that selected configuration items map to standard supporting units in alignment sheets.',
        isEnabled: true,
      }
    ];
  });

  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);

  const handleUpdateFlowField = (flowId: string, field: string, value: any) => {
    setFlows(prev => prev.map(f => {
      if (f.id === flowId) {
        if (field === 'steps') {
          return { ...f, [field]: value.split(',').map((x: string) => x.trim()).filter(Boolean) };
        }
        return { ...f, [field]: value };
      }
      return f;
    }));
  };

  const handleSaveFlows = () => {
    localStorage.setItem('servicenow_custom_flows', JSON.stringify(flows));
    setEditingFlowId(null);
    triggerPopup('ServiceNow Valuation Pipeline configuration saved successfully!', 'success');
  };

  // Synchronize overall rules state with parent cache
  useEffect(() => {
    if (rules) {
      setLocalRules(JSON.parse(JSON.stringify(rules)));
    }
  }, [rules]);

  // Sync raw text area representation with active settings
  useEffect(() => {
    if (localRules && localRules.length > 0) {
      setJsonText(formatRulesToText(localRules));
    } else {
      setJsonText('');
    }
  }, [localRules]);

  const pushStateToHistory = (stateToRecord: OverallTicketAuditRule[]) => {
    setHistoryLog(prev => [...prev.slice(-9), JSON.parse(JSON.stringify(stateToRecord))]);
  };

  const handleToggleRule = (id: string) => {
    pushStateToHistory(localRules);
    setLocalRules(prev => prev.map(r => r.id === id ? { ...r, isEnabled: !r.isEnabled } : r));
    triggerPopup('Toggled rule state! Please click Save Configuration to persist.', 'info');
  };

  const handleUpdateRuleField = (id: string, field: keyof OverallTicketAuditRule, value: any) => {
    pushStateToHistory(localRules);
    setLocalRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onRulesSave(localRules);
      triggerPopup('ServiceNow 13 Core Audit Checkpoints updated successfully!', 'success');
    } catch (e) {
      triggerPopup('Error updating parameters.', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    pushStateToHistory(localRules);
    const defaults = JSON.parse(JSON.stringify(defaultRules));
    setLocalRules(defaults);
    setJsonText(formatRulesToText(defaults));
    triggerPopup('Reset live overall rules to corporate baselines.', 'info');
  };

  const handleUndo = () => {
    if (historyLog.length === 0) {
      triggerPopup('No undo states recorded.', 'warning');
      return;
    }
    const previous = historyLog[historyLog.length - 1];
    setLocalRules(previous);
    setHistoryLog(prev => prev.slice(0, -1));
    triggerPopup('Reverted to match previous draft layout state.', 'success');
  };

  // ChatBot parser handler link
  const handleSendNLPMessage = async () => {
    if (!chatPrompt.trim()) return;
    setChatLoading(true);
    setAiResponse(null);
    try {
      const response = await fetch('/api/overall-rule-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: chatPrompt,
          currentRules: localRules
        })
      });
      const data = await response.json();
      if (data.success) {
        setAiResponse({
          explanation: data.explanation || 'Processed rules logic mapping and adjusted properties.',
          proposedRules: data.rules
        });
        triggerPopup('Decoded natural language guidelines successfully!', 'success');
      } else {
        triggerPopup(data.error || 'AI parsing system error.', 'warning');
      }
    } catch (err) {
      console.error(err);
      triggerPopup('Failed to connect to AI regulations parser.', 'warning');
    } finally {
      setChatLoading(false);
    }
  };

  const handleApplyProposedRules = () => {
    if (!aiResponse || !aiResponse.proposedRules) return;
    pushStateToHistory(localRules);
    setLocalRules(JSON.parse(JSON.stringify(aiResponse.proposedRules)));
    setAiResponse(null);
    setChatPrompt('');
    triggerPopup('Successfully synchronized proposed parameters! Remember to click save.', 'success');
  };

  const handleApplyJsonText = () => {
    const { rules: parsed, error } = parseTextToRules(jsonText, localRules);
    if (error) {
      triggerPopup(error, 'warning');
      return;
    }
    pushStateToHistory(localRules);
    setLocalRules(parsed);
    onRulesSave(parsed);
    triggerPopup('Custom rule specification saved successfully from plain text!', 'success');
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="unified-servicenow-config-dashboard">
      
      {/* 🧭 Consolidating Navigation Header Tabs */}
      <div className="bg-card border border-border p-2.5 rounded-xl flex flex-wrap gap-1.5 shadow-card">
        <button
          onClick={() => setCurrentTab('keyword_mappings')}
          className={`flex-1 min-w-[140px] py-2 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 border cursor-pointer ${
            currentTab === 'keyword_mappings'
              ? 'bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Keywords ServiceNow Matrix</span>
        </button>

        <button
          onClick={() => setCurrentTab('assignment_group_cis')}
          className={`flex-1 min-w-[140px] py-2 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 border cursor-pointer ${
            currentTab === 'assignment_group_cis'
              ? 'bg-teal-500/10 hover:bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Assignment Group CIs</span>
        </button>

        <button
          onClick={() => setCurrentTab('resolution_checklist')}
          className={`flex-1 min-w-[140px] py-2 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 border cursor-pointer ${
            currentTab === 'resolution_checklist'
              ? 'bg-purple-500/10 hover:bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted'
          }`}
        >
          <ListTodo className="h-4 w-4" />
          <span>Resolution Checkpoints Checklist</span>
        </button>
      </div>

      {/* RENDER ACTIVE MENU TAB WORKSPACE PLACE */}
      {false && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Main 13 core audit parameters section list (Left column: 7 cols) */}
          <div className="xl:col-span-7 space-y-4">
            
            <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Settings className="h-4.5 w-4.5 text-emerald-400" />
                  <span>13 Core Compliance Regulations Setup</span>
                </h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  Deactivate checkboxes, adjust severity scales, or update warning instructions.
                </p>
              </div>

              <div className="flex items-center space-x-1.5 self-end md:self-auto">
                <button
                  onClick={() => setSubView(subView === 'visual' ? 'raw' : 'visual')}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-750 text-gray-300 font-mono text-[10px] rounded border border-[#2A2D35] cursor-pointer"
                >
                  {subView === 'visual' ? 'Raw Code Mode' : 'Visual Form State'}
                </button>

                {historyLog.length > 0 && (
                  <button
                    onClick={handleUndo}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] rounded font-bold cursor-pointer"
                  >
                    Restore draft
                  </button>
                )}

                <button
                  onClick={handleResetToDefault}
                  className="px-2.5 py-1 bg-red-950/25 hover:bg-red-950/40 border border-red-900/30 text-red-400 text-[10px] rounded font-bold cursor-pointer"
                >
                  Factory Baseline
                </button>

                <button
                  onClick={subView === 'raw' ? handleApplyJsonText : handleSaveAll}
                  disabled={isSaving}
                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10.5px] rounded-md shadow-sm cursor-pointer"
                >
                  {isSaving ? 'Processing...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {subView === 'visual' ? (
              <div className="space-y-3.5 max-h-[720px] overflow-y-auto pr-1.5">
                {localRules.map((r, index) => (
                  <div 
                    key={r.id} 
                    className={`p-4 rounded-xl border transition-all ${
                      r.isEnabled 
                        ? 'bg-[#15171C] border-[#2A2D35] hover:border-emerald-500/25' 
                        : 'bg-[#0E1014] border-gray-900 opacity-55 hover:opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-0.5 flex-1 pr-1.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-[9px] bg-[#0A0C0F] border border-gray-800/60 text-gray-400 px-1.5 py-0.2 rounded font-black">
                            {index + 1}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wide">
                            {r.ruleCode}
                          </span>
                          <span className="text-[10px] text-gray-500 italic">
                            ({r.category})
                          </span>
                        </div>
                        <h4 className="text-xs font-extrabold text-[#E2E8F0] mt-1">{r.name}</h4>
                        <p className="text-[11px] text-gray-400 leading-normal mt-0.5">{r.description}</p>
                      </div>

                      {/* Rule Interaction Controls */}
                      <div className="flex flex-col gap-1.5 min-w-[100px] text-right">
                        <button 
                          onClick={() => handleToggleRule(r.id)}
                          className={`w-full px-2.5 py-1 rounded text-[9.5px] font-mono font-extrabold border transition-all cursor-pointer ${
                            r.isEnabled 
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/25' 
                              : 'bg-gray-800/25 hover:bg-gray-800/40 text-gray-500 border-gray-850'
                          }`}
                        >
                          {r.isEnabled ? '● ACTIVE' : '○ BYPASSED'}
                        </button>
                        
                        {r.isEnabled && (
                          <button
                            onClick={() => setExpandedConfigRuleId(expandedConfigRuleId === r.id ? null : r.id)}
                            className={`w-full px-2.5 py-1 rounded text-[9.5px] font-mono font-extrabold border transition-all cursor-pointer ${
                              expandedConfigRuleId === r.id
                                ? 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-500 border-amber-500/30'
                                : 'bg-gray-850 hover:bg-gray-800 text-gray-300 border-[#2A2D35]'
                            }`}
                          >
                            {expandedConfigRuleId === r.id ? '✕ COLLAPSE' : '⚙️ CONFIG RULE'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* EXPANDED DETAILED CONFIGURATION PARAMETERS SECTION */}
                    {r.isEnabled && expandedConfigRuleId === r.id && (
                      <div className="mt-3 p-4 bg-[#0A0C0F] border border-[#2D313E] rounded-xl space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-[#2D313E]/60 pb-2">
                          <span className="text-[10px] font-bold text-amber-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                            <Sliders className="h-3.5 w-3.5" />
                            ⚙️ OPERATIONAL RULE CONFIGURATOR CRITERIA
                          </span>
                          <span className="text-[9px] font-mono text-gray-400 bg-[#15171C] px-2 py-0.5 rounded border border-[#2D313E]/30">
                            ID/SYSTEM CODE: {r.ruleCode}
                          </span>
                        </div>

                        {/* Custom visual configuration element tailored specifically for the rule's logic */}
                        <div className="bg-[#12141C] p-3 rounded-lg border border-[#2D313E]/40 space-y-3.5">
                          
                          {/* 1. AFFECTED_CI_ALIGNMENT */}
                          {r.ruleCode === 'AFFECTED_CI_ALIGNMENT' && (
                            <div>
                              <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1.5">
                                Mapping Compliance Strictness Level
                              </label>
                              <select
                                value={r.mappingStrictness || 'Strict'}
                                onChange={(e) => handleUpdateRuleField(r.id, 'mappingStrictness', e.target.value)}
                                className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1.5 text-xs text-white cursor-pointer"
                              >
                                <option value="Strict">Strict (Affected CI + Assignment Group must match Alignment Matrix)</option>
                                <option value="Loose">Loose (Assignment Group must exist, but Affected CI matches can be flexible)</option>
                                <option value="AllowAny">AllowAny (Accept any Affected CI as long as non-empty)</option>
                              </select>
                              <p className="text-[9.5px] text-gray-500 mt-1 leading-normal">
                                Strict mode is highly recommended to enforce strict alignment rules with your ServiceNow CMDB and alignment records.
                              </p>
                            </div>
                          )}

                          {/* 2. SUSPECTED_CI_EXCEPTIONS */}
                          {r.ruleCode === 'SUSPECTED_CI_EXCEPTIONS' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              <div>
                                <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                  Closure Code 1 Trigger Keywords
                                </label>
                                <input
                                  type="text"
                                  placeholder="dependent, delay"
                                  value={r.c1DependentKeywords || ''}
                                  onChange={(e) => handleUpdateRuleField(r.id, 'c1DependentKeywords', e.target.value)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white"
                                />
                                <p className="text-[9px] text-gray-500 mt-1">Comma-separated triggers within Closure Code 1.</p>
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                  Closure Code 2 Infrastructure Indicators
                                </label>
                                <input
                                  type="text"
                                  placeholder="infrastructure, infra"
                                  value={r.c2InfrastructureKeywords || ''}
                                  onChange={(e) => handleUpdateRuleField(r.id, 'c2InfrastructureKeywords', e.target.value)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white"
                                />
                                <p className="text-[9px] text-gray-500 mt-1">Comma-separated triggers within Closure Code 2.</p>
                              </div>
                            </div>
                          )}

                          {/* 3, 9, 10, 11: Mapping Rule Fallbacks */}
                          {(r.ruleCode === 'SYMPTOM_CODE_CORRELATION' || 
                            r.ruleCode === 'CLOSURE_CODE_1_ALIGNMENT' || 
                            r.ruleCode === 'CLOSURE_CODE_2_ALIGNMENT' || 
                            r.ruleCode === 'SOLUTION_CODE_ALIGNMENT') && (
                            <div>
                              <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                Unmatched Fallback Audit Score
                              </label>
                              <select
                                value={
                                  r.ruleCode === 'SYMPTOM_CODE_CORRELATION' ? (r.defaultSymptomFallbackScore ?? 1) :
                                  r.ruleCode === 'CLOSURE_CODE_1_ALIGNMENT' ? (r.defaultClosure1FallbackScore ?? 1) :
                                  r.ruleCode === 'CLOSURE_CODE_2_ALIGNMENT' ? (r.defaultClosure2FallbackScore ?? 1) :
                                  (r.defaultSolutionFallbackScore ?? 1)
                                }
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  const field = 
                                    r.ruleCode === 'SYMPTOM_CODE_CORRELATION' ? 'defaultSymptomFallbackScore' :
                                    r.ruleCode === 'CLOSURE_CODE_1_ALIGNMENT' ? 'defaultClosure1FallbackScore' :
                                    r.ruleCode === 'CLOSURE_CODE_2_ALIGNMENT' ? 'defaultClosure2FallbackScore' :
                                    'defaultSolutionFallbackScore';
                                  handleUpdateRuleField(r.id, field, val);
                                }}
                                className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1.5 text-xs text-white cursor-pointer"
                              >
                                <option value="2">2 Points (Pass Compliance)</option>
                                <option value="1">1 Point (Partial Score Warning)</option>
                                <option value="0">0 Points (Hard Audit Fail/0)</option>
                              </select>
                              <p className="text-[9.5px] text-gray-500 mt-1 leading-normal">
                                Standard ServiceNow auditing score applied when the incident description fails to match any criteria keywords inside Confluence matrix records.
                              </p>
                            </div>
                          )}

                          {/* 4. REQUIRE_SHORT_DESCRIPTION */}
                          {r.ruleCode === 'REQUIRE_SHORT_DESCRIPTION' && (
                            <div>
                              <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                Short Description Minimum Words
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="40"
                                value={r.shortDescMinWords ?? 5}
                                onChange={(e) => handleUpdateRuleField(r.id, 'shortDescMinWords', parseInt(e.target.value, 10) || 5)}
                                className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white font-mono"
                              />
                              <p className="text-[9px] text-gray-500 mt-1">Short descriptions containing fewer words than this threshold will be flagged as too brief.</p>
                            </div>
                          )}

                          {/* 5. TECH_DESC_MIN_LEN */}
                          {r.ruleCode === 'TECH_DESC_MIN_LEN' && (
                            <div>
                              <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                Technical Description Minimum Character Length
                              </label>
                              <input
                                type="number"
                                min="10"
                                max="500"
                                value={r.minLen ?? 50}
                                onChange={(e) => handleUpdateRuleField(r.id, 'minLen', parseInt(e.target.value, 10) || 50)}
                                className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white font-mono"
                              />
                              <p className="text-[9px] text-gray-500 mt-1">Enforce character length standards to secure technical quality reporting.</p>
                            </div>
                          )}

                          {/* 6. REQUIRE_SERVICE_IMPACT_CODE */}
                          {r.ruleCode === 'REQUIRE_SERVICE_IMPACT_CODE' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              <div>
                                <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                  Minimum Required Character Length
                                </label>
                                <input
                                  type="number"
                                  min="5"
                                  max="100"
                                  value={r.serviceImpactMinLen ?? 15}
                                  onChange={(e) => handleUpdateRuleField(r.id, 'serviceImpactMinLen', parseInt(e.target.value, 10) || 15)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white font-mono"
                                />
                                <p className="text-[9px] text-gray-500 mt-1">Expect at least this length of statement description.</p>
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                  Priority Indicator Regular Expression
                                </label>
                                <input
                                  type="text"
                                  value={r.serviceImpactRegex ?? '[pP][1234][hHmL]'}
                                  onChange={(e) => handleUpdateRuleField(r.id, 'serviceImpactRegex', e.target.value)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white font-mono"
                                />
                                <p className="text-[9px] text-gray-500 mt-1">Accepts and validates urgency priority indicators like P3L, P1H.</p>
                              </div>
                            </div>
                          )}

                          {/* 7. REQUIRE_BUSINESS_IMPACT */}
                          {r.ruleCode === 'REQUIRE_BUSINESS_IMPACT' && (
                            <div>
                              <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                Minimum Required Character Length
                              </label>
                              <input
                                type="number"
                                min="5"
                                max="150"
                                value={r.businessImpactMinLen ?? 10}
                                onChange={(e) => handleUpdateRuleField(r.id, 'businessImpactMinLen', parseInt(e.target.value, 10) || 10)}
                                className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white font-mono"
                              />
                              <p className="text-[9px] text-gray-500 mt-1">Guarantees sufficient length detailing downstream business consequences.</p>
                            </div>
                          )}

                          {/* 8. ACTIVITY_LOG_STATE_BYPASS */}
                          {r.ruleCode === 'ACTIVITY_LOG_STATE_BYPASS' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              <div>
                                <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                  Max Days Gap Before warning Warning
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="14"
                                  value={r.activityMaxDaysNoUpdate ?? 2}
                                  onChange={(e) => handleUpdateRuleField(r.id, 'activityMaxDaysNoUpdate', parseInt(e.target.value, 10) || 2)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white font-mono"
                                />
                                <p className="text-[9px] text-gray-500 mt-1">Penalty applies if open ticket has zero activity for this space.</p>
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                  Required Lifecycle String Markers
                                </label>
                                <input
                                  type="text"
                                  value={r.activityRequiredStates ?? 'progress, resolved, closed'}
                                  onChange={(e) => handleUpdateRuleField(r.id, 'activityRequiredStates', e.target.value)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white"
                                />
                                <p className="text-[9px] text-gray-500 mt-1">State sequences indicating normal ServiceNow progression flow.</p>
                              </div>
                            </div>
                          )}

                          {/* 12. KNOWLEDGE_ARTICLE_CITATION */}
                          {r.ruleCode === 'KNOWLEDGE_ARTICLE_CITATION' && (
                            <div>
                              <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                Mandatory Article Key Indicator Substring
                              </label>
                              <input
                                type="text"
                                placeholder="KB"
                                value={r.kbArticlePrefixRule ?? 'KB'}
                                onChange={(e) => handleUpdateRuleField(r.id, 'kbArticlePrefixRule', e.target.value)}
                                className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white"
                              />
                              <p className="text-[9px] text-gray-500 mt-1">If specified, checks that details have a matching catalog prefix string (e.g. KB, KBA).</p>
                              <div className="mt-3">
                                <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                  Target Semantic Similarity Benchmark (%)
                                </label>
                                <input
                                  type="number"
                                  min="10"
                                  max="100"
                                  value={r.targetAlignmentScore ?? 60}
                                  onChange={(e) => handleUpdateRuleField(r.id, 'targetAlignmentScore', parseInt(e.target.value, 10) || 60)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white font-mono"
                                />
                                <p className="text-[9px] text-gray-500 mt-1">Set the similarity score benchmark for 100% compliance score (default 60%).</p>
                              </div>
                            </div>
                          )}

                          {/* 13. RESOLUTION_DESC_8_POINTS */}
                          {r.ruleCode === 'RESOLUTION_DESC_8_POINTS' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              <div>
                                <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                  Minimum Required Resolution Checkpoints
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="15"
                                  value={r.resDescMinPointsCount ?? 8}
                                  onChange={(e) => handleUpdateRuleField(r.id, 'resDescMinPointsCount', parseInt(e.target.value, 10) || 8)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white font-mono"
                                />
                                <p className="text-[9px] text-gray-500 mt-1">Enforce the minimum compliance checkpoint target. Template statements can be re-defined in Tab 4.</p>
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
                                  Target Semantic Similarity Benchmark (%)
                                </label>
                                <input
                                  type="number"
                                  min="10"
                                  max="100"
                                  value={r.targetAlignmentScore ?? 60}
                                  onChange={(e) => handleUpdateRuleField(r.id, 'targetAlignmentScore', parseInt(e.target.value, 10) || 60)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1 text-xs text-white font-mono"
                                />
                                <p className="text-[9px] text-gray-500 mt-1">Set the similarity score benchmark for 100% compliance score (default 60%).</p>
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Collapsible display details drawer - keeps display meta options optional and separated */}
                        <details className="group border border-[#2D313E]/40 rounded-lg overflow-hidden bg-[#12141C]/40">
                          <summary className="flex items-center justify-between text-[10px] font-bold text-gray-400 py-2 px-3 hover:bg-[#12141C]/70 cursor-pointer select-none">
                            <span>✏️ ADVANCED VIEW: EDIT TITLE & REGULATION DETAILS</span>
                            <span className="text-gray-500 transition-transform group-open:rotate-180">▼</span>
                          </summary>
                          
                          <div className="p-3 border-t border-[#2D313E]/30 space-y-3.5 animate-fadeIn">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              <div>
                                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                  Regulation Title Name
                                </label>
                                <input
                                  type="text"
                                  value={r.name}
                                  onChange={(e) => handleUpdateRuleField(r.id, 'name', e.target.value)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1.5 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                  Section Regulation Category
                                </label>
                                <select
                                  value={r.category}
                                  onChange={(e) => handleUpdateRuleField(r.id, 'category', e.target.value)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded px-2.5 py-1.5 text-[#E2E8F0] text-xs cursor-pointer"
                                >
                                  <option value="Configuration Alignment">Configuration Alignment</option>
                                  <option value="Documentation Quality">Documentation Quality</option>
                                  <option value="Process Compliance">Process Compliance</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                Detailed Policy Description & Guidelines Summary
                              </label>
                              <textarea
                                rows={2}
                                value={r.description}
                                onChange={(e) => handleUpdateRuleField(r.id, 'description', e.target.value)}
                                className="w-full bg-[#0A0C0F] border border-[#2D313E] rounded p-2 text-xs text-gray-300 leading-normal focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                        </details>
                      </div>
                    )}

                    {/* Simple, intuitive inline input adjustments on card if enabled! */}
                    {r.isEnabled && (
                      <div className="mt-3.5 pt-3 border-t border-[#2A2D35]/30 grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#0A0C10] p-3 rounded-lg border border-[#2D3340]/40">
                        {/* 1. Scale points */}
                        <div className="md:col-span-3">
                          <label className="block text-[8.5px] font-bold text-gray-500 uppercase tracking-wider font-mono mb-1">
                            Severity Penalty Points
                          </label>
                          <div className="flex items-center space-x-1.5">
                            <input 
                              type="number" 
                              min="0" 
                              max="10"
                              value={r.weight}
                              onChange={(e) => handleUpdateRuleField(r.id, 'weight', parseInt(e.target.value, 10) || 0)}
                              className="bg-[#12141C] border border-[#2A2D35] rounded px-2.5 py-1 text-xs text-white font-mono w-full focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[10px] text-gray-500 font-mono">pts</span>
                          </div>
                        </div>

                        {/* 2. Failure instruction */}
                        <div className="md:col-span-9">
                          <label className="block text-[8.5px] font-bold text-gray-500 uppercase tracking-wider font-mono mb-1">
                            Printed Audit Failure Instruction Message
                          </label>
                          <input 
                            type="text"
                            value={r.errorMessage}
                            onChange={(e) => handleUpdateRuleField(r.id, 'errorMessage', e.target.value)}
                            className="w-full bg-[#12141C] border border-[#2A2D35] rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3.5 pt-1">
                <div className="relative rounded-xl border border-[#2A2D35] bg-[#07080B] p-2">
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder="Type or paste standard compliance checks syntax block here..."
                    rows={22}
                    className="w-full bg-transparent text-xs text-emerald-400 p-2.5 leading-relaxed resize-y focus:outline-none placeholder-gray-600 font-mono whitespace-pre"
                  />
                </div>
                <div className="flex justify-between items-center bg-[#15171C] border border-[#2A2D35] p-3 rounded-lg">
                  <span className="text-[10.5px] text-gray-500 italic font-mono">Format matching standard headers "=== RULE CODE: RULE_NAME ==="</span>
                  <button
                    onClick={handleApplyJsonText}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded shadow-md cursor-pointer"
                  >
                    Apply Plain Text Configurations
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 💬 Beautiful Chat panel specifically for parsing text prompts to update rules (Right col: 5 cols) */}
          <div className="xl:col-span-5 space-y-4">
            
            <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 flex flex-col space-y-4 shadow-xl">
              <div className="pb-3 border-b border-[#2A2D35]/70">
                <div className="flex items-center space-x-2">
                  <div className="p-1 px-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-md text-emerald-400 animate-pulse">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs uppercase font-extrabold tracking-wider text-white">AI Policy Reconfig Copilot</h3>
                    <p className="text-[10px] text-gray-505 text-gray-450 mt-0.5">Change parameters using standard, conversational prompts</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-2">
                  <label className="text-[9px] text-gray-500 uppercase font-mono tracking-wider font-bold">
                    Natural Language Reconfiguration Prompt
                  </label>
                  <textarea
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    placeholder="e.g., 'Double the score weight of KNOWLEDGE_ARTICLE_CITATION and translate error parameter text to - SLA Article missing from closure fields'"
                    rows={4}
                    className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-emerald-500 rounded-lg p-3 text-xs text-slate-100 placeholder-gray-650 outline-none leading-relaxed transition-all"
                  />
                </div>

                <button
                  onClick={handleSendNLPMessage}
                  disabled={chatLoading || !chatPrompt.trim()}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-black text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md"
                >
                  {chatLoading ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                      <span>Synthesizing Policy Changes...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Process Changes with AI</span>
                    </>
                  )}
                </button>

                {/* AI advice feedback suite */}
                {aiResponse && (
                  <div className="border border-emerald-500/25 bg-emerald-950/10 rounded-xl p-4 space-y-3.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-200">
                        <CheckCircle className="h-4 w-4 text-emerald-400 animate-bounce" />
                        <span>AI Proposal Draft Formulated</span>
                      </div>
                      <span className="text-[9px] uppercase font-mono bg-emerald-505/10 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20">Success</span>
                    </div>

                    <p className="text-[11px] text-gray-300 leading-normal bg-black/35 p-2.5 rounded border border-emerald-500/10 italic">
                      "{aiResponse.explanation}"
                    </p>

                    <div className="space-y-1 bg-[#0A0C0F] border border-[#2A2D35] p-2.5 rounded-lg">
                      <span className="text-[8.5px] font-mono tracking-widest text-gray-500 block uppercase">Calculated Rules Syntax</span>
                      <pre className="text-[9px] font-mono text-emerald-400 overflow-x-auto max-h-[140px] leading-relaxed p-1 bg-black/40 rounded">
                        {formatRulesToText(aiResponse.proposedRules || [])}
                      </pre>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const text = formatRulesToText(aiResponse.proposedRules || []);
                          navigator.clipboard.writeText(text);
                          triggerPopup('Copied structured text rules to clipboard!', 'success');
                        }}
                        className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10.5px] font-bold rounded flex items-center justify-center space-x-1.5"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Syntax</span>
                      </button>

                      <button
                        onClick={handleApplyProposedRules}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10.5px] font-black rounded flex items-center justify-center space-x-1.5 shadow-md"
                      >
                        <Cpu className="h-3.5 w-3.5" />
                        <span>Auto-Apply Changes</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 📋 13 Core Audit Regulation Category Groups Explanation Card */}
                <div className="bg-[#15171C] border border-blue-500/20 p-4 rounded-xl space-y-3 font-sans shadow-md">
                  <div className="flex items-center space-x-2 pb-2 border-b border-[#2A2D35]/50">
                    <span className="p-1 px-1.5 bg-blue-500/10 border border-blue-500/35 rounded text-blue-400 text-xs">
                      📋
                    </span>
                    <div>
                      <h4 className="text-[10px] font-black text-white uppercase font-mono tracking-wider">
                        13 Core Audit Regulation Groups
                      </h4>
                      <p className="text-[9.5px] text-gray-500">Overview of policy classification metrics and scopes</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-[10px]">
                    {/* Category A */}
                    <div className="bg-black/25 p-2.5 rounded-lg border border-[#2A2D35]/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#E2E8F0] text-[11px]">1. Configuration Alignment</span>
                        <span className="font-mono text-[8px] bg-blue-500/10 text-blue-400 px-1.5 py-0.2 rounded font-bold">Rules 1, 2, 3, 9, 10, 11</span>
                      </div>
                      <p className="text-[9.5px] text-gray-400 leading-normal">
                        Maintains technical synchronization between configured devices, closure criteria, and keywords ServiceNow matrix. Validates suspected CI exceptions and symptom code couplings.
                      </p>
                    </div>

                    {/* Category B */}
                    <div className="bg-black/25 p-2.5 rounded-lg border border-[#2A2D35]/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#E2E8F0] text-[11px]">2. Documentation Quality</span>
                        <span className="font-mono text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-bold">Rules 4, 5, 6, 7</span>
                      </div>
                      <p className="text-[9.5px] text-gray-400 leading-normal">
                        Utilizes AI models (Generative LLMs) to audit linguistic accuracy of ticket summaries, mandating 50+ character technical descriptions, priority-urgency matches (e.g. P3L), and business impact explanations.
                      </p>
                    </div>

                    {/* Category C */}
                    <div className="bg-black/25 p-2.5 rounded-lg border border-[#2A2D35]/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#E2E8F0] text-[11px]">3. Process Compliance</span>
                        <span className="font-mono text-[8px] bg-purple-500/10 text-purple-400 px-1.5 py-0.2 rounded font-bold">Rules 8, 12, 13</span>
                      </div>
                      <p className="text-[9.5px] text-gray-400 leading-normal">
                        Enforces administrative workflows, preventing state jumps (e.g., in-progress straight to solved), warning about day-old silence, enforcing knowledge citations, and verifying the 8 core checkpoints.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 🗺️ ServiceNow Strategic Compliance Audit Flow Diagrams */}
                <div className="bg-[#1C1F26] border border-[#2A2D35]/65 p-4 rounded-xl space-y-3.5 font-sans leading-relaxed">
                  <div className="flex justify-between items-center pb-2 border-b border-[#2A2D35]/50">
                    <span className="text-[10px] font-black text-blue-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      🚩 CONFIGURABLE AUDIT VALUATION PIPELINES
                    </span>
                    {flows.some((f, idx) => {
                      const cached = localStorage.getItem('servicenow_custom_flows');
                      if (!cached) return true;
                      try {
                        const parsed = JSON.parse(cached);
                        return JSON.stringify(flows) !== cached;
                      } catch (e) {
                        return true;
                      }
                    }) && (
                      <button
                        onClick={handleSaveFlows}
                        className="px-2 py-0.5 bg-blue-650 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[9px] font-extrabold rounded shadow cursor-pointer uppercase animate-pulse"
                      >
                        Commit Changes
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4 pr-1">
                    {flows.map((f) => {
                      const isEditing = editingFlowId === f.id;
                      return (
                        <div 
                          key={f.id} 
                          className={`text-[10px] space-y-2 bg-black/45 p-3 rounded-xl border ${
                            f.isEnabled ? 'border-blue-5/15 border-blue-500/25' : 'border-gray-800 opacity-60'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-extrabold text-gray-200 text-xs block">{f.name}</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleUpdateFlowField(f.id, 'isEnabled', !f.isEnabled)}
                                className={`px-1.5 py-0.2 rounded text-[8px] font-mono leading-none font-bold ${
                                  f.isEnabled ? 'bg-emerald-550/15 bg-emerald-500/10 text-emerald-400' : 'bg-gray-800 text-gray-500'
                                }`}
                              >
                                {f.isEnabled ? 'ACTIVE' : 'BYPASSED'}
                              </button>
                              <button
                                onClick={() => setEditingFlowId(isEditing ? null : f.id)}
                                className="px-1.5 py-0.2 rounded bg-gray-800 hover:bg-gray-700 text-slate-300 text-[8px] font-mono font-bold leading-none cursor-pointer"
                              >
                                {isEditing ? 'Close' : '✍️ Edit Flow'}
                              </button>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-2.5 p-2.5 bg-[#12141A] rounded-lg border border-slate-800 text-[10px]">
                              <div>
                                <label className="block text-[8px] font-mono uppercase text-slate-500 mb-1">Flow Display Title</label>
                                <input 
                                  type="text"
                                  value={f.name}
                                  onChange={(e) => handleUpdateFlowField(f.id, 'name', e.target.value)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D3340] rounded px-2.5 py-1 text-slate-200 text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-[8px] font-mono uppercase text-slate-50 relative mb-1">
                                  <span>Flow Step Sequence (Comma Separated)</span>
                                </label>
                                <input 
                                  type="text"
                                  value={f.steps.join(', ')}
                                  onChange={(e) => handleUpdateFlowField(f.id, 'steps', e.target.value)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D3340] rounded px-2.5 py-1 text-sky-400 font-mono text-xs"
                                  placeholder="e.g. Res. Desc Checkpoints, Closure Code 1"
                                />
                              </div>

                              <div>
                                <label className="block text-[8px] font-mono uppercase text-slate-550 mb-1">Functional Description</label>
                                <textarea 
                                  value={f.description}
                                  onChange={(e) => handleUpdateFlowField(f.id, 'description', e.target.value)}
                                  className="w-full bg-[#0A0C0F] border border-[#2D3340] rounded px-2.5 py-1 text-slate-300 text-xs"
                                  rows={2}
                                />
                              </div>

                              <div className="flex justify-end gap-1.5 pt-1">
                                <button
                                  onClick={handleSaveFlows}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold rounded text-[9px] cursor-pointer"
                                >
                                  ✓ Save All Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-1 font-mono text-[9px]">
                                {f.steps.map((step, sIdx) => (
                                  <React.Fragment key={sIdx}>
                                    <span className="bg-[#15171C] border border-gray-800/80 text-blue-300 px-1.5 py-0.5 rounded text-[8.5px]">
                                      {step}
                                    </span>
                                    {sIdx < f.steps.length - 1 && (
                                      <span className="text-gray-600 text-[8.5px]">➔</span>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                              <p className="text-[9px] text-gray-400 leading-normal">
                                {f.description}
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#1C1F26] border border-[#2A2D35]/65 p-4 rounded-xl space-y-2.5 font-sans leading-relaxed text-xs">
                  <div className="flex items-center space-x-1.5 text-gray-300 font-bold">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    <span>Helpful Command Formats:</span>
                  </div>
                  <div className="space-y-1.5 pl-5 list-decimal text-[11px] text-gray-400">
                    <p>• <em className="text-gray-300 font-mono">"increase weight of KNOWLEDGE_ARTICLE_CITATION to 5"</em></p>
                    <p>• <em className="text-gray-300 font-mono">"bypass rule SYMPTOM_CODE_CORRELATION"</em></p>
                    <p>• <em className="text-gray-300 font-mono">"change failure error message for service impact check"</em></p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {currentTab === 'keyword_mappings' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-card border border-border p-4 rounded-xl shadow-card">
            <h4 className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-mono font-bold">ServiceNow Classification Keyword Rules Matrix</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-normal">
              Map resolution description text keywords to required ServiceNow classification parameters. If an incoming ticket possesses custom keywords, the parser checks and scores its categorizations.
            </p>
          </div>
          <RulesEditor 
            rules={keywordRules} 
            onRulesSave={onKeywordRulesSave} 
            onResetToDefault={onResetKeywordRules} 
            triggerPopup={triggerPopup}
          />
        </div>
      )}

      {currentTab === 'assignment_group_cis' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Card */}
          <div className="bg-card border border-border p-5 rounded-xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 rounded-xl shrink-0">
                <Layers className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">ServiceNow Configuration Items (CIs) by Assignment Group</h4>
                  <span className="px-2 py-0.5 text-[9.5px] font-mono font-semibold rounded bg-teal-500/10 text-teal-600 dark:text-teal-300 border border-teal-500/25">
                    Live CMDB Synced
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                  Configuration Item (CI) details are dynamically fetched and coupled per <strong className="text-foreground">Assignment Group</strong> from the ServiceNow CMDB and incident history. These automatically govern CI audit rules with zero manual alignment configuration required.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={handleSyncGroupCisLive}
                disabled={groupCisLoading}
                className="px-3.5 py-2 rounded-lg text-xs font-bold font-mono bg-teal-600 hover:bg-teal-500 text-white transition-all flex items-center space-x-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${groupCisLoading ? 'animate-spin' : ''}`} />
                <span>{groupCisLoading ? 'Syncing CMDB CIs...' : 'Sync CIs from ServiceNow'}</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-card border border-border p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Assignment Group or CI Name..."
                value={groupCisSearch}
                onChange={(e) => setGroupCisSearch(e.target.value)}
                className="bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal-500 w-full transition-all shadow-2xs"
              />
            </div>
            <div className="text-xs text-muted-foreground font-mono flex items-center space-x-2">
              <span>Tracked Assignment Groups with CIs:</span>
              <span className="text-teal-600 dark:text-teal-400 font-bold bg-muted/40 px-2 py-1 rounded border border-border">
                {Object.keys(groupCisMap).length}
              </span>
            </div>
          </div>

          {/* Groups & CIs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(() => {
              const search = groupCisSearch.toLowerCase().trim();
              const entries = Object.entries(groupCisMap) as Array<[string, Array<{ name: string; sysId?: string; category?: string; className?: string }>]>;
              const filteredGroups = entries.filter(([groupName, cis]) => {
                if (!search) return true;
                const matchGroup = groupName.toLowerCase().includes(search);
                const matchCi = (cis || []).some(c => c.name.toLowerCase().includes(search) || (c.category && c.category.toLowerCase().includes(search)));
                return matchGroup || matchCi;
              });

              if (filteredGroups.length === 0) {
                return (
                  <div className="col-span-2 bg-card border border-border rounded-xl p-10 text-center text-muted-foreground shadow-card">
                    <p className="text-sm font-medium text-foreground">No Assignment Groups or Configuration Items matched your search.</p>
                    <p className="text-xs text-muted-foreground mt-1">Try searching for a different group name or click &quot;Sync CIs from ServiceNow&quot;.</p>
                  </div>
                );
              }

              return filteredGroups.map(([groupName, cis]) => (
                <div key={groupName} className="bg-card border border-border rounded-xl p-4 shadow-card flex flex-col justify-between hover:border-teal-500/30 transition-all">
                  <div>
                    <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-mono text-xs font-bold text-foreground">{groupName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                        {(cis || []).length} {(cis || []).length === 1 ? 'CI' : 'CIs'} Mapped
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {(cis || []).map((ci, cIdx) => (
                        <div key={cIdx} className="bg-muted/40 border border-border rounded-lg p-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                            <span className="font-mono text-xs text-teal-700 dark:text-teal-300 font-medium">{ci.name}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[10px] text-muted-foreground font-mono">
                            {ci.category && (
                              <span className="bg-card border border-border px-1.5 py-0.5 rounded text-foreground">
                                {ci.category}
                              </span>
                            )}
                            {ci.className && (
                              <span className="text-[9px] text-muted-foreground">
                                {ci.className}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[10.5px] text-muted-foreground">
                    <span className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400 inline" />
                      <span>Automatic CI Audit Rules active</span>
                    </span>
                    <span className="text-teal-600 dark:text-teal-400 font-mono">CMDB Authorized</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {currentTab === 'resolution_checklist' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-card border border-border p-4 rounded-xl shadow-card">
            <h4 className="text-xs uppercase tracking-widest text-purple-600 dark:text-purple-400 font-mono font-bold">ServiceNow Corporate 8-Points Checklist Config</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-normal">
              Specify the explicit sequential checkpoints that incident resolution fields are cross-referenced against. The AI core checks text content against every line defined underneath.
            </p>
          </div>
          <ResolutionConfigEditor 
            questions={resolutionQuestions} 
            onSaveQuestions={onSaveResolutionQuestions} 
            onResetToDefault={onResetResolutionQuestions} 
            triggerPopup={triggerPopup}
          />
        </div>
      )}


      
    </div>
  );
}
