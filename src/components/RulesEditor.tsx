import React, { useState, useRef, useEffect } from 'react';
import { AuditRule } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  Undo, 
  Cpu, 
  RefreshCw,
  Copy,
  Send,
  Bot,
  User,
  CheckCircle,
  HelpCircle,
  PlusCircle,
  ArrowRight,
  Terminal,
  Search,
  Sliders
} from 'lucide-react';

interface RulesEditorProps {
  rules: AuditRule[];
  onRulesSave: (newRules: AuditRule[]) => void;
  onResetToDefault: () => void;
  triggerPopup: (msg: string, type: 'success' | 'info' | 'warning') => void;
}

interface RuleChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  ruleGenerated?: AuditRule;
  timestamp: string;
}

export default function RulesEditor({ 
  rules, 
  onRulesSave, 
  onResetToDefault,
  triggerPopup
}: RulesEditorProps) {
  const [localRules, setLocalRules] = useState<AuditRule[]>([]);
  const [deletedRulesStack, setDeletedRulesStack] = useState<{ rule: AuditRule; originalIndex: number }[]>([]);
  const [ruleIndexToDelete, setRuleIndexToDelete] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [subView, setSubView] = useState<'table' | 'raw'>('table');
  const [jsonText, setJsonText] = useState('');
  const [showAiBuilder, setShowAiBuilder] = useState(false);

  const [chatMessages, setChatMessages] = useState<RuleChatMessage[]>([
    {
      id: 'rule_welcome',
      role: 'model',
      content: "Greetings ServiceNow Administrator! I am your dedicated **Rule Customizer & NLP Parser AI**.\n\nDescribe your requested rule structure in simple language (such as *\"create a rule for tablespace full triggers mapping to Capacity code and Harddisk swap solution\"*).\n\nI will instantly map your parameters onto our ServiceNow validation metrics structure, format the rules JSON on-screen, and let you directly apply or copy it.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  // Synchronize state with incoming rules if needed
  useEffect(() => {
    if (rules) {
      setLocalRules([...rules]);
    }
  }, [rules]);

  // Sync JSON text representation with localRules
  useEffect(() => {
    if (localRules && localRules.length > 0) {
      const cleanList = localRules.map(({ keywords, closureCode, closureCode2, solutionCode, symptomCode }) => ({
        keywords,
        closureCode,
        closureCode2,
        solutionCode,
        symptomCode
      }));
      setJsonText(JSON.stringify(cleanList, null, 2));
    } else {
      setJsonText('[]');
    }
  }, [localRules]);

  // Auto scroll to latest conversational advice
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFieldChange = (idx: number, key: keyof AuditRule, val: string | string[]) => {
    const updated = [...localRules];
    if (key === 'keywords') {
      const arr = typeof val === 'string' ? val.split(',').map(s => s.trim()) : val;
      updated[idx] = { ...updated[idx], keywords: arr };
    } else {
      updated[idx] = { ...updated[idx], [key]: val } as AuditRule;
    }
    setLocalRules(updated);
  };

  const handleAddRow = () => {
    const newRule: AuditRule = {
      id: `rule_manual_${Date.now()}`,
      keywords: ['new trigger'],
      closureCode: 'Code',
      closureCode2: 'Change Related',
      solutionCode: 'Workaround',
      symptomCode: 'Configuration Issue'
    };
    setLocalRules([newRule, ...localRules]);
    triggerPopup('Empty rule matrix row added. Remember to customize and save.', 'info');
  };

  const handleDeleteRow = (idx: number) => {
    const deletedRule = localRules[idx];
    setDeletedRulesStack(prev => [...prev, { rule: deletedRule, originalIndex: idx }]);
    
    const updated = localRules.filter((_, i) => i !== idx);
    setLocalRules(updated);
    triggerPopup(`Slated rule for "${deletedRule.keywords.join(', ')}" for removal. Click Undo notice to restore.`, 'warning');
  };

  const handleUndoDelete = () => {
    if (deletedRulesStack.length === 0) return;
    const lastDeleted = deletedRulesStack[deletedRulesStack.length - 1];
    setDeletedRulesStack(prev => prev.slice(0, -1));
    
    const updated = [...localRules];
    if (lastDeleted.originalIndex >= 0 && lastDeleted.originalIndex <= updated.length) {
      updated.splice(lastDeleted.originalIndex, 0, lastDeleted.rule);
    } else {
      updated.push(lastDeleted.rule);
    }
    setLocalRules(updated);
    triggerPopup(`Restored rule combination: "${lastDeleted.rule.keywords.join(', ')}"`, 'success');
  };

  const handleSaveChanges = async () => {
    onRulesSave(localRules);
    triggerPopup('Commit Complete: Custom rules configuration active on server!', 'success');
  };

  // Chat Submission Core
  const handleSendChatMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || chatInput;
    if (!promptToSend.trim() || aiLoading) return;

    const userMsg: RuleChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setChatInput('');
    setAiLoading(true);
    triggerPopup('Dispatched parsing instructions to the AI agent...', 'info');

    try {
      const res = await fetch('/api/rule-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToSend })
      });
      const data = await res.json();

      if (data.success && data.rule) {
        const parsedRule: AuditRule = data.rule;
        setChatMessages(prev => [...prev, {
          id: `model_rule_${Date.now()}`,
          role: 'model',
          content: `I have analyzed your instruction block and synthesized the corresponding ServiceNow matching rule. You can inspect its configuration below and press **Apply to Matrix** to inject it instantly into our ruleset.`,
          ruleGenerated: parsedRule,
          timestamp: new Date().toLocaleTimeString()
        }]);
        triggerPopup('Decoded rule schema successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to extract structured attributes.');
      }
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, {
        id: `model_err_${Date.now()}`,
        role: 'model',
        content: `Apologies, I encountered an issue translating your rules request: **"${err.message || 'Operation error'}"**. Please check your phrasing or specify your target codes directly.`,
        timestamp: new Date().toLocaleTimeString()
      }]);
      triggerPopup('NLP rules engine error.', 'warning');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyRuleFromChat = (rule: AuditRule) => {
    const freshRule: AuditRule = {
      ...rule,
      id: `rule_parsed_${Date.now()}`
    };
    setLocalRules([freshRule, ...localRules]);
    triggerPopup(`Successfully appended and integrated rule for: "${freshRule.keywords.join(', ')}"! Click "Commit Rules" above to persist.`, 'success');
  };

  const handleCopyRuleJson = (rule: AuditRule) => {
    const cleanObject = {
      keywords: rule.keywords,
      closureCode: rule.closureCode,
      closureCode2: rule.closureCode2,
      solutionCode: rule.solutionCode,
      symptomCode: rule.symptomCode
    };
    navigator.clipboard.writeText(JSON.stringify(cleanObject, null, 2));
    triggerPopup('Copied standardized rule JSON to clipboard!', 'success');
  };

  const triggerReset = () => {
    onResetToDefault();
    triggerPopup('Restored standard ServiceNow rules guidelines to database.', 'info');
  };

  const handleApplyJsonRules = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        triggerPopup('Configuration must be a valid JSON Array of rule objects.', 'warning');
        return;
      }

      const mappedRules: AuditRule[] = parsed.map((item: any, idx: number) => {
        return {
          id: item.id || `rule_json_${idx}_${Date.now()}`,
          keywords: Array.isArray(item.keywords) ? item.keywords.map((k: any) => String(k).trim()) : [],
          closureCode: String(item.closureCode || ''),
          closureCode2: String(item.closureCode2 || ''),
          solutionCode: String(item.solutionCode || ''),
          symptomCode: String(item.symptomCode || '')
        };
      });

      setLocalRules(mappedRules);
      onRulesSave(mappedRules);
      triggerPopup(`Successfully applied and stored ${mappedRules.length} rules from paste buffer!`, 'success');
      setSubView('table');
    } catch (e: any) {
      triggerPopup(`JSON format error: ${e.message}. Double-check array structure.`, 'warning');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="rules-editor">

      {/* Sub-View Navigation Bar (Rules Matrix, Raw JSON) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#15171C] border border-[#2A2D35] p-2.5 rounded-xl gap-3 shadow-md">
        <div className="flex items-center space-x-1.5 p-1 bg-[#0A0C0F] rounded-lg border border-[#2A2D35]/80">
          <button
            type="button"
            id="rules-tab-matrix"
            onClick={() => setSubView('table')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              subView === 'table'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1A1D24]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Rules Matrix</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
              subView === 'table' ? 'bg-blue-800 text-blue-200' : 'bg-[#1F232B] text-gray-400'
            }`}>
              {localRules.length}
            </span>
          </button>

          <button
            type="button"
            id="rules-tab-raw"
            onClick={() => setSubView('raw')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              subView === 'raw'
                ? 'bg-gray-700 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1A1D24]'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Raw JSON</span>
          </button>
        </div>
      </div>

      {/* Raw JSON View */}
      {subView === 'raw' && (
        <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-4 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs uppercase font-bold text-white tracking-wider">Raw JSON Configuration</h4>
              <p className="text-xs text-gray-400 mt-0.5">Inspect, copy, or paste rules JSON array directly into memory.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(jsonText);
                  triggerPopup('Copied rules JSON array to clipboard!', 'success');
                }}
                className="px-3 py-1.5 bg-[#0A0C0F] hover:bg-[#1A1D24] text-xs text-gray-300 font-bold rounded-lg border border-[#2A2D35] flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy JSON</span>
              </button>
              <button
                type="button"
                onClick={handleApplyJsonRules}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer transition-colors shadow-md"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Apply JSON to Matrix</span>
              </button>
            </div>
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={16}
            className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-blue-500 rounded-lg p-3 text-xs text-emerald-400 font-mono outline-none resize-y leading-relaxed"
            placeholder='[{"keywords": ["database"], "closureCode": "Code", ...}]'
          />
        </div>
      )}

      {/* Rules Matrix Table View */}
      {subView === 'table' && (
        <>
      {/* Visual Compact AI Wizard Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#111318] border border-[#2A2D35] p-3 rounded-xl gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-blue-600/10 border border-blue-500/30 rounded text-blue-400">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-tight block">NLP Matcher Rule Synthesizer AI</span>
            <span className="text-[10.5px] text-gray-500">Formulate custom alignment patterns dynamically using conversational language prompts</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAiBuilder(!showAiBuilder)}
          className="px-3.5 py-1.5 bg-[#1C1F26] hover:bg-gray-800 border border-[#2A2D35] hover:text-white text-gray-300 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
          <span>{showAiBuilder ? 'Collapse AI Generator Panel' : 'Expand NLP Rule Generator Assistant'}</span>
        </button>
      </div>

      {showAiBuilder && (
        /* Dual Panel Workspace Component (Interactive Conversational Chat Box + Templates Panel) */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-slideDown">
          
          {/* Chat box Pane (2/3 weight on wide displays) */}
          <div className="xl:col-span-2 bg-[#15171C] border border-[#2A2D35] rounded-xl overflow-hidden flex flex-col h-[400px] shadow-xl">
            <div className="p-3 bg-[#1A1D24] border-b border-[#2A2D35] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <div>
                  <h4 className="text-xs uppercase font-bold tracking-wider text-white">Rule-Builder NLP Chat Assistant</h4>
                  <p className="text-[9.5px] text-gray-500">Draft matching logic with full-context conversational AI</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setChatMessages([
                    {
                      id: `refreshed_${Date.now()}`,
                      role: 'model',
                      content: 'Rule builder thread cleared. Please state your requested rule keywords and category mapping values.',
                      timestamp: new Date().toLocaleTimeString()
                    }
                  ]);
                  triggerPopup('Refreshed conversational assistant history logs.', 'info');
                }}
                className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 hover:text-white border border-[#2A2D35] rounded text-[9.5px] text-gray-400 font-mono transition-all cursor-pointer"
              >
                Clear
              </button>
            </div>

            {/* Messages Feed Container */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#0A0C0F]">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex space-x-2.5 max-w-[90%] ${
                    msg.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  {/* Avatar Icon */}
                  <div className={`p-1.5 rounded-lg shrink-0 h-7 w-7 flex items-center justify-center border ${
                    msg.role === 'user' 
                      ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' 
                      : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>

                  {/* Message Body Content card */}
                  <div className="space-y-1">
                    <div className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600/10 border border-blue-500/30 text-slate-100 rounded-tr-none'
                        : 'bg-[#15171C] border border-[#2A2D35] text-gray-300 rounded-tl-none'
                    }`}>
                      {/* Render basic bold statements manually for safety */}
                      <div className="whitespace-pre-wrap">
                        {msg.content.split('\n\n').map((paragraph, pIdx) => {
                          return (
                            <p key={pIdx} className="mb-1.5 last:mb-0 text-[11px]">
                              {paragraph.split('**').map((part, partIdx) => 
                                partIdx % 2 === 1 ? <strong key={partIdx} className="text-white font-bold">{part}</strong> : part
                              )}
                            </p>
                          );
                        })}
                      </div>

                      {/* Format structured rule inside Chat response with action buttons! */}
                      {msg.ruleGenerated && (
                        <div className="mt-2.5 bg-[#0A0C0F] border border-[#2D3340] rounded-lg p-2.5 space-y-2.5 font-mono text-[10.5px] text-slate-300">
                          <div className="flex items-center justify-between border-b border-[#2A2D35]/65 pb-1.5">
                            <div className="flex items-center space-x-1 text-blue-400 font-bold">
                              <Terminal className="h-3 w-3 text-emerald-400" />
                              <span>GENERATED RULE STRUCT</span>
                            </div>
                            <span className="text-[9px] text-gray-500">ServiceNow Matrix Spec</span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-0.5">
                            <div>
                              <span className="text-gray-500 block text-[9px] uppercase">Keywords</span>
                              <span className="text-blue-400 font-semibold">{msg.ruleGenerated.keywords.join(', ')}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[9px] uppercase">Closure Code (1)</span>
                              <span className="text-white">{msg.ruleGenerated.closureCode}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[9px] uppercase">Closure Code (2)</span>
                              <span className="text-white">{msg.ruleGenerated.closureCode2}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[9px] uppercase">Solution Code</span>
                              <span className="text-emerald-400">{msg.ruleGenerated.solutionCode}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500 block text-[9px] uppercase">Symptom Code</span>
                              <span className="text-purple-400">{msg.ruleGenerated.symptomCode}</span>
                            </div>
                          </div>

                          {/* Direct Click Action Controls */}
                          <div className="flex space-x-1.5 border-t border-[#2A2D35]/50 pt-2.5 mt-2">
                            <button
                              type="button"
                              onClick={() => handleApplyRuleFromChat(msg.ruleGenerated!)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9.5px] py-1 rounded flex items-center justify-center space-x-1 cursor-pointer transition-colors animate-pulse"
                            >
                              <PlusCircle className="h-3 w-3" />
                              <span>Apply to Rules Table</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleCopyRuleJson(msg.ruleGenerated!)}
                              className="px-2 bg-gray-800 hover:bg-gray-700 text-slate-300 font-medium text-[9.5px] rounded border border-[#2A2D35] flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                              title="Copy Copy-Pasteable Format JSON"
                            >
                              <Copy className="h-3 w-3" />
                              <span>Copy JSON</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[8px] text-gray-650 block pl-1 font-mono tracking-wider">{msg.timestamp}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Conversational Input bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="p-2.5 bg-[#13151A] border-t border-[#2A2D35] flex items-center space-x-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={aiLoading}
                placeholder="Describe: 'ldap user lockout maps to Account Restored'..."
                className="flex-1 bg-[#0A0C0F] border border-[#2A2D35] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white outline-none font-medium placeholder-gray-650 disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={aiLoading || !chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold text-xs p-2 rounded cursor-pointer transition-colors shrink-0 flex items-center justify-center"
              >
                {aiLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>

          {/* Quick Context Templates Sidebar Panel */}
          <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-3 flex flex-col justify-between space-y-3 h-[400px] shadow-xl overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center space-x-1 border-b border-[#2A2D35] pb-2">
                <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
                <h5 className="text-[10px] uppercase font-extrabold tracking-wider text-gray-305">Quick Templates</h5>
              </div>
              
              <div className="space-y-2">
                {[
                  {
                    title: "Database Slow Rule",
                    prompt: "resolving 'database slow' expectations maps to Software and symptom 'Database slowdown'"
                  },
                  {
                    title: "LDAP User Lockouts",
                    prompt: "resolving 'ldap lock' maps to closure code 'Account Restored'"
                  },
                  {
                    title: "Hardware Replacement",
                    prompt: "resolving 'router failure' maps to Hardware/Replacement"
                  }
                ].map((tmpl, index) => (
                  <div 
                    key={index}
                    onClick={() => handleSendChatMessage(tmpl.prompt)}
                    className="bg-[#0A0C0F] border border-[#2A2D35] hover:border-blue-500 p-2 rounded-lg cursor-pointer hover:bg-[#111317] transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                      <span>{tmpl.title}</span>
                      <ArrowRight className="h-3 w-3 text-gray-500 group-hover:text-blue-450 transition-colors" />
                    </div>
                    <p className="text-[9px] text-gray-500 mt-0.5 line-clamp-1 italic font-mono leading-relaxed">
                      "{tmpl.prompt}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0D0F14] border border-[#2A2D35]/80 p-2 rounded text-[9.5px] text-gray-500 leading-normal font-mono">
              <span className="text-blue-400 font-bold uppercase tracking-wider block text-[8.5px] mb-0.5">💡 TIP</span>
              Tell model what to configure. Click Apply to insert instantly.
            </div>
          </div>

        </div>
      )}

      {/* Undo Delete Notice Banner */}
      {deletedRulesStack.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-xs text-amber-200 animate-slideUp gap-3">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 bg-amber-500/15 rounded-lg text-amber-400 border border-amber-500/20">
              <Trash2 className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-white">Rule slated for deletion</p>
              <p className="text-gray-400 text-[11px] mt-0.5">
                Saved keyword combo: <strong className="text-amber-300 font-mono">"{deletedRulesStack[deletedRulesStack.length - 1].rule.keywords.join(', ')}"</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] cursor-pointer flex items-center space-x-1.5 transition-all shadow-md"
          >
            <Undo className="h-3 w-3" />
            <span>Undo Delete</span>
          </button>
        </div>
      )}

      <div className="bg-[#15171C] border border-[#2A2D35]/80 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-[#1A1D24] border-b border-[#2A2D35] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-gray-400">Rule Combinations Master Matrix</h4>
            <p className="text-xs text-gray-500 mt-1">Direct manual override matrix for granular audit configuration.</p>
          </div>
          
          <div className="flex flex-wrap gap-2 self-end lg:self-auto">
            <button
              onClick={triggerReset}
              className="px-3 py-2 bg-red-955/10 hover:bg-red-955/20 border border-red-900/30 text-red-00 hover:text-red-300 text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer font-bold transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset Rules to Defaults</span>
            </button>
            <button
              onClick={handleAddRow}
              className="px-3 py-2 bg-[#0A0C0F] hover:bg-[#15171C] border border-[#2A2D35] text-xs text-slate-300 rounded-lg flex items-center space-x-1.5 cursor-pointer font-medium"
            >
              <Plus className="h-3 w-3" />
              <span>Add Custom Matrix Row</span>
            </button>
            <button
              onClick={handleSaveChanges}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer transition-all shadow-md"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Commit Rules Configuration to Server</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-[#2A2D35] bg-[#0A0C0F] text-gray-400 font-mono text-[9px] uppercase tracking-wider">
                <th className="px-2 py-2">Keywords of Resolution (Comma Separated)</th>
                <th className="px-2 py-2 w-[170px]">Closure Code</th>
                <th className="px-2 py-2 w-[170px]">Closure Code 2</th>
                <th className="px-2 py-2 w-[170px]">Solution Code</th>
                <th className="px-2 py-2 w-[170px]">Symptom Code</th>
                <th className="px-2 py-2 w-[50px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2D35]/55 text-xs text-gray-300">
              {localRules.map((rule, idx) => (
                <tr key={rule.id} className="hover:bg-[#1A1D24]/40 transition-all">
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={rule.keywords.join(', ')}
                      onChange={(e) => handleFieldChange(idx, 'keywords', e.target.value)}
                      className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-blue-500 rounded px-2 py-1 text-xs text-blue-400 font-semibold font-mono outline-none"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={rule.closureCode}
                      onChange={(e) => handleFieldChange(idx, 'closureCode', e.target.value)}
                      className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-blue-500 rounded px-2 py-1 text-xs text-white outline-none font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={rule.closureCode2}
                      onChange={(e) => handleFieldChange(idx, 'closureCode2', e.target.value)}
                      className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-blue-500 rounded px-2 py-1 text-xs text-white outline-none font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={rule.solutionCode}
                      onChange={(e) => handleFieldChange(idx, 'solutionCode', e.target.value)}
                      className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-blue-500 rounded px-2 py-1 text-xs text-white outline-none font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={rule.symptomCode}
                      onChange={(e) => handleFieldChange(idx, 'symptomCode', e.target.value)}
                      className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-blue-500 rounded px-2 py-1 text-xs text-white outline-none font-mono"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <button
                      onClick={() => setRuleIndexToDelete(idx)}
                      className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-[#1A1D24] transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Matrix Rule Deletion Confirmation Modal */}
      <ConfirmationModal
        isOpen={ruleIndexToDelete !== null}
        title="Delete Matrix Audit Rule?"
        message={`Are you sure you want to delete this validation matrix rule (keywords: "${ruleIndexToDelete !== null ? localRules[ruleIndexToDelete]?.keywords.join(', ') : ''}")?`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        onConfirm={() => {
          if (ruleIndexToDelete !== null) {
            handleDeleteRow(ruleIndexToDelete);
            setRuleIndexToDelete(null);
          }
        }}
        onCancel={() => setRuleIndexToDelete(null)}
      />

    </div>
  );
}
