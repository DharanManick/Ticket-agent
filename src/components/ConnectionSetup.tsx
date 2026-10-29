import React, { useState, useEffect, useRef } from 'react';
import {
  Server,
  Database,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Filter,
  Users,
  Layers,
  UploadCloud,
  FileSpreadsheet,
  Check,
  X,
  Radio,
  Play,
  ShieldCheck,
  Trash2,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Ticket } from '../types';
import { MandatoryMetricsConfig } from './MandatoryMetricsConfig';
import UploadSection from './UploadSection';

const DEFAULT_TRACKED_GROUPS: string[] = [];

interface ConnectionSetupProps {
  triggerPopup: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onTicketsLoaded?: (tickets: Ticket[]) => void;
  onTriggerAudit?: (tickets: Ticket[]) => Promise<void>;
  auditedCount?: number;
  totalRecordsCount?: number;
  isLoading?: boolean;
}

export const ConnectionSetup: React.FC<ConnectionSetupProps> = ({
  triggerPopup,
  onTicketsLoaded = (_tickets: Ticket[]) => {},
  onTriggerAudit,
  auditedCount = 0,
  totalRecordsCount = 0,
  isLoading = false
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'rest' | 'upload' | 'metrics'>('rest');
  const [selectedMetricGroup, setSelectedMetricGroup] = useState<string>('DEFAULT');
  
  // Credentials
  const [instanceName, setInstanceName] = useState(() => localStorage.getItem('gov_snow_instance') || 'dev423209');
  const [username, setUsername] = useState(() => localStorage.getItem('gov_snow_user') || 'admin');
  const [password, setPassword] = useState(() => localStorage.getItem('gov_snow_pass') || 'BrwYffM0%X*1');
  const [showPassword, setShowPassword] = useState(false);
  
  // Limits & Scope
  const [syncLimit, setSyncLimit] = useState<number>(() => {
    const saved = localStorage.getItem('gov_snow_limit');
    if (saved === '0' || saved?.toLowerCase() === 'off') return 0;
    return Number(saved || '0');
  });
  const [syncType, setSyncType] = useState<'tickets' | 'cis' | 'kbs' | 'both' | 'all'>(
    () => (localStorage.getItem('gov_snow_sync_type') as any) || 'all'
  );
  
  // Toggles: default onlyResolved to FALSE
  const [onlyResolved, setOnlyResolved] = useState<boolean>(() => {
    const cached = localStorage.getItem('gov_only_resolved') ?? localStorage.getItem('gov_only_solve_propose');
    return cached === 'true'; // Strictly default to false
  });
  const onlySolvePropose = onlyResolved;
  const setOnlySolvePropose = setOnlyResolved;
  
  const [manualLoadEnabled, setManualLoadEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('gov_snow_manual_load_enabled');
    return saved === 'true';
  });

  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('gov_snow_auto_sync');
    return saved !== 'false';
  });

  const [autoFetchInterval, setAutoFetchInterval] = useState<number>(() => {
    const saved = localStorage.getItem('gov_snow_auto_fetch_interval');
    return Number(saved || '5');
  });

  // Enabled assignment groups (synced for Mandatory Metrics subtab)
  const [trackedGroups, setTrackedGroups] = useState<string[]>([]);

  // Status & Logs
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Connection Setup ready. Live ServiceNow endpoint configured.`
  ]);
  const [connectionProfileActive, setConnectionProfileActive] = useState(true);

  // Load server config on mount
  useEffect(() => {
    fetch('/api/servicenow/credentials')
      .then(res => res.json())
      .then(data => {
        const c = data.credentials || (data.instanceName ? data : null);
        if (c) {
          if (c.instanceName) setInstanceName(c.instanceName);
          if (c.username) setUsername(c.username);
          if (c.password) setPassword(c.password);
          if (c.limit !== undefined) setSyncLimit(c.limit);
          if (c.syncType) setSyncType(c.syncType);
          if (c.autoSyncEnabled !== undefined) setAutoSyncEnabled(c.autoSyncEnabled);
          if (c.autoFetchInterval !== undefined) setAutoFetchInterval(c.autoFetchInterval);
          if (c.manualLoadEnabled !== undefined) setManualLoadEnabled(c.manualLoadEnabled);
          if (Array.isArray(c.trackedGroups)) setTrackedGroups(c.trackedGroups);
          // Only update onlyResolved if explicitly true in server config
          const serverResolved = c.onlyResolved !== undefined ? c.onlyResolved === true : (c.onlySolvePropose === true);
          if (c.onlyResolved !== undefined || c.onlySolvePropose !== undefined) {
            setOnlyResolved(serverResolved);
            localStorage.setItem('gov_only_resolved', String(serverResolved));
          }
        }
      })
      .catch(() => {});

    // Sync enabled assignment groups from server
    const fetchEnabledGroups = () => {
      fetch('/api/servicenow/assignment-groups')
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.enabledGroups)) {
            setTrackedGroups(data.enabledGroups);
          }
        })
        .catch(() => {});
    };
    fetchEnabledGroups();

    const handleGroupsUpdated = (e: any) => {
      if (e?.detail?.enabledGroups && Array.isArray(e.detail.enabledGroups)) {
        setTrackedGroups(e.detail.enabledGroups);
      } else {
        fetchEnabledGroups();
      }
    };
    window.addEventListener('governance_tracked_groups_updated', handleGroupsUpdated);
    window.addEventListener('servicenow_realtime_sync', handleGroupsUpdated);

    return () => {
      window.removeEventListener('governance_tracked_groups_updated', handleGroupsUpdated);
      window.removeEventListener('servicenow_realtime_sync', handleGroupsUpdated);
    };
  }, []);

  const saveCredentialsToServer = async (customOverrides: Record<string, any> = {}) => {
    const payload = {
      instanceName,
      username,
      password,
      limit: syncLimit,
      syncType,
      useSimulator: false,
      autoSyncEnabled,
      autoFetchEnabled: autoSyncEnabled,
      autoFetchInterval,
      onlyResolved,
      onlySolvePropose: onlyResolved,
      manualLoadEnabled,
      ...customOverrides
    };

    localStorage.setItem('gov_snow_instance', payload.instanceName);
    localStorage.setItem('gov_snow_user', payload.username);
    localStorage.setItem('gov_snow_pass', payload.password);
    localStorage.setItem('gov_snow_limit', payload.limit === 0 ? 'off' : String(payload.limit));
    localStorage.setItem('gov_snow_sync_type', payload.syncType);
    localStorage.setItem('gov_snow_auto_sync', String(payload.autoSyncEnabled));
    localStorage.setItem('gov_only_resolved', String(payload.onlyResolved));
    localStorage.setItem('gov_only_solve_propose', String(payload.onlyResolved));
    localStorage.setItem('gov_snow_manual_load_enabled', String(payload.manualLoadEnabled));

    try {
      const resp = await fetch('/api/servicenow/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return resp.ok;
    } catch {
      return false;
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Testing live REST handshake with ${instanceName}...`]);

    try {
      const cleanUrl = instanceName.replace(/\/$/, '');
      const instanceHost = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}.service-now.com`;
      const authHeader = 'Basic ' + btoa(`${username}:${password}`);

      const resp = await fetch('/api/servicenow/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, username, password, targetTable: 'incident' })
      });

      const data = await resp.json();
      if (data.success) {
        setTestResult({ success: true, message: `Connected successfully to ${instanceHost}! HTTP 200 OK.` });
        setSyncLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Handshake SUCCESSFUL: ServiceNow Table API returned valid payload.`
        ]);
        triggerPopup('Live ServiceNow Connection Established!', 'success');
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed.' });
        setSyncLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Handshake FAILED: ${data.error || 'Check credentials'}`
        ]);
        triggerPopup(data.error || 'ServiceNow authentication failed', 'error');
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network request failed' });
      triggerPopup('Network failure connecting to ServiceNow', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const triggerLiveSync = async (resolvedOverride?: boolean) => {
    const activeResolved = resolvedOverride !== undefined ? resolvedOverride : onlyResolved;
    setIsSyncing(true);
    setSyncLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Initiating live REST fetch (Table: incident, Limit: ${syncLimit === 0 ? 'OFF' : syncLimit}, Resolved Only: ${activeResolved ? 'ON' : 'OFF'})...`
    ]);

    try {
      await saveCredentialsToServer({ onlyResolved: activeResolved, onlySolvePropose: activeResolved });

      const response = await fetch('/api/servicenow/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName,
          username,
          password,
          syncType,
          limit: syncLimit,
          useSimulator: false,
          manualLoadEnabled,
          onlyResolved: activeResolved,
          onlySolvePropose: activeResolved
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      if (data.logs && Array.isArray(data.logs)) {
        setSyncLogs(prev => [...prev, ...data.logs]);
      }

      if (data.tickets && Array.isArray(data.tickets)) {
        onTicketsLoaded(data.tickets);
        if (onTriggerAudit) {
          await onTriggerAudit(data.tickets);
        }
        triggerPopup(`Successfully synced ${data.tickets.length} live ServiceNow incidents into workspace!`, 'success');
      }
    } catch (err: any) {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Sync Error: ${err.message || String(err)}`]);
      triggerPopup(`Sync failed: ${err.message || 'ServiceNow API unreachable'}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleResolvedFilter = async () => {
    const nextVal = !onlyResolved;
    setOnlyResolved(nextVal);
    localStorage.setItem('gov_only_resolved', String(nextVal));
    localStorage.setItem('gov_only_solve_propose', String(nextVal));
    triggerPopup(
      nextVal
        ? "Resolved filter ENABLED: Auditing only 'Resolved' tickets."
        : "Resolved filter DISABLED: Auditing ALL tickets across the instance.",
      'info'
    );
    await triggerLiveSync(nextVal);
  };

  const toggleSolveProposeFilter = toggleResolvedFilter;

  const toggleManualLoad = async () => {
    const nextVal = !manualLoadEnabled;
    setManualLoadEnabled(nextVal);
    localStorage.setItem('gov_snow_manual_load_enabled', String(nextVal));
    await saveCredentialsToServer({ manualLoadEnabled: nextVal });
    triggerPopup(
      nextVal
        ? "Manual Load Mode ON: Automatic incident overwrites paused."
        : "Manual Load Mode OFF: Live ServiceNow polling active.",
      'info'
    );
  };

  const toggleAutoSync = async () => {
    const nextVal = !autoSyncEnabled;
    setAutoSyncEnabled(nextVal);
    localStorage.setItem('gov_snow_auto_sync', String(nextVal));
    await saveCredentialsToServer({ autoSyncEnabled: nextVal, autoFetchEnabled: nextVal });
    triggerPopup(
      nextVal
        ? "Auto-Sync ENABLED: Continual background audit checks running."
        : "Auto-Sync PAUSED: Background sweeps suspended.",
      nextVal ? 'success' : 'info'
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-[#12141C] border border-[#2A2D35] rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/10 border border-blue-500/30 rounded-xl text-blue-400">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                  Connection Setup
                </h2>
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  REST Gateway Production Ready
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Manage live ServiceNow Table API authentication, auto-sync polling frequency, fetch limits, and real-time governance parameters.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Resolved Only Toggle */}
            <button
              type="button"
              onClick={toggleResolvedFilter}
              className={`flex items-center space-x-2 border rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer ${
                onlyResolved
                  ? 'bg-blue-600/15 border-blue-500/40 text-blue-300 font-bold'
                  : 'bg-[#1A1D24] border-[#2A2D35] text-gray-400 hover:text-white'
              }`}
              title="When OFF, audits all tickets across the instance. When ON, filters only tickets in Resolved state."
            >
              <Filter className={`h-3.5 w-3.5 ${onlyResolved ? 'text-blue-400' : 'text-gray-500'}`} />
              <span>Resolved Only:</span>
              <span className={`font-mono font-black ${onlyResolved ? 'text-blue-400' : 'text-gray-500'}`}>
                {onlyResolved ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Manual Load Mode Toggle */}
            <button
              type="button"
              onClick={toggleManualLoad}
              className={`flex items-center space-x-2 border rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer ${
                manualLoadEnabled
                  ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-300 font-bold'
                  : 'bg-[#1A1D24] border-[#2A2D35] text-gray-400 hover:text-white'
              }`}
              title="When ON, prevents background ServiceNow sweeps from replacing manual spreadsheet data."
            >
              <Database className={`h-3.5 w-3.5 ${manualLoadEnabled ? 'text-emerald-400' : 'text-gray-500'}`} />
              <span>Manual Load Mode:</span>
              <span className={`font-mono font-black ${manualLoadEnabled ? 'text-emerald-400' : 'text-gray-500'}`}>
                {manualLoadEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Auto-Sync Toggle */}
            <button
              type="button"
              onClick={toggleAutoSync}
              className={`flex items-center space-x-2 border rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer ${
                autoSyncEnabled
                  ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300 font-bold'
                  : 'bg-[#1A1D24] border-[#2A2D35] text-gray-400 hover:text-white'
              }`}
              title="Toggle automatic background sync checks"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${autoSyncEnabled ? 'text-indigo-400 animate-spin' : 'text-gray-500'}`} />
              <span>Auto-Sync:</span>
              <span className={`font-mono font-black ${autoSyncEnabled ? 'text-indigo-400' : 'text-gray-500'}`}>
                {autoSyncEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex border-b border-[#2A2D35] mt-5 gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('rest')}
            className={`pb-2.5 px-3 text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeSubTab === 'rest'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Server className="h-3.5 w-3.5" />
            <span>ServiceNow Direct REST Integration API</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('metrics')}
            className={`pb-2.5 px-3 text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeSubTab === 'metrics'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Mandatory Metrics Checks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('upload')}
            className={`pb-2.5 px-3 text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeSubTab === 'upload'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Spreadsheet Dump Parser (.xlsx / .csv)</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'rest' && (
        <div className="space-y-6">
          {/* Active Connection Profile Summary Box */}
          <div className="bg-[#0E1117] border border-[#2A2D35] rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A2D35]/60 pb-3">
              <div className="flex items-center space-x-2 text-indigo-400 font-mono font-bold text-xs uppercase tracking-wider">
                <Database className="h-4 w-4" />
                <span>Active ServiceNow Connection Profile</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-2.5 py-1 bg-[#1A1D24] hover:bg-[#252A35] border border-[#2A2D35] hover:border-indigo-500/50 rounded text-[11px] font-mono text-indigo-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing Handshake...' : 'Test Connection'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => saveCredentialsToServer().then(ok => ok && triggerPopup('Connection configuration saved successfully!', 'success'))}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                >
                  <Check className="h-3 w-3" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                testResult.success 
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}>
                {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {/* Host URL Input */}
              <div className="bg-[#141720] border border-[#2A2D35] p-3 rounded-lg space-y-1">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block">Instance Host / URL</span>
                <input
                  type="text"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="e.g. dev12000 or company.service-now.com"
                  className="w-full bg-[#0A0C0F] border border-[#2A2D35] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[9px] text-gray-500 font-mono block truncate">
                  https://{instanceName.replace(/https?:\/\//, '').replace(/\/$/, '')}.service-now.com
                </span>
              </div>

              {/* Username Input */}
              <div className="bg-[#141720] border border-[#2A2D35] p-3 rounded-lg space-y-1">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block">Authorized Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or service_account"
                  className="w-full bg-[#0A0C0F] border border-[#2A2D35] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Password Input */}
              <div className="bg-[#141720] border border-[#2A2D35] p-3 rounded-lg space-y-1">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block">API Secret / Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#0A0C0F] border border-[#2A2D35] rounded pl-2.5 pr-8 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1.5 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Fetch Limit Selector */}
              <div className="bg-[#141720] border border-[#2A2D35] p-3 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block">Record Limit</span>
                  <button
                    type="button"
                    onClick={() => setSyncLimit(syncLimit === 0 ? 10 : 0)}
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                      syncLimit === 0 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {syncLimit === 0 ? 'Set Limit (10)' : '⚡ Turn Limit OFF'}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-mono font-extrabold text-xs truncate ${syncLimit === 0 ? 'text-emerald-400' : 'text-white'}`}>
                    {syncLimit === 0 ? '⚡ OFF (All Tickets)' : `${syncLimit} Incidents`}
                  </span>
                  <select
                    value={syncLimit === 0 ? 'off' : String(syncLimit)}
                    onChange={(e) => setSyncLimit(e.target.value === 'off' ? 0 : Number(e.target.value))}
                    className="text-[10px] font-mono bg-[#090C12] border border-[#2A2D35] rounded px-1.5 py-0.5 text-gray-300 cursor-pointer"
                  >
                    <option value="off">OFF (All Tickets)</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="250">250</option>
                    <option value="500">500</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Sync Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Sync Scope */}
              <div className="bg-[#141720] border border-[#2A2D35] p-3 rounded-lg space-y-1">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block">Sync Table Scope</span>
                <select
                  value={syncType}
                  onChange={(e) => setSyncType(e.target.value as any)}
                  className="w-full text-xs font-mono bg-[#0A0C0F] border border-[#2A2D35] rounded px-2 py-1 text-white"
                >
                  <option value="tickets">Incidents Only (incident)</option>
                  <option value="cis">Configuration Items (cmdb_ci)</option>
                  <option value="kbs">Knowledge Articles (kb_knowledge)</option>
                  <option value="both">Incidents & Knowledge Base</option>
                  <option value="all">All Tables (Tickets, CIs, KBs)</option>
                </select>
              </div>

              {/* Auto Fetch Polling Interval */}
              <div className="bg-[#141720] border border-[#2A2D35] p-3 rounded-lg space-y-1">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block">Auto-Fetch Frequency (Sec)</span>
                <input
                  type="number"
                  min="3"
                  max="120"
                  value={autoFetchInterval}
                  onChange={(e) => setAutoFetchInterval(Math.max(3, Math.min(120, Number(e.target.value) || 5)))}
                  className="w-full bg-[#0A0C0F] border border-[#2A2D35] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex flex-col gap-1 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Active tickets currently loaded in workspace: <strong>{totalRecordsCount}</strong> records ({auditedCount} audited)</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span className="text-slate-500">Last Successful Sync:</span>
                  <span className="text-cyan-400 font-bold">{localStorage.getItem('gov_last_sync_time') || 'Continuous Background Sync Active'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => triggerLiveSync()}
                disabled={isSyncing}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-mono font-bold tracking-wide shadow-lg cursor-pointer transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Synchronizing Live Records...' : 'Trigger ServiceNow REST Connection & Sync'}</span>
              </button>
            </div>
          </div>

          {/* Live REST Sync Log Terminal */}
          <div className="bg-[#0A0C0F] border border-[#2A2D35] rounded-xl p-4 space-y-2 shadow-inner">
            <div className="flex items-center justify-between border-b border-[#1F232D] pb-2">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-gray-300">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span>ServiceNow Gateway REST Sync Terminal</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncLogs([`[${new Date().toLocaleTimeString()}] Terminal cleared.`])}
                className="text-[10px] font-mono text-gray-500 hover:text-gray-300"
              >
                Clear Log
              </button>
            </div>

            <div className="font-mono text-[11px] text-emerald-400 bg-[#050608] p-3 rounded-lg max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
              {syncLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Governance Incident Dump Parser & Processor Tab */}
      {activeSubTab === 'upload' && (
        <div className="space-y-4">
          <UploadSection
            onTicketsLoaded={onTicketsLoaded}
            isLoading={isLoading}
            triggerPopup={triggerPopup}
            onTriggerAudit={onTriggerAudit}
          />
        </div>
      )}

      {/* Mandatory Metrics Checks per Assignment Group Tab */}
      {activeSubTab === 'metrics' && (
        <div className="space-y-6">
          <MandatoryMetricsConfig
            triggerPopup={triggerPopup}
            availableAssignmentGroups={trackedGroups}
            initialSelectedGroup={selectedMetricGroup}
          />
        </div>
      )}
    </div>
  );
};

export default ConnectionSetup;
