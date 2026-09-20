import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  RefreshCw,
  X,
  Layers,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  AlertTriangle,
  FileCode,
  Gauge
} from 'lucide-react';

interface CaseResult {
  id: string;
  name: string;
  category: string;
  ticket_id: string;
  expected_score_range: string;
  predicted_score: string;
  expected_compliance: string;
  predicted_compliance: string;
  expected_quality: string;
  predicted_quality: string;
  expected_flags: string[];
  actual_flags: string[];
  passed: boolean;
  latency_ms: number;
  autonomous_loop: {
    think: string;
    act: string;
    observe: string;
  };
  contract: any;
}

interface HarnessReport {
  timestamp: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  overall_accuracy_pct: number;
  gate_precision_pct: number;
  mean_score_delta: number;
  mean_latency_ms: number;
  total_runtime_ms: number;
  status: string;
  model_evaluated: string;
  embedding_evaluated: string;
  cases: CaseResult[];
}

interface EvaluationHarnessModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerPopup?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const EvaluationHarnessModal: React.FC<EvaluationHarnessModalProps> = ({
  isOpen,
  onClose,
  triggerPopup
}) => {
  const [report, setReport] = useState<HarnessReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'passed' | 'failed'>('all');

  const fetchResults = async () => {
    try {
      const res = await fetch('/api/harness/results');
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setReport(data.report);
        }
      }
    } catch (e) {
      console.error('Failed to load harness results:', e);
    }
  };

  const handleRunHarness = async () => {
    setIsRunning(true);
    if (triggerPopup) {
      triggerPopup('Running autonomous evaluation benchmark across golden ITIL test cases...', 'info');
    }
    try {
      const res = await fetch('/api/harness/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setReport(data.report);
          if (triggerPopup) {
            triggerPopup(`Benchmark complete! Accuracy: ${data.report.overall_accuracy_pct}% (${data.report.passed_cases}/${data.report.total_cases} passed)`, 'success');
          }
        }
      } else {
        throw new Error('Harness run failed');
      }
    } catch (e: any) {
      if (triggerPopup) {
        triggerPopup('Evaluation harness execution failed: ' + (e?.message || e), 'error');
      }
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchResults();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cases = report?.cases || [];
  const filteredCases = cases.filter(c => {
    if (activeTab === 'passed') return c.passed;
    if (activeTab === 'failed') return !c.passed;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-card">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  Agent Evaluation Test Harness
                </h2>
                <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Gemini 3.8 Flash Benchmarked
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automated test bench evaluating deterministic gate checks, embeddings, and autonomous LLM output contracts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunHarness}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Running Benchmark...' : 'Run Test Suite'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="p-5 border-b border-border bg-muted/40">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-card border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
                Benchmark Accuracy
              </div>
              <div className="text-2xl font-black text-foreground mt-1 flex items-baseline gap-1.5">
                <span>{report ? `${report.overall_accuracy_pct}%` : '---'}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({report ? `${report.passed_cases}/${report.total_cases}` : '0/0'})
                </span>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                ITIL Ground Truth Alignment
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
                Gate Precision
              </div>
              <div className="text-2xl font-black text-foreground mt-1">
                {report ? `${report.gate_precision_pct}%` : '---'}
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                Deterministic Rule Recall
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
                Average Latency
              </div>
              <div className="text-2xl font-black text-foreground mt-1 flex items-baseline gap-1">
                <span>{report ? `${report.mean_latency_ms}` : '---'}</span>
                <span className="text-xs font-mono text-muted-foreground">ms</span>
              </div>
              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                Full Multi-Stage Cycle
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
                Pipeline Status
              </div>
              <div className="text-2xl font-black mt-1 flex items-center gap-1.5">
                {report?.status === 'PASSED' ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">PASSED</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">{report?.status || 'READY'}</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground font-semibold mt-0.5 font-mono truncate">
                {report?.model_evaluated || 'Gemini 3.8 Flash'}
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Test Cases List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-card">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Cases ({cases.length})
              </button>
              <button
                onClick={() => setActiveTab('passed')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'passed'
                    ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Passed ({report?.passed_cases || 0})
              </button>
              <button
                onClick={() => setActiveTab('failed')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'failed'
                    ? 'bg-card text-red-600 dark:text-red-400 shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Failed ({report?.failed_cases || 0})
              </button>
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              Last evaluated: {report ? new Date(report.timestamp).toLocaleTimeString() : 'Never'}
            </div>
          </div>

          {/* Test cases list */}
          <div className="space-y-2.5">
            {filteredCases.map(c => {
              const isExpanded = expandedCaseId === c.id;
              return (
                <div
                  key={c.id}
                  className={`rounded-xl border transition-all ${
                    c.passed
                      ? 'border-border hover:border-border/80 bg-card'
                      : 'border-red-500/30 bg-red-500/5'
                  }`}
                >
                  <div
                    onClick={() => setExpandedCaseId(isExpanded ? null : c.id)}
                    className="p-4 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      {c.passed ? (
                        <div className="p-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="p-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                          <XCircle className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">{c.id}</span>
                          <span className="text-xs font-bold text-foreground">{c.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                            {c.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-3">
                          <span>Target Ticket: <strong className="font-mono text-foreground">{c.ticket_id}</strong></span>
                          <span>Expected: <strong className="font-mono text-foreground">{c.expected_score_range}</strong></span>
                          <span>Predicted: <strong className="font-mono text-foreground">{c.predicted_score}</strong></span>
                          <span>Compliance: <strong className={`font-mono ${c.predicted_compliance === 'COMPLIANT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{c.predicted_compliance}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {c.latency_ms}ms
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded detail view */}
                  {isExpanded && (
                    <div className="p-4 border-t border-border bg-muted/30 space-y-4">
                      {/* Autonomous operating loop */}
                      <div>
                        <div className="text-[10px] font-mono uppercase font-bold text-muted-foreground tracking-wider mb-2 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                          Autonomous Operating Loop (THINK → ACT → OBSERVE)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                          <div className="p-3 rounded-lg bg-card border border-border">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block mb-1">1. THINK</span>
                            <p className="text-muted-foreground leading-relaxed text-[11px]">{c.autonomous_loop.think}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-card border border-border">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block mb-1">2. ACT</span>
                            <p className="text-muted-foreground leading-relaxed text-[11px]">{c.autonomous_loop.act}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-card border border-border">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block mb-1">3. OBSERVE</span>
                            <p className="text-muted-foreground leading-relaxed text-[11px]">{c.autonomous_loop.observe}</p>
                          </div>
                        </div>
                      </div>

                      {/* Flags comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-card border border-border">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold block mb-1">
                            Expected Policy Flags
                          </span>
                          {c.expected_flags.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.expected_flags.map((f, i) => (
                                <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">No infractions expected (Compliant)</span>
                          )}
                        </div>

                        <div className="p-3 rounded-lg bg-card border border-border">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold block mb-1">
                            Actual Flags Triggered
                          </span>
                          {c.actual_flags.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.actual_flags.map((f, i) => (
                                <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">Clean: 0 infractions</span>
                          )}
                        </div>
                      </div>

                      {/* JSON Output Contract */}
                      <div>
                        <div className="text-[10px] font-mono uppercase font-bold text-muted-foreground tracking-wider mb-1 flex items-center gap-1.5">
                          <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                          Validated Agent Output Contract (JSON)
                        </div>
                        <pre className="p-3 rounded-lg bg-muted border border-border text-[11px] font-mono text-foreground overflow-x-auto max-h-40 leading-relaxed">
                          {JSON.stringify(c.contract, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Deterministic Gate Engine & LLM Auditor Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
