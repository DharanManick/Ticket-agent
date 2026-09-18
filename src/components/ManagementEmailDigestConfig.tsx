import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Calendar,
  Clock,
  Users,
  Filter,
  ShieldCheck,
  AlertTriangle,
  Server,
  Eye,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  Lock,
  Unlock,
  Sparkles,
  ChevronRight,
  Terminal,
  FileText,
  History,
  Check
} from 'lucide-react';
import { ManagementDigestConfig, SmtpConfig, DigestDispatchLogEntry } from '../types';

interface ManagementEmailDigestConfigProps {
  triggerPopup: (message: string, type: 'success' | 'warning' | 'info') => void;
  availableAssignmentGroups?: string[];
}

const DEFAULT_SMTP: SmtpConfig = {
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  user: 'compliance-bot@enterprise.com',
  pass: '',
  from: 'governance-alerts@enterprise.com',
  displayName: 'Enterprise ITIL Governance & SLA Audit Desk',
  useSimulator: true
};

const DEFAULT_DIGEST: ManagementDigestConfig = {
  enabled: true,
  frequency: 'daily',
  dispatchTime: '09:00',
  dispatchDayOfWeek: 'Monday',
  recipients: 'director.operations@enterprise.com, itil.governance@enterprise.com',
  ccRecipients: 'audit.compliance@enterprise.com',
  includeAssignedManagers: true,
  minSeverityFilter: 'warning',
  includeStaleDateViolations: true,
  includeSlaIdleViolations: true,
  includeIncompleteResolution: true,
  assignmentGroupFilter: 'ALL',
  maxInfractionsCount: 25,
  subjectTemplate: '[Leadership Digest] {{frequency}} SLA Audit Infractions Summary - {{date}} ({{count}} Non-Compliances)',
  executiveIntroNote: 'This automated compliance digest summarizes SLA, documentation, and quality infractions identified across recently evaluated incident records. Please review flagged items with your team leads to remediate process deviations.',
  lastDispatchedAt: null,
  lastDispatchStatus: null,
  lastDispatchSummary: null
};

