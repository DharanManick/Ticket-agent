import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TicketAuditReport, AuditHistoricalRun } from '../types';
import { sampleHistoricalRuns } from '../data/sampleHistoricalAuditData';
import { 
  Users, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ChevronRight, 
  X, 
  Download, 
  Calendar, 
  Grid3X3, 
  BarChart2, 
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Info
} from 'lucide-react';

interface AssigneePerformanceHeatmapProps {
  reports: TicketAuditReport[];
  historyRuns: AuditHistoricalRun[];
  onSelectTicket?: (incNumber: string) => void;
  triggerPopup?: (msg: string, type: 'success' | 'info' | 'warning') => void;
  onSeedSampleHistory?: (runs: AuditHistoricalRun[]) => void;
}

interface AssigneeAggregate {
  name: string;
  group: string;
  manager: string;
  totalTickets: number;
  avgScore: number;
  tier: 'Green' | 'Amber' | 'Red';
  runsMap: Record<string, {
    runId: string;
    runLabel: string;
    avgScore: number;
    tier: 'Green' | 'Amber' | 'Red';
    ticketsCount: number;
    tickets: TicketAuditReport[];
  }>;
  categoryScores: Record<string, {
    key: string;
    name: string;
    passRate: number;
    passes: number;
    total: number;
    tier: 'Green' | 'Amber' | 'Red';
  }>;
  allTickets: TicketAuditReport[];
  bypassedStatesCount: number;
  trend: 'improving' | 'declining' | 'stable';
  weakestCategory?: string;
}

const AUDIT_CATEGORIES = [
  { key: 'affectedCi', name: 'Affected CI', shortName: 'Aff CI' },
  { key: 'suspectedCi', name: 'Suspected CI', shortName: 'Susp CI' },
  { key: 'symptomCode', name: 'Symptom Code', shortName: 'Symptom' },
  { key: 'shortDescription', name: 'Short Desc', shortName: 'Short Desc' },
  { key: 'technicalDescription', name: 'Tech Depth', shortName: 'Tech Depth' },
  { key: 'serviceImpactDescription', name: 'Service Impact', shortName: 'Svc Impact' },
  { key: 'businessImpactDescription', name: 'Business Impact', shortName: 'Biz Impact' },
  { key: 'activityLogs', name: 'SLA State Flow', shortName: 'SLA Flow' },
  { key: 'closureCode1', name: 'Closure Code 1', shortName: 'Close C1' },
  { key: 'closureCode2', name: 'Closure Code 2', shortName: 'Close C2' },
  { key: 'solutionCode', name: 'Solution Code', shortName: 'Solution' },
  { key: 'knowledgeArticle', name: 'KA Citation', shortName: 'KA Link' },
  { key: 'resolutionDescription', name: 'Resolution Steps', shortName: 'Res Steps' }
];

