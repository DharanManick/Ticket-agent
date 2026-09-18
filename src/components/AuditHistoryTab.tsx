import React, { useState } from 'react';
import { AuditHistoricalRun, TicketAuditReport } from '../types';
import ConfirmationDialog from './ConfirmationDialog';
import { 
  History, 
  Calendar, 
  Download, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  ArrowRight,
  Database,
  FileSpreadsheet,
  RotateCcw,
  Inbox,
  ArchiveRestore
} from 'lucide-react';
import { exportToColorfulExcel } from '../utils/excelExporter';
import * as XLSX from 'xlsx';

interface AuditHistoryTabProps {
  historyRuns: AuditHistoricalRun[];
  trashRuns?: AuditHistoricalRun[];
  onClearHistory: () => void;
  onMoveRunToTrash?: (runId: string) => void;
  onRestoreRun?: (runId: string) => void;
  onPermanentDeleteRun?: (runId: string) => void;
  onEmptyTrash?: () => void;
  triggerPopup: (msg: string, type: 'success' | 'info' | 'warning') => void;
}

export default function AuditHistoryTab({ 
  historyRuns, 
  trashRuns = [], 
  onClearHistory, 
  onMoveRunToTrash, 
  onRestoreRun, 
  onPermanentDeleteRun, 
  onEmptyTrash, 
  triggerPopup 
}: AuditHistoryTabProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [historySubTab, setHistorySubTab] = useState<'active' | 'trash'>('active');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // States for permanent deletion confirmation modals
  const [deleteRunId, setDeleteRunId] = useState<string | null>(null);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);

  // Download specific saved audit run
  const downloadSingleRunExcel = (run: AuditHistoricalRun) => {
    if (run.tickets.length === 0) {
      triggerPopup('Run contain zero tickets.', 'warning');
      return;
    }

    // Formatting helpers to inject cross-platform visual coloring inside spreadsheet readers
    const formatScorePercent = (p: number) => {
      if (p >= 90) return `🟢 ${p}% [EXCELLENT PASS]`;
      if (p >= 70) return `🟡 ${p}% [AMBER WARN]`;
      return `🔴 ${p}% [CRITICAL FAIL]`;
    };

    const formatScoreTotal = (score: number, p: number) => {
      if (p >= 90) return `🟩 ${score} / 26 [PASS]`;
      if (p >= 70) return `🟨 ${score} / 26 [WARN]`;
      return `🟥 ${score} / 26 [FAIL]`;
    };

    const formatComplianceBand = (p: number) => {
      if (p >= 90) return `✅ COMPLIANT (GREEN AUDIT)`;
      if (p >= 70) return `⚠️ MARGINAL (AMBER WARNING)`;
      return `❌ NON-COMPLIANT (RED CRITICAL)`;
    };

    const rowsToExport = run.tickets.map(r => ({
      'INC Number': r.ticket.incNumber,
      'Assignee': r.ticket.assignee,
      'Assignment Group': r.ticket.assignmentGroup,
      'Assignee Manager': r.ticket.assigneeManager,
      'Created date': r.ticket.createdDate,
      'Closed date': r.ticket.closedDate,
      'KSL (Yes/No)': r.ksl,
      'audit (Yes/No)': r.audited,
      'Audit Compliance Band': formatComplianceBand(r.percentage),
      'affected ci': r.scores.affectedCi.score,
      'suspected ci': r.scores.suspectedCi.score,
      'symptom code': r.scores.symptomCode.score,
      'short description': r.scores.shortDescription.score,
      'technical description': r.scores.technicalDescription.score,
      'service impact description': r.scores.serviceImpactDescription.score,
      'business impact description': r.scores.businessImpactDescription.score,
      'activity logs': r.scores.activityLogs.score,
      'closure code1': r.scores.closureCode1.score,
      'closure code2': r.scores.closureCode2.score,
      'solution code': r.scores.solutionCode.score,
      'knowledge article': r.scores.knowledgeArticle.score,
      'resolution description': r.scores.resolutionDescription.score,
      'Score (Total - 26)': formatScoreTotal(r.totalScore, r.percentage),
      'Score in percent': formatScorePercent(r.percentage),
      'Comments': r.generalComments
    }));

    const worksheet = XLSX.utils.json_to_sheet(rowsToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Archived Audit Run');
    
    // Format timestamp politely
    const dateStamp = run.timestamp.split('T')[0];
    XLSX.writeFile(workbook, `ArchiveRun_${dateStamp}_${run.runId.slice(-5)}.xlsx`);
    triggerPopup(`Exported Archived Audit Run from ${dateStamp}!`, 'success');
  };

  // Group tickets by Month of creation for "monthly one get all audit tickets audited for that month in one short"
  const monthlyAggregates = React.useMemo(() => {
    const monthlyGroups: Record<string, {
      monthKey: string;
      totalTicketsCount: number;
      sumScores: number;
      averageSLA: number;
      runCount: number;
      tickets: TicketAuditReport[];
    }> = {};

    historyRuns.forEach(run => {
      // Find month key e.g. "2026-05" from run timestamp or ticket created dates
      const month = run.monthKey || run.timestamp.slice(0, 7);
      
      if (!monthlyGroups[month]) {
        monthlyGroups[month] = {
          monthKey: month,
          totalTicketsCount: 0,
          sumScores: 0,
          averageSLA: 0,
          runCount: 0,
          tickets: []
        };
      }

      monthlyGroups[month].totalTicketsCount += run.totalTickets;
      monthlyGroups[month].sumScores += (run.averageScorePercentage * run.totalTickets);
      monthlyGroups[month].runCount += 1;
      monthlyGroups[month].tickets.push(...run.tickets);
    });

    return Object.values(monthlyGroups).map(group => ({
      ...group,
      averageSLA: group.totalTicketsCount > 0 ? Math.round(group.sumScores / group.totalTicketsCount) : 0
    })).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [historyRuns]);

  // Download entire consolidated month dataset
  const downloadMonthlyConsolidatedExcel = (monthKey: string, ticketsList: TicketAuditReport[]) => {
    if (ticketsList.length === 0) {
      triggerPopup('This calendar month has no audited records stored.', 'warning');
      return;
    }

    // Deduplicate tickets by incident number to keep data pristine
    const ticketMap = new Map<string, TicketAuditReport>();
    ticketsList.forEach(t => {
      ticketMap.set(t.ticket.incNumber, t);
    });

    const uniqueTickets = Array.from(ticketMap.values());

    exportToColorfulExcel(`Monthly_Consolidated_Audit_${monthKey}`, true, uniqueTickets);
    triggerPopup(`Downloaded ${uniqueTickets.length} incidents for month ${monthKey} as a beautiful colorful audit summary!`, 'success');
  };

  // SVG dimensions for the beautiful aesthetic history timeline
  const width = 640;
  const height = 140;
  const paddingX = 40;
  const paddingY = 20;

  // Render SVG trendline of audit-by-audit scores
  const renderHistoryTrendSVG = () => {
    // We want the runs chronologically (left-to-right) for plotting
    const chronologicalRuns = [...historyRuns].reverse();
    if (chronologicalRuns.length < 2) {
      return (
        <div className="h-28 flex flex-col items-center justify-center text-gray-500 font-mono text-[10px]">
          <span>Need at least 2 historical runs to trace the SLA compliance graph.</span>
        </div>
      );
    }

    const minX = paddingX;
    const maxX = width - paddingX;
    const minY = height - paddingY;
    const maxY = paddingY;

    const getXCoord = (index: number) => {
      return minX + (index / (chronologicalRuns.length - 1)) * (maxX - minX);
    };

    const getYCoord = (score: number) => {
      // 0 % is at minY, 100% is at maxY
      return minY - (score / 100) * (minY - maxY);
    };

    // Construct path coordinates
    const points = chronologicalRuns.map((run, idx) => ({
      x: getXCoord(idx),
      y: getYCoord(run.averageScorePercentage),
      score: run.averageScorePercentage,
      dateLabel: new Date(run.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
    }));

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Quadratic Bezier interpolation for extra aesthetics
      const cpX = (points[i-1].x + points[i].x) / 2;
      pathD += ` Q ${cpX} ${points[i-1].y} ${points[i].x} ${points[i].y}`;
    }

    return (
      <div className="relative w-full overflow-x-auto select-none pt-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto text-emerald-400">
          <defs>
            {/* Soft gradient underneath trace */}
            <linearGradient id="traceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>

          {/* Reference Targets Grid Guidelines */}
          <line x1={minX} y1={getYCoord(90)} x2={maxX} y2={getYCoord(90)} stroke="rgba(16, 185, 129, 0.2)" strokeDasharray="3 3" />
          <line x1={minX} y1={getYCoord(70)} x2={maxX} y2={getYCoord(70)} stroke="rgba(245, 158, 11, 0.15)" strokeDasharray="3 3" />
          <text x={maxX + 5} y={getYCoord(90) + 3} className="text-[8px] font-mono fill-emerald-500/80 uppercase">90% Target</text>

          {/* Area Fill Gradient under curve */}
          <path
            d={`${pathD} L ${points[points.length - 1].x} ${minY} L ${points[0].x} ${minY} Z`}
            fill="url(#traceGrad)"
          />

          {/* Curve Trace Line */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Circular Data Nodes */}
          {points.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                className="fill-[#15171C] stroke-emerald-400 stroke-2 hover:r-6 hover:fill-emerald-400 transition-all duration-200"
              />
              {/* Score text directly shown */}
              <text
                x={pt.x}
                y={pt.y - 8}
                textAnchor="middle"
                className="text-[9px] font-mono fill-gray-200 font-bold"
              >
                {pt.score}%
              </text>
              {/* Horizontal dates */}
              <text
                x={pt.x}
                y={minY + 12}
                textAnchor="middle"
                className="text-[8px] font-mono fill-gray-500"
              >
                {pt.dateLabel}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const activeRun = [...historyRuns, ...trashRuns].find(r => r.runId === selectedRunId) || historyRuns[0] || trashRuns[0];

  return (
    <div className="space-y-6 animate-fadeIn" id="audit-history-view">
      
      {/* 1. Monthly consolidation cards section - ONE SHORT EXPORT */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-5 pointer-events-none p-4">
          <Database className="h-32 w-32" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-[#2A2D35] pb-4">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
              Month-End Consolidated Audit Bundles
            </h3>
            <p className="text-[11px] text-gray-400 mt-1">
              Download all incidents audited during any date or run of a specific month in one click.
            </p>
          </div>
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest bg-[#0A0C0F] border border-[#2A2D35] px-2.5 py-1 rounded-md mt-2 md:mt-0">
            System Auto-Grouped
          </span>
        </div>

        {monthlyAggregates.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500 italic">
            No historical month benchmarks computed. Completed logs will structure here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlyAggregates.map((group) => (
              <div 
                key={group.monthKey} 
                className="p-4 rounded-xl bg-[#0A0C0F]/80 border border-[#2A2D35] hover:border-emerald-500/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-1.5ClassName text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-extrabold text-white font-mono">{group.monthKey} Statement</span>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-extrabold bg-[#1A1D24] border border-[#2A2D35] text-emerald-400 rounded">
                      {group.averageSLA}% Avg
                    </span>
                  </div>
                  
                  <div className="text-[11px] text-gray-400 space-y-1 pt-1">
                    <p>Total Audits Logged: <strong className="text-gray-200 font-mono font-semibold">{group.runCount} batches</strong></p>
                    <p>Combined Incidents: <strong className="text-gray-200 font-mono font-semibold">{group.totalTicketsCount} records</strong></p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => downloadMonthlyConsolidatedExcel(group.monthKey, group.tickets)}
                  className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-extrabold text-xs py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-slate-950" />
                  <span>Download Full Monthly Statement</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Historic Timeline Trends diagram */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-white">Audit Historical Quality Path</h4>
            <p className="text-[10px] text-gray-500 mt-0.5">Plotting average compliance progress across your auto-saved audits</p>
          </div>
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        </div>
        
        {renderHistoryTrendSVG()}
      </div>

      {/* 3. Daily Runs Split Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Run list selector */}
        <div className="xl:col-span-6 space-y-4">
          
          {/* Sub-Tabs Nav Bar */}
          <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-3 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex space-x-1 bg-[#0A0C0F] p-1 rounded-lg border border-[#2A2D35]/50">
              <button
                type="button"
                onClick={() => setHistorySubTab('active')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  historySubTab === 'active'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Active Logs ({historyRuns.length})
              </button>
              <button
                type="button"
                onClick={() => setHistorySubTab('trash')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                  historySubTab === 'trash'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Trash Bin</span>
                {trashRuns.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[9px] font-mono font-black bg-red-650 bg-red-550 text-white rounded-full">
                    {trashRuns.length}
                  </span>
                )}
              </button>
            </div>

            {historySubTab === 'active' ? (
              historyRuns.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirmClearAll) {
                      onClearHistory();
                      setConfirmClearAll(false);
                    } else {
                      setConfirmClearAll(true);
                      triggerPopup('Click Send All again to confirm moving everything to Trash.', 'info');
                      setTimeout(() => setConfirmClearAll(false), 5000);
                    }
                  }}
                  className={`px-2.5 py-1.5 text-[10px] font-bold rounded cursor-pointer transition-colors flex items-center space-x-1 border ${
                    confirmClearAll 
                      ? 'bg-red-650 bg-red-600 border-red-500 text-white animate-pulse' 
                      : 'bg-zinc-950/20 border-zinc-800 text-zinc-400 hover:bg-zinc-950/45 hover:text-white'
                  }`}
                >
                  <Trash2 className="h-3 w-3 text-red-450" />
                  <span>{confirmClearAll ? 'Confirm Send All to Trash?' : 'Send All to Trash'}</span>
                </button>
              )
            ) : (
              trashRuns.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowEmptyTrashModal(true)}
                  className="px-2.5 py-1.5 text-[10px] font-bold rounded cursor-pointer transition-colors flex items-center space-x-1 border bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Empty Trash Bin</span>
                </button>
              )
            )}
          </div>

          {/* List Display switcher */}
          <div className="space-y-3">
            {historySubTab === 'active' ? (
              historyRuns.length === 0 ? (
                <div className="border border-[#2A2D35] border-dashed rounded-xl bg-[#0A0C0F]/20 p-8 text-center text-gray-500 text-xs italic">
                  No archived audit sweeps registered yet. Run an Excel validation to automatically generate historical caches.
                </div>
              ) : (
                historyRuns.map((run) => {
                  const isSelected = activeRun?.runId === run.runId;
                  const dateLabel = new Date(run.timestamp).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={run.runId}
                      onClick={() => setSelectedRunId(run.runId)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center group/run-item ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-950/10' 
                          : 'border-[#2A2D35] bg-[#15171C] hover:border-gray-600'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white font-mono">{dateLabel}</span>
                          <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            Saved
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">
                          Audited by: <strong className="text-gray-300 font-semibold">{run.auditorName || 'Official'}</strong> &bull; Total Incidents: <span className="font-mono text-gray-300 font-semibold">{run.totalTickets}</span>
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`text-sm font-mono font-extrabold ${run.averageScorePercentage >= 90 ? 'text-green-400' : 'text-yellow-500'}`}>
                          {run.averageScorePercentage}% Score
                        </span>
                        
                        {/* Send individual to Trash icon */}
                        <button
                          type="button"
                          title="Send to Trash"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveRunToTrash?.(run.runId);
                          }}
                          className="p-1 px-1.5 bg-zinc-900 border border-zinc-800 text-gray-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-all ml-1.5 opacity-0 group-hover/run-item:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>

                        <ArrowRight className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              // Trash Bin section
              trashRuns.length === 0 ? (
                <div className="border border-[#2A2D35] border-dashed rounded-xl bg-[#0A0C0F]/20 p-8 text-center text-gray-500 text-xs italic flex flex-col items-center justify-center space-y-2">
                  <Inbox className="h-6 w-6 text-gray-600" />
                  <span>The history trash bin is empty. Cleared audit sweeps will show up here.</span>
                </div>
              ) : (
                trashRuns.map((run) => {
                  const isSelected = activeRun?.runId === run.runId;
                  const dateLabel = new Date(run.timestamp).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={run.runId}
                      onClick={() => setSelectedRunId(run.runId)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                        isSelected 
                          ? 'border-red-500 bg-[#1F1416] shadow-md' 
                          : 'border-red-950 bg-[#120F10] hover:border-red-900'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-gray-300 font-mono">{dateLabel}</span>
                          <span className="text-[9px] uppercase font-bold tracking-widest text-red-400 font-mono bg-red-500/10 px-1.5 py-0.5 rounded">
                            Trashed
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">
                          Audited by: <strong className="text-gray-300 font-semibold">{run.auditorName || 'Official'}</strong> &bull; Total Incidents: {run.totalTickets}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs font-mono text-gray-400">
                          {run.averageScorePercentage}% Score
                        </span>

                        {/* Restore button */}
                        <button
                          type="button"
                          title="Restore Run"
                          onClick={() => onRestoreRun?.(run.runId)}
                          className="p-1 px-1.5 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 hover:text-white hover:bg-emerald-900 rounded transition"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        </button>

                        {/* Permanent Delete button */}
                        <button
                          type="button"
                          title="Delete Permanently"
                          onClick={() => setDeleteRunId(run.runId)}
                          className="p-1 px-[7px] rounded transition bg-red-950/10 border border-red-900/45 text-red-400 hover:bg-red-900 hover:text-white cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Selected run detailed breakdown */}
        <div className="xl:col-span-6">
          {activeRun ? (
            <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4">
              <div className="border-b border-[#2A2D35] pb-3 flex justify-between items-start">
                <div>
                  <h4 className="text-xs uppercase font-bold text-gray-400 logo-text">Archived Batch Report Card</h4>
                  <p className="text-xs text-white font-mono font-bold mt-1">ID: {activeRun.runId}</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => downloadSingleRunExcel(activeRun)}
                  className="bg-[#1a1d24] hover:bg-[#23272f] border border-[#2a2d35] text-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                >
                  <Download className="h-3 w-3 text-emerald-400" />
                  <span>Download Run Excel</span>
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0A0C0F] p-3 rounded-lg border border-[#2A2D35]/50">
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-mono">Consolidated Quality average</span>
                  <span className="text-md font-bold font-mono text-emerald-400 block mt-1">{activeRun.averageScorePercentage}%</span>
                </div>
                <div className="bg-[#0A0C0F] p-3 rounded-lg border border-[#2A2D35]/50">
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-mono">Total Incident count</span>
                  <span className="text-md font-bold font-mono text-white block mt-1">{activeRun.totalTickets} Tickets</span>
                </div>
              </div>

              {/* List of individual tickets saved */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono font-bold text-gray-500 tracking-widest block">Logged Incidents Score Check</span>
                <div className="max-h-60 overflow-y-auto divide-y divide-[#2A2D35]/40 pr-1">
                  {activeRun.tickets.map((t, tIdx) => (
                    <div key={`${t.ticket.incNumber || t.ticket.id || 'hist-t'}-${tIdx}`} className="py-2 flex justify-between items-center text-xs">
                      <span className="font-mono text-blue-400 font-semibold">{t.ticket.incNumber}</span>
                      <span className="text-gray-400 truncate max-w-[200px]" title={t.ticket.assignee}>{t.ticket.assignee}</span>
                      <span className={`font-mono font-bold ${t.percentage >= 90 ? 'text-green-400' : t.percentage >= 70 ? 'text-yellow-500' : 'text-red-400'}`}>{t.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-8 text-center text-gray-500 text-xs italic">
              Archived validation summaries will show details here.
            </div>
          )}
        </div>

      </div>

      {/* Permanent Deletion of a single run Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteRunId !== null}
        title="Permanently Delete Audit Record Sweep?"
        message="Are you sure you want to permanently delete this incident audit sweep? This operation is completely irreversible and all associated compliance metrics and quality scorecards will be permanently destroyed."
        confirmText="Delete Permanently"
        cancelText="Keep Record"
        variant="danger"
        affectedRecords={trashRuns.find(r => r.runId === deleteRunId) ? {
          count: trashRuns.find(r => r.runId === deleteRunId)?.totalTickets || trashRuns.find(r => r.runId === deleteRunId)?.tickets?.length || 0,
          label: 'Incident Records in Sweep',
          sublabel: `Audit Batch: ${deleteRunId} (${trashRuns.find(r => r.runId === deleteRunId)?.monthKey || 'Historical Sweep'})`
        } : undefined}
        warningNote="Action is permanent: This historical sweep and all of its ticket evaluations will be completely removed from your browser database."
        onConfirm={() => {
          if (deleteRunId) {
            onPermanentDeleteRun?.(deleteRunId);
            setDeleteRunId(null);
          }
        }}
        onCancel={() => setDeleteRunId(null)}
      />

      {/* Permanently clear all trash runs Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showEmptyTrashModal}
        title="Empty History Trash Bin Permanently?"
        message="This action will permanently purge all incident audit records and historical sweeps currently stored in the trash bin. These audit histories cannot be retrieved or recovered once cleared from the database."
        confirmText="Empty Trash Permanently"
        cancelText="Keep in Trash"
        variant="danger"
        affectedRecords={{
          count: trashRuns.reduce((sum, r) => sum + (r.totalTickets || r.tickets?.length || 0), 0),
          label: 'Total Incident Records',
          sublabel: `${trashRuns.length} historical audit run${trashRuns.length === 1 ? '' : 's'} staged in Trash Bin`
        }}
        warningNote="Permanent purge: All staged historical sweeps and their detailed 13-metric scorecards will be wiped from local storage and cannot be restored."
        onConfirm={() => {
          onEmptyTrash?.();
          setShowEmptyTrashModal(false);
        }}
        onCancel={() => setShowEmptyTrashModal(false)}
      />

    </div>
  );
}