export const ManagementEmailDigestConfig: React.FC<ManagementEmailDigestConfigProps> = ({
  triggerPopup,
  availableAssignmentGroups = []
}) => {
  const [digestConfig, setDigestConfig] = useState<ManagementDigestConfig>(() => {
    try {
      const saved = localStorage.getItem('gov_digest_config');
      if (saved) return { ...DEFAULT_DIGEST, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_DIGEST;
  });

  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => {
    try {
      const saved = localStorage.getItem('gov_smtp_config');
      if (saved) return { ...DEFAULT_SMTP, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_SMTP;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Modals & Drawers
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [generatingPreview, setGeneratingPreview] = useState<boolean>(false);

  const [showSmtpTraceModal, setShowSmtpTraceModal] = useState<boolean>(false);
  const [testingSmtp, setTestingSmtp] = useState<boolean>(false);
  const [smtpTraceLogs, setSmtpTraceLogs] = useState<string[]>([]);
  const [smtpTestSuccess, setSmtpTestSuccess] = useState<boolean | null>(null);

  const [sendingTestDigest, setSendingTestDigest] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [dispatchLogs, setDispatchLogs] = useState<DigestDispatchLogEntry[]>([]);

  // Active section tab inside this config panel
  const [activeSection, setActiveSection] = useState<'cadence' | 'recipients' | 'filters' | 'smtp' | 'template'>('cadence');

  // Load from server API on mount
  useEffect(() => {
    fetchConfigFromServer();
    fetchHistoryLogs();
  }, []);

  const fetchConfigFromServer = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/digest/config');
      if (res.ok) {
        const data = await res.json();
        if (data.digestConfig) {
          setDigestConfig(prev => ({ ...prev, ...data.digestConfig }));
          localStorage.setItem('gov_digest_config', JSON.stringify(data.digestConfig));
        }
        if (data.smtpConfig) {
          setSmtpConfig(prev => ({ ...prev, ...data.smtpConfig }));
          localStorage.setItem('gov_smtp_config', JSON.stringify(data.smtpConfig));
        }
      }
    } catch (err) {
      console.warn('Failed to load digest config from server, using cached local config:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryLogs = async () => {
    try {
      const res = await fetch('/api/digest/history');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          setDispatchLogs(data.logs);
        }
      }
    } catch (e) {
      console.warn('Could not fetch digest history:', e);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      // Save locally
      localStorage.setItem('gov_digest_config', JSON.stringify(digestConfig));
      localStorage.setItem('gov_smtp_config', JSON.stringify(smtpConfig));

      // Save to server
      const res = await fetch('/api/digest/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digestConfig,
          smtpConfig
        })
      });

      if (res.ok) {
        triggerPopup('Management Email Digest configuration saved successfully!', 'success');
      } else {
        triggerPopup('Saved locally, but server returned warning on persistence.', 'warning');
      }
    } catch (err: any) {
      triggerPopup(`Failed to save to server: ${err.message}`, 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtpConnection = async () => {
    setTestingSmtp(true);
    setShowSmtpTraceModal(true);
    setSmtpTestSuccess(null);
    setSmtpTraceLogs([
      `[${new Date().toLocaleTimeString()}] Initiating RFC 5321 ESMTP socket verification to ${smtpConfig.host}:${smtpConfig.port}...`,
      `[${new Date().toLocaleTimeString()}] Secure TLS mode: ${smtpConfig.secure ? 'Implicit SSL/TLS' : 'Explicit STARTTLS'}`,
      `[${new Date().toLocaleTimeString()}] Simulator mode: ${smtpConfig.useSimulator ? 'ENABLED (Zero-credential sandbox simulation)' : 'DISABLED (Live transport)'}`
    ]);

    try {
      const res = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig,
          useSimulator: smtpConfig.useSimulator
        })
      });

      const data = await res.json();
      if (data.logs && Array.isArray(data.logs)) {
        setSmtpTraceLogs(data.logs);
      } else {
        setSmtpTraceLogs(prev => [...prev, data.message || 'Verification complete.']);
      }

      if (data.success) {
        setSmtpTestSuccess(true);
        triggerPopup('SMTP relay connection and authentication verified successfully!', 'success');
      } else {
        setSmtpTestSuccess(false);
        triggerPopup(`SMTP test failed: ${data.message || 'Connection refused'}`, 'warning');
      }
    } catch (err: any) {
      setSmtpTestSuccess(false);
      setSmtpTraceLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [ERROR] Socket failure: ${err.message}`
      ]);
      triggerPopup(`SMTP verification error: ${err.message}`, 'warning');
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleGeneratePreview = async () => {
    setGeneratingPreview(true);
    setShowPreviewModal(true);
    try {
      const res = await fetch('/api/digest/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewOnly: true,
          overrideDigestConfig: digestConfig,
          overrideSmtpConfig: smtpConfig
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.html || '');
        setPreviewSubject(data.subject || '');
      } else {
        triggerPopup('Failed to generate email preview from server.', 'warning');
      }
    } catch (err: any) {
      triggerPopup(`Preview error: ${err.message}`, 'warning');
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handleSendTestDigestNow = async () => {
    setSendingTestDigest(true);
    try {
      const res = await fetch('/api/digest/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrideDigestConfig: digestConfig,
          overrideSmtpConfig: smtpConfig
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerPopup(
          data.simulated
            ? `[Simulator] Test digest compiled and simulated to ${digestConfig.recipients}!`
            : `Test digest sent successfully via SMTP (${smtpConfig.host})!`,
          'success'
        );
        fetchHistoryLogs();
        setDigestConfig(prev => ({
          ...prev,
          lastDispatchedAt: new Date().toISOString(),
          lastDispatchStatus: data.simulated ? 'simulated' : 'success',
          lastDispatchSummary: `${data.infractionsCount || 0} infractions sent to ${digestConfig.recipients}`
        }));
      } else {
        triggerPopup(`Failed to dispatch test digest: ${data.error || 'Server error'}`, 'warning');
      }
    } catch (err: any) {
      triggerPopup(`Dispatch exception: ${err.message}`, 'warning');
    } finally {
      setSendingTestDigest(false);
    }
  };

  const insertVariableToSubject = (variable: string) => {
    setDigestConfig(prev => ({
      ...prev,
      subjectTemplate: `${prev.subjectTemplate} ${variable}`
    }));
  };

  const allAssignmentGroups = Array.from(
    new Set([
      'ALL',
      ...availableAssignmentGroups,
      'Database Support Services',
      'Cloud Infrastructure',
      'Network Operations',
      'Enterprise Applications',
      'Service Desk Tier 2'
    ])
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Executive Control Deck */}
      <div className="bg-gray-800/80 border border-gray-700/80 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="p-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400">
                <Mail className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Management Automated Email Digest Configuration
              </h2>
              <span
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
                  digestConfig.enabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-gray-700/50 text-gray-400 border-gray-600'
                }`}
              >
                {digestConfig.enabled ? 'AUTOMATION ACTIVE' : 'AUTOMATION PAUSED'}
              </span>
            </div>
            <p className="text-xs text-gray-400 max-w-3xl leading-relaxed">
              Schedule automated daily or weekly email digest summaries of audit infractions, non-compliant work notes (including same-day date policy checks), and SLA breaches dispatched directly to management using corporate SMTP.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGeneratePreview}
              disabled={generatingPreview}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-gray-600 cursor-pointer"
            >
              {generatingPreview ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-blue-400" />
              )}
              <span>Live Digest Preview</span>
            </button>

            <button
              onClick={handleSendTestDigestNow}
              disabled={sendingTestDigest}
              className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 border border-blue-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {sendingTestDigest ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Send Test Digest Now</span>
            </button>

            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Save Configuration</span>
            </button>
          </div>
        </div>

        {/* Status ribbon */}
        <div className="mt-4 pt-3 border-t border-gray-700/60 flex flex-wrap items-center justify-between text-xs text-gray-400 gap-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              <span>
                Cadence:{' '}
                <strong className="text-gray-200 capitalize">
                  {digestConfig.frequency} ({digestConfig.dispatchTime}
                  {digestConfig.frequency === 'weekly' ? ` on ${digestConfig.dispatchDayOfWeek}` : ''})
                </strong>
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Server className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                Relay:{' '}
                <strong className="text-gray-200">
                  {smtpConfig.host}:{smtpConfig.port}
                </strong>{' '}
                {smtpConfig.useSimulator && (
                  <span className="text-amber-400 font-medium">(Simulator)</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {digestConfig.lastDispatchedAt && (
              <span>
                Last Dispatched:{' '}
                <span className="text-gray-300 font-mono">
                  {new Date(digestConfig.lastDispatchedAt).toLocaleString()}
                </span>
              </span>
            )}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 text-xs cursor-pointer"
            >
              <History className="h-3.5 w-3.5" />
              <span>Dispatch Logs ({dispatchLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex space-x-1 border-b border-gray-700/80 pb-2">
        <button
          onClick={() => setActiveSection('cadence')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSection === 'cadence'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Cadence & Schedule</span>
        </button>

        <button
          onClick={() => setActiveSection('recipients')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSection === 'recipients'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Management Recipients</span>
        </button>

        <button
          onClick={() => setActiveSection('filters')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSection === 'filters'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Infraction Scope & Rules</span>
        </button>

        <button
          onClick={() => setActiveSection('smtp')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSection === 'smtp'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
          }`}
        >
          <Server className="h-3.5 w-3.5" />
          <span>Existing SMTP Settings</span>
        </button>

        <button
          onClick={() => setActiveSection('template')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSection === 'template'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Subject & Memo Template</span>
        </button>
      </div>

      {/* SECTION 1: CADENCE & SCHEDULE */}
      {activeSection === 'cadence' && (
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-700/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span>Automated Dispatch Cadence & Timing</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Set when management receives consolidated reports summarizing audit non-compliances.
              </p>
            </div>

            {/* Master Toggle */}
            <label className="flex items-center cursor-pointer space-x-3">
              <span className="text-xs font-medium text-gray-300">
                {digestConfig.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={digestConfig.enabled}
                  onChange={e => setDigestConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                <div
                  className={`w-11 h-6 rounded-full transition-colors ${
                    digestConfig.enabled ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                />
                <div
                  className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    digestConfig.enabled ? 'transform translate-x-5' : ''
                  }`}
                />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Frequency Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-300">
                Digest Summary Frequency
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDigestConfig(prev => ({ ...prev, frequency: 'daily' }))}
                  className={`p-3 rounded-lg border text-left flex flex-col space-y-1 transition-all cursor-pointer ${
                    digestConfig.frequency === 'daily'
                      ? 'bg-blue-600/20 border-blue-500/50 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Daily Digest</span>
                    {digestConfig.frequency === 'daily' && (
                      <Check className="h-4 w-4 text-blue-400" />
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Dispatched every day at the designated hour to track daily quality.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDigestConfig(prev => ({ ...prev, frequency: 'weekly' }))}
                  className={`p-3 rounded-lg border text-left flex flex-col space-y-1 transition-all cursor-pointer ${
                    digestConfig.frequency === 'weekly'
                      ? 'bg-blue-600/20 border-blue-500/50 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Weekly Digest</span>
                    {digestConfig.frequency === 'weekly' && (
                      <Check className="h-4 w-4 text-blue-400" />
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Dispatched once a week on the selected day for leadership reviews.
                  </span>
                </button>
              </div>
            </div>

            {/* Time Configuration */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-300">
                Dispatch Time (Local Container Time)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="time"
                  value={digestConfig.dispatchTime}
                  onChange={e => setDigestConfig(prev => ({ ...prev, dispatchTime: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <div className="flex flex-wrap gap-1.5">
                  {['08:00', '09:00', '13:00', '17:00'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDigestConfig(prev => ({ ...prev, dispatchTime: preset }))}
                      className={`px-2 py-1 rounded text-[11px] font-mono border cursor-pointer ${
                        digestConfig.dispatchTime === preset
                          ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                The automated scheduler runs in the server background every minute to evaluate dispatch criteria.
              </p>
            </div>
          </div>

          {/* If Weekly: Day of Week */}
          {digestConfig.frequency === 'weekly' && (
            <div className="pt-4 border-t border-gray-700/60 space-y-2">
              <label className="block text-xs font-semibold text-gray-300">
                Weekly Delivery Day
              </label>
              <div className="flex flex-wrap gap-2">
                {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const).map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setDigestConfig(prev => ({ ...prev, dispatchDayOfWeek: day }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      digestConfig.dispatchDayOfWeek === day
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: MANAGEMENT RECIPIENTS & ROUTING */}
      {activeSection === 'recipients' && (
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-5 space-y-6">
          <div className="border-b border-gray-700/60 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-400" />
              <span>Management Distribution List & Supervisor Routing</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Specify the executive managers, service delivery leads, and governance compliance officers who receive the digest.
            </p>
          </div>

          <div className="space-y-4">
            {/* Primary Recipients */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-300">
                  Primary Management Recipients (Comma-Separated)
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const current = digestConfig.recipients ? digestConfig.recipients.split(',').map(s => s.trim()) : [];
                      if (!current.includes('director.it@enterprise.com')) {
                        current.push('director.it@enterprise.com');
                        setDigestConfig(prev => ({ ...prev, recipients: current.join(', ') }));
                      }
                    }}
                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                  >
                    + IT Director
                  </button>
                  <span className="text-gray-600">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = digestConfig.recipients ? digestConfig.recipients.split(',').map(s => s.trim()) : [];
                      if (!current.includes('governance.lead@enterprise.com')) {
                        current.push('governance.lead@enterprise.com');
                        setDigestConfig(prev => ({ ...prev, recipients: current.join(', ') }));
                      }
                    }}
                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                  >
                    + Governance Lead
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={digestConfig.recipients}
                onChange={e => setDigestConfig(prev => ({ ...prev, recipients: e.target.value }))}
                placeholder="director.operations@enterprise.com, itil.governance@enterprise.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-[11px] text-gray-400">
                Managers in this field receive the email in the 'To' header.
              </p>
            </div>

            {/* CC List */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Executive CC List (Audit & Compliance Archive)
              </label>
              <input
                type="text"
                value={digestConfig.ccRecipients}
                onChange={e => setDigestConfig(prev => ({ ...prev, ccRecipients: e.target.value }))}
                placeholder="audit.compliance@enterprise.com, itil-archive@enterprise.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Auto-CC Line Managers */}
            <div className="pt-3 border-t border-gray-700/60">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={digestConfig.includeAssignedManagers}
                  onChange={e => setDigestConfig(prev => ({ ...prev, includeAssignedManagers: e.target.checked }))}
                  className="mt-0.5 rounded border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-gray-200">
                    Dynamic Line Manager Routing (Auto-CC Flagged Engineers' Direct Supervisors)
                  </span>
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                    When enabled, the digest engine examines each flagged non-compliant ticket and dynamically CC's that engineer's recorded line manager (<code className="text-blue-400 font-mono">assigneeManager</code>) for immediate corrective action.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: INFRACTION SCOPE & FILTERS */}
      {activeSection === 'filters' && (
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-5 space-y-6">
          <div className="border-b border-gray-700/60 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Filter className="h-4 w-4 text-blue-400" />
              <span>Infraction Filtering & Compliance Scope Criteria</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Select which categories of non-compliance and severity levels are compiled into the management digest.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Minimum Severity */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-300">
                Minimum Infraction Severity Threshold
              </label>
              <div className="space-y-2">
                {[
                  {
                    id: 'warning',
                    title: 'Critical & Warning (< 75% Score) — Recommended',
                    desc: 'Flags red critical failures (<50%) and amber quality warnings (<75%). Standard ITIL standard.'
                  },
                  {
                    id: 'critical',
                    title: 'Critical Infractions Only (< 50% Score - Red)',
                    desc: 'Escalates only severe compliance failures for urgent leadership intervention.'
                  },
                  {
                    id: 'all',
                    title: 'All Infractions (< 100% Score)',
                    desc: 'Flags any incident with any checklist or documentation discrepancy.'
                  }
                ].map(opt => (
                  <label
                    key={opt.id}
                    className={`block p-2.5 rounded-lg border cursor-pointer transition-all ${
                      digestConfig.minSeverityFilter === opt.id
                        ? 'bg-blue-600/15 border-blue-500/50 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="minSeverityFilter"
                        checked={digestConfig.minSeverityFilter === opt.id}
                        onChange={() => setDigestConfig(prev => ({ ...prev, minSeverityFilter: opt.id as any }))}
                        className="text-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-gray-200">{opt.title}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 ml-5 mt-1">{opt.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Policy Check Inclusions */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-300">
                Governance Rules Evaluated in Digest
              </label>
              <div className="space-y-2.5">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={digestConfig.includeStaleDateViolations}
                    onChange={e => setDigestConfig(prev => ({ ...prev, includeStaleDateViolations: e.target.checked }))}
                    className="mt-0.5 rounded border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-200 flex items-center space-x-1">
                      <span>📅 Same-Day Worknote Policy Check</span>
                      <span className="px-1.5 py-0.2 text-[9px] bg-red-500/20 text-red-300 rounded font-mono">CRITICAL</span>
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Flag any activity log where the last update date is older than today.
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={digestConfig.includeSlaIdleViolations}
                    onChange={e => setDigestConfig(prev => ({ ...prev, includeSlaIdleViolations: e.target.checked }))}
                    className="mt-0.5 rounded border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-200">
                      ⏳ SLA Inactivity Violations (&gt; 24h Idle)
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Flag ongoing incidents with no diagnostic or customer update in over 24 hours.
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={digestConfig.includeIncompleteResolution}
                    onChange={e => setDigestConfig(prev => ({ ...prev, includeIncompleteResolution: e.target.checked }))}
                    className="mt-0.5 rounded border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-200">
                      📝 Skeletal Notes &amp; Missing Closure Codes
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Flag missing root causes, vague diagnostic documentation, or unverified work steps.
                    </p>
                  </div>
                </label>
              </div>

              {/* Assignment Group Scope */}
              <div className="pt-3 border-t border-gray-700/60 space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  Assignment Group Scope Filter
                </label>
                <select
                  value={digestConfig.assignmentGroupFilter}
                  onChange={e => setDigestConfig(prev => ({ ...prev, assignmentGroupFilter: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {allAssignmentGroups.map(group => (
                    <option key={group} value={group}>
                      {group === 'ALL' ? '🌐 All Assignment Groups (Organization-wide)' : group}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max Records Limit */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  Max Infractions per Digest Summary
                </label>
                <div className="flex gap-2">
                  {[10, 25, 50, 100].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setDigestConfig(prev => ({ ...prev, maxInfractionsCount: cnt }))}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                        digestConfig.maxInfractionsCount === cnt
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                      }`}
                    >
                      Top {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: EXISTING SMTP SETTINGS */}
      {activeSection === 'smtp' && (
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-700/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Server className="h-4 w-4 text-emerald-400" />
                <span>Existing Corporate SMTP Relay Configuration</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Manage the active SMTP connection used for transmitting all automated alerts and digest summaries.
              </p>
            </div>

            <button
              onClick={handleTestSmtpConnection}
              disabled={testingSmtp}
              className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {testingSmtp ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Terminal className="h-3.5 w-3.5" />
              )}
              <span>Verify SMTP Handshake</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Host */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300">SMTP Host / Server</label>
              <input
                type="text"
                value={smtpConfig.host}
                onChange={e => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                placeholder="smtp.office365.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Port */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300">Port</label>
              <input
                type="number"
                value={smtpConfig.port}
                onChange={e => setSmtpConfig(prev => ({ ...prev, port: Number(e.target.value) || 587 }))}
                placeholder="587"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* SSL/TLS */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300">Encryption Protocol</label>
              <div className="flex items-center space-x-3 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={smtpConfig.secure}
                    onChange={e => setSmtpConfig(prev => ({ ...prev, secure: e.target.checked }))}
                    className="rounded border-gray-700 text-blue-600 cursor-pointer"
                  />
                  <span>Implicit SSL/TLS (Port 465)</span>
                </label>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300">Auth Username / Service Account</label>
              <input
                type="text"
                value={smtpConfig.user}
                onChange={e => setSmtpConfig(prev => ({ ...prev, user: e.target.value }))}
                placeholder="compliance-alerts@company.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-300">App Password / Secret</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-gray-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                >
                  {showPassword ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  <span>{showPassword ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={smtpConfig.pass}
                onChange={e => setSmtpConfig(prev => ({ ...prev, pass: e.target.value }))}
                placeholder="••••••••••••••••"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* From Address */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300">Sender 'From' Address</label>
              <input
                type="text"
                value={smtpConfig.from}
                onChange={e => setSmtpConfig(prev => ({ ...prev, from: e.target.value }))}
                placeholder="governance-alerts@enterprise.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Sender Display Name */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-300">Sender Display Name</label>
            <input
              type="text"
              value={smtpConfig.displayName || ''}
              onChange={e => setSmtpConfig(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Enterprise ITIL Governance & SLA Audit Desk"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Simulator Toggle */}
          <div className="pt-3 border-t border-gray-700/60 flex items-start justify-between bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/80">
            <div>
              <span className="text-xs font-bold text-gray-200 flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>SMTP Zero-Credential Sandbox Simulator Mode</span>
              </span>
              <p className="text-[11px] text-gray-400 mt-1 max-w-xl">
                When enabled, email transmissions and socket handshakes are verified inside an offline simulated sandbox. This allows risk-free testing without requiring corporate credentials or exposing firewalled SMTP ports.
              </p>
            </div>
            <label className="flex items-center cursor-pointer space-x-2">
              <span className="text-xs font-medium text-gray-300">
                {smtpConfig.useSimulator ? 'Simulator Active' : 'Live SMTP Active'}
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={!!smtpConfig.useSimulator}
                  onChange={e => setSmtpConfig(prev => ({ ...prev, useSimulator: e.target.checked }))}
                />
                <div
                  className={`w-11 h-6 rounded-full transition-colors ${
                    smtpConfig.useSimulator ? 'bg-amber-600' : 'bg-emerald-600'
                  }`}
                />
                <div
                  className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    smtpConfig.useSimulator ? 'transform translate-x-5' : ''
                  }`}
                />
              </div>
            </label>
          </div>
        </div>
      )}

      {/* SECTION 5: TEMPLATE & MEMORANDUM */}
      {activeSection === 'template' && (
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-5 space-y-6">
          <div className="border-b border-gray-700/60 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileText className="h-4 w-4 text-blue-400" />
              <span>Email Subject & Executive Memorandum Customization</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Personalize the subject line template and leadership instructions sent at the top of the executive digest.
            </p>
          </div>

          <div className="space-y-4">
            {/* Subject Template */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-300">
                  Email Subject Template
                </label>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] text-gray-400">Insert Variable:</span>
                  {['{{frequency}}', '{{date}}', '{{count}}', '{{avg_score}}'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertVariableToSubject(tag)}
                      className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-blue-300 text-[10px] rounded font-mono cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={digestConfig.subjectTemplate}
                onChange={e => setDigestConfig(prev => ({ ...prev, subjectTemplate: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Executive Memorandum / Instructions */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Leadership Memorandum (Preamble Box in Email)
              </label>
              <textarea
                rows={4}
                value={digestConfig.executiveIntroNote}
                onChange={e => setDigestConfig(prev => ({ ...prev, executiveIntroNote: e.target.value }))}
                placeholder="Guidance for operations leads and IT management regarding SLA resolution and same-day work notes compliance..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-gray-200 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
              />
              <p className="text-[11px] text-gray-400">
                This notice appears prominently in a highlighted callout box under the header banner of every digest email.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LIVE DIGEST PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-850">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Live Executive Digest Email Preview
                </h3>
                <span className="text-xs text-gray-400">
                  (Rendered as viewed in Outlook / Webmail)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSendTestDigestNow}
                  disabled={sendingTestDigest}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                  <span>Send This Now</span>
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800 cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Email Header Preview Bar */}
            <div className="bg-gray-950 px-4 py-2.5 border-b border-gray-800 text-xs text-gray-400 space-y-1 font-mono">
              <div>
                <strong className="text-gray-300">Subject:</strong> {previewSubject || digestConfig.subjectTemplate}
              </div>
              <div className="flex flex-wrap gap-4">
                <span>
                  <strong className="text-gray-300">From:</strong> {smtpConfig.displayName || 'Compliance Bot'} &lt;{smtpConfig.from}&gt;
                </span>
                <span>
                  <strong className="text-gray-300">To:</strong> {digestConfig.recipients}
                </span>
                {digestConfig.ccRecipients && (
                  <span>
                    <strong className="text-gray-300">CC:</strong> {digestConfig.ccRecipients}
                  </span>
                )}
              </div>
            </div>

            {/* Rendered HTML Container */}
            <div className="flex-1 overflow-auto p-4 bg-slate-900/40">
              {generatingPreview ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
                  <p className="text-xs text-gray-400">Compiling live infractions and generating HTML digest...</p>
                </div>
              ) : previewHtml ? (
                <iframe
                  title="Digest Preview"
                  srcDoc={previewHtml}
                  className="w-full h-[600px] border border-gray-700 rounded-lg bg-white"
                />
              ) : (
                <div className="text-center py-20 text-gray-400 text-xs">
                  No preview generated yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SMTP TRACE / VERIFICATION MODAL */}
      {showSmtpTraceModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-850">
              <div className="flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">SMTP Socket Protocol Trace</h3>
              </div>
              <button
                onClick={() => setShowSmtpTraceModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-black font-mono text-xs text-gray-300 h-80 overflow-y-auto space-y-1.5 border-b border-gray-800">
              {smtpTraceLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes('SUCCESS') || log.includes('250') || log.includes('OK')
                      ? 'text-emerald-400'
                      : log.includes('ERROR') || log.includes('WARN') || log.includes('5')
                      ? 'text-red-400'
                      : 'text-gray-300'
                  }
                >
                  {log}
                </div>
              ))}
              {testingSmtp && (
                <div className="flex items-center space-x-2 text-blue-400 animate-pulse pt-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Connecting to SMTP socket and negotiating TLS transport...</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-900 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                {smtpTestSuccess === true && (
                  <span className="flex items-center space-x-1 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Socket Verified (Ready for Delivery)</span>
                  </span>
                )}
                {smtpTestSuccess === false && (
                  <span className="flex items-center space-x-1 text-red-400 text-xs font-bold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Verification Failed</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowSmtpTraceModal(false)}
                className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-bold cursor-pointer"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORICAL DISPATCH LOGS MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Digest Dispatch Execution History</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {dispatchLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No automated or manual digest transmissions logged yet. Use "Send Test Digest Now" to execute an initial test run.
                </div>
              ) : (
                <div className="space-y-2">
                  {dispatchLogs.map((item, itemIdx) => (
                    <div
                      key={`${item.id}-${itemIdx}`}
                      className="bg-gray-800/80 border border-gray-700 rounded-lg p-3 text-xs flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.status === 'sent'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : item.status === 'simulated'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="font-semibold text-gray-200 capitalize">
                            {item.triggerType.replace('_', ' ')} ({item.frequency})
                          </span>
                          <span className="text-gray-400 text-[11px] font-mono">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-gray-400 text-[11px]">
                          Infractions: <strong className="text-amber-300">{item.infractionsCount}</strong> • Avg Score: <strong className="text-blue-300">{item.averageScore}%</strong> • Recipients: {item.recipientsCount} • Relay: {item.smtpHost}
                        </div>
                      </div>

                      {item.messageId && (
                        <div className="text-[10px] font-mono text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-800">
                          {item.messageId}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementEmailDigestConfig;
