import React, { useState, useMemo } from 'react';
import { TicketAuditReport, AuditHistoricalRun } from '../types';
import AuditTrendChart from './AuditTrendChart';
import AssignmentGroupBarChart from './AssignmentGroupBarChart';
import { sampleHistoricalRuns } from '../data/sampleHistoricalAuditData';
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  Calendar, 
  Activity, 
  Award, 
  AlertCircle,
  Clock,
  Sparkles,
  Percent,
  ShieldCheck,
  CheckCircle2,
  Filter,
  Info
} from 'lucide-react';

interface TrendsPageProps {
  reports: TicketAuditReport[];
  historyRuns?: AuditHistoricalRun[];
}

type TimeframeMode = 'week' | 'run' | 'benchmark';

interface TrendBadgeProps {
  delta: number;
  label: string;
  invertPolarity?: boolean; // When true (e.g. defect rate), negative delta is good (green), positive is bad (red)
  unit?: string;
  isCount?: boolean;
}

function TrendBadge({ delta, label, invertPolarity = false, unit = '%', isCount = false }: TrendBadgeProps) {
  // If delta is virtually zero
  const isZero = Math.abs(delta) < 0.05;
  const isGood = invertPolarity ? delta < 0 : delta > 0;
  const isBad = invertPolarity ? delta > 0 : delta < 0;

  const colorClasses = isZero
    ? 'bg-slate-800/80 text-slate-400 border-slate-700/60'
    : isGood
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
    : 'bg-rose-500/10 text-rose-400 border-rose-500/25';

  const Icon = isZero ? Minus : isGood ? TrendingUp : TrendingDown;

  const formattedValue = isCount
    ? `${delta > 0 ? '+' : ''}${Math.round(delta)}`
    : `${delta > 0 ? '+' : ''}${Math.abs(delta) % 1 === 0 ? delta.toFixed(0) : delta.toFixed(1)}${unit}`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono tracking-tight border transition-all ${colorClasses}`}
      title={`${formattedValue} ${label}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{formattedValue} {label}</span>
    </span>
  );
}