export default function AssigneePerformanceHeatmap({
  reports,
  historyRuns,
  onSelectTicket,
  triggerPopup,
  onSeedSampleHistory
}: AssigneePerformanceHeatmapProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'categories' | 'cards'>('timeline');
  const [tierFilter, setTierFilter] = useState<'all' | 'Green' | 'Amber' | 'Red'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'lowest_score' | 'highest_score' | 'most_tickets' | 'name'>('lowest_score');
  
  // Selected assignee or cell for detail inspection modal
  const [inspectModal, setInspectModal] = useState<{
    assigneeName: string;
    assigneeData: AssigneeAggregate;
    filterRunId?: string;
    filterCategory?: string;
  } | null>(null);

  // Determine effective historical dataset
  const { effectiveRuns, isUsingSampleBenchmark } = useMemo(() => {
    // If user has saved historical runs, use them and merge current active session if not already in history
    if (historyRuns && historyRuns.length > 0) {
      const merged = [...historyRuns];
      if (reports && reports.length > 0) {
        const alreadyInHistory = merged.some(r => 
          r.tickets.length === reports.length && 
          r.tickets[0]?.ticket.incNumber === reports[0]?.ticket.incNumber
        );
        if (!alreadyInHistory) {
          merged.unshift({
            runId: 'current_active_session',
            timestamp: new Date().toISOString(),
            monthKey: 'Current Session (Live)',
            auditorName: 'Active Auditor',
            totalTickets: reports.length,
            averageScorePercentage: Math.round(reports.reduce((acc, r) => acc + r.percentage, 0) / reports.length),
            tickets: reports
          });
        }
      }
      return { effectiveRuns: merged, isUsingSampleBenchmark: false };
    }
    // If user only has active reports from uploaded spreadsheet, wrap in a single current run
    if (reports && reports.length > 0) {
      const currentRun: AuditHistoricalRun = {
        runId: 'current_active_session',
        timestamp: new Date().toISOString(),
        monthKey: 'Current Audit Session',
        auditorName: 'Active Auditor',
        totalTickets: reports.length,
        averageScorePercentage: Math.round(reports.reduce((acc, r) => acc + r.percentage, 0) / reports.length),
        tickets: reports
      };
      return { effectiveRuns: [currentRun], isUsingSampleBenchmark: false };
    }
    // Otherwise provide benchmark sample historical runs for instant out-of-the-box exploration
    return { effectiveRuns: sampleHistoricalRuns, isUsingSampleBenchmark: true };
  }, [historyRuns, reports]);

  // Aggregate assignee data across historical runs
  const { assignees, runsList } = useMemo(() => {
    // Chronologically sorted runs
    const sortedRuns = [...effectiveRuns].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const map: Record<string, {
      name: string;
      group: string;
      manager: string;
      allTickets: TicketAuditReport[];
      runsMap: Record<string, {
        runId: string;
        runLabel: string;
        scores: number[];
        tickets: TicketAuditReport[];
      }>;
      categoryScores: Record<string, { passes: number; total: number }>;
      bypassedStatesCount: number;
    }> = {};

    sortedRuns.forEach((run, runIdx) => {
      const runLabel = run.monthKey || `Batch #${runIdx + 1}`;
      run.tickets.forEach(rep => {
        const name = (rep.ticket.assignee || 'Unassigned Associate').trim();
        const group = rep.ticket.assignmentGroup || 'General Service Queue';
        const manager = rep.ticket.assigneeManager || 'Unassigned Manager';

        if (!map[name]) {
          map[name] = {
            name,
            group,
            manager,
            allTickets: [],
            runsMap: {},
            categoryScores: {},
            bypassedStatesCount: 0
          };
          AUDIT_CATEGORIES.forEach(cat => {
            map[name].categoryScores[cat.key] = { passes: 0, total: 0 };
          });
        }

        map[name].allTickets.push(rep);

        if (!map[name].runsMap[run.runId]) {
          map[name].runsMap[run.runId] = {
            runId: run.runId,
            runLabel,
            scores: [],
            tickets: []
          };
        }
        map[name].runsMap[run.runId].scores.push(rep.percentage);
        map[name].runsMap[run.runId].tickets.push(rep);

        // Track category scores
        AUDIT_CATEGORIES.forEach(cat => {
          const scoreObj = rep.scores[cat.key as keyof typeof rep.scores];
          map[name].categoryScores[cat.key].total += 1;
          if (scoreObj && (scoreObj.status === 'Pass' || scoreObj.score >= 2)) {
            map[name].categoryScores[cat.key].passes += 1;
          }
        });

        // Track bypassed SLA states
        const logs = (rep.ticket.activityLogs || '').toLowerCase();
        if (logs.includes('progress') && logs.includes('confirm') && !logs.includes('propose')) {
          map[name].bypassedStatesCount += 1;
        }
      });
    });

    const aggregates: AssigneeAggregate[] = Object.values(map).map(item => {
      const totalTickets = item.allTickets.length;
      const sum = item.allTickets.reduce((acc, t) => acc + t.percentage, 0);
      const avgScore = totalTickets > 0 ? Math.round(sum / totalTickets) : 0;

      let tier: 'Green' | 'Amber' | 'Red' = 'Green';
      if (avgScore < 70) tier = 'Red';
      else if (avgScore < 90) tier = 'Amber';

      // Process run breakdown
      const finalRunsMap: AssigneeAggregate['runsMap'] = {};
      const runScoresList: number[] = [];

      sortedRuns.forEach(r => {
        const runData = item.runsMap[r.runId];
        if (runData && runData.scores.length > 0) {
          const runAvg = Math.round(runData.scores.reduce((a, b) => a + b, 0) / runData.scores.length);
          let runTier: 'Green' | 'Amber' | 'Red' = 'Green';
          if (runAvg < 70) runTier = 'Red';
          else if (runAvg < 90) runTier = 'Amber';

          finalRunsMap[r.runId] = {
            runId: r.runId,
            runLabel: runData.runLabel,
            avgScore: runAvg,
            tier: runTier,
            ticketsCount: runData.scores.length,
            tickets: runData.tickets
          };
          runScoresList.push(runAvg);
        }
      });

      // Calculate trajectory trend (first half vs second half)
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (runScoresList.length >= 2) {
        const recent = runScoresList[runScoresList.length - 1];
        const prev = runScoresList[0];
        if (recent - prev >= 5) trend = 'improving';
        else if (prev - recent >= 5) trend = 'declining';
      }

      // Process category breakdown
      const finalCategoryScores: AssigneeAggregate['categoryScores'] = {};
      let lowestCatName = '';
      let lowestCatRate = 101;

      AUDIT_CATEGORIES.forEach(cat => {
        const cs = item.categoryScores[cat.key];
        const passRate = cs.total > 0 ? Math.round((cs.passes / cs.total) * 100) : 0;
        let catTier: 'Green' | 'Amber' | 'Red' = 'Green';
        if (passRate < 70) catTier = 'Red';
        else if (passRate < 90) catTier = 'Amber';

        finalCategoryScores[cat.key] = {
          key: cat.key,
          name: cat.name,
          passRate,
          passes: cs.passes,
          total: cs.total,
          tier: catTier
        };

        if (passRate < lowestCatRate && cs.total > 0) {
          lowestCatRate = passRate;
          lowestCatName = `${cat.name} (${passRate}%)`;
        }
      });

      return {
        name: item.name,
        group: item.group,
        manager: item.manager,
        totalTickets,
        avgScore,
        tier,
        runsMap: finalRunsMap,
        categoryScores: finalCategoryScores,
        allTickets: item.allTickets,
        bypassedStatesCount: item.bypassedStatesCount,
        trend,
        weakestCategory: lowestCatRate < 80 ? lowestCatName : undefined
      };
    });

    return {
      assignees: aggregates,
      runsList: sortedRuns.map((r, i) => ({
        runId: r.runId,
        label: r.monthKey || `Run #${i + 1}`,
        timestamp: r.timestamp,
        auditor: r.auditorName,
        avgScore: r.averageScorePercentage
      }))
    };
  }, [effectiveRuns]);

  // Overall KPI statistics
  const kpis = useMemo(() => {
    const total = assignees.length;
    if (total === 0) return { total: 0, green: 0, amber: 0, red: 0, meanScore: 0 };
    const green = assignees.filter(a => a.tier === 'Green').length;
    const amber = assignees.filter(a => a.tier === 'Amber').length;
    const red = assignees.filter(a => a.tier === 'Red').length;
    const mean = Math.round(assignees.reduce((acc, a) => acc + a.avgScore, 0) / total);
    return {
      total,
      green,
      amber,
      red,
      greenPct: Math.round((green / total) * 100),
      amberPct: Math.round((amber / total) * 100),
      redPct: Math.round((red / total) * 100),
      meanScore: mean
    };
  }, [assignees]);

  // Filtered and sorted assignees
  const displayedAssignees = useMemo(() => {
    let list = assignees.filter(a => {
      if (tierFilter !== 'all' && a.tier !== tierFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.group.toLowerCase().includes(q) ||
          a.manager.toLowerCase().includes(q)
        );
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'lowest_score') return a.avgScore - b.avgScore;
      if (sortBy === 'highest_score') return b.avgScore - a.avgScore;
      if (sortBy === 'most_tickets') return b.totalTickets - a.totalTickets;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [assignees, tierFilter, searchTerm, sortBy]);

  // Helper for heatmap cell color style
  const getHeatmapColorClass = (score: number | null | undefined) => {
    if (score === null || score === undefined) {
      return 'bg-muted/40 text-muted-foreground border-border/40';
    }
    if (score >= 90) {
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25';
    }
    if (score >= 70) {
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25';
    }
    return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25';
  };

  // Helper for badge pill style
  const getTierBadge = (tier: 'Green' | 'Amber' | 'Red') => {
    if (tier === 'Green') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          PASS 90%+
        </span>
      );
    }
    if (tier === 'Amber') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          ATTN 70-89%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        FAIL &lt;70%
      </span>
    );
  };

  // Export CSV summary of heatmap
  const handleExportCSV = () => {
    const headers = ['Assignee Name', 'Assignment Group', 'Assignee Manager', 'Total Incidents', 'Historical Mean Score', 'Compliance Tier'];
    runsList.forEach(r => headers.push(r.label));
    AUDIT_CATEGORIES.forEach(c => headers.push(c.name));

    const rows = assignees.map(a => {
      const row = [
        `"${a.name}"`,
        `"${a.group}"`,
        `"${a.manager}"`,
        a.totalTickets,
        `${a.avgScore}%`,
        a.tier
      ];
      runsList.forEach(r => {
        const runData = a.runsMap[r.runId];
        row.push(runData ? `${runData.avgScore}%` : 'N/A');
      });
      AUDIT_CATEGORIES.forEach(c => {
        const catData = a.categoryScores[c.key];
        row.push(catData ? `${catData.passRate}%` : 'N/A');
      });
      return row.join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Assignee_Audit_Heatmap_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (triggerPopup) {
      triggerPopup('Exported Assignee Performance Heatmap CSV report successfully.', 'success');
    }
  };

  // Seed sample benchmark history into main storage
  const handleSeedBenchmark = () => {
    if (onSeedSampleHistory) {
      onSeedSampleHistory(sampleHistoricalRuns);
      if (triggerPopup) {
        triggerPopup('Loaded 4 multi-week historical audit runs with 48 benchmark tickets!', 'success');
      }
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-xs space-y-5 transition-colors">
      
      {/* 1. Header & Live Telemetry Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Grid3X3 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Assignee Performance Heatmap
                {isUsingSampleBenchmark && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    Benchmark Historical Demo
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                Color-coded historical compliance grid across audit runs and quality dimensions (Green ≥90% • Amber 70-89% • Red &lt;70%).
              </p>
            </div>
          </div>
        </div>

        {/* Heatmap Legend & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span> ≥90%
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span> 70-89%
            </span>
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span> &lt;70%
            </span>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
            title="Download Heatmap CSV Export"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </button>

          {isUsingSampleBenchmark && onSeedSampleHistory && (
            <button
              type="button"
              onClick={handleSeedBenchmark}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Save Benchmark Demo Data into Historical Runs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Persist Demo History</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top-Level Telemetry Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl bg-background border border-border">
          <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mb-1">
            Tracked Assignees
          </div>
          <div className="text-xl font-mono font-bold text-foreground">
            {kpis.total}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background border border-border">
          <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mb-1">
            Historical Mean
          </div>
          <div className={`text-xl font-mono font-bold ${
            kpis.meanScore >= 90 ? 'text-emerald-500' : kpis.meanScore >= 70 ? 'text-amber-500' : 'text-rose-500'
          }`}>
            {kpis.meanScore}%
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background border border-border">
          <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 flex items-center justify-between">
            <span>Pass Tier</span>
            <span>{kpis.greenPct || 0}%</span>
          </div>
          <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {kpis.green} <span className="text-xs font-sans text-muted-foreground font-normal">staff</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background border border-border">
          <div className="text-[10px] uppercase font-mono tracking-wider text-amber-600 dark:text-amber-400 mb-1 flex items-center justify-between">
            <span>Attention</span>
            <span>{kpis.amberPct || 0}%</span>
          </div>
          <div className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {kpis.amber} <span className="text-xs font-sans text-muted-foreground font-normal">staff</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-background border border-border">
          <div className="text-[10px] uppercase font-mono tracking-wider text-rose-600 dark:text-rose-400 mb-1 flex items-center justify-between">
            <span>Critical Risk</span>
            <span>{kpis.redPct || 0}%</span>
          </div>
          <div className="text-xl font-mono font-bold text-rose-600 dark:text-rose-400">
            {kpis.red} <span className="text-xs font-sans text-muted-foreground font-normal">staff</span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Filtering and View Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1">
        {/* View Mode Tabs */}
        <div className="inline-flex p-1 rounded-lg bg-muted/60 border border-border">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Timeline Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('categories')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'categories'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Category Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Performance Cards</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tier Pills */}
          <div className="inline-flex p-0.5 rounded-lg bg-muted/60 border border-border">
            <button
              type="button"
              onClick={() => setTierFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                tierFilter === 'all'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({kpis.total})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('Green')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                tierFilter === 'Green'
                  ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Green ({kpis.green})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('Amber')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                tierFilter === 'Amber'
                  ? 'bg-card text-amber-600 dark:text-amber-400 shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Amber ({kpis.amber})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('Red')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                tierFilter === 'Red'
                  ? 'bg-card text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Red ({kpis.red})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[170px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assignee..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-ring transition-colors"
            />
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-hidden focus:border-ring cursor-pointer"
          >
            <option value="lowest_score">Lowest Score (Attention)</option>
            <option value="highest_score">Highest Score</option>
            <option value="most_tickets">Most Audited Incidents</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 4. Main Heatmap Presentation Views */}
      {displayedAssignees.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-border rounded-xl bg-background space-y-2">
          <Users className="w-8 h-8 mx-auto text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">No assignees match the current filters.</p>
          <p className="text-xs text-muted-foreground">Try clearing your search keyword or switching performance tier filters.</p>
        </div>
      ) : (
        <>
          {/* VIEW 1: Timeline Matrix (Assignees x Audit Runs) */}
          {viewMode === 'timeline' && (
            <div className="overflow-x-auto border border-border rounded-xl bg-background">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase text-muted-foreground tracking-wider">
                    <th className="py-3 px-4 font-bold sticky left-0 bg-muted/90 backdrop-blur-xs z-10 min-w-[200px]">
                      Assignee &amp; Department
                    </th>
                    <th className="py-3 px-3 text-center min-w-[80px]">
                      Pool
                    </th>
                    {runsList.map(run => (
                      <th key={run.runId} className="py-3 px-3 text-center min-w-[110px]" title={run.timestamp}>
                        <div className="truncate font-bold text-foreground">{run.label}</div>
                        <div className="text-[9px] text-muted-foreground font-normal">
                          {new Date(run.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-4 text-center min-w-[120px] font-bold">
                      Historical Mean
                    </th>
                    <th className="py-3 px-3 text-center min-w-[90px]">
                      Trajectory
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedAssignees.map(assignee => (
                    <tr 
                      key={assignee.name}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => setInspectModal({ assigneeName: assignee.name, assigneeData: assignee })}
                    >
                      {/* Sticky Assignee Info */}
                      <td className="py-3 px-4 sticky left-0 bg-background group-hover:bg-muted/30 z-10 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            assignee.tier === 'Green' 
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                              : assignee.tier === 'Amber'
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                          }`}>
                            {assignee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate group-hover:text-blue-500 transition-colors">
                              {assignee.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {assignee.group}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Total Audited Incidents */}
                      <td className="py-3 px-3 text-center font-mono text-muted-foreground">
                        {assignee.totalTickets} <span className="text-[9px]">INCS</span>
                      </td>

                      {/* Heatmap Cells for Each Audit Run */}
                      {runsList.map(run => {
                        const runData = assignee.runsMap[run.runId];
                        return (
                          <td key={run.runId} className="py-2.5 px-2 text-center">
                            {runData ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectModal({
                                    assigneeName: assignee.name,
                                    assigneeData: assignee,
                                    filterRunId: run.runId
                                  });
                                }}
                                className={`w-full py-1.5 px-2 rounded-lg font-mono font-bold text-xs border transition-all cursor-pointer ${getHeatmapColorClass(
                                  runData.avgScore
                                )}`}
                                title={`${assignee.name} in ${run.label}: ${runData.avgScore}% (${runData.ticketsCount} tickets)`}
                              >
                                {runData.avgScore}%
                              </button>
                            ) : (
                              <div className="w-full py-1.5 px-2 rounded-lg font-mono text-xs text-muted-foreground/40 border border-dashed border-border/40 text-center">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Overall Average Score Pill */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-md font-mono font-bold text-xs border ${getHeatmapColorClass(assignee.avgScore)}`}>
                            {assignee.avgScore}%
                          </span>
                          {getTierBadge(assignee.tier)}
                        </div>
                      </td>

                      {/* Trajectory */}
                      <td className="py-3 px-3 text-center">
                        {assignee.trend === 'improving' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-500 font-bold" title="Trending Upwards">
                            <TrendingUp className="w-3.5 h-3.5" /> +5%
                          </span>
                        )}
                        {assignee.trend === 'declining' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-500 font-bold" title="Trending Downwards">
                            <TrendingDown className="w-3.5 h-3.5" /> -5%
                          </span>
                        )}
                        {assignee.trend === 'stable' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground" title="Stable Trajectory">
                            <Minus className="w-3.5 h-3.5" /> ±0%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: Category Matrix (Assignees x Quality Dimensions) */}
          {viewMode === 'categories' && (
            <div className="overflow-x-auto border border-border rounded-xl bg-background">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase text-muted-foreground tracking-wider">
                    <th className="py-3 px-4 font-bold sticky left-0 bg-muted/90 backdrop-blur-xs z-10 min-w-[190px]">
                      Assignee
                    </th>
                    <th className="py-3 px-2 text-center min-w-[70px]">
                      Overall
                    </th>
                    {AUDIT_CATEGORIES.map(cat => (
                      <th key={cat.key} className="py-3 px-1.5 text-center min-w-[75px]" title={cat.name}>
                        <div className="truncate font-bold text-foreground">{cat.shortName}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedAssignees.map(assignee => (
                    <tr 
                      key={assignee.name}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => setInspectModal({ assigneeName: assignee.name, assigneeData: assignee })}
                    >
                      {/* Sticky Assignee Info */}
                      <td className="py-3 px-4 sticky left-0 bg-background group-hover:bg-muted/30 z-10 transition-colors">
                        <div className="font-semibold text-foreground truncate group-hover:text-blue-500 transition-colors">
                          {assignee.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {assignee.group}
                        </div>
                      </td>

                      {/* Overall Score */}
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-1 rounded-md font-mono font-bold text-xs border ${getHeatmapColorClass(assignee.avgScore)}`}>
                          {assignee.avgScore}%
                        </span>
                      </td>

                      {/* Heatmap Cells for Each Quality Category */}
                      {AUDIT_CATEGORIES.map(cat => {
                        const catScore = assignee.categoryScores[cat.key];
                        return (
                          <td key={cat.key} className="py-2 px-1 text-center">
                            {catScore ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectModal({
                                    assigneeName: assignee.name,
                                    assigneeData: assignee,
                                    filterCategory: cat.key
                                  });
                                }}
                                className={`w-full py-1.5 px-1 rounded-md font-mono font-bold text-[11px] border transition-all cursor-pointer ${getHeatmapColorClass(
                                  catScore.passRate
                                )}`}
                                title={`${assignee.name} - ${cat.name}: ${catScore.passRate}% (${catScore.passes}/${catScore.total} passed)`}
                              >
                                {catScore.passRate}%
                              </button>
                            ) : (
                              <div className="w-full py-1.5 px-1 rounded-md font-mono text-[11px] text-muted-foreground/30 text-center">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 3: Bento Performance Cards Grid */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedAssignees.map(assignee => (
                <div
                  key={assignee.name}
                  onClick={() => setInspectModal({ assigneeName: assignee.name, assigneeData: assignee })}
                  className="bg-background border border-border rounded-xl p-4.5 hover:border-ring transition-all hover:shadow-sm cursor-pointer flex flex-col justify-between space-y-3.5 group"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        assignee.tier === 'Green' 
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                          : assignee.tier === 'Amber'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}>
                        {assignee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-foreground truncate group-hover:text-blue-500 transition-colors">
                          {assignee.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground truncate">{assignee.group}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-xl font-mono font-bold leading-none ${
                        assignee.tier === 'Green'
                          ? 'text-emerald-500'
                          : assignee.tier === 'Amber'
                          ? 'text-amber-500'
                          : 'text-rose-500'
                      }`}>
                        {assignee.avgScore}%
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground block mt-0.5 uppercase">
                        Historical Mean
                      </span>
                    </div>
                  </div>

                  {/* Spark Heatmap Ribbon: Individual Ticket Scores Over Time */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>Recent Audited Incidents</span>
                      <span>{assignee.allTickets.length} total</span>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                      {assignee.allTickets.slice(-12).map((t, tIdx) => (
                        <div
                          key={`${t.ticket.id || t.ticket.incNumber || 'ht'}-${tIdx}`}
                          className={`flex-1 h-5 min-w-[14px] rounded-xs border flex items-center justify-center text-[9px] font-mono font-bold transition-transform hover:scale-115 ${getHeatmapColorClass(
                            t.percentage
                          )}`}
                          title={`${t.ticket.incNumber}: ${t.percentage}% (${t.statusColor})`}
                        >
                          <span className="sr-only">{t.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Quick Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                      <span className="text-[9.5px] text-muted-foreground uppercase font-mono block">State Bypasses</span>
                      <span className={`font-mono font-bold ${assignee.bypassedStatesCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {assignee.bypassedStatesCount} incidents
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                      <span className="text-[9.5px] text-muted-foreground uppercase font-mono block">Pass Tier</span>
                      {getTierBadge(assignee.tier)}
                    </div>
                  </div>

                  {/* Weakest link alert or coaching notice */}
                  {assignee.weakestCategory && (
                    <div className="text-[11px] text-muted-foreground bg-muted/30 border border-border/40 p-2 rounded-lg flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">Coaching Focus: <strong>{assignee.weakestCategory}</strong></span>
                    </div>
                  )}

                  {/* Action Link */}
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-500 pt-1">
                    <span>Inspect Full Audit History</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 5. Assignee Drill-Down Inspection Modal */}
      <AnimatePresence>
        {inspectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs"
            onClick={() => setInspectModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-foreground"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    inspectModal.assigneeData.tier === 'Green'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : inspectModal.assigneeData.tier === 'Amber'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  }`}>
                    {inspectModal.assigneeData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      {inspectModal.assigneeData.name}
                      {getTierBadge(inspectModal.assigneeData.tier)}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Queue: <strong className="text-foreground">{inspectModal.assigneeData.group}</strong> • Manager: <strong className="text-foreground">{inspectModal.assigneeData.manager}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectModal(null)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-5 overflow-y-auto">
                {/* Scorecards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-background border border-border">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground block">Historical Score</span>
                    <span className={`text-xl font-mono font-bold ${
                      inspectModal.assigneeData.avgScore >= 90 ? 'text-emerald-500' : inspectModal.assigneeData.avgScore >= 70 ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {inspectModal.assigneeData.avgScore}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-border">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground block">Audited Tickets</span>
                    <span className="text-xl font-mono font-bold text-foreground">
                      {inspectModal.assigneeData.totalTickets} <span className="text-xs font-normal text-muted-foreground">recs</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-border">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground block">Bypassed SLA Steps</span>
                    <span className={`text-xl font-mono font-bold ${
                      inspectModal.assigneeData.bypassedStatesCount > 0 ? 'text-rose-500' : 'text-emerald-500'
                    }`}>
                      {inspectModal.assigneeData.bypassedStatesCount}
                    </span>
                  </div>
                </div>

                {/* Quality Criteria Heatmap Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-muted-foreground">
                    Audit Quality Dimension Breakdown
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {AUDIT_CATEGORIES.map(c => {
                      const cs = inspectModal.assigneeData.categoryScores[c.key];
                      return (
                        <div key={c.key} className="p-2 rounded-lg bg-background border border-border flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate">{c.shortName}</span>
                          <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${getHeatmapColorClass(cs?.passRate)}`}>
                            {cs ? `${cs.passRate}%` : 'N/A'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audited Tickets History Table */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-muted-foreground">
                        {inspectModal.filterRunId && inspectModal.assigneeData.runsMap[inspectModal.filterRunId]
                          ? `Audited Incidents for ${inspectModal.assigneeData.runsMap[inspectModal.filterRunId].runLabel}`
                          : `Historical Audited Incident Records (${inspectModal.assigneeData.allTickets.length})`
                        }
                      </h4>
                      {inspectModal.filterRunId && (
                        <button
                          type="button"
                          onClick={() => setInspectModal(prev => prev ? { ...prev, filterRunId: undefined } : null)}
                          className="text-[10px] text-blue-500 hover:underline font-mono"
                        >
                          (Show All {inspectModal.assigneeData.allTickets.length})
                        </button>
                      )}
                    </div>
                    {onSelectTicket && (
                      <span className="text-[10px] text-muted-foreground">Click incident number to inspect in audit workspace</span>
                    )}
                  </div>

                  <div className="border border-border rounded-xl bg-background overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 border-b border-border font-mono text-[10px] uppercase text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-3">Ticket ID</th>
                          <th className="py-2.5 px-2 text-center">Audit Score</th>
                          <th className="py-2.5 px-3">Summary / Diagnosis</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(inspectModal.filterRunId && inspectModal.assigneeData.runsMap[inspectModal.filterRunId]?.tickets
                          ? inspectModal.assigneeData.runsMap[inspectModal.filterRunId].tickets
                          : inspectModal.assigneeData.allTickets
                        ).map((t, tIdx) => (
                          <tr key={`${t.ticket.id || t.ticket.incNumber || 'modal-t'}-${tIdx}`} className="hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                              {t.ticket.incNumber}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${getHeatmapColorClass(t.percentage)}`}>
                                {t.percentage}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[280px]">
                              {t.ticket.shortDescription || 'Remediation completed.'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {onSelectTicket && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectTicket(t.ticket.incNumber);
                                    setInspectModal(null);
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
                                >
                                  <span>Inspect</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectModal(null)}
                  className="px-4 py-2 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
