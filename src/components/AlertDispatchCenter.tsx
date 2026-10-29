import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  MessageSquare, 
  Send, 
  Check, 
  Sliders, 
  Info,
  Save,
  Mail,
  Zap,
  Globe,
  RefreshCw,
  Key,
  ShieldCheck,
  Play,
  Wifi,
  Database
} from 'lucide-react';
import { TicketAuditReport } from '../types';
import ManagementEmailDigestConfig from './ManagementEmailDigestConfig';

interface AlertDispatchCenterProps {
  reports: TicketAuditReport[];
  triggerPopup: (msg: string, type: 'success' | 'info' | 'warning') => void;
}

export default function AlertDispatchCenter({ reports, triggerPopup }: AlertDispatchCenterProps) {
  // Navigation Sub-tab
  const [activeTab, setActiveTab] = useState<'realtime_alerts' | 'email_digest'>('realtime_alerts');

  // Configuration Profile State
  const [webhookUrl, setWebhookUrl] = useState('https://enterprise.webhook.office.com/v1/teams/remediation-alerts-channel...');
  const [managerWebhookUrl, setManagerWebhookUrl] = useState('https://enterprise.webhook.office.com/v1/teams/manager-escalations-channel...');
  const [outlookSenderMailbox, setOutlookSenderMailbox] = useState('compliance-bot@global-mnc-it.com');
  const [microsoftGraphToken, setMicrosoftGraphToken] = useState('');
  const [lowScoreThreshold, setLowScoreThreshold] = useState(75);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['Red', 'Amber']);

  // Toggles for active notifications
  const [enableIndividualAlerts, setEnableIndividualAlerts] = useState(true); // MS Teams DM Cards
  const [enableManagerTeamsAlerts, setEnableManagerTeamsAlerts] = useState(true); // MS Teams Manager Escalation Cards
  const [enableIndividualEmails, setEnableIndividualEmails] = useState(true); // Outlook Direct Emails
  const [enableManagerEmails, setEnableManagerEmails] = useState(true); // Outlook Manager Emails

  // Operational states
  const [isSaving, setIsSaving] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSendingDigest, setIsSendingDigest] = useState(false);
  const [selectedDigestGroup, setSelectedDigestGroup] = useState('ALL');
  const [digestManagerEmail, setDigestManagerEmail] = useState('manager@global-mnc-it.com');
  const [lastDigestResult, setLastDigestResult] = useState<{
    success: boolean;
    assignmentGroup: string;
    totalAudited: number;
    totalFlagged: number;
    timestamp: string;
  } | null>(null);

  const availableGroups = useMemo(() => {
    const s = new Set<string>();
    reports.forEach(r => {
      const g = r.ticket?.assignmentGroup;
      if (g && g.trim()) s.add(g.trim());
    });
    return Array.from(s).sort();
  }, [reports]);

  const [lastTestResult, setLastTestResult] = useState<{
    success: boolean;
    timestamp: string;
    teamsStatus: string;
    outlookStatus: string;
    scoreEvaluated: number;
  } | null>(null);

  // Load current configuration on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/alerts/config');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config) {
            const c = data.config;
            if (c.webhookUrl) setWebhookUrl(c.webhookUrl);
            if (c.managerWebhookUrl) setManagerWebhookUrl(c.managerWebhookUrl);
            if (c.outlookSenderMailbox) setOutlookSenderMailbox(c.outlookSenderMailbox);
            if (c.microsoftGraphToken) setMicrosoftGraphToken(c.microsoftGraphToken);
            if (c.lowScoreThreshold) setLowScoreThreshold(c.lowScoreThreshold);
            if (c.selectedFilters) setSelectedFilters(c.selectedFilters);
            setEnableIndividualAlerts(!!c.enableIndividualAlerts);
            setEnableManagerTeamsAlerts(c.enableManagerTeamsAlerts !== false); // default to true
            setEnableIndividualEmails(!!c.enableIndividualEmails);
            setEnableManagerEmails(c.enableManagerEmails !== false); // default to true
          }
        }
      } catch (err) {
        console.error('Failed to load alert configuration:', err);
      }
    }
    loadConfig();
  }, []);

  // Save config profile to server
  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const payload = {
        webhookUrl,
        managerWebhookUrl,
        selectedFilters,
        outlookSenderMailbox,
        microsoftGraphToken,
        lowScoreThreshold,
        enableIndividualAlerts,
        enableIndividualEmails,
        enableManagerTeamsAlerts,
        enableManagerEmails
      };

      const res = await fetch('/api/alerts/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: payload })
      });

      if (res.ok) {
        triggerPopup('Configuration profile saved successfully.', 'success');
      } else {
        const data = await res.json();
        triggerPopup(data.error || 'Failed to save configuration profile.', 'warning');
      }
    } catch (err: any) {
      triggerPopup(`Failed to synchronize settings: ${err.message || String(err)}`, 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // Immediate diagnostic testing using first available incident ticket
  const handleInstantConnectionTest = async () => {
    if (!reports || reports.length === 0) {
      triggerPopup('No ServiceNow incidents available for test routing.', 'warning');
      return;
    }

    const testReport = reports[0];
    setIsSimulating(true);

    try {
      const incidentPayload = {
        incNumber: testReport.ticket.incNumber,
        assignee: testReport.ticket.assignee,
        assignmentGroup: testReport.ticket.assignmentGroup,
        assigneeManager: testReport.ticket.assigneeManager || 'IT Operations Manager',
        percentage: testReport.percentage,
        generalComments: testReport.generalComments || 'ServiceNow standard ticket evaluation details failed quality thresholds.',
        idleTimeHours: 18,
        assigneeEmail: testReport.ticket.assignee.toLowerCase().replace(/\s+/g, '.') + '@global-mnc-it.com',
        assigneeManagerEmail: 'manager@global-mnc-it.com'
      };

      const res = await fetch('/api/alerts/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentPayload })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLastTestResult({
            success: true,
            timestamp: new Date().toLocaleTimeString(),
            teamsStatus: data.teams?.assigneeMessage || 'Sent successfully',
            outlookStatus: data.outlook?.assigneeMessage || 'Sent successfully',
            scoreEvaluated: data.score
          });
          triggerPopup(`Diagnostic dispatch test completed successfully! Score: ${data.score}%`, 'success');
        } else {
          triggerPopup(`Simulation rejected: ${data.error}`, 'warning');
        }
      } else {
        triggerPopup('Endpoint returned a transmission failure.', 'warning');
      }
    } catch (err: any) {
      triggerPopup(`Connection failure: ${err.message}`, 'warning');
    } finally {
      setIsSimulating(false);
    }
  };

  const loadTeamsDemoPreset = () => {
    setWebhookUrl('https://prod-14.southeastasia.logic.azure.com:443/workflows/9a2b9dcd87e14f86be2e8f174e50772f/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=rXy8V3U9-AdaptiveTeamsAssigneeInbound');
    setManagerWebhookUrl('https://prod-14.southeastasia.logic.azure.com:443/workflows/9a2b9dcd87e14f86be2e8f174e50772f/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=rXy8V3U9-AdaptiveTeamsManagerInbound');
    triggerPopup('Teams Power Automate endpoint preset loaded for both Assignee and Manager streams!', 'info');
  };

  const loadOutlookDemoPreset = () => {
    setOutlookSenderMailbox('itsm-compliance-bot@global-mnc-it.com');
    setMicrosoftGraphToken('eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6InNpbXVsYXRpb24ifQ.eyJhZ2VudCI6ImNvbXBsaWFuY2UtYm90IiwidGVuYW50IjoiZ2xvYmFsLW1uYy1pdC5jb20iLCJyb2xlcyI6WyJNYWlsLlNlbmQiXX0');
    triggerPopup('Outlook Graph API connection preset loaded!', 'info');
  };

  const handleDispatchGroupDigest = async () => {
    if (!reports || reports.length === 0) {
      triggerPopup('No ticket audit reports available to build consolidated digest.', 'warning');
      return;
    }
    setIsSendingDigest(true);
    try {
      const res = await fetch('/api/alerts/dispatch-group-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentGroup: selectedDigestGroup,
          reports,
          targetManagerEmail: digestManagerEmail,
          cutoffThreshold: lowScoreThreshold
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastDigestResult({
          success: true,
          assignmentGroup: data.assignmentGroup,
          totalAudited: data.totalAuditedInGroup,
          totalFlagged: data.totalFlagged,
          timestamp: new Date().toLocaleTimeString()
        });
        triggerPopup(`Consolidated manager digest dispatched for ${data.assignmentGroup}! (${data.totalFlagged} non-compliant tickets)`, 'success');
      } else {
        triggerPopup(data.error || 'Failed to dispatch group digest.', 'warning');
      }
    } catch (err: any) {
      triggerPopup(`Failed to dispatch group digest: ${err.message}`, 'warning');
    } finally {
      setIsSendingDigest(false);
    }
  };

  const toggleFilter = (tier: string) => {
    setSelectedFilters(prev => 
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]
    );
  };

  return (
    <div className="space-y-6 text-foreground">
      
      {/* Title & Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">ITSM Compliance Suite v2.4</span>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Outbound Dispatch Router Active
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mt-1">
            <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Individual Notification Setup
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Configure direct assignee notification channels. Use Microsoft Power Automate to send Adaptive Cards in Teams, and Microsoft Graph REST API to send automated emails.
          </p>
        </div>
        
        <button
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-mono font-bold transition-all disabled:opacity-50 shadow-md shadow-indigo-600/15 shrink-0 cursor-pointer"
        >
          <Save className={`h-3.5 w-3.5 ${isSaving ? 'animate-spin' : ''}`} />
          Save Integration Settings
        </button>
      </div>

      {/* SUB-TAB NAVIGATION BAR */}
      <div className="flex items-center space-x-2 border-b border-border pb-3 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('realtime_alerts')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'realtime_alerts'
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          <span>Real-Time Alert Triggers (Teams & Outlook)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('email_digest')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'email_digest'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Email Digest Automation</span>
        </button>
      </div>

      {activeTab === 'realtime_alerts' && (
        <>
          {/* TWO PART CONFIGURATION CONTAINER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PART 1: MICROSOFT TEAMS (Power Automate) */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-card hover:border-border-strong transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-[#4B5697]/15 text-[#4B5697] dark:bg-[#4B5697]/25 dark:text-indigo-400 rounded">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground font-mono">Part 1: MS Teams Chat Notification</h3>
                  <p className="text-[10px] text-muted-foreground">Power Automate Adaptive Card Flow</p>
                </div>
              </div>

              <button
                onClick={loadTeamsDemoPreset}
                className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold transition-colors bg-card hover:bg-muted border border-border px-2.5 py-1 rounded cursor-pointer shadow-2xs"
              >
                Load Preset URLs
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-normal">
              Post rich 1:1 Adaptive Cards directly into the assignee&apos;s and manager&apos;s MS Teams chat container immediately when a ticket fails documentation compliance.
            </p>

            {/* Dynamic Controls Grid */}
            <div className="space-y-4 pt-1">
              {/* Assignee Webhook Settings */}
              <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Assignee Stream
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-muted-foreground font-bold">ACTIVATE</span>
                    <button
                      type="button"
                      onClick={() => setEnableIndividualAlerts(!enableIndividualAlerts)}
                      className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        enableIndividualAlerts ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-gray-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          enableIndividualAlerts ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono text-muted-foreground">Assignee Webhook Endpoint</label>
                  <input 
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://prod-XX.southeastasia.logic.azure.com/workflows/..."
                    className="w-full bg-card border border-border focus:border-indigo-500 rounded p-1.5 text-[11px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Manager Webhook Settings */}
              <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Manager Escalation Stream
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-muted-foreground font-bold">ACTIVATE</span>
                    <button
                      type="button"
                      onClick={() => setEnableManagerTeamsAlerts(!enableManagerTeamsAlerts)}
                      className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        enableManagerTeamsAlerts ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-gray-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          enableManagerTeamsAlerts ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono text-muted-foreground">Manager Webhook Endpoint</label>
                  <input 
                    type="text"
                    value={managerWebhookUrl}
                    onChange={(e) => setManagerWebhookUrl(e.target.value)}
                    placeholder="https://prod-XX.southeastasia.logic.azure.com/workflows/..."
                    className="w-full bg-card border border-border focus:border-indigo-500 rounded p-1.5 text-[11px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 border border-border p-3 rounded text-[10.5px] text-muted-foreground leading-normal flex gap-2 mt-2">
            <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="font-sans">
              <span className="font-bold text-foreground">Dynamic Routing:</span> Target addresses are matched dynamically against the assignee&apos;s email and their supervisor&apos;s email dynamically fetched from the incident ticket payload.
            </div>
          </div>
        </div>

        {/* PART 2: MICROSOFT OUTLOOK (Microsoft Graph API) */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-card hover:border-border-strong transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground font-mono">Part 2: Outlook Email Notification</h3>
                  <p className="text-[10px] text-muted-foreground">Microsoft Graph REST Mail Gateway</p>
                </div>
              </div>

              <button
                onClick={loadOutlookDemoPreset}
                className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold transition-colors bg-card hover:bg-muted border border-border px-2.5 py-1 rounded cursor-pointer shadow-2xs"
              >
                Load Preset Mailbox
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-normal">
              Send formal corporate SLA Quality emails summarizing specific documentation infractions and AI coaching advice utilizing modern Microsoft Graph delegated routing.
            </p>

            {/* Dynamic Stream Toggles & Shared Auth */}
            <div className="space-y-3 pt-1">
              {/* Toggles section */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 p-2.5 rounded border border-border flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">Assignee</span>
                    <span className="text-[9px] text-muted-foreground">Direct Email</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableIndividualEmails(!enableIndividualEmails)}
                    className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      enableIndividualEmails ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-gray-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        enableIndividualEmails ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="bg-muted/40 p-2.5 rounded border border-border flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">Manager</span>
                    <span className="text-[9px] text-muted-foreground">Escalation Email</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableManagerEmails(!enableManagerEmails)}
                    className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      enableManagerEmails ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-gray-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        enableManagerEmails ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Shared Auth configuration */}
              <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-border">
                {/* Mailbox Input */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                    Outlook Sender Mailbox Account
                  </label>
                  <input 
                    type="text"
                    value={outlookSenderMailbox}
                    onChange={(e) => setOutlookSenderMailbox(e.target.value)}
                    placeholder="itsm-compliance-bot@global-mnc-it.com"
                    className="w-full bg-card border border-border focus:border-indigo-500 rounded p-1.5 text-[11px] font-mono text-foreground focus:outline-none transition-colors shadow-2xs"
                  />
                </div>

                {/* Token Input */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                    Microsoft Graph Access Token (Bearer Key)
                  </label>
                  <input 
                    type="password"
                    value={microsoftGraphToken}
                    onChange={(e) => setMicrosoftGraphToken(e.target.value)}
                    placeholder="Paste eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI..."
                    className="w-full bg-card border border-border focus:border-indigo-500 rounded p-1.5 text-[11px] font-mono text-foreground focus:outline-none transition-colors shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 border border-border p-3 rounded text-[10.5px] text-muted-foreground leading-normal flex gap-2 mt-2">
            <Key className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="font-sans">
              <span className="font-bold text-foreground">Simulation Fallback:</span> If no authorized access token is pasted, the mail router runs in Sandbox Simulation mode to allow seamless local testing.
            </div>
          </div>
        </div>

      </div>

      {/* CORE CONTROL THRESHOLDS & INSTANT CONNECTIVITY TESTING */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
        
        {/* Compliance Threshold Rules */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 md:col-span-7 flex flex-col justify-between shadow-card">
          <div>
            <h3 className="text-xs font-bold text-foreground font-mono uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-3">
              <Sliders className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Compliance Scoring Thresholds
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
              {/* Score threshold */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-foreground">Failure Trigger Limit</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-bold">
                    {lowScoreThreshold}%
                  </span>
                </div>
                <input 
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={lowScoreThreshold}
                  onChange={(e) => setLowScoreThreshold(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                />
                <p className="text-[10px] text-muted-foreground">Tickets with audit quality scores lower than this trigger immediate notifications.</p>
              </div>

              {/* Warning Classes */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-foreground">Target Categories</span>
                <div className="flex bg-muted/50 rounded border border-border p-0.5">
                  {['Red', 'Amber', 'Green'].map(tier => {
                    const active = selectedFilters.includes(tier);
                    return (
                      <button
                        key={tier}
                        onClick={() => toggleFilter(tier)}
                        className={`flex-1 text-center py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          active 
                            ? tier === 'Red' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold shadow-2xs' : tier === 'Amber' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold shadow-2xs' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tier.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">Filters active incident severity classes to dispatch alerts.</p>
              </div>
            </div>
          </div>

          <div className="bg-muted/40 border border-border p-3 rounded text-[11px] text-muted-foreground leading-relaxed font-sans">
            <strong className="text-foreground">Active Dispatch Logic:</strong> When a ServiceNow quality audit completes, our daemon validates if the assignee notifier switches are on. If yes, it routes customized Adaptive Cards and Outlook alerts simultaneously.
          </div>
        </div>

        {/* Instant Connectivity Test Panel */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 md:col-span-5 flex flex-col justify-between shadow-card">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground font-mono uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-3">
              <Wifi className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Instant Connection Test
            </h3>

            <p className="text-xs text-muted-foreground leading-normal">
              Execute a real-time, sandbox audit dispatch simulation using the first ServiceNow compliance record to verify integration connectivity immediately.
            </p>

            <button
              onClick={handleInstantConnectionTest}
              disabled={isSimulating || reports.length === 0}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded text-xs font-bold font-mono transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Testing Outbound Pipelines...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Send Test Notification Payload
                </>
              )}
            </button>
          </div>

          {/* Test Status Logs */}
          <div className="bg-muted/40 border border-border rounded p-3 text-[10px] font-mono space-y-1.5 min-h-[95px]">
            <span className="block text-muted-foreground font-bold text-[9px] uppercase tracking-wider">Test Run Results</span>
            {lastTestResult ? (
              <div className="space-y-1 leading-normal">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="text-foreground font-bold">{lastTestResult.timestamp}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Teams Card:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{lastTestResult.teamsStatus}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Outlook Mail:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{lastTestResult.outlookStatus}</span>
                </div>
                <div className="flex justify-between text-[11px] border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground">Score Evaluated:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{lastTestResult.scoreEvaluated}%</span>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-5">
                No diagnostic dispatches completed. Click test to verify routes.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* CONSOLIDATED MANAGER EMAIL DIGEST BY ASSIGNMENT GROUP */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Manager Consolidated Digest by Assignment Group
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Groups all non-compliant incidents (&lt; {lowScoreThreshold}%) for a specific ServiceNow Assignment Group into a single, high-fidelity executive review email for the team manager.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">Total Monitored Queues:</span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              {availableGroups.length} Live Groups
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Target Assignment Group
            </label>
            <select
              value={selectedDigestGroup}
              onChange={(e) => setSelectedDigestGroup(e.target.value)}
              className="w-full bg-card border border-border focus:border-emerald-500 rounded p-2 text-xs font-mono text-foreground focus:outline-none shadow-2xs"
            >
              <option value="ALL">All Monitored Assignment Groups</option>
              {availableGroups.map((grp) => (
                <option key={grp} value={grp}>{grp}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Manager Recipient Email
            </label>
            <input
              type="email"
              value={digestManagerEmail}
              onChange={(e) => setDigestManagerEmail(e.target.value)}
              placeholder="manager@global-mnc-it.com"
              className="w-full bg-card border border-border focus:border-emerald-500 rounded p-2 text-xs font-mono text-foreground focus:outline-none shadow-2xs"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleDispatchGroupDigest}
              disabled={isSendingDigest || reports.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold font-mono transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isSendingDigest ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Compiling & Dispatching Digest...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Dispatch Consolidated Group Email
                </>
              )}
            </button>
          </div>
        </div>

        {lastDigestResult && (
          <div className="bg-muted/40 border border-emerald-500/30 rounded p-3 text-xs font-mono flex flex-wrap items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              <span>Consolidated Digest Delivered for <strong>{lastDigestResult.assignmentGroup}</strong></span>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground text-[11px]">
              <span>Audited: <strong className="text-foreground">{lastDigestResult.totalAudited}</strong></span>
              <span>Flagged (&lt;{lowScoreThreshold}%): <strong className="text-rose-600 dark:text-rose-400">{lastDigestResult.totalFlagged}</strong></span>
              <span>Time: <strong className="text-foreground">{lastDigestResult.timestamp}</strong></span>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* LEADERSHIP EMAIL DIGEST AUTOMATION SUB-TAB */}
      {activeTab === 'email_digest' && (
        <div className="space-y-6 animate-fadeIn">
          <ManagementEmailDigestConfig
            triggerPopup={triggerPopup}
            availableAssignmentGroups={availableGroups}
          />
        </div>
      )}

    </div>
  );
}
