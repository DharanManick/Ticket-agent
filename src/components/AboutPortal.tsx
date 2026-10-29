import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Cpu, 
  Layers, 
  Settings, 
  LineChart, 
  Sparkles, 
  MessageSquare, 
  Share2, 
  Send,
  History, 
  Database, 
  ShieldCheck, 
  Activity, 
  ArrowRight,
  Info,
  Edit2,
  Save,
  RefreshCw,
  Clock,
  Mail,
  Server,
  Terminal,
  Laptop,
  Globe,
  Download,
  Image as ImageIcon
} from 'lucide-react';
const systemArchitectureImg = '/src/assets/images/audit_architecture_1780476874314.png';

interface AboutPortalProps {
  currentReportsCount: number;
}

export default function AboutPortal({ currentReportsCount }: AboutPortalProps) {
  // States to enable/disable specific sections (persisted in localStorage)
  const [charterEnabled, setCharterEnabled] = useState<boolean>(() => {
    const val = localStorage.getItem('about_portal_charter_enabled');
    return val !== 'false';
  });

  const [archDiagramEnabled, setArchDiagramEnabled] = useState<boolean>(() => {
    const val = localStorage.getItem('about_portal_arch_diagram_enabled');
    return val !== 'false';
  });

  // Toggle callbacks that save state
  const toggleCharter = () => {
    const nextVal = !charterEnabled;
    setCharterEnabled(nextVal);
    localStorage.setItem('about_portal_charter_enabled', String(nextVal));
  };

  const toggleArchDiagram = () => {
    const nextVal = !archDiagramEnabled;
    setArchDiagramEnabled(nextVal);
    localStorage.setItem('about_portal_arch_diagram_enabled', String(nextVal));
  };

  // States for dynamic live sync with the portal database configurations
  const [syncTimestamp, setSyncTimestamp] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSummary, setSyncSummary] = useState<{
    rulesCount: number;
    overallRulesCount: number;
    ciCombinationsCount: number;
    resolutionQuestionsCount: number;
  } | null>(null);

  const fetchProjectData = async () => {
    setIsSyncing(true);
    try {
      const [rulesRes, ciRes, overallRes, qRes] = await Promise.all([
        fetch('/api/rules').then(r => r.json()).catch(() => ({ rules: [] })),
        fetch('/api/ci-combinations').then(r => r.json()).catch(() => ({ combinations: [] })),
        fetch('/api/overall-rules').then(r => r.json()).catch(() => ({ overallRules: [] })),
        fetch('/api/resolution-questions').then(r => r.json()).catch(() => ({ questions: [] }))
      ]);

      const updatedSummary = {
        rulesCount: Array.isArray(rulesRes.rules) ? rulesRes.rules.length : 0,
        ciCombinationsCount: Array.isArray(ciRes.combinations) ? ciRes.combinations.length : 0,
        overallRulesCount: Array.isArray(overallRes.overallRules) ? overallRes.overallRules.length : 0,
        resolutionQuestionsCount: Array.isArray(qRes.questions) ? qRes.questions.length : 0
      };

      setSyncSummary(updatedSummary);
      setSyncTimestamp(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error synchronizing with code/DB:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Synchronize on mount
  useEffect(() => {
    fetchProjectData();
  }, []);

  // Simple state to show/hide dynamic API traffic simulation or details
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [archTab, setArchTab] = useState<'topology' | 'pipeline' | 'stack'>('topology');

  // States for the Project Charter metadata derived from user-uploaded template
  const [charter, setCharter] = useState(() => {
    try {
      const saved = localStorage.getItem('corporate_project_charter');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      domain: "ITSM / ServiceNow Quality Assurance",
      spoc: "Dharan",
      teamName: "ServiceNow Quality Assurance",
      customerName: "",
      customerDesignation: "Director of Service Desk & Infrastructure",
      problemStatement: "ServiceNow incident audits are performed manually and retrospectively. This leads to substantial data oversight, unchecked state transitions (e.g. bypassing 'Resolved' audit validation stages), missing corporate Knowledge Articles (KAs), inaccurate causal CIs, and incomplete description documentation.",
      solutionProposal: "An automated real-time incident compliance portal utilizing fuzzy string mapping algorithms, deterministic local auditing gates across 13 core metrics, visual trends tracking, direct manager operational portfolios, and generative AI via Gemini 3.8 Flash for peer coaching synthesis.",
      potentialImpact: "Guarantees 100% resolution documentation audits. Eliminates external cloud data leaks by processing files entirely in the local sandbox browser environment. Delivers immediate, customized performance coaching actions for team managers, while reducing service ticket state bypasses by over 45%.",
      techStack: "React 18, Vite, Tailwind CSS, Recharts, Lucide, Gemini 3.8 Flash SDK",
      squadLocation: "",
      teamNameBottom: ""
    };
  });

  const [isEditingCharter, setIsEditingCharter] = useState<boolean>(false);
  const [chTheme, setChTheme] = useState<'slide' | 'dark'>('slide'); // Slide Replica (light screenshot theme) vs Premium Dark

  // Helper to save charter edits
  const handleSaveCharter = () => {
    try {
      localStorage.setItem('corporate_project_charter', JSON.stringify(charter));
      setIsEditingCharter(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetCharter = () => {
    const defaults = {
      domain: "ITSM / ServiceNow Quality Assurance",
      spoc: "Dharan",
      teamName: "ServiceNow Quality Assurance",
      customerName: "",
      customerDesignation: "Director of Service Desk & Infrastructure",
      problemStatement: "ServiceNow incident audits are performed manually and retrospectively. This leads to substantial data oversight, unchecked state transitions (e.g. bypassing 'Resolved' audit validation stages), missing corporate Knowledge Articles (KAs), inaccurate causal CIs, and incomplete description documentation.",
      solutionProposal: "An automated real-time incident compliance portal utilizing fuzzy string mapping algorithms, deterministic local auditing gates across 13 core metrics, visual trends tracking, direct manager operational portfolios, and generative AI via Gemini 3.8 Flash for peer coaching synthesis.",
      potentialImpact: "Guarantees 100% resolution documentation audits. Eliminates external cloud data leaks by processing files entirely in the local sandbox browser environment. Delivers immediate, customized performance coaching actions for team managers, while reducing service ticket state bypasses by over 45%.",
      techStack: "React 18, Vite, Tailwind CSS, Recharts, Lucide, Gemini 3.8 Flash SDK",
      squadLocation: "",
      teamNameBottom: ""
    };
    setCharter(defaults);
    localStorage.setItem('corporate_project_charter', JSON.stringify(defaults));
    setIsEditingCharter(false);
  };

  // Detail specifications about the underlying architecture
  const componentsList = [
    {
      name: "Remittance & Upload Desk",
      icon: <Database className="h-4 w-4 text-teal-400" />,
      role: "Central Administration Room & Template Hub",
      details: "A centralized workspace under the Control Panel for uploading incident spreadsheets, downloading standard validation Excel structures, setting group-specific custom target email directories, and adjusting keyword matrix parameters."
    },
    {
      name: "Incident Excel Dump Processor",
      icon: <Layers className="h-4 w-4 text-sky-400" />,
      role: "Upload section parsing & fuzzy mapping",
      details: "Translates ServiceNow spreadsheet sheets matching fuzzy column headers into certified structures. Validates that critical required fields are present and triggers compliance run blocks dynamically."
    },
    {
      name: "Governance Analytics Engine",
      icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
      role: "13 Core Regulations verification module",
      details: "Evaluates incident entries locally across text thresholds, P-Code alignment, missing Knowledge Articles keys, closure code criteria, and suspected CI pairs configuration rules."
    },
    {
      name: "MS Teams Format Validator",
      icon: <Cpu className="h-4 w-4 text-violet-400" />,
      role: "Regex Pattern Matching Sentinel",
      details: "Validates Webhooks in real-time format patterns matching enterprise-assigned structures. Safeguards routing channels prior to dispatching cards to production team channels."
    },
    {
      name: "Trends & Analytical Views",
      icon: <LineChart className="h-4 w-4 text-purple-400" />,
      role: "Recharts-driven interactive charts",
      details: "Reveals chronologically standard audit compliance scores over resolution times, categorized flag counts (such as missing KAs or bypassed states), and alerts to process outliers."
    },
    {
      name: "Hierarchy Performance Directory",
      icon: <Activity className="h-4 w-4 text-indigo-400" />,
      role: "Individual & Managerial metrics dashboard",
      details: "Collates team quality metrics dynamically. Provides an 'Assignee Manager' view mode to compile strategic queue performance cards for direct analyst portfolios."
    },
    {
      name: "AI Assistant",
      icon: <MessageSquare className="h-4 w-4 text-amber-400" />,
      role: "Contextual reasoning and customer support",
      details: "Loads currently verified compliance issues to allow users to ask general organizational health queries, diagnose systemic gaps, and craft customized team-wide performance templates."
    },
    {
      name: "Historical Run Registries",
      icon: <History className="h-4 w-4 text-rose-400" />,
      role: "State persistence tracker and Trash backup",
      details: "Saves historic audit snapshots with complete local storage caches, permitting comparative evaluations and standard backup recovery controls."
    },
    {
      name: "Teams Webhook Secure HTTP Proxy",
      icon: <Send className="h-4 w-4 text-blue-400" />,
      role: "CORS-Avoiding API Proxy Gateway",
      details: "Routes manual and bulk Microsoft Teams compliance notifications through an Express server proxy route, avoiding browser CORS locks and ensuring 100% reliable webhook delivery."
    },
    {
      name: "Anti-Data Loss Guardrails",
      icon: <ShieldCheck className="h-4 w-4 text-rose-500" />,
      role: "Action confirmation interceptors",
      details: "Configures animated spring-motion confirmation modal alerts across delete operations (perm-delete active runs, empty history trash, or delete validation matrix rules) protecting users from accidental payload loss."
    }
  ];

  const aiFeatures = [
    {
      title: "Context-Aware Performance Coaching",
      purpose: "Generates tailored workspace coaching scripts based on an individual analyst's metric score, standard operational gaps (e.g. bypassing 'Resolved'), and missing KAs. Outputs directly into formatted Slack recognition drafts for supervisors."
    },
    {
      title: "Hierarchical Oversight Synthesis",
      purpose: "Aggregates multi-assignee performance under designated managers. Translates team-wide failure points into executive summary action plans with remedial standup talking points."
    },
    {
      title: "Live Conversational Auditing Advisor",
      purpose: "Exposes loaded records to real-time prompt queries. Provides semantic advice on specific incident states, audit patterns, and corrective measures without needing static logic overrides."
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn font-sans" id="about-portal-view">
      {/* Hero Welcome banner */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 uppercase tracking-widest">
                System Architecture Manual
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-widest">
                Internal Spec 2026
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              About ServiceNow Governance Audit Portal
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              This interactive operations suite is engineered to audit Incident dump exports, ensuring standard quality standards are enforced. By parsing operational details dynamically, it bridges compliance gaps before logs reach permanent archives.
            </p>
          </div>
          <div className="flex bg-[#0A0C0F] border border-[#2A2D35] p-3 rounded-lg shrink-0 flex-col items-center justify-center font-mono min-w-[140px]">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider">Reports Loaded</span>
            <span className="text-2xl font-black text-indigo-400 mt-1">{currentReportsCount}</span>
            <span className="text-[8px] text-emerald-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Parser Ready
            </span>
          </div>
        </div>
      </div>

      {/* 🔮 CONTROL ROOM: REAL-TIME PORTAL SYNCHRONIZATION */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4 animate-fadeIn" id="portal-session-control-room">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A2D35] pb-3">
          <div>
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
              <Settings className="h-4 w-4 animate-spin-slow" />
              ⚡ Control Room: Real-Time Configuration & Audit Sync
            </h3>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              Synchronize documentation metrics with live code and database configurations instantaneously.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={fetchProjectData}
              disabled={isSyncing}
              className="px-3.5 py-1.5 text-[11px] font-mono font-bold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:cursor-not-allowed uppercase hover:scale-[1.02]"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-white ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronizing...' : 'Sync with DB/Code'}
            </button>
          </div>
        </div>

        <div className="pt-1">
          {/* Live Database Metrics Status */}
          <div className="space-y-2.5 bg-muted/40 border border-border rounded-xl p-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-[10.5px] font-bold font-mono text-foreground flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                Live Resource Counts (Code & Database Rules)
              </span>
              <span className="text-[8.5px] font-mono text-muted-foreground">
                Sync: <span className="text-emerald-600 dark:text-emerald-400">{syncTimestamp || 'Loading...'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-card border border-border p-2 rounded flex justify-between items-center shadow-2xs">
                <span className="text-muted-foreground text-[10px]">Checkpoint Rules</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {syncSummary ? syncSummary.overallRulesCount : '---'}
                </span>
              </div>
              <div className="bg-card border border-border p-2 rounded flex justify-between items-center shadow-2xs">
                <span className="text-muted-foreground text-[10px]">Keywords Mapped</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  {syncSummary ? syncSummary.rulesCount : '---'}
                </span>
              </div>
              <div className="bg-card border border-border p-2 rounded flex justify-between items-center shadow-2xs">
                <span className="text-muted-foreground text-[10px]">CMDB CI Map Pairs</span>
                <span className="font-bold text-violet-600 dark:text-violet-400">
                  {syncSummary ? syncSummary.ciCombinationsCount : '---'}
                </span>
              </div>
              <div className="bg-card border border-border p-2 rounded flex justify-between items-center shadow-2xs">
                <span className="text-muted-foreground text-[10px]">Audit Checkpoints</span>
                <span className="font-bold text-amber-600 dark:text-amber-500">
                  {syncSummary ? syncSummary.resolutionQuestionsCount : '---'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Charter visual slide replication section */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4 animate-fadeIn" id="project-charter-wrapper">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A2D35] pb-3">
          <div>
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 bg-blue-500 h-2 rounded-sm"></span>
              🏆 Project Delivery Alignment Charter
            </h3>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              Live interactive replica of the strategic project alignment slide for leadership review.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleCharter}
              className={`px-2.5 py-1.5 text-[10px] font-mono font-bold rounded border transition-all cursor-pointer shadow-2xs ${
                charterEnabled
                  ? 'border-border bg-card hover:bg-muted text-foreground'
                  : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
              }`}
            >
              {charterEnabled ? '👁️ Hide' : '👁️ Show'}
            </button>

            {charterEnabled && (
              <>
                <button
                  type="button"
                  onClick={() => setChTheme(chTheme === 'slide' ? 'dark' : 'slide')}
                  className="px-2.5 py-1.5 text-[10px] font-mono font-bold rounded border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition-all cursor-pointer"
                >
                  🎨 Theme: {chTheme === 'slide' ? 'Light Slide Replica' : 'Premium Dark Theme'}
                </button>

                {isEditingCharter ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSaveCharter}
                      className="px-2.5 py-1.5 text-[10px] font-mono font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1 cursor-pointer shadow-md"
                    >
                      <Save className="h-3 w-3" />
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleResetCharter}
                      className="px-2.5 py-1.5 text-[10px] font-mono font-bold rounded border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-all flex items-center gap-1 cursor-pointer"
                      title="Reset to project defaults"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Reset Defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingCharter(false)}
                      className="px-2.5 py-1.5 text-[10px] font-mono font-bold rounded bg-zinc-700 hover:bg-zinc-650 text-gray-200 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingCharter(true)}
                    className="px-2.5 py-1.5 text-[10px] font-mono font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit Slide details
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {charterEnabled ? (
          <div 
          className={`transition-all duration-300 rounded-xl overflow-hidden shadow-2xl relative ${
            chTheme === 'slide' 
              ? 'bg-[#F4F7FB] text-slate-800 border-[3.5px] border-blue-600 p-3 sm:p-5' 
              : 'bg-[#0A0C0F] text-gray-200 border border-[#2A2D35] p-3 sm:p-5'
          }`}
          id="corporate-slide-canvas"
        >
          {/* Classification banner */}
          <div className="flex justify-between items-center text-[8px] sm:text-[9.5px] font-mono opacity-80 uppercase tracking-widest px-1 mb-3">
            <span></span>
            {isEditingCharter && (
              <span className="text-amber-500 animate-pulse font-bold text-[9px]">
                ⚠️ Interactive Edit Mode Active
              </span>
            )}
          </div>

          <div className="space-y-3">
            
            {/* Top Metadata Row: 5 blocks */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              <div className={`p-2.5 rounded text-left ${
                chTheme === 'slide' 
                  ? 'bg-[#DBE6F2] border border-[#B8CADF] text-slate-800' 
                  : 'bg-[#15171C] border border-[#2A2D35] text-gray-200'
              }`}>
                <span className="text-[8px] sm:text-[9.5px] uppercase font-bold tracking-wider opacity-70 block">Domain/ Business area:</span>
                {isEditingCharter ? (
                  <input
                    type="text"
                    value={charter.domain}
                    onChange={(e) => setCharter({ ...charter, domain: e.target.value })}
                    className="w-full bg-[#0A0C0F] text-white text-[11px] border border-[#2A2D35] rounded px-1.5 py-0.5 mt-1 font-mono outline-none"
                  />
                ) : (
                  <span className="text-[10.5px] sm:text-[11.5px] font-bold block mt-1 truncate" title={charter.domain}>{charter.domain}</span>
                )}
              </div>

              <div className={`p-2.5 rounded text-left ${
                chTheme === 'slide' 
                  ? 'bg-[#DBE6F2] border border-[#B8CADF] text-slate-800' 
                  : 'bg-[#15171C] border border-[#2A2D35] text-gray-200'
              }`}>
                <span className="text-[8px] sm:text-[9.5px] uppercase font-bold tracking-wider opacity-70 block">SPOC:</span>
                {isEditingCharter ? (
                  <input
                    type="text"
                    value={charter.spoc}
                    onChange={(e) => setCharter({ ...charter, spoc: e.target.value })}
                    className="w-full bg-[#0A0C0F] text-white text-[11px] border border-[#2A2D35] rounded px-1.5 py-0.5 mt-1 font-mono outline-none"
                  />
                ) : (
                  <span className="text-[10.5px] sm:text-[11.5px] font-bold block mt-1 truncate" title={charter.spoc}>{charter.spoc}</span>
                )}
              </div>

              <div className={`p-2.5 rounded text-left ${
                chTheme === 'slide' 
                  ? 'bg-[#DBE6F2] border border-[#B8CADF] text-slate-800' 
                  : 'bg-[#15171C] border border-[#2A2D35] text-gray-200'
              }`}>
                <span className="text-[8px] sm:text-[9.5px] uppercase font-bold tracking-wider opacity-70 block">Team Name:</span>
                {isEditingCharter ? (
                  <input
                    type="text"
                    value={charter.teamName}
                    onChange={(e) => setCharter({ ...charter, teamName: e.target.value })}
                    className="w-full bg-[#0A0C0F] text-white text-[11px] border border-[#2A2D35] rounded px-1.5 py-0.5 mt-1 font-mono outline-none"
                  />
                ) : (
                  <span className="text-[10.5px] sm:text-[11.5px] font-bold block mt-1 truncate" title={charter.teamName}>{charter.teamName}</span>
                )}
              </div>

              <div className={`p-2.5 rounded text-left ${
                chTheme === 'slide' 
                  ? 'bg-[#DBE6F2] border border-[#B8CADF] text-slate-800' 
                  : 'bg-[#15171C] border border-[#2A2D35] text-gray-200'
              }`}>
                <span className="text-[8px] sm:text-[9.5px] uppercase font-bold tracking-wider opacity-70 block">Customer Name(s):::</span>
                {isEditingCharter ? (
                  <input
                    type="text"
                    value={charter.customerName}
                    onChange={(e) => setCharter({ ...charter, customerName: e.target.value })}
                    className="w-full bg-[#0A0C0F] text-white text-[11px] border border-[#2A2D35] rounded px-1.5 py-0.5 mt-1 font-mono outline-none"
                  />
                ) : (
                  <span className="text-[10.5px] sm:text-[11.5px] font-bold block mt-1 truncate" title={charter.customerName}>{charter.customerName}</span>
                )}
              </div>

              <div className={`col-span-2 md:col-span-1 p-2.5 rounded text-left ${
                chTheme === 'slide' 
                  ? 'bg-[#DBE6F2] border border-[#B8CADF] text-slate-800' 
                  : 'bg-[#15171C] border border-[#2A2D35] text-gray-200'
              }`}>
                <span className="text-[8px] sm:text-[9.5px] uppercase font-bold tracking-wider opacity-70 block">Customer Designation:</span>
                {isEditingCharter ? (
                  <input
                    type="text"
                    value={charter.customerDesignation}
                    onChange={(e) => setCharter({ ...charter, customerDesignation: e.target.value })}
                    className="w-full bg-[#0A0C0F] text-white text-[11px] border border-[#2A2D35] rounded px-1.5 py-0.5 mt-1 font-mono outline-none"
                  />
                ) : (
                  <span className="text-[10.5px] sm:text-[11.5px] font-bold block mt-1 truncate" title={charter.customerDesignation}>{charter.customerDesignation}</span>
                )}
              </div>
            </div>

            {/* Problem Statement Block (Light Blue Box) */}
            <div className={`p-4 rounded-lg text-left ${
              chTheme === 'slide' 
                ? 'bg-[#DBE6F2] border border-[#B8CADF] text-slate-800' 
                : 'bg-indigo-950/15 border border-indigo-500/15 text-indigo-100'
            }`}>
              <h4 className="text-[11.5px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5">Problem Statement:</h4>
              {isEditingCharter ? (
                <textarea
                  rows={3}
                  value={charter.problemStatement}
                  onChange={(e) => setCharter({ ...charter, problemStatement: e.target.value })}
                  className="w-full bg-[#0A0C0F] text-white text-xs border border-[#2A2D35] rounded px-2.5 py-1.5 mt-1 font-mono outline-none resize-none"
                />
              ) : (
                <p className="text-[11px] sm:text-xs leading-relaxed font-sans">{charter.problemStatement}</p>
              )}
            </div>

            {/* Solution Proposal (Light Lime green) */}
            <div className={`p-4 rounded-lg text-left ${
              chTheme === 'slide' 
                ? 'bg-[#E2ECC8] border border-[#CCDCA9] text-slate-800' 
                : 'bg-emerald-950/20 border border-emerald-500/20 text-emerald-100'
            }`}>
              <h4 className="text-[11.5px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5">Solution Proposal:</h4>
              {isEditingCharter ? (
                <textarea
                  rows={3}
                  value={charter.solutionProposal}
                  onChange={(e) => setCharter({ ...charter, solutionProposal: e.target.value })}
                  className="w-full bg-[#0A0C0F] text-white text-xs border border-[#2A2D35] rounded px-2.5 py-1.5 mt-1 font-mono outline-none resize-none"
                />
              ) : (
                <p className="text-[11px] sm:text-xs leading-relaxed font-sans">{charter.solutionProposal}</p>
              )}
            </div>

            {/* Potential Impact (Deep Royal Blue) */}
            <div className={`p-4 rounded-lg text-left ${
              chTheme === 'slide' 
                ? 'bg-[#2A75C0] border border-[#1E62A6] text-white shadow-inner' 
                : 'bg-blue-950/30 border border-blue-500/20 text-blue-100'
            }`}>
              <h4 className={`text-[11.5px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5 ${chTheme === 'slide' ? 'text-white' : 'text-blue-300'}`}>Potential Impact:</h4>
              {isEditingCharter ? (
                <textarea
                  rows={3}
                  value={charter.potentialImpact}
                  onChange={(e) => setCharter({ ...charter, potentialImpact: e.target.value })}
                  className="w-full bg-[#0A0C0F] text-white text-xs border border-[#2A2D35] rounded px-2.5 py-1.5 mt-1 font-mono outline-none resize-none"
                />
              ) : (
                <p className="text-[11px] sm:text-xs leading-relaxed font-sans">{charter.potentialImpact}</p>
              )}
            </div>

            {/* Bottom Row elements: Tech Stack, Location, Bottom team name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className={`p-2.5 rounded text-left ${
                chTheme === 'slide' 
                  ? 'bg-[#DBE6F2] border border-[#B8CADF] text-slate-800' 
                  : 'bg-[#15171C] border border-[#2A2D35] text-gray-200'
              }`}>
                <span className="text-[8px] sm:text-[9.5px] uppercase font-bold tracking-wider opacity-70 block">Tech Stack:</span>
                {isEditingCharter ? (
                  <input
                    type="text"
                    value={charter.techStack}
                    onChange={(e) => setCharter({ ...charter, techStack: e.target.value })}
                    className="w-full bg-[#0A0C0F] text-white text-[11px] border border-[#2A2D35] rounded px-1.5 py-0.5 mt-1 font-mono outline-none"
                  />
                ) : (
                  <span className="text-[10.5px] sm:text-[11.5px] font-bold block mt-1 truncate" title={charter.techStack}>{charter.techStack}</span>
                )}
              </div>

              <div className={`p-2.5 rounded text-left ${
                chTheme === 'slide' 
                  ? 'bg-[#DBE6F2] border border-[#B8CADF] text-slate-800' 
                  : 'bg-[#15171C] border border-[#2A2D35] text-gray-200'
              }`}>
                <span className="text-[8px] sm:text-[9.5px] uppercase font-bold tracking-wider opacity-70 block">Squad Location:</span>
                {isEditingCharter ? (
                  <input
                    type="text"
                    value={charter.squadLocation}
                    onChange={(e) => setCharter({ ...charter, squadLocation: e.target.value })}
                    className="w-full bg-[#0A0C0F] text-white text-[11px] border border-[#2A2D35] rounded px-1.5 py-0.5 mt-1 font-mono outline-none"
                  />
                ) : (
                  <span className="text-[10.5px] sm:text-[11.5px] font-bold block mt-1 truncate" title={charter.squadLocation}>{charter.squadLocation}</span>
                )}
              </div>

              <div className={`p-2.5 rounded text-left ${
                chTheme === 'slide' 
                  ? 'bg-[#DBE6F2] border border-[#B8CADF] text-slate-800' 
                  : 'bg-[#15171C] border border-[#2A2D35] text-gray-200'
              }`}>
                <span className="text-[8px] sm:text-[9.5px] uppercase font-bold tracking-wider opacity-70 block">Team name:</span>
                {isEditingCharter ? (
                  <input
                    type="text"
                    value={charter.teamNameBottom}
                    onChange={(e) => setCharter({ ...charter, teamNameBottom: e.target.value })}
                    className="w-full bg-[#0A0C0F] text-white text-[11px] border border-[#2A2D35] rounded px-1.5 py-0.5 mt-1 font-mono outline-none"
                  />
                ) : (
                  <span className="text-[10.5px] sm:text-[11.5px] font-bold block mt-1 truncate" title={charter.teamNameBottom}>{charter.teamNameBottom}</span>
                )}
              </div>
            </div>

            {/* Slide Footer Row */}
            <div className="border-t border-slate-300/40 pt-1 mt-1.5 flex justify-end">
              <span className="text-[9px] text-gray-400 italic">Project Roadmap Alignment Slide</span>
            </div>

          </div>
        </div>
        ) : (
          <div className="text-center text-xs font-mono text-muted-foreground py-4 bg-muted/40 rounded-xl border border-dashed border-border" id="charter-collapsible-hidden">
            🏆 The alignment slide content is currently hidden. Click <span className="text-indigo-600 dark:text-blue-400 font-bold">👁️ Show</span> in the section header above to expand.
          </div>
        )}
      </div>

      {/* 📊 INTERACTIVE PROJECT ARCHITECTURE BLUEPRINT */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-card space-y-4 animate-fadeIn" id="project-architecture-blueprint">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              🛠️ ServiceNow Ticket quality Audit Architecture Diagram
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              Interactive high-fidelity overview of frontend components, Express backend proxy endpoints, and third-party APIs.
            </p>
          </div>

          {/* Tab buttons & Visual Diagram Toggle option */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 select-none">
            <div className="flex bg-muted/40 border border-border p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setArchTab('topology')}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                  archTab === 'topology' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Topology Diagram
              </button>
              <button
                type="button"
                onClick={() => setArchTab('pipeline')}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                  archTab === 'pipeline' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Data Process Flows
              </button>
              <button
                type="button"
                onClick={() => setArchTab('stack')}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                  archTab === 'stack' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tech Stack Details
              </button>
            </div>
          </div>
        </div>

        {/* Content 1: System Topology Diagram */}
        {archTab === 'topology' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Legend info block */}
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border justify-center sm:justify-start">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm inline-block"></span>
                Browser Sandbox
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-purple-500 rounded-sm inline-block"></span>
                Full-Stack Server
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block"></span>
                External Services
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-indigo-400 animate-pulse"></span>
                Data Routing Path
              </span>
            </div>

            {/* Glowing Interactive Topology Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative p-1">
              
              {/* Connection overlay lines for visual aesthetic (only shown on desktop viewports) */}
              <div className="hidden lg:block absolute inset-0 pointer-events-none z-0">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  {/* Client to Server connection path */}
                  <path 
                    d="M 280,180 L 390,180" 
                    fill="none" 
                    stroke="#4F46E5" 
                    strokeWidth="2" 
                    strokeDasharray="4 4"
                    className="animate-[dash_20s_linear_infinite]" 
                  />
                  {/* Client to Server alternative path (Rules saved) */}
                  <path 
                    d="M 280,310 L 390,260" 
                    fill="none" 
                    stroke="#4F46E5" 
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  {/* Server to External API channels */}
                  <path 
                    d="M 680,140 L 780,105" 
                    fill="none" 
                    stroke="#10B981" 
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  <path 
                    d="M 680,210 L 780,210" 
                    fill="none" 
                    stroke="#10B981" 
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className="animate-[dash_15s_linear_infinite]"
                  />
                  <path 
                    d="M 680,285 L 780,315" 
                    fill="none" 
                    stroke="#10B981" 
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                </svg>
              </div>

              {/* TIER 1: CLIENT WEB APP (SPA) */}
              <div className="bg-[#0A0C0F] border border-blue-500/20 rounded-xl p-4.5 space-y-3 shadow-lg z-10 hover:border-blue-550/40 transition-all relative">
                <div className="flex items-center space-x-2 pb-2.5 border-b border-[#2A2D35]/40 justify-between">
                  <div className="flex items-center space-x-2">
                    <Laptop className="h-4.5 w-4.5 text-blue-400" />
                    <span className="text-xs font-bold font-mono text-white tracking-tight">Client-Side Tier</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[8px] uppercase tracking-wider font-mono">
                    Local Sandbox
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-2.5 bg-[#12151D] border border-blue-500/10 rounded-lg text-[11px]">
                    <span className="font-bold text-blue-300 block mb-0.5">📂 Excel Ingest Desk (CSV/XLSX)</span>
                    <span className="text-gray-400 leading-normal text-[10px] block font-sans">
                      Reads ServiceNow files. Executes semantic **Fuzzy column headers mapper** matching synonyms to standardized formats locally.
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#12151D] border border-blue-500/10 rounded-lg text-[11px]">
                    <span className="font-bold text-blue-300 block mb-0.5">🛡️ Audit Regulations Compiler</span>
                    <span className="text-gray-400 leading-normal text-[10px] block font-sans">
                      Evaluates 13 critical ITSM validation metrics (P-codes, bypassed states, knowledge item checks) with sub-millisecond execution.
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#12151D] border border-blue-500/10 rounded-lg text-[11px]">
                    <span className="font-bold text-blue-300 block mb-0.5">💾 Browser Local Storage Cache</span>
                    <span className="text-gray-400 leading-normal text-[10px] block font-sans">
                      Writelocks matrix configurations, compliance trends, historical records lists, and trash items locally.
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#12151D] border border-blue-500/10 rounded-lg text-[11px]">
                    <span className="font-bold text-blue-300 block mb-0.5">📊 Recharts Visualization Board</span>
                    <span className="text-gray-400 leading-normal text-[10px] block font-sans">
                      Renders ticket duration trend curves, defect histograms, and performance standings without network lags.
                    </span>
                  </div>
                </div>
              </div>

              {/* TIER 2: SERVER BACKEND (EXPRESS APP GATEWAY) */}
              <div className="bg-[#0A0C0F] border border-purple-500/20 rounded-xl p-4.5 space-y-3 shadow-lg z-10 hover:border-purple-500/40 transition-all relative">
                <div className="flex items-center space-x-2 pb-2.5 border-b border-[#2A2D35]/40 justify-between">
                  <div className="flex items-center space-x-2">
                    <Server className="h-4.5 w-4.5 text-purple-400" />
                    <span className="text-xs font-bold font-mono text-white tracking-tight">Full-Stack Server Tier</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[8px] uppercase tracking-wider font-mono">
                    Express Gateway
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-2.5 bg-[#15131C] border border-purple-500/10 rounded-lg text-[11px]">
                    <span className="font-bold text-purple-300 block mb-0.5">🌐 CORS Webhook Envoy Proxy</span>
                    <span className="text-gray-400 leading-normal text-[10px] block font-sans">
                      Exposes a dedicated secure route <code className="text-purple-400 text-[9px]">/api/dispatch-teams-webhook</code> matching request payloads. Bypasses client-side browser CORS blocking.
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#15131C] border border-purple-500/10 rounded-lg text-[11px]">
                    <span className="font-bold text-purple-300 block mb-0.5">🤖 Gemini 3.8 LLM Connector</span>
                    <span className="text-gray-400 leading-normal text-[10px] block font-sans">
                      Hosts background express routers <code className="text-[9.5px] text-purple-400">/api/teams-format-bot</code> and <code className="text-[9.5px] text-purple-400">/api/chat-bot</code> to inject contextual incident parameters into Gemini client loaders.
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#15131C] border border-purple-500/10 rounded-lg text-[11px]">
                    <span className="font-bold text-purple-300 block mb-0.5">🧱 Database Mock Storage</span>
                    <span className="text-gray-400 leading-normal text-[10px] block font-sans">
                      Synchronizes settings, audit questions matrix rules, and Affected CI mapping profiles gracefully.
                    </span>
                  </div>
                </div>
              </div>

              {/* TIER 3: EXTERNAL SERVICES OVER THE CLOUD */}
              <div className="bg-[#0A0C0F] border border-emerald-500/20 rounded-xl p-4.5 space-y-3 shadow-lg z-10 hover:border-emerald-500/40 transition-all relative">
                <div className="flex items-center space-x-2 pb-2.5 border-b border-[#2A2D35]/40 justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4.5 w-4.5 text-emerald-400" />
                    <span className="text-xs font-bold font-mono text-white tracking-tight">Upstream Systems Tier</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[8px] uppercase tracking-wider font-mono">
                    Cloud APIs
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-2.5 bg-[#121614] border border-emerald-500/10 rounded-lg text-[11px]">
                    <span className="font-bold text-emerald-300 block mb-0.5">🏢 Microsoft Teams Webhooks</span>
                    <span className="text-gray-400 leading-normal text-[10px] block font-sans">
                      Accepts sanitized JSON Adaptive message cards, instantly displaying rich compliance and audit infractions alerts in team chats.
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#121614] border border-emerald-500/10 rounded-lg text-[11px]">
                    <span className="font-bold text-emerald-300 block mb-0.5 font-mono">🧠 Gemini AI LLM Services</span>
                    <span className="text-gray-400 leading-normal text-[10px] block font-sans">
                      Ingests complex validation matrices to synthesize high-impact peer coaching tips & managerial standup talking summaries.
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* If dynamic high-fidelity diagram is enabled, show it right here inline at the bottom of the Topology Grid */}
            {archDiagramEnabled ? (
              <div className="bg-[#0C0E12]/80 border border-[#2A2D35]/60 p-4.5 rounded-xl space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A2D35]/50 pb-2.5">
                  <div className="flex items-center space-x-2.5 flex-wrap gap-2">
                    <span className="p-1 px-2 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-xs font-bold">
                      HIGH FIDELITY DIAGRAM
                    </span>
                    <span className="text-xs text-gray-400 font-sans font-medium">ServiceNow Ticket Quality Audit Visual Architecture</span>
                    <button
                      type="button"
                      onClick={toggleArchDiagram}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold text-gray-500 hover:text-[#FF5555] bg-black/30 border border-[#2A2D35] hover:bg-red-500/5 hover:border-red-550/20 rounded-md transition-all cursor-pointer"
                      title="Hide the visual technical blueprint illustration"
                    >
                      [Hide Blueprint]
                    </button>
                  </div>
                  <a 
                    href={systemArchitectureImg} 
                    download="servicenow-compliance-architecture-blueprint.png"
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10.5px] font-mono font-bold flex items-center gap-1.5 border border-indigo-500/30 transition-all hover:scale-[1.02] shadow-lg shadow-indigo-950/20 uppercase"
                  >
                    <Download className="h-3.5 w-3.5 text-white animate-pulse" />
                    Download Blueprint PNG
                  </a>
                </div>

                <div className="relative border border-[#2A2D35]/70 rounded-lg overflow-hidden bg-black/40 group max-h-[480px] flex justify-center items-center">
                  <img 
                    src={systemArchitectureImg} 
                    alt="ServiceNow Auditing Tech Stack and System Architecture" 
                    referrerPolicy="no-referrer"
                    className="object-contain w-full max-h-[460px] rounded-lg transition-transform duration-500 group-hover:scale-[1.015]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 pointer-events-none">
                    <div className="text-[10px] font-mono text-gray-300">
                      💡 <span className="text-indigo-400 font-bold">Workspace Tip:</span> Click download to capture and save this complete full-resolution tech stack layout.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0A0C10] border border-[#2A2D35]/50 p-4.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center space-x-2.5">
                  <span className="p-1 px-1.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[9px] font-bold">MINIMIZED</span>
                  <span className="text-xs text-gray-400 font-sans">High-Fidelity Visual Blueprint is hidden.</span>
                </div>
                <button
                  type="button"
                  onClick={toggleArchDiagram}
                  className="px-3.5 py-1.5 text-[10px] font-mono font-bold text-indigo-400 hover:text-white bg-indigo-950/40 border border-indigo-500/20 hover:bg-indigo-600 rounded-lg transition-all cursor-pointer"
                >
                  Show High-Fidelity Blueprint Reference
                </button>
              </div>
            )}

          </div>
        )}

        {/* Content 2: Compliance Pipeline Lifecycles */}
        {archTab === 'pipeline' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-3 bg-[#0A0C0F] border border-[#2A2D35]/45 rounded-xl space-y-4">
              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">Compliance Audit Execution Pipeline Lifecycle</span>
              
              <div className="relative pt-2 pb-2">
                <div className="flex flex-col md:flex-row justify-between items-stretch gap-4">
                  {/* Step 1 */}
                  <div className="flex-1 bg-[#15171C] border border-[#2A2D35] p-3 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-mono text-[10px] font-bold border border-blue-500/30">1</span>
                        <h4 className="text-xs font-bold text-white font-sans">File Ingestion Desk</h4>
                      </div>
                      <p className="text-[10.5px] text-gray-400 leading-normal font-sans mt-2">
                        Auditor uploads raw XLSX/CSV incident logs. System reads worksheets using the **dynamic synonym matcher** to handle column misalignment.
                      </p>
                    </div>
                    <div className="pt-2 text-[9px] font-mono text-blue-400 uppercase tracking-widest text-right">🔒 Client-Side Only</div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex-1 bg-[#15171C] border border-[#2A2D35] p-3 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="h-5 w-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-mono text-[10px] font-bold border border-indigo-500/30">2</span>
                        <h4 className="text-xs font-bold text-white font-sans">Verification Engine</h4>
                      </div>
                      <p className="text-[10.5px] text-gray-400 leading-normal font-sans mt-2">
                        Executes structured logic: evaluates Resolution Description lengths, proposed timing checks, valid CA CIs, and custom keywords validation metrics.
                      </p>
                    </div>
                    <div className="pt-2 text-[9px] font-mono text-indigo-400 uppercase tracking-widest text-right">🎯 Sub-Millisecond</div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex-1 bg-[#15171C] border border-[#2A2D35] p-3 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="h-5 w-5 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-mono text-[10px] font-bold border border-purple-500/30">3</span>
                        <h4 className="text-xs font-bold text-white font-sans">Secure Dispatch Proxy</h4>
                      </div>
                      <p className="text-[10.5px] text-gray-400 leading-normal font-sans mt-2">
                        Sends critical infraction message cards using Express server API proxies directly to Teams webhooks, completely bypassing web browser CORS locks.
                      </p>
                    </div>
                    <div className="pt-2 text-[9px] font-mono text-purple-400 uppercase tracking-widest text-right">⚡ Server Routed</div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex-1 bg-[#15171C] border border-[#2A2D35] p-3 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono text-[10px] font-bold border border-emerald-500/30">4</span>
                        <h4 className="text-xs font-bold text-white font-sans">AI Reasoning Synthesis</h4>
                      </div>
                      <p className="text-[10.5px] text-gray-400 leading-normal font-sans mt-2">
                        Assembles violated audit metrics under Gemini prompts. Compiles formatted Slack mentoring scripts or team summaries for direct queue leadership remediation.
                      </p>
                    </div>
                    <div className="pt-2 text-[9px] font-mono text-emerald-400 uppercase tracking-widest text-right">🧠 Gemini 3.8 API</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content 3: Detailed Tech Stack breakdown */}
        {archTab === 'stack' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-[#0A0C0F] border border-[#2A2D35]/45 rounded-xl space-y-4">
              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">Full Project Technology Stack Specification Matrix</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Tech Item 1: React 18, Vite & TS */}
                <div className="p-3 bg-[#15171C] border border-[#2A2D35]/60 rounded-lg space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <strong className="text-white">React 18 & TypeScript (SPA)</strong>
                    <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1 rounded">UI Framework</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-sans leading-normal">
                    Serves as the high-speed rendering base of the application. Supports modular type safety structures, ensuring variables, incident objects, metrics, and rule matrices are compiled robustly.
                  </p>
                </div>

                {/* Tech Item 2: Express Node API Server */}
                <div className="p-3 bg-[#15171C] border border-[#2A2D35]/60 rounded-lg space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <strong className="text-white">Express Server & Node.js Middleware</strong>
                    <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1 rounded">Backend Web App</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-sans leading-normal">
                    Serves as our full-stack application gateway binding on port 3000. Handles secure server-side communications and proxy endpoints.
                  </p>
                </div>

                {/* Tech Item 3: Gemini 3.8 Generative Flash SDK */}
                <div className="p-3 bg-[#15171C] border border-[#2A2D35]/60 rounded-lg space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <strong className="text-white">@google/genai TypeScript SDK</strong>
                    <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1 rounded">Intelligence Layer</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-sans leading-normal">
                    Integrates Gemini 3.8 Flash server-side. Leverages the SDK specifically for compiling structured JSON prompt guidelines, synthesizing summaries, and powering the live interactive companion.
                  </p>
                </div>

                {/* Tech Item 4: Recharts Interactive Graphic Engine */}
                <div className="p-3 bg-[#15171C] border border-[#2A2D35]/60 rounded-lg space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <strong className="text-white">Recharts Graphic Engine</strong>
                    <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1 rounded">Visual Reporting</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-sans leading-normal">
                    Renders fluid SVG charts. Features interactive hover sliders and customized grid ticks, compiling compliance percentages over time and defect distributions.
                  </p>
                </div>

                {/* Tech Item 5: Tailwind CSS Utility Toolkit */}
                <div className="p-3 bg-[#15171C] border border-[#2A2D35]/60 rounded-lg space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <strong className="text-white">Tailwind CSS Utility Toolkit</strong>
                    <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1 rounded">Visual Styles</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-sans leading-normal">
                    Stylizes all cards, lists, sidebar drawers, indicators, and buttons with absolute precision. Incorporates custom scrollbars hides, animations transitions, and eye-safe twilight background colors.
                  </p>
                </div>

                {/* Tech Item 6: Lucide Vector Icon Suite */}
                <div className="p-3 bg-[#15171C] border border-[#2A2D35]/60 rounded-lg space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <strong className="text-white">Lucide React & Framer Motion</strong>
                    <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1 rounded">UI Mechanics</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-sans leading-normal">
                    Powers interactive visual cues and responsive overlays. Integrates vectors directly in React components and animates confirmation alerts smoothly using Framer physics spring models.
                  </p>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>

      {/* 🔮 NEW PLACE MAP: WHERE LLM & AI RESIDES IN OUR PROJECT */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4" id="ai-llm-integration-blueprint">
        <div>
          <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-emerald-400 animate-pulse" />
            🤖 Live LLM & AI Blueprint Map (Where AI Takes Place)
          </h3>
          <p className="text-[10.5px] text-gray-400 font-sans mt-0.5">
            This map highlights exactly where generative intelligence triggers within the user-interface, allowing direct access to the LLM backend for audit execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Touchpoint 1: AI Chatbot Companion */}
          <div className="p-4 bg-[#0A0C0F] border border-[#22242C] rounded-xl space-y-2.5 hover:border-[#2A2D35] transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold text-xs">
                  01
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-sans">AI Assistant</h4>
                  <span className="text-[8px] font-mono text-amber-400 uppercase tracking-wider font-semibold">Active Interactive Console</span>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[8.5px] font-mono uppercase tracking-wider">
                Full Context
              </span>
            </div>
            
            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              <strong>Locate in Portal:</strong> Choose the <strong className="text-amber-400 font-mono text-[10.5px]">AI Assistant</strong> tab on the left-hand navigation sidebar.
            </p>
            <div className="p-2.5 bg-amber-950/10 border border-amber-500/10 rounded text-[10.5px] text-gray-300 leading-relaxed space-y-1">
              <span className="font-semibold text-amber-300 block">🤖 How the LLM Processes This:</span>
              <p className="text-gray-400 leading-relaxed text-[10px]">
                Loads loaded spreadsheet incident violations, compliance states, and active rules into a background system instructions prompt. Allows the auditor to chat in free-form natural language to perform diagnostic checks or extract reports.
              </p>
            </div>
          </div>

          {/* Touchpoint 2: Individual coaching script synthesis */}
          <div className="p-4 bg-[#0A0C0F] border border-[#22242C] rounded-xl space-y-2.5 hover:border-[#2A2D35] transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-all"></div>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono font-bold text-xs">
                  02
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-sans">Personalized Coach Script Synthesizer</h4>
                  <span className="text-[8px] font-mono text-sky-400 uppercase tracking-wider font-semibold">One-Click Generator</span>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 text-[8.5px] font-mono uppercase tracking-wider">
                Per-Agent Prompt
              </span>
            </div>
            
            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              <strong>Locate in Portal:</strong> Click the <strong className="text-sky-400 font-mono text-[10.5px]">Assignee Portfolio & Coaching</strong> tab, pick any listed assignee, and click the blue <strong className="font-semibold text-sky-400">"Generate Customized Coaching Card"</strong> button.
            </p>
            <div className="p-2.5 bg-sky-950/10 border border-sky-500/10 rounded text-[10.5px] text-gray-300 leading-relaxed space-y-1">
              <span className="font-semibold text-sky-300 block">🤖 How the LLM Processes This:</span>
              <p className="text-gray-400 leading-relaxed text-[10px]">
                Constructs a targeted payload composed of the analyst's specific score, exact violated compliance checkpoints, and unresolved tickets. The Gemini model translates this data into visual feedback cards and a realistic copyable supervisor Slack text draft.
              </p>
            </div>
          </div>

          {/* Touchpoint 3: Hierarchical Managerial Oversight Summaries */}
          <div className="p-4 bg-[#0A0C0F] border border-[#22242C] rounded-xl space-y-2.5 hover:border-[#2A2D35] transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-bold text-xs">
                  03
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-sans">Manager Oversight Summarizer</h4>
                  <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-wider font-semibold">Queue Quality Aggregation</span>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[8.5px] font-mono uppercase tracking-wider">
                Multi-Agent Synthesis
              </span>
            </div>
            
            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              <strong>Locate in Portal:</strong> Enter <strong className="text-indigo-400 font-mono text-[10.5px]">Assignee Portfolio & Coaching</strong>, toggle the upper view-mode to <strong className="font-semibold text-indigo-400">"Assignee Manager Mode"</strong>, select any manager name list, and hit <strong className="font-semibold text-indigo-400">"Synthesize Manager Briefing"</strong>.
            </p>
            <div className="p-2.5 bg-indigo-950/10 border border-indigo-500/10 rounded text-[10.5px] text-gray-300 leading-relaxed space-y-1">
              <span className="font-semibold text-indigo-300 block">🤖 How the LLM Processes This:</span>
              <p className="text-gray-400 leading-relaxed text-[10px]">
                Bundles all team members working under that specific manager, identifying root breakdown patterns across general queues. The LLM translates these metrics into a strategic presentation guide highlighting remedial standup bullet points for immediate quality recovery.
              </p>
            </div>
          </div>

          {/* Touchpoint 4: Actionable audit remediation tips */}
          <div className="p-4 bg-[#0A0C0F] border border-[#22242C] rounded-xl space-y-2.5 hover:border-[#2A2D35] transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs">
                  04
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-sans">Audit Transition Remediation Tips</h4>
                  <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">Dynamic Explanations</span>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-[#2A2D35] text-[8.5px] font-mono uppercase tracking-wider">
                Rule Definition Tips
              </span>
            </div>
            
            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              <strong>Locate in Portal:</strong> Navigate to the <strong className="text-emerald-400 font-mono text-[10.5px]">Audit Rules Definitions</strong> tab or view individual warning messages on tickets. Click on the info blocks for dynamic governance advice.
            </p>
            <div className="p-2.5 bg-emerald-950/10 border border-emerald-500/10 rounded text-[10.5px] text-gray-300 leading-relaxed space-y-1">
              <span className="font-semibold text-emerald-300 block">🤖 How the LLM Processes This:</span>
              <p className="text-gray-400 leading-relaxed text-[10px]">
                Combines static regulation keys (like bypassing audit state checks or missing KAs) with AI suggestions to render human-readable instruction definitions, ensuring analysts instantly grasp the reasons why specific checkpoints failed.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Main Details Grid split layout (Left: AI & LLM metrics, Right: Components utilized) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: AI features & LLM Specs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-400" />
              Intelligence Layer (LLM Specifications)
            </h3>
            
            <div className="bg-[#0A0C0F] rounded-lg border border-[#2A2D35]/60 p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#2A2D35]/40">
                <span className="text-gray-500">Configured Model</span>
                <span className="text-indigo-300 font-bold">Gemini 3.8 Flash</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#2A2D35]/40">
                <span className="text-gray-500">SDK Environment</span>
                <span className="text-gray-300">@google/genai (Node API Proxy)</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#2A2D35]/40">
                <span className="text-gray-500">Response Mode</span>
                <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                  <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                  Safe Streaming / JSON Blocks
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Processing Host</span>
                <span className="text-gray-300">Vite Full-stack Server Mode</span>
              </div>
            </div>

            {/* API Traffic counter explanations */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono block">
                🔄 LLM API Connection Architecture
              </span>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                A common bottleneck in generative AI portals is delayed response or high token costs on direct dataset uploads. This portal is designed with a **Deterministic client-side compiler**:
              </p>

              <div className="bg-blue-950/20 border border-blue-900/40 p-3 rounded-lg flex items-center space-x-3">
                <div className="p-2 bg-blue-500/10 rounded font-mono text-xs font-bold text-blue-400 shrink-0">
                  0 Hits
                </div>
                <div className="text-[11.5px] text-gray-400 leading-relaxed">
                  <strong>Initial File Ingestion (Each Load)</strong>: <strong>Zero LLM hits</strong> are made when parsing spreadsheets! Compliance scores are computed locally in milliseconds.
                </div>
              </div>

              <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-lg flex items-center space-x-3">
                <div className="p-2 bg-amber-500/10 rounded font-mono text-xs font-bold text-amber-400 shrink-0">
                  1 Hit
                </div>
                <div className="text-[11.5px] text-gray-400 leading-relaxed">
                  <strong>On-Demand AI Actions</strong>: The Gemini API is hit exactly <strong>one time</strong> when generating performer summary scripts, manager reports, or chatting with the auditor companion.
                </div>
              </div>
            </div>
          </div>

          {/* AI Features Checklist */}
          <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
              Major AI Powered Features
            </h3>

            <div className="space-y-3">
              {aiFeatures.map((feat) => (
                <div key={feat.title} className="p-3 bg-[#0A0C0F] border border-[#2A2D35]/50 rounded-lg space-y-1">
                  <span className="text-xs font-bold text-slate-200 block">{feat.title}</span>
                  <p className="text-[11px] text-gray-400 font-sans leading-relaxed">{feat.purpose}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Portal Component architecture breakdown */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#2A2D35]">
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-400" />
                Under the Hood: Complete Component Roster
              </h3>
              <button 
                type="button" 
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 transition-all font-bold cursor-pointer"
              >
                {showTechnicalDetails ? '[- Hide Details]' : '[+ View Technical Tags]'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {componentsList.map((comp) => (
                <div key={comp.name} className="p-4 bg-[#0A0C0F] border border-[#22242C] hover:border-[#2A2D35] rounded-xl flex flex-col justify-between space-y-2.5 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded bg-[#111317] border border-[#2A2D35]/40 shrink-0">
                        {comp.icon}
                      </div>
                      <span className="text-[11.5px] font-bold text-white tracking-wide truncate" title={comp.name}>{comp.name}</span>
                    </div>
                    <span className="text-[9.5px] uppercase font-mono font-semibold text-indigo-400/80 tracking-wide block">
                      {comp.role}
                    </span>
                    <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                      {comp.details}
                    </p>
                  </div>

                  {showTechnicalDetails && (
                    <div className="pt-2 border-t border-[#1C1F26] flex items-center justify-between font-mono text-[9px] text-gray-500">
                      <span>Module: SPA Component</span>
                      <span className="bg-[#111317] px-1.5 py-0.5 rounded text-blue-400">Reactive</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Explanatory notes about persistent states */}
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-xs leading-relaxed text-gray-400" id="local-storage-specs">
              <div className="flex items-center space-x-2 font-bold text-indigo-300 font-mono mb-1 text-[11px]">
                <Database className="h-3.5 w-3.5 text-indigo-400" />
                <span>STATE & PARAMETERS LOCAL STORAGE</span>
              </div>
              <p className="text-[11px]">
                Settings, Core Audit Regulations, Keyword Matrices, and History trials list are cached in the browser's <code>localStorage</code> database context rules. This ensures configurations are fully resilient to unexpected reloads, remaining operational without server overhead.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Presentation Tips / Footer details block */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-emerald-400" />
          💡 Key Highlight Points when Presenting to Stakeholders
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1 bg-[#0A0C0F] border border-[#2A2D35]/40 p-3 rounded-lg">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              1. Fuzzy Header Matching
              <ArrowRight className="h-3 w-3" />
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              Highlight that auditors do not need to format their ServiceNow excel exports. The processor matches various synonyms automatically, ensuring instant trial readiness.
            </p>
          </div>

          <div className="space-y-1 bg-[#0A0C0F] border border-[#2A2D35]/40 p-3 rounded-lg">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              2. Absolute Privacy & Local Auditing
              <ArrowRight className="h-3 w-3" />
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              Since 100% of the audit score processing happens locally inside React in milliseconds, confidential ServiceNow tickets are never sent to third-party LLM cloud servers.
            </p>
          </div>

          <div className="space-y-1 bg-[#0A0C0F] border border-[#2A2D35]/40 p-3 rounded-lg">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              3. Interactive Slack Coaching Code
              <ArrowRight className="h-3 w-3" />
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              Demonstrate how the platform translates dry numbers into immediate coaching value with direct supervisor Slack script generators and hierarchical leader lists.
            </p>
          </div>

          <div className="space-y-1 bg-[#0A0C0F]/80 border border-[#2A2D35]/65 p-3 rounded-lg ring-1 ring-blue-500/10">
            <span className="font-bold text-blue-400 flex items-center gap-1">
              4. Direct Gateways & Validation
              <ArrowRight className="h-3 w-3 text-blue-400" />
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              Differentiate this system with real-time webhook validation patterns to ensure corporate communications deploy programmatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
