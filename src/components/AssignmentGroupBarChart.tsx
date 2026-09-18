import React, { useState, useMemo } from 'react';
import { TicketAuditReport } from '../types';
import { 
  Users, 
  ArrowUpDown, 
  Search, 
  Award, 
  AlertCircle, 
  FileText, 
  TrendingUp, 
  Sparkles,
  Layers,
  HelpCircle,
  Clock
} from 'lucide-react';

interface AssignmentGroupBarChartProps {
  reports: TicketAuditReport[];
}

type SortOption = 'score-desc' | 'score-asc' | 'volume-desc' | 'volume-asc';

export default function AssignmentGroupBarChart({ reports }: AssignmentGroupBarChartProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('score-desc');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Group and aggregate data by assignmentGroup
  const aggregatedData = useMemo(() => {
    const groups: { [name: string]: { 
      groupName: string; 
      scores: number[]; 
      tickets: TicketAuditReport[]; 
    } } = {};

    reports.forEach((r) => {
      const gName = (r.ticket.assignmentGroup || 'Unassigned').trim();
      if (!groups[gName]) {
        groups[gName] = { 
          groupName: gName, 
          scores: [], 
          tickets: [] 
        };
      }
      groups[gName].scores.push(r.percentage);
      groups[gName].tickets.push(r);
    });

    return Object.values(groups).map((g) => {
      const totalScore = g.scores.reduce((a, b) => a + b, 0);
      const average = g.scores.length > 0 ? Math.round((totalScore / g.scores.length) * 10) / 10 : 0;
      const minScore = g.scores.length > 0 ? Math.min(...g.scores) : 0;
      const maxScore = g.scores.length > 0 ? Math.max(...g.scores) : 0;

      // Classify breakdowns
      const compliant = g.scores.filter(s => s >= 90).length;
      const warning = g.scores.filter(s => s >= 70 && s < 90).length;
      const failed = g.scores.filter(s => s < 70).length;

      return {
        groupName: g.groupName,
        average,
        totalTickets: g.scores.length,
        minScore,
        maxScore,
        compliant,
        warning,
        failed,
        tickets: g.tickets,
      };
    });
  }, [reports]);

  // Filter and sort grouped records
  const processedGroups = useMemo(() => {
    let result = aggregatedData.filter(g => 
      g.groupName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortBy === 'score-desc') return b.average - a.average;
      if (sortBy === 'score-asc') return a.average - b.average;
      if (sortBy === 'volume-desc') return b.totalTickets - a.totalTickets;
      if (sortBy === 'volume-asc') return a.totalTickets - b.totalTickets;
      return 0;
    });

    return result;
  }, [aggregatedData, searchTerm, sortBy]);

  // Auto-select first group if none hovered/selected to show detail panels
  const activeGroup = useMemo(() => {
    if (processedGroups.length === 0) return null;
    if (selectedGroup) {
      const found = processedGroups.find(g => g.groupName === selectedGroup);
      if (found) return found;
    }
    return processedGroups[0];
  }, [processedGroups, selectedGroup]);

  // Determine global average across all assignment groups
  const overallAverage = useMemo(() => {
    if (reports.length === 0) return 0;
    const total = reports.reduce((acc, r) => acc + r.percentage, 0);
    return Math.round((total / reports.length) * 10) / 10;
  }, [reports]);

  const getSlaColorClass = (score: number) => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 70) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  const getBarGradient = (score: number) => {
    if (score >= 90) return 'from-emerald-500 to-emerald-400';
    if (score >= 70) return 'from-amber-500 to-amber-400';
    return 'from-red-500 to-red-400';
  };

  return (
    <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg flex flex-col space-y-5" id="assignment-group-bar-chart-container">
      
      {/* 📊 Title & KPI Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2A2D35] pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-500/10 rounded text-emerald-400 border border-emerald-500/15">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-white">Assignment Group SLA Comparison</h4>
            <p className="text-[10.5px] text-gray-500 mt-0.5">Average compliance audit scores compared across operational ServiceNow queues</p>
          </div>
        </div>

        {/* Global SLA KPI bubble */}
        <div className="flex items-center space-x-3 bg-[#0A0C0F] border border-[#2A2D35] px-4 py-2 rounded-lg">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></div>
          <div>
            <p className="text-[9px] text-gray-500 uppercase font-mono tracking-wider">Overall Queue Pool SLA</p>
            <p className="text-sm font-extrabold text-white font-mono">{overallAverage}%</p>
          </div>
        </div>
      </div>

      {/* ⚙️ Chart Controls (Search & Sorting) */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-[#0C0E12] border border-[#22242C] p-3 rounded-lg">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-gray-500">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            id="group-search-input"
            type="text"
            placeholder="Filter Assignment Groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs text-white bg-[#15171C] border border-[#2A2D35] hover:border-[#383C47] focus:border-blue-500 focus:outline-none rounded-md py-1.5 pl-8 pr-3 font-medium transition-all placeholder-gray-500"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          <ArrowUpDown className="h-3.5 w-3.5 text-gray-500 shrink-0" />
          <span className="text-[11px] text-gray-400 select-none">Sort:</span>
          <select
            id="group-sort-selector"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-[#15171C] border border-[#2A2D35] hover:border-[#383C47] text-white text-xs font-semibold py-1.2 px-2.5 rounded focus:outline-none cursor-pointer text-ellipsis max-w-[180px]"
          >
            <option value="score-desc">SLA Score (High → Low)</option>
            <option value="score-asc">SLA Score (Low → High)</option>
            <option value="volume-desc">Audit Volume (High → Low)</option>
            <option value="volume-asc">Audit Volume (Low → High)</option>
          </select>
        </div>
      </div>

      {processedGroups.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center border border-[#2A2D35] border-dashed rounded-lg bg-[#0A0C0F]/20 text-center">
          <HelpCircle className="h-8 w-8 text-gray-600 mb-2" />
          <p className="text-xs text-gray-400 uppercase font-mono tracking-wider">No matching groups found</p>
          <p className="text-xs text-gray-500 mt-1">Try refining your search keyword filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* 📊 The Visual Bar Chart Grid Column */}
          <div className="lg:col-span-7 space-y-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
            {processedGroups.map((g, index) => {
              const isSelected = activeGroup?.groupName === g.groupName;
              return (
                <div 
                  key={g.groupName}
                  onClick={() => setSelectedGroup(g.groupName)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col space-y-2 select-none ${
                    isSelected 
                      ? 'bg-[#1C1F26] border-blue-500/40 shadow-md ring-1 ring-blue-500/10' 
                      : 'bg-[#0E1014] border-[#22242C] hover:bg-[#15171C] hover:border-[#2A2D35]'
                  }`}
                  id={`bar-group-${g.groupName.replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] text-gray-500 font-bold bg-[#1C1F26] px-1.5 py-0.5 rounded border border-[#2A2D35]">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-xs">
                        {g.groupName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] font-mono">
                      <span className="text-gray-500 font-medium">({g.totalTickets} ticket{g.totalTickets !== 1 ? 's' : ''})</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getSlaColorClass(g.average)}`}>
                        {g.average}%
                      </span>
                    </div>
                  </div>

                  {/* SVG Bar Representation */}
                  <div className="w-full bg-[#1A1C23] h-2.5 rounded-full overflow-hidden relative border border-[#22242C]">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(g.average)} transition-all duration-500`}
                      style={{ width: `${g.average}%` }}
                    />
                    
                    {/* Tick overlay mark at 90% */}
                    <div className="absolute top-0 bottom-0 left-[90%] w-0.5 bg-emerald-400/50" title="90% compliance Target" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ℹ️ Detailed Metrics Inspection Panel */}
          {activeGroup && (
            <div className="lg:col-span-5 bg-[#0C0E12] border border-[#22242C] rounded-xl p-4 flex flex-col space-y-4 self-start shadow-inner">
              
              {/* Inspection Header */}
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 font-mono">operational spot audit</span>
                <h5 className="text-xs font-extrabold text-white mt-0.5 break-all max-w-full leading-snug">
                  {activeGroup.groupName}
                </h5>
              </div>

              {/* Grid Mini-SLA Metrics Card */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#15171C] border border-[#2A2D35] p-2.5 rounded-lg text-center">
                  <span className="text-[8.5px] font-bold text-gray-500 uppercase tracking-wide block">Group Queue SLA</span>
                  <span className="text-base font-extrabold text-white font-mono block mt-1">
                    {activeGroup.average}%
                  </span>
                </div>
                <div className="bg-[#15171C] border border-[#2A2D35] p-2.5 rounded-lg text-center">
                  <span className="text-[8.5px] font-bold text-gray-500 uppercase tracking-wide block">Audited Pool</span>
                  <span className="text-base font-extrabold text-gray-200 font-mono block mt-1">
                    {activeGroup.totalTickets}
                  </span>
                </div>
              </div>

              {/* Range representation */}
              <div className="bg-[#15171C] border border-[#2A2D35] p-3 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                  <span>Lowest Audit score</span>
                  <span className="text-red-400 font-bold">{activeGroup.minScore}%</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                  <span>Highest Audit score</span>
                  <span className="text-emerald-400 font-bold">{activeGroup.maxScore}%</span>
                </div>
              </div>

              {/* Breakdown Distribution stack */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">compliance band volume</span>
                <div className="h-6 w-full rounded-md overflow-hidden flex font-mono text-[10px] font-bold border border-[#22242C]">
                  {activeGroup.compliant > 0 && (
                    <div 
                      className="bg-emerald-500/80 text-white flex items-center justify-center transition-all"
                      style={{ width: `${(activeGroup.compliant / activeGroup.totalTickets) * 100}%` }}
                      title={`${activeGroup.compliant} Compliant (>=90%)`}
                    >
                      {activeGroup.compliant}
                    </div>
                  )}
                  {activeGroup.warning > 0 && (
                    <div 
                      className="bg-amber-500/80 text-black flex items-center justify-center transition-all"
                      style={{ width: `${(activeGroup.warning / activeGroup.totalTickets) * 100}%` }}
                      title={`${activeGroup.warning} Marginal (70-89%)`}
                    >
                      {activeGroup.warning}
                    </div>
                  )}
                  {activeGroup.failed > 0 && (
                    <div 
                      className="bg-red-500/80 text-white flex items-center justify-center transition-all"
                      style={{ width: `${(activeGroup.failed / activeGroup.totalTickets) * 100}%` }}
                      title={`${activeGroup.failed} Non-Compliant (<70%)`}
                    >
                      {activeGroup.failed}
                    </div>
                  )}
                </div>
                
                {/* Legends */}
                <div className="grid grid-cols-3 gap-1 text-[9px] font-semibold text-gray-500 uppercase font-mono">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block" />
                    <span>Pass: {activeGroup.compliant}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 block" />
                    <span>Warn: {activeGroup.warning}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 block" />
                    <span>Fail: {activeGroup.failed}</span>
                  </div>
                </div>
              </div>

              {/* Representative Tickets List snippet */}
              <div className="space-y-2 pt-2 border-t border-[#2A2D35]">
                <div className="flex items-center space-x-1">
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">sampled incidents list ({activeGroup.tickets.length})</span>
                </div>
                
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {activeGroup.tickets.map((tReport, tIdx) => (
                    <div 
                      key={`${tReport.ticket.id || tReport.ticket.incNumber || 't'}-${tIdx}`}
                      className="flex items-center justify-between text-[11px] p-1.5 bg-[#15171C] rounded border border-[#2A2D35]/60 hover:border-gray-500/30 transition-all font-mono"
                    >
                      <span className="text-blue-400 font-bold truncate max-w-[80px]" title={tReport.ticket.incNumber}>
                        {tReport.ticket.incNumber}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[120px]" title={tReport.ticket.shortDescription}>
                        {tReport.ticket.shortDescription}
                      </span>
                      <span className={`px-1 rounded-sm text-[9px] font-semibold ${
                        tReport.percentage >= 90 ? 'text-emerald-400 bg-emerald-400/10' :
                        tReport.percentage >= 70 ? 'text-amber-400 bg-amber-400/10' :
                        'text-red-400 bg-red-400/10'
                      }`}>
                        {tReport.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Footer hint */}
      <div className="bg-[#0A0C0F]/45 rounded-lg border border-[#2A2D35]/50 p-2.5 flex items-start space-x-2 text-[10.5px] text-gray-500 leading-relaxed font-sans">
        <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span>Comparing assignment queue performance aids operational review and target accountability programs. Standard Service Management goals request group scores to remain above the <strong>90% SLA Threshold</strong>.</span>
        </div>
      </div>

    </div>
  );
}