export default function TrendsPage({ reports, historyRuns }: TrendsPageProps) {
  const [timeframe, setTimeframe] = useState<TimeframeMode>('week');

  // Compute effective ticket list (from current audit session, past historical runs, or demo benchmark)
  const { effectiveReports, isUsingSampleBenchmark } = useMemo(() => {
    if (reports && reports.length > 0) {
      return { effectiveReports: reports, isUsingSampleBenchmark: false };
    }
    if (historyRuns && historyRuns.length > 0) {
      return { effectiveReports: historyRuns.flatMap(r => r.tickets), isUsingSampleBenchmark: false };
    }
    return { effectiveReports: sampleHistoricalRuns.flatMap(r => r.tickets), isUsingSampleBenchmark: true };
  }, [reports, historyRuns]);

  // Aggregate overall peak stats across effective dataset
  const peakStats = useMemo(() => {
    if (effectiveReports.length === 0) {
      return { peakDay: 'N/A', peakScore: 0, totalAudits: 0, volPeakDay: 'N/A', volPeakCount: 0 };
    }

    const dayGroups: { [dateStr: string]: { scores: number[]; count: number } } = {};
    
    effectiveReports.forEach(r => {
      const dStr = r.ticket.createdDate ? r.ticket.createdDate.substring(0, 10) : '';
      if (!dStr) return;
      if (!dayGroups[dStr]) {
        dayGroups[dStr] = { scores: [], count: 0 };
      }
      dayGroups[dStr].scores.push(r.percentage);
      dayGroups[dStr].count += 1;
    });

    let peakDay = 'N/A';
    let peakScore = 0;
    let volPeakDay = 'N/A';
    let volPeakCount = 0;

    Object.entries(dayGroups).forEach(([day, data]) => {
      const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      if (avg > peakScore) {
        peakScore = Math.round(avg);
        peakDay = day;
      }
      if (data.count > volPeakCount) {
        volPeakCount = data.count;
        volPeakDay = day;
      }
    });

    const formatDate = (dStr: string) => {
      if (dStr === 'N/A') return 'N/A';
      try {
        return new Date(dStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch (e) {
        return dStr;
      }
    };

    return {
      peakDay: formatDate(peakDay),
      peakScore,
      totalAudits: effectiveReports.length,
      volPeakDay: formatDate(volPeakDay),
      volPeakCount
    };
  }, [effectiveReports]);

  // Compute performance changes over time (Current period vs Previous period)
  const performanceTrend = useMemo(() => {
    if (effectiveReports.length === 0) {
      return {
        current: { count: 0, avgScore: 0, passRate: 0, defectRate: 0, greenCount: 0, redCount: 0 },
        previous: { count: 0, avgScore: 0, passRate: 0, defectRate: 0, greenCount: 0, redCount: 0 },
        deltas: { score: 0, passRate: 0, volumePct: 0, volumeCount: 0, defectRate: 0 },
        label: 'from last week'
      };
    }

    const calcSubset = (tickets: TicketAuditReport[]) => {
      if (tickets.length === 0) {
        return { count: 0, avgScore: 0, passRate: 0, defectRate: 0, greenCount: 0, redCount: 0 };
      }
      const count = tickets.length;
      const sumScore = tickets.reduce((acc, r) => acc + r.percentage, 0);
      const avgScore = sumScore / count;
      const greenCount = tickets.filter(r => r.statusColor === 'Green' || r.percentage >= 90).length;
      const redCount = tickets.filter(r => r.statusColor === 'Red' || r.percentage < 70).length;
      const passRate = (greenCount / count) * 100;
      const defectRate = (redCount / count) * 100;
      return { count, avgScore, passRate, defectRate, greenCount, redCount };
    };

    // Partition logic based on timeframe mode
    let currentTickets: TicketAuditReport[] = [];
    let prevTickets: TicketAuditReport[] = [];
    let trendLabel = 'from last week';

    const runsList = (historyRuns && historyRuns.length > 0) ? historyRuns : sampleHistoricalRuns;

    if (timeframe === 'run' && runsList.length >= 2) {
      trendLabel = 'from last run';
      currentTickets = runsList[0].tickets;
      prevTickets = runsList[1].tickets;
    } else if (timeframe === 'benchmark') {
      trendLabel = 'vs 30d avg';
      // Current is latest week or run
      if (runsList.length > 0) {
        currentTickets = runsList[0].tickets;
      } else {
        currentTickets = effectiveReports.slice(0, Math.ceil(effectiveReports.length / 2));
      }
      prevTickets = effectiveReports;
    } else {
      // Default: 'week' (from last week)
      trendLabel = 'from last week';

      // Parse ticket dates to locate the latest 7 calendar days vs preceding 7 calendar days
      const withDates = effectiveReports.map(r => {
        const d = r.ticket.createdDate ? new Date(r.ticket.createdDate) : null;
        return { report: r, date: d && !isNaN(d.getTime()) ? d : null };
      });

      const validTimestamps = withDates.filter(t => t.date !== null).map(t => t.date!.getTime());

      if (validTimestamps.length > 0) {
        const maxTime = Math.max(...validTimestamps);
        const currentWeekStart = maxTime - (7 * 24 * 60 * 60 * 1000);
        const prevWeekStart = currentWeekStart - (7 * 24 * 60 * 60 * 1000);

        currentTickets = withDates
          .filter(t => t.date && t.date.getTime() >= currentWeekStart && t.date.getTime() <= maxTime)
          .map(t => t.report);

        prevTickets = withDates
          .filter(t => t.date && t.date.getTime() >= prevWeekStart && t.date.getTime() < currentWeekStart)
          .map(t => t.report);
      }

      // If date window was too narrow or previous week had no data in this slice, fallback to multi-run comparison
      if (prevTickets.length === 0 || currentTickets.length === 0) {
        if (runsList.length >= 2) {
          currentTickets = runsList[0].tickets;
          prevTickets = runsList[1].tickets;
        } else if (effectiveReports.length >= 4) {
          const half = Math.floor(effectiveReports.length / 2);
          currentTickets = effectiveReports.slice(0, half);
          prevTickets = effectiveReports.slice(half);
        } else {
          currentTickets = effectiveReports;
          prevTickets = sampleHistoricalRuns[1].tickets;
        }
      }
    }

    const currentStats = calcSubset(currentTickets);
    const prevStats = calcSubset(prevTickets);

    const scoreDelta = currentStats.avgScore - prevStats.avgScore;
    const passRateDelta = currentStats.passRate - prevStats.passRate;
    const volumeDeltaPct = prevStats.count > 0 ? ((currentStats.count - prevStats.count) / prevStats.count) * 100 : 0;
    const volumeDeltaCount = currentStats.count - prevStats.count;
    const defectDelta = currentStats.defectRate - prevStats.defectRate;

    return {
      current: currentStats,
      previous: prevStats,
      deltas: {
        score: scoreDelta,
        passRate: passRateDelta,
        volumePct: volumeDeltaPct,
        volumeCount: volumeDeltaCount,
        defectRate: defectDelta
      },
      label: trendLabel
    };
  }, [effectiveReports, historyRuns, timeframe]);

  return (
    <div className="space-y-6 animate-fadeIn" id="trends-page-view">
      
      {/* Trends Header Deck */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-6 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4.5 w-4.5 text-blue-400" />
            <h3 className="text-sm font-bold text-white tracking-wider uppercase">Compliance Performance Trend Intelligence</h3>
          </div>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
            Continuously tracking audit score anomalies, peak operational quality distributions, and week-over-week performance changes across 13 compliance gates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Comparative Timeframe Filter Selector */}
          <div className="flex items-center bg-[#0A0C0F] border border-[#2A2D35] p-1 rounded-lg">
            <span className="text-[10px] text-gray-500 uppercase font-mono px-2 flex items-center gap-1">
              <Filter className="h-3 w-3 text-blue-400" /> Compare:
            </span>
            <button
              type="button"
              onClick={() => setTimeframe('week')}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-all ${
                timeframe === 'week'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              vs Last Week
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('run')}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-all ${
                timeframe === 'run'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              vs Prior Run
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('benchmark')}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-all ${
                timeframe === 'benchmark'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              vs 30d Baseline
            </button>
          </div>

          <div className="flex items-center space-x-2.5 bg-[#0A0C0F] border border-[#2A2D35] px-3.5 py-2 rounded-lg shrink-0">
            <Clock className="h-4 w-4 text-emerald-400" />
            <div className="text-left">
              <p className="text-[9px] text-gray-500 uppercase font-mono tracking-wider">Telemetry Window</p>
              <p className="text-xs font-bold text-white font-mono">Last 30 Calendar Days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Benchmark Notification Banner if no direct reports uploaded */}
      {isUsingSampleBenchmark && (
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-blue-300 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 text-blue-400 shrink-0" />
            <span>
              <strong>Telemetry Benchmark Mode:</strong> Displaying trend analytics for <strong>{effectiveReports.length} historical incidents</strong> across 4 weekly audit cycles. Ingest live spreadsheets in your workspace or Ingestion Hub to measure real-time session deltas.
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono bg-blue-900/50 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded shrink-0">
            Benchmark Active
          </span>
        </div>
      )}

      {effectiveReports.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border border-[#2A2D35] border-dashed rounded-xl bg-[#15171C]/50 p-6 text-center">
          <Calendar className="h-10 w-10 text-gray-600 mb-2.5" />
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">No Compliance Records Loaded</h4>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            Ingest spreadsheets or generate sample ServiceNow tickets under your workspace tab to activate active timeline telemetry mapping.
          </p>
        </div>
      ) : (
        <>
          {/* Enhanced Metric Cards with Green/Red Trend Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="trends-metric-cards">
            
            {/* Card 1: Mean Quality Score */}
            <div className="bg-[#15171C] border border-[#2A2D35] p-4 rounded-xl shadow-md hover:border-[#3E4350] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">MEAN COMPLIANCE SCORE</span>
                  <Award className="h-4 w-4 text-emerald-400" />
                </div>
                
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-black text-white font-mono tracking-tight">
                    {Math.round(performanceTrend.current.avgScore || peakStats.peakScore)}%
                  </p>
                  <TrendBadge 
                    delta={performanceTrend.deltas.score} 
                    label={performanceTrend.label} 
                  />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#2A2D35]/70 flex items-center justify-between text-[10.5px] text-gray-450 text-gray-400">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>Target SLA: 80%</span>
                </span>
                <span className="font-mono text-[10px] text-gray-500">
                  Peak: {peakStats.peakScore}% ({peakStats.peakDay})
                </span>
              </div>
            </div>

            {/* Card 2: First-Time Pass Rate */}
            <div className="bg-[#15171C] border border-[#2A2D35] p-4 rounded-xl shadow-md hover:border-[#3E4350] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">FIRST-TIME SLA PASS RATE</span>
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                </div>
                
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-black text-white font-mono tracking-tight">
                    {Math.round(performanceTrend.current.passRate)}%
                  </p>
                  <TrendBadge 
                    delta={performanceTrend.deltas.passRate} 
                    label={performanceTrend.label} 
                  />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#2A2D35]/70 flex items-center justify-between text-[10.5px] text-gray-400">
                <span className="text-gray-400">
                  {performanceTrend.current.greenCount} of {performanceTrend.current.count} Green Tier
                </span>
                <span className="font-mono text-[10px] text-blue-400/80">
                  Score ≥ 90%
                </span>
              </div>
            </div>

            {/* Card 3: Audit Volume & Velocity */}
            <div className="bg-[#15171C] border border-[#2A2D35] p-4 rounded-xl shadow-md hover:border-[#3E4350] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">AUDIT THROUGHPUT VOLUME</span>
                  <Activity className="h-4 w-4 text-purple-400" />
                </div>
                
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-black text-white font-mono tracking-tight">
                    {peakStats.totalAudits} <span className="text-xs font-normal text-gray-400">Incidents</span>
                  </p>
                  <TrendBadge 
                    delta={performanceTrend.deltas.volumePct} 
                    label={performanceTrend.label} 
                  />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#2A2D35]/70 flex items-center justify-between text-[10.5px] text-gray-400">
                <span className="text-gray-400">
                  Current slice: {performanceTrend.current.count} tickets
                </span>
                <span className="font-mono text-[10px] text-purple-400/80">
                  Peak: {peakStats.volPeakCount} on {peakStats.volPeakDay}
                </span>
              </div>
            </div>

            {/* Card 4: Quality Anomaly & Defect Rate (Inverted Polarity: Lower is better) */}
            <div className="bg-[#15171C] border border-[#2A2D35] p-4 rounded-xl shadow-md hover:border-[#3E4350] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">QUALITY ANOMALY DEFECTS</span>
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                </div>
                
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-black text-white font-mono tracking-tight">
                    {performanceTrend.current.defectRate.toFixed(1)}%
                  </p>
                  <TrendBadge 
                    delta={performanceTrend.deltas.defectRate} 
                    label={performanceTrend.label} 
                    invertPolarity={true}
                  />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#2A2D35]/70 flex items-center justify-between text-[10.5px] text-gray-400">
                <span className={`${performanceTrend.current.redCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {performanceTrend.current.redCount} critical outlier{performanceTrend.current.redCount === 1 ? '' : 's'}
                </span>
                <span className="font-mono text-[10px] text-gray-500">
                  Score &lt; 70% threshold
                </span>
              </div>
            </div>
            
          </div>

          {/* Telemetry Highlight Summary Bar */}
          <div className="bg-[#15171C]/70 border border-[#2A2D35] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-gray-400">
              <span className="flex items-center gap-1.5 font-medium text-gray-300">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>Executive Trajectory Diagnostic:</span>
              </span>
              <span>
                Peak Quality: <strong className="text-emerald-400 font-mono">{peakStats.peakDay} ({peakStats.peakScore}%)</strong>
              </span>
              <span className="hidden sm:inline text-gray-600">•</span>
              <span className="hidden sm:inline">
                Peak Load: <strong className="text-purple-400 font-mono">{peakStats.volPeakDay} ({peakStats.volPeakCount} incidents)</strong>
              </span>
            </div>

            <div className="text-[11px] font-mono text-gray-500">
              Active Comparison Horizon: <span className="text-gray-300 font-semibold">{performanceTrend.label}</span>
            </div>
          </div>

          {/* Interactive Trend Chart Layout */}
          <div className="space-y-2">
            <div className="text-xs uppercase font-bold text-gray-500 tracking-wider">Trajectory Timeline Visualization</div>
            <AuditTrendChart reports={effectiveReports} />
          </div>

          {/* Queue & Organizational Performance */}
          <div className="space-y-2">
            <div className="text-xs uppercase font-bold text-gray-500 tracking-wider">Queue & Organizational Performance</div>
            <AssignmentGroupBarChart reports={effectiveReports} />
          </div>
        </>
      )}
    </div>
  );
}
