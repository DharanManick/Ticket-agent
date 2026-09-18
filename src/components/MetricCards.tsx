import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TicketAuditReport } from '../types';
import { ShieldCheck, AlertTriangle, XCircle, Users, Activity, CheckCircle, TrendingUp, BarChart3, BookOpen } from 'lucide-react';

interface MetricCardsProps {
  reports: TicketAuditReport[];
  onSelectTicket?: (incNumber: string) => void;
}

export default function MetricCards({ reports, onSelectTicket }: MetricCardsProps) {
  const total = reports.length;

  // Dynamic compliance checks per category across all reports to identify top gaps sorted lowest first
  const categoryPassRates = useMemo(() => {
    if (reports.length === 0) return [];
    const categoriesList = [
      { key: 'affectedCi', name: 'Affected CI Mapping' },
      { key: 'suspectedCi', name: 'Suspected CI Correlation' },
      { key: 'symptomCode', name: 'Symptom Code Confluence' },
      { key: 'shortDescription', name: 'Short Description Clarity' },
      { key: 'technicalDescription', name: 'Technical Depth (50+ chars)' },
      { key: 'serviceImpactDescription', name: 'Service Impact Tier' },
      { key: 'businessImpactDescription', name: 'Business Impact Depth' },
      { key: 'activityLogs', name: 'Solve Propose Transition' },
      { key: 'closureCode1', name: 'Closure Code 1 Alignment' },
      { key: 'closureCode2', name: 'Closure Code 2 Alignment' },
      { key: 'solutionCode', name: 'Solution Code Integrity' },
      { key: 'knowledgeArticle', name: 'Knowledge Loop Citation' },
      { key: 'resolutionDescription', name: '8-Step Corrector Steps' }
    ];

    return categoriesList.map(item => {
      const passesCount = reports.filter(r => {
        const met = r.scores[item.key as keyof typeof r.scores];
        return met && met.score === 2;
      }).length;
      const rate = Math.round((passesCount / reports.length) * 100);
      return {
        name: item.name,
        passRate: rate,
        failsCount: reports.length - passesCount
      };
    }).sort((a, b) => a.passRate - b.passRate); // Ascending order (lowest pass rate first, representing top failure gaps)
  }, [reports]);

  // Alerts on bypassed step "Solve Propose"
  const falseAudits = reports.filter(r => {
    const logs = r.ticket.activityLogs ? r.ticket.activityLogs.toLowerCase() : '';
    return logs.includes('progress') && logs.includes('confirm') && !logs.includes('propose');
  });

  // Dynamic executive recommendations builder
  const managementRecommendations = useMemo(() => {
    const list: string[] = [];
    if (reports.length === 0) return ["Ingest audited ticket files to generate executive compliance action forecasts."];

    if (falseAudits.length > 0) {
      list.push(`🚪 STATE FLOW BYPASS: Identified direct In-Progress to Confirm jumps in ${falseAudits.length} incidents. Restrict manual closures on those tickets until state transition validation filters are passed.`);
    }
    const weakTechDescCount = reports.filter(r => r.scores.technicalDescription.score === 0).length;
    if (weakTechDescCount > (reports.length * 0.15)) {
      list.push(`📓 SKELETAL TECHNICAL DIARIES: ${weakTechDescCount} records contain deficient logs under 50 characters. Enable input limits on ServiceNow form submission to mandate detailed engineering journals.`);
    }
    const emptyKaCount = reports.filter(r => r.scores.knowledgeArticle.score === 0).length;
    if (emptyKaCount > (reports.length * 0.2)) {
      list.push(`⚠️ KNOWLEDGE CLASSIFICATION BYPASSED: ${emptyKaCount} resolutions failed to cite a Knowledge Article (KA) reference. Require active article search before allowing solver resolution saves.`);
    }
    const badSymptomsCount = reports.filter(r => r.scores.symptomCode.score === 0).length;
    if (badSymptomsCount > (reports.length * 0.15)) {
      list.push(`🏷️ CATEGORY DRIFT: Mismapped Symptom fields detected in ${badSymptomsCount} reviews. Standardize confluence symptom code mapping policies with the classification team.`);
    }

    if (list.length === 0) {
      list.push("✨ STRATEGIC DATA PATTERN COHERENT: Excellent ticket hygiene. Maintain periodic cycles to avoid operational drift.");
    }
    return list;
  }, [reports, falseAudits]);
  
  const greenCount = reports.filter(r => r.statusColor === 'Green').length;
  const amberCount = reports.filter(r => r.statusColor === 'Amber').length;
  const redCount = reports.filter(r => r.statusColor === 'Red').length;
  
  const passRate = total > 0 ? Math.round((greenCount / total) * 100) : 0;
  const warningRate = total > 0 ? Math.round((amberCount / total) * 100) : 0;
  const failRate = total > 0 ? Math.round((redCount / total) * 100) : 0;

  const [hoveredSlice, setHoveredSlice] = useState<'Green' | 'Amber' | 'Red' | null>(null);

  const avgScore = useMemo(() => {
    if (reports.length === 0) return 0;
    return Math.round(reports.reduce((acc, r) => acc + r.percentage, 0) / reports.length);
  }, [reports]);

  const { gLen, aLen, rLen, greenPct, amberPct, redPct } = useMemo(() => {
    const totalReviewed = reports.length;
    if (totalReviewed === 0) {
      return { gLen: 0, aLen: 0, rLen: 0, greenPct: 0, amberPct: 0, redPct: 0 };
    }
    const circumference = 238.76;
    const gPct = greenCount / totalReviewed;
    const aPct = amberCount / totalReviewed;
    const rPct = redCount / totalReviewed;
    return {
      gLen: gPct * circumference,
      aLen: aPct * circumference,
      rLen: rPct * circumference,
      greenPct: gPct * 100,
      amberPct: aPct * 100,
      redPct: rPct * 100,
    };
  }, [reports, greenCount, amberCount, redCount]);

  // Score stats by Manager
  const managerStats = reports.reduce((acc, r) => {
    const mgr = r.ticket.assigneeManager || 'Unassigned Manager';
    if (!acc[mgr]) {
      acc[mgr] = { total: 0, sumScore: 0, sumPercentage: 0, redCount: 0 };
    }
    acc[mgr].total += 1;
    acc[mgr].sumScore += r.totalScore;
    acc[mgr].sumPercentage += r.percentage;
    if (r.statusColor === 'Red') acc[mgr].redCount += 1;
    return acc;
  }, {} as Record<string, { total: number; sumScore: number; sumPercentage: number; redCount: number }>);

  // Score stats by Assignment Group
  const groupStats = reports.reduce((acc, r) => {
    const grp = r.ticket.assignmentGroup || 'General Support';
    if (!acc[grp]) {
      acc[grp] = { total: 0, sumPercent: 0 };
    }
    acc[grp].total += 1;
    acc[grp].sumPercent += r.percentage;
    return acc;
  }, {} as Record<string, { total: number; sumPercent: number }>);

  // Generate a key that updates on audit sweeps (changes in reports list or scores)
  const sweepKey = useMemo(() => {
    if (reports.length === 0) return 'empty';
    const scoreSum = reports.reduce((acc, r) => acc + r.percentage, 0);
    return `${reports.length}-${scoreSum}`;
  }, [reports]);

  return (
    <div className="space-y-6 animate-fadeIn" id="metrics-panel">
      {/* Visual Tickers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Ingested */}
        <motion.div 
          key={`card-total-${sweepKey}`}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 28px -5px rgba(0, 0, 0, 0.6), 0 0 20px 0 rgba(59, 130, 246, 0.18)' }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-md hover:border-blue-500/50 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 group-hover:text-blue-400 transition-colors">Total Reviewed Pool</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1.5 flex items-baseline gap-1">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={total}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {total}
                  </motion.span>
                </AnimatePresence>
                <span className="text-xs text-gray-400 font-sans ml-1">INCS</span>
              </h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded text-blue-400 border border-blue-500/10 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-3 font-mono">ServiceNow dump database active</p>
        </motion.div>

        {/* Pass Rate */}
        <motion.div 
          key={`card-pass-${sweepKey}`}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 28px -5px rgba(0, 0, 0, 0.6), 0 0 20px 0 rgba(34, 197, 94, 0.18)' }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-md hover:border-green-500/50 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 group-hover:text-green-400 transition-colors">Perfect Align Rank (Green)</p>
              <h3 className="text-2xl font-mono font-bold text-green-400 mt-1.5">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={passRate}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {passRate}
                  </motion.span>
                </AnimatePresence>
                %
              </h3>
            </div>
            <div className="p-2 bg-green-500/10 rounded text-green-400 border border-green-500/10 group-hover:scale-110 group-hover:bg-green-500/20 transition-all">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-[#0A0C0F] rounded-full h-1 overflow-hidden">
              <motion.div 
                className="bg-green-400 h-1 rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${passRate}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1.5">
              <span>{greenCount} passed</span>
              <span>Min target score &ge; 90%</span>
            </div>
          </div>
        </motion.div>

        {/* Warning Rate */}
        <motion.div 
          key={`card-warning-${sweepKey}`}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 28px -5px rgba(0, 0, 0, 0.6), 0 0 20px 0 rgba(234, 179, 8, 0.18)' }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-md hover:border-yellow-500/50 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 group-hover:text-yellow-400 transition-colors">Warning Align Rank (Amber)</p>
              <h3 className="text-2xl font-mono font-bold text-yellow-500 mt-1.5">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={warningRate}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {warningRate}
                  </motion.span>
                </AnimatePresence>
                %
              </h3>
            </div>
            <div className="p-2 bg-yellow-500/10 rounded text-yellow-500 border border-yellow-500/10 group-hover:scale-110 group-hover:bg-yellow-500/20 transition-all">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-[#0A0C0F] rounded-full h-1 overflow-hidden">
              <motion.div 
                className="bg-yellow-500 h-1 rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${warningRate}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1.5">
              <span>{amberCount} in warning</span>
              <span>Bounds 70% to 89%</span>
            </div>
          </div>
        </motion.div>

        {/* Bypassed Logs */}
        <motion.div 
          key={`card-bypassed-${sweepKey}`}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 28px -5px rgba(0, 0, 0, 0.6), 0 0 20px 0 rgba(239, 68, 68, 0.18)' }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-md hover:border-red-500/50 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 group-hover:text-red-400 transition-colors">Critical State Jumps (Red)</p>
              <h3 className={`text-2xl font-mono font-bold mt-1.5 ${falseAudits.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={falseAudits.length}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {falseAudits.length}
                  </motion.span>
                </AnimatePresence>
              </h3>
            </div>
            <div className={`p-2 rounded transition-all group-hover:scale-110 ${falseAudits.length > 0 ? 'bg-red-500/10 text-red-400 border border-red-500/10 group-hover:bg-red-500/20' : 'bg-[#0A0C0F] text-gray-500'}`}>
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-[#0A0C0F] rounded-full h-1 overflow-hidden">
              <motion.div 
                className="bg-red-400 h-1 rounded-full animate-none" 
                initial={{ width: 0 }}
                animate={{ width: `${total > 0 ? (falseAudits.length / total) * 100 : 0}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1.5">
              <span>Bypassed Solve Propose</span>
              <span className={`font-semibold ${falseAudits.length > 0 ? 'text-red-400' : 'text-green-500'}`}>
                {falseAudits.length > 0 ? 'Action Protocol' : 'Compliant'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Critical alerts banner */}
      {falseAudits.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 flex items-start space-x-3 text-sm text-red-200">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block text-red-300 font-mono text-xs uppercase tracking-wider">Operational Warning: Bypassed State Transition Detected</span>
            <span className="text-xs text-gray-400 leading-relaxed block">
              The tickets cataloged below transitioned straight from **In-Progress** to **Solve Confirm**, bypassing the mandatory **"Solve Propose" state** checkpoints. This violates security governance standards. Select a ticket to review compliance errors.
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {falseAudits.map((fa, faIdx) => (
                <button
                  key={`${fa.ticket.id || fa.ticket.incNumber || 'fa'}-${faIdx}`}
                  onClick={() => onSelectTicket?.(fa.ticket.incNumber)}
                  className="bg-red-900/10 border border-red-500/30 hover:border-red-400 hover:bg-red-500/10 px-2.5 py-1 rounded text-[11px] font-mono flex items-center space-x-1.5 text-white cursor-pointer transition-all"
                >
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></span>
                  <span>{fa.ticket.incNumber} ({fa.ticket.assignee})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🏢 EXECUTIVE MANAGEMENT & AUDIT DRIFT INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="executive-trends-panel">
        
        {/* Module A: Compliance Distribution Donut Chart (4/12) */}
        <div className="lg:col-span-4 bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg flex flex-col space-y-4" id="donut-distribution">
          <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
            <h4 className="text-xs uppercase font-black font-mono tracking-widest text-[#10b981] flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              COMPLIANCE DISTRIBUTION
            </h4>
            <span className="text-[9px] text-gray-500 font-mono">Real-time Breakdown</span>
          </div>

          {reports.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8">
              <svg width="120" height="120" viewBox="0 0 120 120" className="animate-pulse">
                <circle
                  cx="60"
                  cy="60"
                  r="38"
                  fill="transparent"
                  stroke="#2A2D35"
                  strokeWidth="12"
                  strokeDasharray="4 4"
                />
              </svg>
              <p className="text-xs text-gray-400 mt-3 font-mono">0 Incidents Loaded</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
              {/* Donut Chart Visual */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                <svg width="140" height="140" viewBox="0 0 120 120" className="transform -rotate-90 select-none">
                  {/* Green slice */}
                  {greenCount > 0 && (
                    <circle
                      cx="60"
                      cy="60"
                      r="38"
                      fill="transparent"
                      stroke="#22c55e"
                      strokeWidth={hoveredSlice === 'Green' ? 14 : 11}
                      strokeDasharray={`${gLen} ${238.76 - gLen}`}
                      strokeDashoffset={0}
                      className="transition-all duration-200 cursor-pointer origin-center"
                      onMouseEnter={() => setHoveredSlice('Green')}
                      onMouseLeave={() => setHoveredSlice(null)}
                      style={{
                        opacity: hoveredSlice && hoveredSlice !== 'Green' ? 0.45 : 1,
                        filter: hoveredSlice === 'Green' ? 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.4))' : 'none'
                      }}
                    />
                  )}
                  {/* Amber slice */}
                  {amberCount > 0 && (
                    <circle
                      cx="60"
                      cy="60"
                      r="38"
                      fill="transparent"
                      stroke="#eab308"
                      strokeWidth={hoveredSlice === 'Amber' ? 14 : 11}
                      strokeDasharray={`${aLen} ${238.76 - aLen}`}
                      strokeDashoffset={-gLen}
                      className="transition-all duration-200 cursor-pointer origin-center"
                      onMouseEnter={() => setHoveredSlice('Amber')}
                      onMouseLeave={() => setHoveredSlice(null)}
                      style={{
                        opacity: hoveredSlice && hoveredSlice !== 'Amber' ? 0.45 : 1,
                        filter: hoveredSlice === 'Amber' ? 'drop-shadow(0 0 4px rgba(234, 179, 8, 0.4))' : 'none'
                      }}
                    />
                  )}
                  {/* Red slice */}
                  {redCount > 0 && (
                    <circle
                      cx="60"
                      cy="60"
                      r="38"
                      fill="transparent"
                      stroke="#ef4444"
                      strokeWidth={hoveredSlice === 'Red' ? 14 : 11}
                      strokeDasharray={`${rLen} ${238.76 - rLen}`}
                      strokeDashoffset={-(gLen + aLen)}
                      className="transition-all duration-200 cursor-pointer origin-center"
                      onMouseEnter={() => setHoveredSlice('Red')}
                      onMouseLeave={() => setHoveredSlice(null)}
                      style={{
                        opacity: hoveredSlice && hoveredSlice !== 'Red' ? 0.45 : 1,
                        filter: hoveredSlice === 'Red' ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.4))' : 'none'
                      }}
                    />
                  )}
                </svg>

                {/* Central Labels */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[8.5px] uppercase font-mono font-bold text-gray-500 tracking-wider">
                    {hoveredSlice === 'Green' ? 'Pass (Audit)' :
                     hoveredSlice === 'Amber' ? 'Warning' :
                     hoveredSlice === 'Red' ? 'Fail (Crit)' :
                     'Avg Quality'}
                  </span>
                  <span className={`text-[17px] font-mono font-extrabold mt-0.5 transition-colors duration-200 ${
                    hoveredSlice === 'Green' ? 'text-green-400' :
                    hoveredSlice === 'Amber' ? 'text-yellow-500' :
                    hoveredSlice === 'Red' ? 'text-red-400' :
                    'text-white'
                  }`}>
                    {hoveredSlice === 'Green' ? `${Math.round(greenPct)}%` :
                     hoveredSlice === 'Amber' ? `${Math.round(amberPct)}%` :
                     hoveredSlice === 'Red' ? `${Math.round(redPct)}%` :
                     `${avgScore}%`}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">
                    {hoveredSlice === 'Green' ? `${greenCount} INCS` :
                     hoveredSlice === 'Amber' ? `${amberCount} INCS` :
                     hoveredSlice === 'Red' ? `${redCount} INCS` :
                     `${total} Total`}
                  </span>
                </div>
              </div>

              {/* Legend Detail lists */}
              <div className="flex-1 flex flex-col justify-center space-y-1.5 w-full">
                {/* Green item */}
                <div
                  className="bg-[#0A0C0F]/80 border border-[#23262D] rounded-lg p-1.5 py-1.5 flex items-center justify-between transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredSlice('Green')}
                  onMouseLeave={() => setHoveredSlice(null)}
                  style={{
                    borderColor: hoveredSlice === 'Green' ? '#22c55e' : 'rgba(35, 38, 45, 1)',
                    backgroundColor: hoveredSlice === 'Green' ? 'rgba(34, 197, 94, 0.05)' : '#0A0C0F'
                  }}
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded bg-green-500 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-200">Green (PAS)</span>
                  </div>
                  <div className="text-right font-mono font-extrabold text-[11px] text-green-400">
                    {greenCount} <span className="text-[9px] font-normal text-gray-400">({Math.round(greenPct)}%)</span>
                  </div>
                </div>

                {/* Amber item */}
                <div
                  className="bg-[#0A0C0F]/80 border border-[#23262D] rounded-lg p-1.5 py-1.5 flex items-center justify-between transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredSlice('Amber')}
                  onMouseLeave={() => setHoveredSlice(null)}
                  style={{
                    borderColor: hoveredSlice === 'Amber' ? '#eab308' : 'rgba(35, 38, 45, 1)',
                    backgroundColor: hoveredSlice === 'Amber' ? 'rgba(234, 179, 8, 0.05)' : '#0A0C0F'
                  }}
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded bg-yellow-500 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-200">Amber (WARN)</span>
                  </div>
                  <div className="text-right font-mono font-extrabold text-[11px] text-yellow-500">
                    {amberCount} <span className="text-[9px] font-normal text-gray-400">({Math.round(amberPct)}%)</span>
                  </div>
                </div>

                {/* Red item */}
                <div
                  className="bg-[#0A0C0F]/80 border border-[#23262D] rounded-lg p-1.5 py-1.5 flex items-center justify-between transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredSlice('Red')}
                  onMouseLeave={() => setHoveredSlice(null)}
                  style={{
                    borderColor: hoveredSlice === 'Red' ? '#ef4444' : 'rgba(35, 38, 45, 1)',
                    backgroundColor: hoveredSlice === 'Red' ? 'rgba(239, 68, 68, 0.05)' : '#0A0C0F'
                  }}
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded bg-red-500 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-200">Red (FAIL)</span>
                  </div>
                  <div className="text-right font-mono font-extrabold text-[11px] text-red-400">
                    {redCount} <span className="text-[9px] font-normal text-gray-400">({Math.round(redPct)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Module 1: Compliance Hotspots & Drift Tracking (4/12) */}
        <div className="lg:col-span-4 bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
            <h4 className="text-xs uppercase font-black font-mono tracking-widest text-[#FF6584] flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              TOP COMPLIANCE HOT SPOTS
            </h4>
            <span className="text-[9px] text-gray-500 font-mono">Lowest pass first</span>
          </div>

          {reports.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-6 text-center">No audited logs loaded to identify compliance hotspots.</p>
          ) : (
            <div className="space-y-3.5 pt-1">
              {categoryPassRates.slice(0, 4).map((hotspot, idx) => {
                const colorClass = hotspot.passRate >= 90 ? 'bg-green-400' : hotspot.passRate >= 70 ? 'bg-yellow-500' : 'bg-red-500';
                const textClass = hotspot.passRate >= 90 ? 'text-green-400' : hotspot.passRate >= 70 ? 'text-yellow-500' : 'text-red-400';
                
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium font-sans">
                      <span className="text-gray-300 truncate max-w-[150px]" title={hotspot.name}>
                        {hotspot.name}
                      </span>
                      <span className={`font-mono font-bold ${textClass}`}>
                        {hotspot.passRate}%
                      </span>
                    </div>
                    <div className="w-full bg-[#0A0C0F] rounded-full h-1 overflow-hidden border border-[#2A2D35]/30">
                      <motion.div 
                        key={`${hotspot.name}-${sweepKey}`}
                        className={`h-1 rounded-full ${colorClass}`} 
                        initial={{ width: 0 }}
                        animate={{ width: `${hotspot.passRate}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.08 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Module 2: Team and Manager Coaching Board (4/12) */}
        <div className="lg:col-span-4 bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
            <h4 className="text-xs uppercase font-black font-mono tracking-widest text-emerald-400 flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              COACHING TARGETS BY OWNER MANAGER
            </h4>
            <span className="text-[9px] text-gray-500 font-mono">Mean Compliance %</span>
          </div>

          {reports.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-6 text-center">No team roster loaded.</p>
          ) : (
            <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1">
              {Object.entries(managerStats).map(([mgr, stat]) => {
                const avgPercent = Math.round(stat.sumPercentage / stat.total);
                const isCompliant = avgPercent >= 90;
                const hasStateJumps = stat.redCount > 0;
                
                return (
                  <div key={mgr} className="bg-[#0A0C0F] border border-[#23262D] rounded-lg p-2 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-slate-200 block truncate max-w-[130px]" title={mgr}>{mgr}</span>
                      <span className="text-[9px] text-gray-500 font-mono block">Pool: {stat.total} INCS</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`text-xs font-mono font-bold ${
                        isCompliant ? 'text-green-400' : avgPercent >= 70 ? 'text-yellow-500' : 'text-red-400'
                      }`}>
                        {avgPercent}% avg
                      </span>
                      <span className={`text-[8.5px] font-mono uppercase font-bold px-1.5 py-0.5 mt-1 rounded ${
                        hasStateJumps ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                      }`}>
                        {hasStateJumps ? 'Coaching' : 'Stable'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Module 3: Dynamic Management Governance Directives (Full 12/12) */}
        <div className="lg:col-span-12 bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-3.5">
          <div className="flex items-center gap-1.5 text-blue-400 text-xs font-black uppercase tracking-widest border-b border-[#2A2D35] pb-2">
            <BookOpen className="h-4 w-4" />
            <span>AI EXECUTIVE MANAGEMENT GOVERNANCE BLUEPRINT STRATEGIES</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {managementRecommendations.map((rec, rIdx) => (
              <div key={rIdx} className="bg-[#0A0C0F] border border-[#2A2D35] p-3.5 rounded-xl flex items-start gap-3 shadow-inner">
                <div className="text-blue-400 text-base shrink-0 mt-0.5 font-bold">💡</div>
                <div className="space-y-1">
                  <span className="text-[9.5px] font-bold uppercase font-mono tracking-wider text-blue-400">Directive #{rIdx + 1}</span>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">{rec}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
