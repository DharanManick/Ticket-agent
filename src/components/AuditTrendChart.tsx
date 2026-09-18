import React, { useState, useMemo } from 'react';
import { TicketAuditReport } from '../types';
import { TrendingUp, Calendar, AlertCircle, Info, Sparkles } from 'lucide-react';

interface AuditTrendChartProps {
  reports: TicketAuditReport[];
}

export default function AuditTrendChart({ reports }: AuditTrendChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'peaks'>('all'); // Show all 30 days vs only days with audits

  const hoveredDayReports = useMemo(() => {
    if (!hoveredPoint) return [];
    return reports.filter(r => {
      if (!r.ticket.createdDate) return false;
      return r.ticket.createdDate.startsWith(hoveredPoint.dateStr);
    });
  }, [hoveredPoint, reports]);

  const flagCounts = useMemo(() => {
    if (hoveredDayReports.length === 0) return [];
    
    const counts = {
      affectedCi: 0,
      suspectedCi: 0,
      symptomCode: 0,
      shortDescription: 0,
      technicalDescription: 0,
      serviceImpactDescription: 0,
      businessImpactDescription: 0,
      activityLogs: 0,
      closureCode1: 0,
      closureCode2: 0,
      solutionCode: 0,
      knowledgeArticle: 0,
      resolutionDescription: 0,
    };

    hoveredDayReports.forEach((r) => {
      if (r.scores) {
        if (r.scores.affectedCi?.rating && r.scores.affectedCi.rating !== 'Pass') counts.affectedCi++;
        if (r.scores.suspectedCi?.rating && r.scores.suspectedCi.rating !== 'Pass') counts.suspectedCi++;
        if (r.scores.symptomCode?.rating && r.scores.symptomCode.rating !== 'Pass') counts.symptomCode++;
        if (r.scores.shortDescription?.rating && r.scores.shortDescription.rating !== 'Pass') counts.shortDescription++;
        if (r.scores.technicalDescription?.rating && r.scores.technicalDescription.rating !== 'Pass') counts.technicalDescription++;
        if (r.scores.serviceImpactDescription?.rating && r.scores.serviceImpactDescription.rating !== 'Pass') counts.serviceImpactDescription++;
        if (r.scores.businessImpactDescription?.rating && r.scores.businessImpactDescription.rating !== 'Pass') counts.businessImpactDescription++;
        if (r.scores.activityLogs?.rating && r.scores.activityLogs.rating !== 'Pass') counts.activityLogs++;
        if (r.scores.closureCode1?.rating && r.scores.closureCode1.rating !== 'Pass') counts.closureCode1++;
        if (r.scores.closureCode2?.rating && r.scores.closureCode2.rating !== 'Pass') counts.closureCode2++;
        if (r.scores.solutionCode?.rating && r.scores.solutionCode.rating !== 'Pass') counts.solutionCode++;
        if (r.scores.knowledgeArticle?.rating && r.scores.knowledgeArticle.rating !== 'Pass') counts.knowledgeArticle++;
        if (r.scores.resolutionDescription?.rating && r.scores.resolutionDescription.rating !== 'Pass') counts.resolutionDescription++;
      }
    });

    const list = [
      { key: 'affectedCi', label: 'Affected CI alignment mismatched', count: counts.affectedCi },
      { key: 'suspectedCi', label: 'Suspected CI exceptions flagged', count: counts.suspectedCi },
      { key: 'symptomCode', label: 'Symptom correlation deviations', count: counts.symptomCode },
      { key: 'shortDescription', label: 'Lacking concise Short Description', count: counts.shortDescription },
      { key: 'technicalDescription', label: 'Insufficient troubleshooting logs', count: counts.technicalDescription },
      { key: 'serviceImpactDescription', label: 'Missing Priority/Urgency urgency codes', count: counts.serviceImpactDescription },
      { key: 'businessImpactDescription', label: 'Lacking Business Impact details', count: counts.businessImpactDescription },
      { key: 'activityLogs', label: 'Bypassed transitions/missing updates', count: counts.activityLogs },
      { key: 'closureCode1', label: 'Mismatch in Closure Code 1', count: counts.closureCode1 },
      { key: 'closureCode2', label: 'Mismatch in Closure Sub-code 2', count: counts.closureCode2 },
      { key: 'solutionCode', label: 'Deviations on Solution Codes', count: counts.solutionCode },
      { key: 'knowledgeArticle', label: 'missing Knowledge Articles', count: counts.knowledgeArticle },
      { key: 'resolutionDescription', label: 'Failed 8-points resolution checks', count: counts.resolutionDescription },
    ];

    return list.filter(item => item.count > 0);
  }, [hoveredDayReports]);

  const getFlagMessage = (item: { key: string; label: string; count: number }) => {
    const pluralS = item.count > 1 ? 's' : '';
    if (item.key === 'knowledgeArticle') {
      return `${item.count} ticket${pluralS} missing Knowledge Articles`;
    }
    if (item.key === 'technicalDescription') {
      return `${item.count} ticket${pluralS} with insufficient troubleshooting logs`;
    }
    if (item.key === 'affectedCi') {
      return `${item.count} ticket${pluralS} with mismatched Affected CI`;
    }
    if (item.key === 'suspectedCi') {
      return `${item.count} ticket${pluralS} with mismatched Suspected CI`;
    }
    if (item.key === 'symptomCode') {
      return `${item.count} ticket${pluralS} with symptom correlation deviations`;
    }
    if (item.key === 'shortDescription') {
      return `${item.count} ticket${pluralS} lacking concise Short Description`;
    }
    if (item.key === 'serviceImpactDescription') {
      return `${item.count} ticket${pluralS} lacking Service Impact context`;
    }
    if (item.key === 'businessImpactDescription') {
      return `${item.count} ticket${pluralS} lacking Business Impact justifications`;
    }
    if (item.key === 'activityLogs') {
      return `${item.count} ticket${pluralS} bypassing state transition checks`;
    }
    if (item.key === 'closureCode1') {
      return `${item.count} ticket${pluralS} with Closure Code 1 mismatches`;
    }
    if (item.key === 'closureCode2') {
      return `${item.count} ticket${pluralS} with Closure Code 2 mismatches`;
    }
    if (item.key === 'solutionCode') {
      return `${item.count} ticket${pluralS} with Solution Code deviations`;
    }
    if (item.key === 'resolutionDescription') {
      return `${item.count} ticket${pluralS} failing 8-point checklist`;
    }
    return `${item.count} ticket${pluralS} flagged for ${item.label.toLowerCase()}`;
  };

  // Find reference date (maximum date in reports dataset, or fallback to today)
  let referenceDate = new Date();
  if (reports.length > 0) {
    const dates = reports.map(r => {
      const d = new Date(r.ticket.createdDate || '');
      return isNaN(d.getTime()) ? null : d;
    }).filter(Boolean) as Date[];

    if (dates.length > 0) {
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      referenceDate = maxDate;
    }
  }

  // Calculate 30 calendar days leading up to reference date
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }).reverse();

  // Combine reports inside these days
  const full30DayTrend = last30Days.map((dateStr) => {
    const dayReports = reports.filter(r => {
      if (!r.ticket.createdDate) return false;
      return r.ticket.createdDate.startsWith(dateStr);
    });

    const avgScore = dayReports.length > 0
      ? Math.round(dayReports.reduce((acc, r) => acc + r.percentage, 0) / dayReports.length)
      : null;

    const dateObj = new Date(dateStr + 'T00:00:00');
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

    return {
      dateStr,
      label,
      avgScore,
      count: dayReports.length
    };
  });

  // Filter list depending on viewing preferences
  // 'all' shows the full calendar timeline
  // 'peaks' compacts the trend only to days that contain processed records to draw a continuous graph
  const activeTrendPoints = viewMode === 'peaks'
    ? full30DayTrend.filter(pt => pt.avgScore !== null)
    : full30DayTrend;

  // Let's draw the SVG coordinates
  const height = 180;
  const width = 680;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Determine line coordinates
  // X scale: index to chartWidth
  // Y scale: score (0 - 100) to chartHeight
  const getX = (index: number) => {
    if (activeTrendPoints.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (activeTrendPoints.length - 1)) * chartWidth;
  };

  const getY = (score: number) => {
    // scale from 0..100 onto chartHeight..0
    return paddingTop + chartHeight - (score / 100) * chartHeight;
  };

  // Find valid lines to draw (if viewMode is 'all', there might be breaks/null values)
  // Let's create segment structures
  const segments: any[][] = [];
  let currentSegment: any[] = [];

  activeTrendPoints.forEach((pt, index) => {
    if (pt.avgScore !== null) {
      currentSegment.push({ ...pt, index });
    } else {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    }
  });
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  // Draw target guideline references (Grid)
  const gridLines = [
    { value: 90, label: '90% Target PAS', color: 'rgba(52, 211, 153, 0.15)', stroke: 'rgba(52, 211, 153, 0.4)' },
    { value: 70, label: '70% Warning', color: 'rgba(234, 179, 8, 0.12)', stroke: 'rgba(234, 179, 8, 0.35)' },
    { value: 50, label: '', color: 'rgba(255, 255, 255, 0.03)', stroke: 'rgba(255, 255, 255, 0.08)' }
  ];

  return (
    <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg flex flex-col" id="audit-trend-chart-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-blue-500/10 rounded text-blue-400 border border-blue-500/10">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-white">Daily 30-Day Audit Trend</h4>
            <p className="text-[10.5px] text-gray-500 mt-0.5">Average compliance score trajectory over timeline</p>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center space-x-2 bg-[#0A0C0F] border border-[#2A2D35] p-1 rounded-lg self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded transition-all cursor-pointer ${
              viewMode === 'all'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Calendar View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('peaks')}
            className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded transition-all cursor-pointer ${
              viewMode === 'peaks'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Audit Run Highlights
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center border border-[#2A2D35] border-dashed rounded-lg bg-[#0A0C0F]/30 p-4">
          <Calendar className="h-8 w-8 text-gray-600 mb-2" />
          <p className="text-xs text-gray-400">No telemetry data. Ingest spreadsheets to map timeline trajectory.</p>
        </div>
      ) : (
        <div className="relative w-full overflow-x-auto select-none pt-2">
          {/* Main SVG Chart container */}
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[600px] h-auto overflow-visible"
          >
            {/* Soft Gradients details */}
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <filter id="glowFilter" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Guideline Threshold grids */}
            {gridLines.map((line) => (
              <g key={line.value}>
                {/* Horizontal reference line */}
                <line
                  x1={paddingLeft}
                  y1={getY(line.value)}
                  x2={width - paddingRight}
                  y2={getY(line.value)}
                  stroke={line.stroke}
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                {/* Label positioning inside left panel */}
                <text
                  x={paddingLeft - 8}
                  y={getY(line.value) + 3}
                  textAnchor="end"
                  className="fill-gray-500 font-mono text-[9px] font-semibold"
                >
                  {line.value}%
                </text>
                {line.label && (
                  <text
                    x={width - paddingRight - 4}
                    y={getY(line.value) - 4}
                    textAnchor="end"
                    className="fill-gray-400 font-sans text-[8px] font-bold uppercase tracking-widest bg-[#15171C]"
                  >
                    {line.label}
                  </text>
                )}
              </g>
            ))}

            {/* Segments of Line Chart */}
            {segments.map((seg, sIdx) => {
              if (seg.length === 0) return null;

              // Generate coordinate list for SVG draw command
              const dLine = seg.map((pt, i) => {
                const prefix = i === 0 ? 'M' : 'L';
                return `${prefix} ${getX(pt.index)} ${getY(pt.avgScore)}`;
              }).join(' ');

              // Generate coordinate list for closed area SVG draw command
              const dArea = [
                `M ${getX(seg[0].index)} ${getY(0)}`,
                ...seg.map((pt) => `L ${getX(pt.index)} ${getY(pt.avgScore)}`),
                `L ${getX(seg[seg.length - 1].index)} ${getY(0)}`,
                'Z'
              ].join(' ');

              return (
                <g key={sIdx}>
                  {/* Under-line filled gradient area */}
                  <path
                    d={dArea}
                    fill="url(#areaGradient)"
                    className="transition-opacity duration-300"
                  />

                  {/* Main Line path */}
                  <path
                    d={dLine}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glowFilter)"
                  />
                </g>
              );
            })}

            {/* Individual Interactive Dots */}
            {activeTrendPoints.map((pt, index) => {
              if (pt.avgScore === null) return null;

              const isHovered = hoveredPoint?.dateStr === pt.dateStr;
              const xCoord = getX(index);
              const yCoord = getY(pt.avgScore);

              return (
                <g
                  key={pt.dateStr}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Larger transparent hover target */}
                  <circle
                    cx={xCoord}
                    cy={yCoord}
                    r="9"
                    fill="transparent"
                  />
                  {/* Outer glowing halo on focus */}
                  {isHovered && (
                    <circle
                      cx={xCoord}
                      cy={yCoord}
                      r="7"
                      fill="#3b82f6"
                      fillOpacity="0.25"
                      stroke="#3b82f6"
                      strokeOpacity="0.5"
                      strokeWidth="1"
                    />
                  )}
                  {/* Display Bullet dot */}
                  <circle
                    cx={xCoord}
                    cy={yCoord}
                    r={isHovered ? '4.5' : '3'}
                    className="transition-all"
                    fill={pt.avgScore >= 90 ? '#34d399' : pt.avgScore >= 70 ? '#eab308' : '#f87171'}
                    stroke="#15171C"
                    strokeWidth="1.2"
                  />
                </g>
              );
            })}

            {/* Timeline X Axis calendar labels */}
            {activeTrendPoints.map((pt, index) => {
              // Only draw 5 calendar label ticks to prevent congestion
              const totalLen = activeTrendPoints.length;
              const step = Math.max(1, Math.floor(totalLen / 5));
              const shouldLabel = index % step === 0 || index === totalLen - 1;

              if (!shouldLabel) return null;

              return (
                <g key={`lbl-${index}`}>
                  <line
                    x1={getX(index)}
                    y1={height - paddingBottom}
                    x2={getX(index)}
                    y2={height - paddingBottom + 4}
                    stroke="rgba(255, 255, 255, 0.15)"
                  />
                  <text
                    x={getX(index)}
                    y={height - paddingBottom + 16}
                    textAnchor="middle"
                    className="fill-gray-500 font-sans text-[8.5px] font-semibold"
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating Tooltip Overlay */}
          {hoveredPoint && (
            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-[#0A0C0F] border border-[#2A2D35] rounded-lg p-3 shadow-xl flex flex-col pointer-events-none text-left z-20 transition-all font-sans min-w-[240px] max-w-sm">
              <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold font-mono">Date: {hoveredPoint.label}</span>
              <div className="flex items-center space-x-2 mt-1 border-b border-[#2A2D35]/50 pb-2">
                <span className={`w-2 h-2 rounded-full ${
                  hoveredPoint.avgScore >= 90 ? 'bg-green-450 bg-emerald-400' :
                  hoveredPoint.avgScore >= 70 ? 'bg-amber-500' :
                  'bg-red-400'
                }`}></span>
                <span className="text-xs font-bold text-white font-mono">{hoveredPoint.avgScore}% Mean Audit</span>
                <span className="text-[10px] text-gray-500 font-medium">({hoveredPoint.count} ticket{hoveredPoint.count !== 1 ? 's' : ''})</span>
              </div>
              
              {/* Compliance Issue Counts Breakdown */}
              {flagCounts.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-red-400 font-bold font-mono">Detected System Deviations:</span>
                  <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                    {flagCounts.map((flag) => (
                      <div key={flag.key} className="flex items-start space-x-1.5 text-[10px] text-gray-300 leading-tight">
                        <span className="text-red-500 shrink-0 mt-0.5">•</span>
                        <span className="font-medium text-gray-300">{getFlagMessage(flag)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-[10px] text-emerald-400 font-medium font-mono flex items-center space-x-1">
                  <span>✨ 100% compliant, all points pass!</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Strategic trend commentary details */}
      <div className="mt-3 bg-[#0A0C0F]/45 rounded-lg border border-[#2A2D35]/50 p-3 flex items-start space-x-2 text-[11px] text-gray-450 text-gray-400 leading-relaxed font-sans">
        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span>This trajectory maps data relative to the maximum date identified in your parsed source spreadsheet. Daily aggregate averages compile active values representing score distributions. Double-check your corporate alignment rules periodically.</span>
        </div>
      </div>
    </div>
  );
}
