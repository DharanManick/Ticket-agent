import React, { useState, useMemo } from 'react';
import { TicketAuditReport, AuditHistoricalRun } from '../types';
import { sampleHistoricalRuns } from '../data/sampleHistoricalAuditData';
import { 
  User, 
  Users,
  AlertTriangle, 
  Search,
  Award,
  ShieldCheck,
  X
} from 'lucide-react';

interface AssigneeInsightsProps {
  reports: TicketAuditReport[];
  historyRuns?: AuditHistoricalRun[];
  triggerPopup: (msg: string, type: 'success' | 'info' | 'warning') => void;
}

export default function AssigneeInsights({ reports, historyRuns, triggerPopup }: AssigneeInsightsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  
  // Toggle view mode: 'assignee' (individual) vs 'manager' (hierarchical assignee manager)
  const [viewType, setViewType] = useState<'assignee' | 'manager'>('assignee');

  // Assignee performance modal popup state
  const [activeModalAssignee, setActiveModalAssignee] = useState<any | null>(null);

  // Compute effective ticket list (from current audit session, past historical runs, or demo benchmark)
  const effectiveReports = useMemo(() => {
    if (reports && reports.length > 0) return reports;
    if (historyRuns && historyRuns.length > 0) {
      return historyRuns.flatMap(r => r.tickets);
    }
    return sampleHistoricalRuns.flatMap(r => r.tickets);
  }, [reports, historyRuns]);

  // Aggregate assignee or manager compliance data
  const assigneeStats = useMemo(() => {
    const stats: Record<string, {
      name: string;
      totalReviewed: number;
      sumPercentage: number;
      perfectPasses: number; // >= 90
      warnings: number;       // 70 - 89
      criticalFails: number;  // < 70
      bypassedSLA: number;    // bypassed Solve Propose transition
      groupNames: Set<string>;
      tickets: TicketAuditReport[];
      assigneesManaged: Set<string>;
      assigneeScores: Record<string, { sum: number, count: number }>;
    }> = {};

    effectiveReports.forEach(r => {
      const name = (viewType === 'manager' 
        ? r.ticket.assigneeManager 
        : r.ticket.assignee) || (viewType === 'manager' ? 'Unassigned Manager' : 'Unassigned Associate');
      
      const isBypassed = r.ticket.activityLogs 
        ? (r.ticket.activityLogs.toLowerCase().includes('progress') && r.ticket.activityLogs.toLowerCase().includes('confirm') && !r.ticket.activityLogs.toLowerCase().includes('propose'))
        : false;

      if (!stats[name]) {
        stats[name] = {
          name,
          totalReviewed: 0,
          sumPercentage: 0,
          perfectPasses: 0,
          warnings: 0,
          criticalFails: 0,
          bypassedSLA: 0,
          groupNames: new Set<string>(),
          tickets: [],
          assigneesManaged: new Set<string>(),
          assigneeScores: {},
        };
      }

      stats[name].totalReviewed += 1;
      stats[name].sumPercentage += r.percentage;
      stats[name].tickets.push(r);
      if (r.ticket.assignmentGroup) {
        stats[name].groupNames.add(r.ticket.assignmentGroup);
      }

      const realAssignee = r.ticket.assignee || 'Unassigned Associate';
      stats[name].assigneesManaged.add(realAssignee);
      
      if (!stats[name].assigneeScores[realAssignee]) {
        stats[name].assigneeScores[realAssignee] = { sum: 0, count: 0 };
      }
      stats[name].assigneeScores[realAssignee].sum += r.percentage;
      stats[name].assigneeScores[realAssignee].count += 1;

      if (r.statusColor === 'Green') stats[name].perfectPasses += 1;
      else if (r.statusColor === 'Amber') stats[name].warnings += 1;
      else stats[name].criticalFails += 1;

      if (isBypassed) {
        stats[name].bypassedSLA += 1;
      }
    });

    return Object.values(stats).map(s => {
      const avgPercentage = Math.round(s.sumPercentage / s.totalReviewed);
      const groups = Array.from(s.groupNames).join(', ');
      
      let subTitle = groups || 'General Helpdesk';
      if (viewType === 'manager') {
        const directCount = s.assigneesManaged.size;
        subTitle = `Manages ${directCount} supervisor/analyst${directCount !== 1 ? 's' : ''} in queue`;
      }

      // Compile the direct reports sorted by their scores
      const directReports = Array.from(s.assigneesManaged).map((rep) => {
        const subStat = s.assigneeScores[rep];
        const avg = subStat ? Math.round(subStat.sum / subStat.count) : 0;
        return {
          name: rep,
          avgPercentage: avg,
          totalReviewed: subStat ? subStat.count : 0,
        };
      }).sort((a, b) => b.avgPercentage - a.avgPercentage);

      return {
        ...s,
        avgPercentage,
        groups,
        subTitle,
        directReports,
      };
    }).sort((a, b) => b.avgPercentage - a.avgPercentage);
  }, [effectiveReports, viewType]);



  // Automated smart reasoning response compiler
  const generateAIResponse = (query: string, stats: any[]): string => {
    const q = query.toLowerCase();
    const foundStat = stats.find(s => q.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(q));

    if (foundStat) {
      const avg = foundStat.avgPercentage;
      const total = foundStat.totalReviewed;
      const isTopTier = avg >= 90;
      
      if (viewType === 'manager') {
        let speech = `### Hierarchical Compliance Audit for Manager ${foundStat.name}\n`;
        speech += `**Portfolio Audit Score**: \`${avg}%\` (${total} incidents reviewed)\n`;
        speech += `- Department Status: ${avg >= 90 ? '🟢 Sovereign Compliance Authority' : avg >= 70 ? '🟡 Stable / Warning Benchmarks' : '🔴 Coaching remediation required'}\n\n`;
        
        speech += `#### 🏢 Direct Reports Standings\n`;
        foundStat.directReports.forEach((rep: any) => {
          const statusBullet = rep.avgPercentage >= 90 ? '🟢' : rep.avgPercentage >= 70 ? '🟡' : '🔴';
          speech += `- ${statusBullet} **${rep.name}**: \`${rep.avgPercentage}%\` Audit rating with ${rep.totalReviewed} closed cases.\n`;
        });
        speech += `\n`;

        if (isTopTier) {
          speech += `#### 🌟 Manager Commendations\n`;
          speech += `Exceptional oversight! **${foundStat.name}** is maintaining flawless adherence guidelines across their operations team. High engagement on checklist criteria matches standards.\n\n`;
          speech += `*Recommended Manager Slack Recognition outreach :*\n`;
          speech += `> "Hi ${foundStat.name.split(' ')[0]}! Checked our governance stats – fantastic job steering your team to a compliance average of **${avg}%**! Special kudos to your top performers. Thanks for prioritizing quality! 🏆"\n`;
        } else {
          speech += `#### 🛠️ Team-wide Quality Gaps & Targeted Remediation\n`;
          speech += `Strategic roll-up analysis shows these key compliance elements to address at the team standup:\n`;
          
          if (foundStat.bypassedSLA > 0) {
            speech += `- **Process Integrity Alert**: There were **${foundStat.bypassedSLA} cases** where team analysts skipped the 'Solve Propose' transition, closing incidents directly.\n`;
          }

          // Gather individual weaknesses
          const lowPerformers = foundStat.directReports.filter((r: any) => r.avgPercentage < 75);
          if (lowPerformers.length > 0) {
            speech += `- **Individual Coaching Targets**: Direct coaching is specifically recommended for **${lowPerformers.map((lp: any) => lp.name).join(', ')}** (scores < 75%) to review ServiceNow resolution code standards.\n`;
          }

          let missingKA = 0;
          foundStat.tickets.forEach((t: any) => {
            if (!t.ticket.knowledgeArticle) missingKA++;
          });
          if (missingKA > 0) {
            speech += `- **Systemic Missing Citations**: **${missingKA} closed tickets** had missing or unlinked corporate Knowledge Article references.\n`;
          }

          speech += `\n**Remediation Action Plan**: Arrange a 15-minute alignment sync with your queue supervisors to walk through the closure guidelines and review current CI matrices.`;
        }
        return speech;
      }

      // Individual Assignee Branch
      let speech = `### Compliance Summary for ${foundStat.name}\n`;
      speech += `**Combined Average Score**: \`${avg}%\` (${total} incidents reviewed)\n`;
      speech += `- Focus Alignment: ${avg >= 90 ? '🟢 Excellence Standard' : avg >= 70 ? '🟡 Warning Standby' : '🔴 Immediate coaching required'}\n\n`;

      if (isTopTier) {
        speech += `#### 🌟 Commendations & Strengths\n`;
        speech += `Outstanding work! **${foundStat.name}** is maintaining brilliant adherence to the general Rules Matrix. All mapped parameters show high closure accuracy.\n\n`;
        speech += `*Recommended Slack notification draft :*\n`;
        speech += `> "Hi ${foundStat.name.split(' ')[0]}! Checking in from Quality Audit Desk – amazing job achieving a compliance average of **${avg}%** in the latest governance batch! Your tickets display exceptional technical details. Keep up the high standard! 🏆"\n`;
      } else {
        speech += `#### 🛠️ Core Gaps & Resolution Analysis\n`;
        speech += `Strategic review isolated key areas to address for ${foundStat.name.split(' ')[0]}:\n`;
        
        if (foundStat.bypassedSLA > 0) {
          speech += `- **Bypassed Solve Propose**: The agent skipped 'Solve Propose' in ${foundStat.bypassedSLA} tickets. Transitioning directly from In-Progress to Close is an SLA failure.\n`;
        }
        
        let missingKA = 0;
        let missingCI = 0;
        foundStat.tickets.forEach((t: any) => {
          if (!t.ticket.knowledgeArticle) missingKA++;
          if (!t.ticket.affectedCi) missingCI++;
        });

        if (missingKA > 0) {
          speech += `- **Empty Knowledge Base Search**: ${missingKA} tickets missed Knowledge Article references during resolution.\n`;
        }
        if (missingCI > 0) {
          speech += `- **Missing Assets (CI)**: ${missingCI} ticket logs lacked a correctly mapped Affected Configuration Item.\n`;
        }

        speech += `\n**Remediation Steps**: Schedule standard walkthroughs, prompting the agent to review the compliance checkbox prior to ticket closures.`;
      }

      return speech;
    }

    if (q.includes('average') || q.includes('ranking') || q.includes('top') || q.includes('team')) {
      if (stats.length === 0) {
        return "No statistical benchmarks computed yet. Load spreadsheet dumps to evaluate team trends.";
      }
      
      const perfects = stats.filter(s => s.avgPercentage >= 90);
      const warnings = stats.filter(s => s.avgPercentage >= 70 && s.avgPercentage < 90);
      const lowerScores = stats.filter(s => s.avgPercentage < 70);

      let report = `### Team Performance Report Card\n\n`;
      
      if (perfects.length > 0) {
        report += `🟢 **Governance Excellence**:\n`;
        perfects.forEach(p => {
          report += `- **${p.name}**: \`${p.avgPercentage}%\` Audit compliance across ${p.totalReviewed} incidents.\n`;
        });
      }

      if (warnings.length > 0) {
        report += `\n🟡 **Stabilization Standby**:\n`;
        warnings.forEach(w => {
          report += `- **${w.name}**: \`${w.avgPercentage}%\` compliance average.\n`;
        });
      }

      if (lowerScores.length > 0) {
        report += `\n🔴 **Coaching Area Needed**:\n`;
        lowerScores.forEach(l => {
          report += `- **${l.name}**: \`${l.avgPercentage}%\` (Needs instruction regarding bypassed states or missing CI/KA parameters).\n`;
        });
      } else {
        report += `\n✨ Active performers are meeting compliance metrics cleanly. No failures reported.`;
      }

      return report;
    }

    return "For targeted insights, click any active performer's profile card to open the coaching workspace modal, or ask directly: 'Show team compliance summary'.";
  };

  const filteredStats = useMemo(() => {
    return assigneeStats.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.groups && s.groups.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [assigneeStats, searchTerm]);

  return (
    <div className="space-y-4 animate-fadeIn font-sans" id="assignee-insights">
      
      {/* Header Grid */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 rounded text-indigo-400 border border-indigo-500/15">
            {viewType === 'manager' ? (
              <Users className="h-4.5 w-4.5" />
            ) : (
              <User className="h-4.5 w-4.5" />
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
              Performers Compliance Directory
            </h3>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              Grouped metrics compiled from active ticket sheets
            </p>
          </div>
        </div>

        {/* 🔀 Hierarchical Toggle (individual vs manager) */}
        <div className="flex bg-[#0A0C0F] border border-[#2A2D35] p-1 rounded-lg shrink-0 self-start md:self-auto" id="governance-hierarchy-toggle">
          <button
            type="button"
            id="toggle-individual-assignees"
            onClick={() => {
              setViewType('assignee');
              setSelectedAssignee(null);
              setActiveModalAssignee(null);
              triggerPopup('Switched directory view to Individual Assignees', 'info');
            }}
            className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded-md transition-all uppercase tracking-wider cursor-pointer ${
              viewType === 'assignee'
                ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                : 'text-gray-400 hover:text-white hover:bg-[#1A1D24]/40'
            }`}
          >
            Individual Assignee
          </button>
          <button
            type="button"
            id="toggle-assignee-managers"
            onClick={() => {
              setViewType('manager');
              setSelectedAssignee(null);
              setActiveModalAssignee(null);
              triggerPopup('Switched directory view to Assignee Managers Hierarchical Index', 'info');
            }}
            className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded-md transition-all uppercase tracking-wider cursor-pointer ${
              viewType === 'manager'
                ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                : 'text-gray-400 hover:text-white hover:bg-[#1A1D24]/40'
            }`}
          >
            Assignee Manager
          </button>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-500" />
          <input
            id="assignee-directory-search-input"
            type="text"
            placeholder={viewType === 'manager' ? "Search Managers..." : "Search Assignee / Group..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-indigo-500 rounded-md pl-8 pr-3 py-1.5 text-xs text-white outline-none placeholder-gray-600 font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Team/Manager Performance Distribution Chart (Left Column) */}
        <div className="lg:col-span-4 bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-start">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono block">
              {viewType === 'manager' ? 'Manager Performance Distribution' : 'Team Performance Distribution'}
            </span>
            <p className="text-[11px] text-gray-400 mt-1 font-sans">
              {viewType === 'manager' 
                ? 'Average compliance percentage compiled across active assignment queue managers.' 
                : 'Average compliance percentage compiled for the top active team members.'}
            </p>
          </div>

          {filteredStats.length === 0 ? (
            <div className="flex-1 min-h-[180px] flex flex-col items-center justify-center border border-[#2A2D35] border-dashed rounded-lg bg-[#0A0C0F]/35 text-gray-500 text-xs italic">
              No performer metrics generated. Upload spreadsheet reports to populate directory.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {filteredStats.slice(0, 4).map((stat) => (
                <div key={stat.name} className="space-y-1.5" id={`distribution-${stat.name.replace(/\s+/g, '-')}`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-300 flex items-center space-x-1.5">
                      {viewType === 'manager' ? (
                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                      ) : (
                        <User className="h-3.5 w-3.5 text-indigo-400" />
                      )}
                      <span className="truncate max-w-[120px]" title={stat.name}>{stat.name}</span>
                    </span>
                    <span className="font-mono text-[10.5px] text-gray-400">
                      Audit Score: <strong className={stat.avgPercentage >= 90 ? 'text-green-400' : stat.avgPercentage >= 70 ? 'text-yellow-500' : 'text-red-400'}>{stat.avgPercentage}%</strong> 
                    </span>
                  </div>
                  <div className="relative w-full bg-[#0A0C0F] h-2 rounded-full overflow-hidden border border-[#2A2D35]/60">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        stat.avgPercentage >= 90 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                        stat.avgPercentage >= 70 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                        'bg-gradient-to-r from-red-600 to-rose-500'
                      }`}
                      style={{ width: `${stat.avgPercentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Directory List Grid Cards (Right Column - Wider!) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex justify-between items-center px-1 border-b border-[#2A2D35] pb-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              {viewType === 'manager' ? 'Management Performance Cards' : 'Performer Cards'} ({filteredStats.length})
            </span>
            <span className="text-[11px] text-indigo-400 font-mono">
              {viewType === 'manager' 
                ? 'Click card to open Manager Coaching Report' 
                : 'Click card to open Gemini coaching workspace'}
            </span>
          </div>

          {filteredStats.length === 0 ? (
            <div className="p-8 border border-[#2A2D35] border-dashed rounded-2xl bg-[#0A0C0F]/20 text-center text-gray-500 text-xs italic">
              No active performers match search filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
              {filteredStats.map((stat) => (
                <div 
                  key={stat.name}
                  onClick={() => {
                    setSelectedAssignee(stat.name);
                    setActiveModalAssignee(stat);
                    triggerPopup(viewType === 'manager' ? `Opening Manager quality portfolio for ${stat.name}` : `Opening comparative scorecard for ${stat.name}`, 'success');
                  }}
                  className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-4 shadow-md hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between space-y-3 shrink-0"
                  id={`card-${stat.name.replace(/\s+/g, '-')}`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="truncate pr-1">
                        <span className="text-[13px] font-bold text-white block truncate">{stat.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono truncate block" title={stat.subTitle}>
                          {stat.subTitle}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-[10.5px] font-mono font-bold rounded ${
                        stat.avgPercentage >= 90 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        stat.avgPercentage >= 70 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                        'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {stat.avgPercentage}%
                      </span>
                    </div>

                    {/* Score breakdown metrics pill */}
                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[9px] pt-1">
                      <div className="bg-[#0A0C0F] p-1 rounded border border-[#2A2D35]/40 text-green-400">
                        <span className="block font-bold">{stat.perfectPasses}</span>
                        <span className="text-gray-500 text-[7px] uppercase font-mono">Pass</span>
                      </div>
                      <div className="bg-[#0A0C0F] p-1 rounded border border-[#2A2D35]/40 text-yellow-500">
                        <span className="block font-bold">{stat.warnings}</span>
                        <span className="text-gray-500 text-[7px] uppercase font-mono">Warn</span>
                      </div>
                      <div className="bg-[#0A0C0F] p-1 rounded border border-[#2A2D35]/40 text-red-400">
                        <span className="block font-bold">{stat.criticalFails}</span>
                        <span className="text-gray-500 text-[7px] uppercase font-mono">Fail</span>
                      </div>
                    </div>
                  </div>

                  {stat.bypassedSLA > 0 && (
                    <div className="flex items-center space-x-1.5 bg-red-950/15 border border-red-900/30 rounded px-2.5 py-1 text-[9px] text-red-400">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-red-400" />
                      <span>SLA Transition bypassed in {stat.bypassedSLA} cases!</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. CENTERED FLOATING DIAGNOSIS COACHING POP-UP WINDOW MODAL (User Requested!) */}
      {activeModalAssignee && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" id="assignee-popup-modal">
          <div className="bg-[#15171C] border border-indigo-500/40 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative space-y-0 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-4 bg-[#1a1d24] border-b border-[#2A2D35] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-500/15 rounded text-indigo-400 border border-indigo-500/30">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    {viewType === 'manager' ? 'Management Performance Portfolio' : 'Performance Coaching Insight'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono">
                    {viewType === 'manager' ? 'Department quality index & standings' : 'Analyst quality alignment profiles'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalAssignee(null)}
                className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Score / Metrics banner inside popup */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-[#2A2D35]/65 pb-4">
                <div className="bg-[#0A0C0F] p-3 rounded-xl border border-[#2A2D35] text-center">
                  <span className="text-[9px] uppercase font-mono text-gray-500 block tracking-wider">
                    {viewType === 'manager' ? 'Manager Name' : 'Analyst Name'}
                  </span>
                  <span className="text-sm font-bold text-white block mt-0.5">{activeModalAssignee.name}</span>
                </div>
                
                <div className="bg-[#0A0C0F] p-3 rounded-xl border border-[#2A2D35] text-center">
                  <span className="text-[9px] uppercase font-mono text-gray-500 block tracking-wider">
                    {viewType === 'manager' ? 'Team Volume' : 'Active Group'}
                  </span>
                  <span className="text-xs font-semibold text-gray-300 block mt-1 truncate" title={viewType === 'manager' ? `${activeModalAssignee.directReports.length} Direct Analysts` : activeModalAssignee.groups}>
                    {viewType === 'manager' 
                      ? `${activeModalAssignee.directReports.length} Direct Analyst${activeModalAssignee.directReports.length !== 1 ? 's' : ''}` 
                      : (activeModalAssignee.groups || 'Service Desk')}
                  </span>
                </div>

                <div className="bg-[#0A0C0F] p-3 rounded-xl border border-[#2A2D35] text-center">
                  <span className="text-[9px] uppercase font-mono text-gray-500 block tracking-wider">Audit Score Average</span>
                  <span className={`text-base font-mono font-black block mt-0.5 ${
                    activeModalAssignee.avgPercentage >= 90 ? 'text-green-400' :
                    activeModalAssignee.avgPercentage >= 70 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {activeModalAssignee.avgPercentage}%
                  </span>
                </div>
              </div>

              {/* Status Points Breakdown */}
              <div className="grid grid-cols-4 gap-2 pt-1 text-center font-mono">
                <div className="bg-green-500/5 p-2 rounded-xl border border-green-500/20">
                  <span className="text-green-400 text-lg font-bold block">{activeModalAssignee.perfectPasses}</span>
                  <span className="text-gray-500 text-[8px] uppercase tracking-wider block">Pass cases</span>
                </div>
                <div className="bg-yellow-500/5 p-2 rounded-xl border border-yellow-500/20">
                  <span className="text-yellow-400 text-lg font-bold block">{activeModalAssignee.warnings}</span>
                  <span className="text-gray-500 text-[8px] uppercase tracking-wider block">Warning logs</span>
                </div>
                <div className="bg-red-500/5 p-2 rounded-xl border border-red-500/15">
                  <span className="text-red-400 text-lg font-bold block">{activeModalAssignee.criticalFails}</span>
                  <span className="text-gray-500 text-[8px] uppercase tracking-wider block">Failed runs</span>
                </div>
                <div className="bg-[#12141A] p-2 rounded-xl border border-[#2A2D35]">
                  <span className="text-[#A0A0A0] text-lg font-bold block">{activeModalAssignee.bypassedSLA}</span>
                  <span className="text-gray-500 text-[8px] uppercase tracking-wider block">Bypass SLOs</span>
                </div>
              </div>

              {/* Direct Reports List inside Modal for Managers */}
              {viewType === 'manager' && activeModalAssignee.directReports && activeModalAssignee.directReports.length > 0 && (
                <div className="bg-[#0A0C0F] rounded-xl border border-[#2A2D35]/50 p-4 space-y-2.5" id="manager-direct-reports-roster">
                  <span className="text-[9.5px] uppercase font-mono font-bold text-indigo-400 tracking-wider block">
                    Direct Reports Compliance Rosters ({activeModalAssignee.directReports.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {activeModalAssignee.directReports.map((rep: any) => (
                      <div 
                        key={rep.name} 
                        className="flex items-center justify-between p-2 bg-[#15171C] border border-[#2A2D35] rounded-lg text-xs hover:border-indigo-500/20 transition-all font-mono"
                      >
                        <span className="font-semibold text-gray-200 truncate pr-2" title={rep.name}>• {rep.name}</span>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-gray-500 text-[9px]">({rep.totalReviewed} batch{rep.totalReviewed !== 1 ? 'es' : ''})</span>
                          <span className={`font-bold text-[11px] ${
                            rep.avgPercentage >= 90 ? 'text-green-400' :
                            rep.avgPercentage >= 70 ? 'text-yellow-500' : 'text-red-400'
                          }`}>
                            {rep.avgPercentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Smart markdown text evaluated from local generator */}
              <div className="bg-[#0A0C0F] rounded-xl border border-[#2A2D35]/50 p-4 leading-relaxed text-xs">
                <span className="text-[9px] uppercase font-mono font-bold text-[#E0E0E0] tracking-widest block mb-2 opacity-65 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                  Gemini Coaching Diagnostic Report
                </span>
                <div className="space-y-3.5 pr-1 text-slate-300">
                  {generateAIResponse(activeModalAssignee.name, assigneeStats).split('\n').map((line, lIdx) => {
                    if (line.startsWith('### ')) return null; // already displayed in title
                    if (line.startsWith('**') || line.startsWith('#### ')) {
                      return <strong key={lIdx} className="text-slate-100 font-bold block mt-1.5">{line.replace(/\*\*|#### /g, '')}</strong>;
                    }
                    if (line.startsWith('- ')) {
                      return <li key={lIdx} className="list-disc pl-3 text-gray-300 ml-1 mt-0.5">{line.replace('- ', '')}</li>;
                    }
                    if (line.startsWith('> ')) {
                      const quoteText = line.replace('> ', '').replace(/"/g, '');
                      return (
                        <div key={lIdx} className="bg-indigo-650 bg-indigo-950/40 border-l-2 border-indigo-400 p-3 rounded-lg font-mono italic my-2 relative">
                          <p className="text-indigo-300 select-all pr-12 text-[10.5px]">"{quoteText}"</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(quoteText);
                              triggerPopup(`Slack message template copied!`, 'success');
                            }}
                            className="absolute right-2.5 top-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] px-2 py-1 rounded font-bold uppercase transition-colors"
                          >
                            Copy Outreach
                          </button>
                        </div>
                      );
                    }
                    return <p key={lIdx} className="text-gray-300 mt-0.5 leading-relaxed">{line}</p>;
                  })}
                </div>
              </div>

              {/* Bypassed notification */}
              {activeModalAssignee.bypassedSLA > 0 && (
                <div className="flex items-center space-x-2 bg-red-950/15 border border-red-900/35 rounded-lg p-3 text-red-400 text-xs font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>
                    {viewType === 'manager' 
                      ? `Notice: Process policy bypassed. Analysts under this manager bypassed 'Solve Propose' in ${activeModalAssignee.bypassedSLA} incident resolutions. Leadership oversight recommended.`
                      : `Notice: Skip policy bypass records alert. This analyst has bypassed the 'Solve Propose' transition in ${activeModalAssignee.bypassedSLA} incident resolutions. A review of ServiceNow logs is advised.`}
                  </span>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#1a1d24] border-t border-[#2A2D35] flex justify-end">
              <button
                onClick={() => setActiveModalAssignee(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-mono px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Done / Close Diagnostic
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
