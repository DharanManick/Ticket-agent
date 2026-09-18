import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Database, 
  FileText, 
  Server, 
  Terminal, 
  HelpCircle, 
  Code, 
  Search, 
  Copy, 
  Check, 
  Box, 
  Globe, 
  Eye, 
  X, 
  Clock, 
  History, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  CheckCircle, 
  XCircle,
  Activity,
  ArrowDownCircle,
  List
} from 'lucide-react';
import { FetchLogEntry } from '../types';

interface ServiceNowApiTesterProps {
  triggerPopup: (msg: string, type?: any) => void;
}

export default function ServiceNowApiTester({ triggerPopup }: ServiceNowApiTesterProps) {
  const [credentials, setCredentials] = useState(() => {
    const savedLimit = localStorage.getItem('gov_snow_limit');
    const parsedLimit = (savedLimit === '0' || savedLimit?.toLowerCase() === 'off') ? 0 : Number(savedLimit || '10');
    return {
      instanceName: localStorage.getItem('gov_snow_instance') || 'dev12000',
      username: localStorage.getItem('gov_snow_user') || 'admin',
      password: localStorage.getItem('gov_snow_pass') || 'admin',
      limit: parsedLimit,
      syncType: ((localStorage.getItem('gov_snow_sync_type') as any) || 'both') as 'tickets' | 'cis' | 'kbs' | 'both' | 'all',
      useSimulator: false,
      autoSyncEnabled: localStorage.getItem('gov_snow_auto_sync') !== 'false',
      autoFetchEnabled: localStorage.getItem('gov_snow_auto_fetch_enabled') !== 'false',
      autoFetchInterval: Number(localStorage.getItem('gov_snow_auto_fetch_interval') || '2'),
      onlySolvePropose: localStorage.getItem('gov_only_solve_propose') === 'true',
      assignmentGroupFilter: localStorage.getItem('gov_snow_assignment_group_filter') || 'ALL'
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [fetchLogs, setFetchLogs] = useState<FetchLogEntry[]>([]);
  const [isFetchingLogsLoading, setIsFetchingLogsLoading] = useState(false);
  const [fetchedIncidents, setFetchedIncidents] = useState<any[]>([]);
  const [fetchedArticles, setFetchedArticles] = useState<any[]>([]);
  const [fetchedCis, setFetchedCis] = useState<any[]>([]);
  const [overallOverview, setOverallOverview] = useState<any>(null);
  const [rawPayload, setRawPayload] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'fetch_logs' | 'incidents' | 'overview' | 'cis' | 'articles' | 'raw'>('fetch_logs');
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [ciSearch, setCiSearch] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logFilterType, setLogFilterType] = useState<'all' | 'auto' | 'manual'>('all');
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<any | null>(null);

  // Load existing credentials & initial fetch logs on startup
  useEffect(() => {
    fetchCredentials();
    loadFetchLogs();
  }, []);

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/servicenow/credentials');
      if (response.ok) {
        const data = await response.json();
        if (data && data.instanceName) {
          setCredentials(prev => ({
            ...prev,
            instanceName: data.instanceName || 'dev12000',
            username: data.username || 'admin',
            password: data.password || 'admin',
            limit: (data.limit === 0 || data.limit === '0' || String(data.limit).toLowerCase() === 'off') ? 0 : Number(data.limit || 10),
            syncType: data.syncType || 'both',
            useSimulator: data.useSimulator === true,
            autoSyncEnabled: data.autoSyncEnabled !== false,
            autoFetchEnabled: data.autoFetchEnabled !== false,
            autoFetchInterval: Number(data.autoFetchInterval) || 2,
            onlySolvePropose: data.onlySolvePropose !== false,
            assignmentGroupFilter: data.assignmentGroupFilter || 'ALL'
          }));
        }
      }
    } catch (e) {
      console.error('Error fetching ServiceNow credentials:', e);
    }
  };

  const loadFetchLogs = async () => {
    setIsFetchingLogsLoading(true);
    try {
      const resp = await fetch('/api/servicenow/fetch-logs');
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.logs)) {
          setFetchLogs(data.logs);
        }
      }
    } catch (err) {
      console.error('Failed to load fetch logs', err);
    } finally {
      setIsFetchingLogsLoading(false);
    }
  };

  const handleClearFetchLogs = async () => {
    try {
      const resp = await fetch('/api/servicenow/fetch-logs', { method: 'DELETE' });
      if (resp.ok) {
        setFetchLogs([]);
        triggerPopup('Fetch logs history cleared successfully!', 'info');
      }
    } catch (err) {
      triggerPopup('Failed to clear fetch logs history.', 'warning');
    }
  };

  const saveCredentials = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      // Save locally
      localStorage.setItem('gov_snow_instance', credentials.instanceName);
      localStorage.setItem('gov_snow_user', credentials.username);
      localStorage.setItem('gov_snow_pass', credentials.password);
      localStorage.setItem('gov_snow_limit', credentials.limit === 0 ? 'off' : String(credentials.limit));
      localStorage.setItem('gov_snow_sync_type', credentials.syncType);
      localStorage.setItem('gov_snow_auto_sync', String(credentials.autoSyncEnabled));
      localStorage.setItem('gov_snow_auto_fetch_enabled', String(credentials.autoFetchEnabled));
      localStorage.setItem('gov_snow_auto_fetch_interval', String(credentials.autoFetchInterval));
      localStorage.setItem('gov_only_solve_propose', String(credentials.onlySolvePropose));
      localStorage.setItem('gov_snow_assignment_group_filter', credentials.assignmentGroupFilter);

      const response = await fetch('/api/servicenow/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      if (response.ok) {
        triggerPopup('ServiceNow connection profile & auto-fetch settings saved!', 'success');
        window.dispatchEvent(new Event('storage'));
      } else {
        triggerPopup('Failed to save ServiceNow connection profile.', 'error');
      }
    } catch (err) {
      triggerPopup('Network error saving ServiceNow credentials.', 'error');
    }
  };

  // Run dynamic sync query for selected sync scope
  const handleRunDiagnostic = async (overrideSyncType?: 'tickets' | 'cis' | 'kbs' | 'both' | 'all') => {
    setIsLoading(true);
    const effectiveSyncType = overrideSyncType || credentials.syncType;

    setTestLogs([
      `[${new Date().toLocaleTimeString()}] Querying ServiceNow instance '${credentials.instanceName}'...`,
      `[${new Date().toLocaleTimeString()}] Sync Scope: '${effectiveSyncType}' | Limit: ${credentials.limit === 0 ? 'OFF (All Available Tickets)' : credentials.limit} | Group Filter: '${credentials.assignmentGroupFilter}'`
    ]);
    setFetchedIncidents([]);
    setFetchedArticles([]);
    setFetchedCis([]);
    setRawPayload(null);
    setActiveSubTab('logs');

    try {
      // Step 1: Save current configuration
      await fetch('/api/servicenow/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, syncType: effectiveSyncType })
      });

      // Step 2: Query API
      const response = await fetch('/api/servicenow/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, syncType: effectiveSyncType })
      });

      let results: any;
      if (!response.ok) {
        let errMsg = `Endpoint returned HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.logs) {
            setTestLogs(prev => [...prev, ...errData.logs]);
          }
          errMsg = errData.error || errMsg;
        } catch (_) {
          const errText = await response.text();
          errMsg = errText || errMsg;
        }
        throw new Error(errMsg);
      }

      results = await response.json();
      
      // Update logs
      if (results.logs && results.logs.length > 0) {
        setTestLogs(prev => [...prev, ...results.logs]);
      } else {
        setTestLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Response received successfully.`]);
      }

      const ticketsCount = results.ticketsSynced || (results.tickets ? results.tickets.length : 0);
      const articlesCount = results.articlesSynced || (results.articles ? results.articles.length : 0);
      const cisCount = results.cisSynced || (results.cis ? results.cis.length : 0);

      setTestLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Sync query succeeded! Ingested: ${ticketsCount} Incidents, ${cisCount} CIs, ${articlesCount} KBs.`
      ]);

      setFetchedIncidents(results.tickets || []);
      setFetchedArticles(results.articles || []);
      setFetchedCis(results.cis || []);
      setRawPayload(results);

      // Refresh fetch logs list
      loadFetchLogs();

      if (ticketsCount > 0 || articlesCount > 0 || cisCount > 0) {
        triggerPopup(`Sync succeeded! Fetched ${ticketsCount} tickets, ${cisCount} CIs, ${articlesCount} KBs.`, 'success');
        if (effectiveSyncType === 'cis' || (cisCount > 0 && ticketsCount === 0)) {
          setActiveSubTab('cis');
        } else if (ticketsCount > 0) {
          setActiveSubTab('incidents');
        } else if (articlesCount > 0) {
          setActiveSubTab('articles');
        }
      } else {
        triggerPopup(`Handshake succeeded! 0 records matched filter.`, 'warning');
      }

    } catch (err: any) {
      setTestLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ CONNECTION ERROR: ${err.message || String(err)}`,
        `[${new Date().toLocaleTimeString()}] DIAGNOSTIC ADVICE:`,
        `1. Make sure credentials (username/password) are authorized for ServiceNow REST API.`,
        `2. Confirm the ServiceNow instance '${credentials.instanceName}' is online and accessible.`,
        `3. Check network and proxy permissions for service-now.com endpoints.`
      ]);
      triggerPopup(`ServiceNow API: ${err.message || 'Check logs'}`, 'error');
      loadFetchLogs();
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Overall Overview Across Multiple Tables from ServiceNow API
  const handleFetchOverallOverview = async () => {
    setIsOverviewLoading(true);
    setActiveSubTab('overview');
    setTestLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Requesting Overall ServiceNow API overview across all core tables...`
    ]);

    try {
      const response = await fetch('/api/servicenow/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: credentials.instanceName,
          username: credentials.username,
          password: credentials.password,
          limit: 5
        })
      });

      if (!response.ok) {
        throw new Error(`Overview API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setOverallOverview(data);
      if (data.logs) {
        setTestLogs(prev => [...prev, ...data.logs]);
      }
      triggerPopup(`ServiceNow Overall API Overview loaded successfully!`, 'success');
    } catch (err: any) {
      triggerPopup(`Overall API Overview Notice: ${err.message || String(err)}`, 'error');
      setTestLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Failed to fetch overall API overview: ${err.message}`]);
    } finally {
      setIsOverviewLoading(false);
    }
  };

  const handleFetchCIsOnly = async () => {
    await handleRunDiagnostic('cis');
  };

  const handleCopyRawPayload = () => {
    if (!rawPayload && !overallOverview) return;
    const content = rawPayload || overallOverview;
    navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    setCopiedRaw(true);
    triggerPopup('Payload JSON copied to clipboard!', 'success');
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const filteredCis = fetchedCis.filter(ci => {
    if (!ciSearch.trim()) return true;
    const term = ciSearch.toLowerCase();
    return (
      (ci.name && ci.name.toLowerCase().includes(term)) ||
      (ci.category && ci.category.toLowerCase().includes(term)) ||
      (ci.supportGroup && ci.supportGroup.toLowerCase().includes(term)) ||
      (ci.className && ci.className.toLowerCase().includes(term))
    );
  });

  const filteredFetchLogs = fetchLogs.filter(entry => {
    if (logFilterType !== 'all' && entry.triggerType !== logFilterType) return false;
    if (!logSearchQuery.trim()) return true;
    const q = logSearchQuery.toLowerCase();
    const tablesStr = Array.isArray(entry.tables) ? entry.tables.join(' ') : String(entry.tables || '');
    return (
      tablesStr.toLowerCase().includes(q) ||
      entry.status.toLowerCase().includes(q) ||
      (entry.errorMessage && entry.errorMessage.toLowerCase().includes(q)) ||
      (entry.details && entry.details.toLowerCase().includes(q)) ||
      entry.timestamp.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-[#E0E0E0] font-sans">
      {/* Header bar with primary action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2A2D35] pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-400" />
            ServiceNow API Gateway & Compliance Tester
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Test live ServiceNow REST connectivity, trigger manual sync sweeps by scope, and monitor background auto-fetch execution logs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Fetch Logs */}
          <button
            type="button"
            onClick={loadFetchLogs}
            disabled={isFetchingLogsLoading}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 border border-[#2A2D35] rounded text-xs font-mono font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            title="Reload fetch execution logs"
          >
            <History className={`h-3.5 w-3.5 text-indigo-400 ${isFetchingLogsLoading ? 'animate-spin' : ''}`} />
            FETCH LOGS ({fetchLogs.length})
          </button>

          {/* Overall Multi-Table Overview Fetch Button */}
          <button
            type="button"
            onClick={handleFetchOverallOverview}
            disabled={isOverviewLoading}
            className="px-3.5 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded text-xs font-mono font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            title="Query overall summary from ServiceNow API across all major tables"
          >
            <Globe className={`h-4 w-4 ${isOverviewLoading ? 'animate-spin' : ''}`} />
            OVERALL API OVERVIEW
          </button>

          {/* Live CIs Fetch */}
          <button
            type="button"
            onClick={handleFetchCIsOnly}
            disabled={isLoading}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded text-xs font-mono font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <Box className="h-4 w-4" />
            FETCH CIs
          </button>

          {/* Run Scope Handshake */}
          <button
            type="button"
            onClick={() => handleRunDiagnostic()}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white rounded text-xs font-mono font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            TRIGGER SYNC ({credentials.syncType.toUpperCase()})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Connection & Auto-Fetch Config Form */}
        <div className="lg:col-span-1 space-y-4">
          <form onSubmit={saveCredentials} className="bg-[#121620] border border-[#222836] p-5 rounded-xl space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2533]">
              <h3 className="font-semibold text-xs text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-gray-400" />
                Connection & Sync Config
              </h3>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                LIVE INSTANCE
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400 block">ServiceNow Instance Name / Host</label>
              <div className="relative">
                <input
                  type="text"
                  value={credentials.instanceName}
                  onChange={(e) => setCredentials({ ...credentials, instanceName: e.target.value })}
                  placeholder="e.g. dev12000"
                  className="w-full bg-[#090C12] border border-[#222836] focus:border-blue-500 rounded px-3 py-2 text-xs font-mono text-white outline-none"
                />
                {!credentials.useSimulator && (
                  <span className="absolute right-3 top-2 text-[10px] text-gray-500 font-mono">.service-now.com</span>
                )}
              </div>
              <p className="text-[9px] text-gray-500 mt-0.5">Target instance domain or prefix without protocol.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400 block">REST Username</label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  placeholder="admin"
                  className="w-full bg-[#090C12] border border-[#222836] focus:border-blue-500 rounded px-3 py-2 text-xs font-mono text-white outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400 block">REST Password</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-[#090C12] border border-[#222836] focus:border-blue-500 rounded px-3 py-2 text-xs font-mono text-white outline-none"
                />
              </div>
            </div>

            {/* Sync Scope Selection */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400 block">Synchronization Scope</label>
              <select
                value={credentials.syncType}
                onChange={(e) => setCredentials({ ...credentials, syncType: e.target.value as any })}
                className="w-full bg-[#090C12] border border-[#222836] focus:outline-none focus:border-blue-500 rounded px-3 py-2 text-xs font-mono text-white cursor-pointer"
              >
                <option value="tickets">Tickets Only (Incident Table - incident)</option>
                <option value="cis">CI (Configuration Item) (CMDB Table - cmdb_ci)</option>
                <option value="kbs">KB Articles Catalog (Knowledge Table - kb_knowledge)</option>
                <option value="both">Tickets & KB Articles (incident & kb_knowledge)</option>
                <option value="all">All (Tickets, CIs & Knowledge Base)</option>
              </select>
              <p className="text-[9px] text-gray-500 mt-0.5">Controls which entity tables are fetched and audited.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400 block">Fetch Limit</label>
                  <button
                    type="button"
                    onClick={() => setCredentials({ ...credentials, limit: credentials.limit === 0 ? 10 : 0 })}
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border transition-colors cursor-pointer ${
                      credentials.limit === 0 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30' 
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                    }`}
                  >
                    {credentials.limit === 0 ? 'Set Limit (10)' : '⚡ Turn Limit OFF'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={credentials.limit === 0 ? 'off' : [10, 25, 50, 100, 250, 500].includes(credentials.limit) ? String(credentials.limit) : 'custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'off') {
                        setCredentials({ ...credentials, limit: 0 });
                      } else if (val === 'custom') {
                        setCredentials({ ...credentials, limit: credentials.limit === 0 ? 50 : credentials.limit });
                      } else {
                        setCredentials({ ...credentials, limit: Number(val) });
                      }
                    }}
                    className="w-full bg-[#090C12] border border-[#222836] focus:border-blue-500 rounded px-3 py-2 text-xs font-mono text-white outline-none cursor-pointer"
                  >
                    <option value="off">⚡ OFF (Fetch All Tickets in Instance)</option>
                    <option value="10">10 Incidents</option>
                    <option value="25">25 Incidents</option>
                    <option value="50">50 Incidents</option>
                    <option value="100">100 Incidents</option>
                    <option value="250">250 Incidents</option>
                    <option value="500">500 Incidents</option>
                    <option value="custom">Custom Limit...</option>
                  </select>
                  {credentials.limit !== 0 && (
                    <input
                      type="number"
                      min="1"
                      max="5000"
                      value={credentials.limit}
                      onChange={(e) => setCredentials({ ...credentials, limit: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-24 bg-[#090C12] border border-[#222836] focus:border-blue-500 rounded px-2.5 py-2 text-xs font-mono text-white outline-none"
                    />
                  )}
                </div>
                <p className="text-[9.5px] text-gray-500 font-mono">
                  {credentials.limit === 0 ? (
                    <span className="text-emerald-400">Fetch limit OFF: Synchronizes all available tickets from ServiceNow.</span>
                  ) : (
                    `Syncs up to ${credentials.limit} records. Select "OFF" to retrieve all tickets.`
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400 block">Assignment Group</label>
                <input
                  type="text"
                  value={credentials.assignmentGroupFilter}
                  onChange={(e) => setCredentials({ ...credentials, assignmentGroupFilter: e.target.value })}
                  placeholder="e.g. ALL"
                  className="w-full bg-[#090C12] border border-[#222836] focus:border-blue-500 rounded px-3 py-2 text-xs font-mono text-white outline-none"
                />
              </div>
            </div>

            {/* Auto-Fetch Interval Configuration */}
            <div className="p-3.5 bg-[#090C12] rounded-lg border border-[#222836] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-[10.5px] font-bold text-gray-200 font-mono uppercase tracking-wider">Auto-Fetch Tickets</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCredentials({ ...credentials, autoFetchEnabled: !credentials.autoFetchEnabled })}
                  className="focus:outline-none cursor-pointer"
                >
                  {credentials.autoFetchEnabled ? (
                    <ToggleRight className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1E2533]">
                <label className="text-[10px] text-gray-400 font-mono">Interval (Minutes):</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={credentials.autoFetchInterval}
                    disabled={!credentials.autoFetchEnabled}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(60, Number(e.target.value) || 2));
                      setCredentials({ ...credentials, autoFetchInterval: val });
                    }}
                    className="w-16 bg-[#121620] border border-[#222836] rounded px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                  />
                  <span className="text-[10px] text-gray-500 font-mono">min</span>
                </div>
              </div>
              <p className="text-[8.5px] text-gray-500 leading-normal">
                Uses incremental <code className="text-indigo-300">sys_updated_on</code> watermark polling every {credentials.autoFetchInterval} minute(s).
              </p>
            </div>

            {/* Solve Propose Filter (Workspace Checklist Only) */}
            <div className="p-3.5 bg-[#090C12] rounded-lg border border-[#222836] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-gray-200 font-mono uppercase tracking-wider">Solve Propose Filter</span>
                <button
                  type="button"
                  onClick={() => setCredentials({ ...credentials, onlySolvePropose: !credentials.onlySolvePropose })}
                  className="focus:outline-none cursor-pointer"
                >
                  {credentials.onlySolvePropose ? (
                    <ToggleRight className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>
              <p className="text-[8.5px] text-gray-400 leading-normal">
                Applies only to <strong>Workspace Checklist</strong> audit. Empathy Dashboard auto-fetches all ongoing/active tickets.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-mono font-bold tracking-wide transition-all cursor-pointer shadow-md"
              >
                SAVE CONNECTION & AUTO-FETCH SETTINGS
              </button>
            </div>
          </form>

          {/* Testing Tips Card */}
          <div className="bg-[#121620] border border-[#222836] p-4 rounded-xl space-y-3">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-blue-400" />
              ServiceNow Integration Notes
            </h4>
            <div className="text-[11px] text-gray-400 space-y-2 leading-relaxed">
              <p>
                <strong>1. Fetch Logs:</strong><br />
                Every manual sync trigger and automatic background timer sweep is recorded with timestamp, queried tables, record count, and errors in the <strong>FETCH LOGS</strong> panel.
              </p>
              <p>
                <strong>2. Incremental Polling:</strong><br />
                The auto-fetch timer checks for updated records modified since the previous sync watermark (<code className="text-indigo-300">sys_updated_on</code>), avoiding repetitive heavy full-table downloads.
              </p>
              <p>
                <strong>3. Sync Scope:</strong><br />
                Choose between Incidents, Configuration Items (cmdb_ci), Knowledge Base articles (kb_knowledge), or combined multi-table sets.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Results, Fetch Logs, and Overview Panels */}
        <div className="lg:col-span-2 space-y-4 flex flex-col h-full">
          <div className="bg-[#121620] border border-[#222836] rounded-xl overflow-hidden flex flex-col flex-1 shadow-lg min-h-[520px]">
            {/* Header sub-tabs */}
            <div className="bg-[#171C28] border-b border-[#222836] px-4 py-3 flex flex-wrap justify-between items-center gap-2">
              <div className="flex flex-wrap items-center gap-1 bg-[#090C12] rounded p-0.5 border border-[#222836]">
                <button
                  onClick={() => setActiveSubTab('fetch_logs')}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded font-bold tracking-tight flex items-center gap-1 transition-all ${activeSubTab === 'fetch_logs' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <History className="h-3.5 w-3.5" />
                  FETCH LOGS ({fetchLogs.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('logs')}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded font-bold tracking-tight flex items-center gap-1 transition-all ${activeSubTab === 'logs' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  GATEWAY LOGS
                </button>
                <button
                  onClick={() => setActiveSubTab('incidents')}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded font-bold tracking-tight flex items-center gap-1 transition-all ${activeSubTab === 'incidents' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Database className="h-3.5 w-3.5" />
                  INCIDENTS ({fetchedIncidents.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('overview')}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded font-bold tracking-tight flex items-center gap-1 transition-all ${activeSubTab === 'overview' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  OVERALL API VIEW
                </button>
                <button
                  onClick={() => setActiveSubTab('cis')}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded font-bold tracking-tight flex items-center gap-1 transition-all ${activeSubTab === 'cis' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Box className="h-3.5 w-3.5" />
                  CIs ({fetchedCis.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('articles')}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded font-bold tracking-tight flex items-center gap-1 transition-all ${activeSubTab === 'articles' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  KBs ({fetchedArticles.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('raw')}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded font-bold tracking-tight flex items-center gap-1 transition-all ${activeSubTab === 'raw' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Code className="h-3.5 w-3.5" />
                  RAW PAYLOAD
                </button>
              </div>

              {(rawPayload || overallOverview) && activeSubTab === 'raw' && (
                <button
                  onClick={handleCopyRawPayload}
                  className="text-[10px] font-mono text-gray-300 hover:text-white bg-[#121620] px-2 py-1 rounded border border-[#2A2D35] flex items-center gap-1 cursor-pointer"
                >
                  {copiedRaw ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedRaw ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              )}
            </div>

            {/* Display Screen */}
            <div className="p-4 flex-1 overflow-y-auto max-h-[580px]">
              
              {/* 1. FETCH LOGS PANEL */}
              {activeSubTab === 'fetch_logs' && (
                <div className="space-y-3.5 min-h-[400px]">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-[#090C12] p-3 rounded-lg border border-[#222836]">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="h-3.5 w-3.5 text-gray-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={logSearchQuery}
                        onChange={(e) => setLogSearchQuery(e.target.value)}
                        placeholder="Search logs by table, error message, timestamp..."
                        className="w-full bg-[#121620] border border-[#222836] focus:border-indigo-500 rounded pl-9 pr-3 py-1.5 text-xs font-mono text-white outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex bg-[#121620] rounded border border-[#222836] p-0.5 text-[10px] font-mono">
                        <button
                          type="button"
                          onClick={() => setLogFilterType('all')}
                          className={`px-2 py-1 rounded ${logFilterType === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                          All ({fetchLogs.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogFilterType('auto')}
                          className={`px-2 py-1 rounded ${logFilterType === 'auto' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                          Auto ({fetchLogs.filter(l => l.triggerType === 'auto').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogFilterType('manual')}
                          className={`px-2 py-1 rounded ${logFilterType === 'manual' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                          Manual ({fetchLogs.filter(l => l.triggerType === 'manual').length})
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={loadFetchLogs}
                        disabled={isFetchingLogsLoading}
                        className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer border border-[#222836]"
                        title="Refresh Logs"
                      >
                        <RefreshCw className={`h-3 w-3 text-indigo-400 ${isFetchingLogsLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>

                      {fetchLogs.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearFetchLogs}
                          className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer border border-red-900/40"
                          title="Clear logs history"
                        >
                          <Trash2 className="h-3 w-3" />
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Logs Table / List */}
                  {filteredFetchLogs.length === 0 ? (
                    <div className="h-[320px] flex flex-col items-center justify-center text-gray-500 text-xs text-center p-6 bg-[#090C12] rounded-lg border border-[#222836]">
                      <History className="h-8 w-8 text-gray-600 mb-2" />
                      <span>{fetchLogs.length === 0 ? 'No fetch events recorded yet.' : 'No fetch logs match your filter criteria.'}</span>
                      <p className="text-[10px] text-gray-600 mt-1 max-w-md">
                        {fetchLogs.length === 0 ? 'Click "TRIGGER SYNC" or wait for the auto-fetch timer to record transactions.' : 'Try clearing your search query or switching filters.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-[#222836] rounded-lg">
                      <table className="w-full text-left text-xs font-sans">
                        <thead>
                          <tr className="bg-[#171C28] text-gray-400 border-b border-[#222836] font-mono text-[9px] uppercase tracking-wider">
                            <th className="p-3">Timestamp</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Tables Queried</th>
                            <th className="p-3">Records (Fetched / Ingested)</th>
                            <th className="p-3">Summary / Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1D2433]">
                          {filteredFetchLogs.map((entry, entryIdx) => {
                            const isSuccess = entry.status === 'success';
                            const isAuto = entry.triggerType === 'auto';
                            const formattedTime = new Date(entry.timestamp).toLocaleString();
                            
                            return (
                              <tr key={`${entry.id || 'entry'}-${entryIdx}`} className="hover:bg-[#161B27] transition-all">
                                <td className="p-3 font-mono text-[10.5px] text-gray-300 whitespace-nowrap">
                                  {formattedTime}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wide border ${
                                    isAuto 
                                      ? 'bg-purple-950/60 text-purple-300 border-purple-800/40' 
                                      : 'bg-blue-950/60 text-blue-300 border-blue-800/40'
                                  }`}>
                                    {isAuto ? '⏰ Auto-Fetch' : '🖐️ Manual'}
                                  </span>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wide flex items-center gap-1 w-fit border ${
                                    isSuccess 
                                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40' 
                                      : 'bg-red-950/60 text-red-300 border-red-800/40'
                                  }`}>
                                    {isSuccess ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
                                    {isSuccess ? 'Success' : 'Failed'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1">
                                    {(Array.isArray(entry.tables) ? entry.tables : [String(entry.tables || 'incident')]).map((tbl, tIdx) => (
                                      <span key={tIdx} className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#090C12] text-indigo-300 border border-[#222836]">
                                        {tbl}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                                  <span className="text-white font-bold">{entry.recordsFetched}</span> fetched
                                  <span className="text-gray-500 mx-1">/</span>
                                  <span className="text-emerald-400 font-bold">{entry.recordsIngested}</span> saved
                                </td>
                                <td className="p-3 text-[11px]">
                                  {entry.errorMessage ? (
                                    <div className="text-red-400 font-mono text-[10px] bg-red-950/30 p-1.5 rounded border border-red-900/40 max-w-xs break-words">
                                      ⚠️ {entry.errorMessage}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 font-mono text-[10px]">
                                      {entry.details || `Synchronized ${entry.recordsFetched} records successfully.`}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 2. GATEWAY LOGS TAB */}
              {activeSubTab === 'logs' && (
                <div className="space-y-1.5 font-mono text-[11px] text-gray-300 bg-[#090C12] p-4 rounded-lg border border-[#222836] overflow-x-auto min-h-[400px]">
                  {testLogs.length === 0 ? (
                    <div className="h-[340px] flex flex-col items-center justify-center text-gray-500 text-xs">
                      <Terminal className="h-8 w-8 text-gray-600 mb-2 animate-pulse" />
                      <span>Gateway is idle. Click "TRIGGER SYNC" above to start testing live connection.</span>
                    </div>
                  ) : (
                    testLogs.map((log, index) => {
                      const isError = log.includes('❌') || log.includes('error') || log.includes('failed') || log.includes('HTTP error');
                      const isWarning = log.includes('notice') || log.includes('warning') || log.includes('Warning');
                      const isSuccess = log.includes('Successfully') || log.includes('succeeded') || log.includes('Synchronized') || log.includes('Fetched') || log.includes('Received');
                      
                      let colorClass = 'text-gray-300';
                      if (isError) colorClass = 'text-red-400 font-bold';
                      else if (isWarning) colorClass = 'text-amber-400';
                      else if (isSuccess) colorClass = 'text-emerald-400 font-bold';

                      return (
                        <div key={index} className={`${colorClass} py-0.5 border-b border-gray-900/40 last:border-0`}>
                          {log}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 3. INCIDENTS TAB */}
              {activeSubTab === 'incidents' && (
                <div className="space-y-3 min-h-[400px]">
                  {fetchedIncidents.length === 0 ? (
                    <div className="h-[340px] flex flex-col items-center justify-center text-gray-500 text-xs text-center p-6">
                      <Database className="h-8 w-8 text-gray-600 mb-2" />
                      <span>No incidents fetched in this query transaction.</span>
                      <p className="text-[10px] text-gray-600 mt-1 max-w-md">Click "TRIGGER SYNC" above to fetch live data from the ServiceNow incident table.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-[#171C28] text-[10.5px] font-mono text-gray-300 border border-[#222836] rounded-lg flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span>Source Table: <strong className="text-indigo-400">incident</strong></span>
                          <span className="text-gray-500">|</span>
                          <span>Total Ingested: <strong className="text-emerald-400">{fetchedIncidents.length}</strong></span>
                        </div>
                        <span className="text-[10px] text-gray-400">Click any row or "Inspect Schema" to view full table columns</span>
                      </div>

                      <div className="overflow-x-auto border border-[#222836] rounded-lg">
                        <table className="w-full text-left text-xs font-sans">
                          <thead>
                            <tr className="bg-[#141822] text-gray-400 border-b border-[#222836] font-mono text-[9px] uppercase tracking-wider">
                              <th className="p-3">Incident Number</th>
                              <th className="p-3">Assignee</th>
                              <th className="p-3">Assignment Group</th>
                              <th className="p-3">Affected CI</th>
                              <th className="p-3">State / Status</th>
                              <th className="p-3">Short Description</th>
                              <th className="p-3 text-right">Inspect</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1D2433]">
                            {fetchedIncidents.map((inc, i) => (
                              <tr key={i} className="hover:bg-[#161B27] transition-all">
                                <td className="p-3 font-mono font-bold text-blue-400">{inc.incNumber}</td>
                                <td className="p-3 text-gray-300">{inc.assignee}</td>
                                <td className="p-3 text-gray-400 font-mono text-[10px]">{inc.assignmentGroup}</td>
                                <td className="p-3 text-emerald-400 font-mono text-[10px]">{inc.affectedCi || '—'}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-gray-800 text-gray-300 border border-gray-700">
                                    {inc.incidentState || 'Active'}
                                  </span>
                                </td>
                                <td className="p-3 text-gray-300 max-w-xs truncate">{inc.shortDescription || <span className="text-gray-600 italic">None</span>}</td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRecordForDetail(inc)}
                                    className="px-2 py-1 bg-blue-900/40 hover:bg-blue-800 text-blue-300 rounded text-[9px] font-mono flex items-center gap-1 ml-auto cursor-pointer border border-blue-800/50"
                                  >
                                    <Eye className="h-3 w-3" />
                                    Schema
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. OVERALL API VIEW TAB */}
              {activeSubTab === 'overview' && (
                <div className="space-y-4 min-h-[400px]">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-[#090C12] p-3 rounded-lg border border-[#222836]">
                    <div>
                      <h3 className="font-bold text-xs text-white font-mono flex items-center gap-1.5">
                        <Globe className="h-4 w-4 text-purple-400" />
                        Overall ServiceNow API Health & Multi-Table Overview
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Consolidated summary across core ITSM, CMDB, and Knowledge tables.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleFetchOverallOverview}
                      disabled={isOverviewLoading}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${isOverviewLoading ? 'animate-spin' : ''}`} />
                      Refresh Overall Data
                    </button>
                  </div>

                  {!overallOverview ? (
                    <div className="h-[320px] flex flex-col items-center justify-center text-gray-500 text-xs text-center p-6 bg-[#090C12] rounded-lg border border-[#222836]">
                      <Globe className="h-8 w-8 text-purple-600 mb-2 animate-pulse" />
                      <span>No overall summary loaded yet.</span>
                      <button
                        type="button"
                        onClick={handleFetchOverallOverview}
                        className="mt-3 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-mono font-bold cursor-pointer"
                      >
                        Run Overall ServiceNow API Scan
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {overallOverview.overviewSummaries && Object.entries(overallOverview.overviewSummaries).map(([tblName, tblData]: [string, any]) => (
                          <div key={tblName} className="bg-[#090C12] border border-[#222836] p-3.5 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-indigo-400">{tblName}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold ${tblData.status.includes('200') || tblData.status.includes('Accessible') ? 'bg-emerald-950/60 text-emerald-300' : 'bg-amber-950/60 text-amber-300'}`}>
                                {tblData.status}
                              </span>
                            </div>
                            <div className="text-lg font-bold text-white font-mono">
                              {tblData.recordCount} <span className="text-[10px] text-gray-400 font-normal">records</span>
                            </div>
                            {tblData.sampleRecords && tblData.sampleRecords.length > 0 && (
                              <div className="text-[9.5px] text-gray-400 space-y-0.5 pt-1 border-t border-gray-900">
                                <span className="text-[8.5px] uppercase font-mono text-gray-500 block">Sample Record:</span>
                                <div className="text-blue-300 font-mono truncate">{tblData.sampleRecords[0]?.number}</div>
                                <div className="text-gray-300 truncate">{tblData.sampleRecords[0]?.shortDescription || '—'}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. CONFIGURATION ITEMS (CIs) TAB */}
              {activeSubTab === 'cis' && (
                <div className="space-y-3 min-h-[400px]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="h-3.5 w-3.5 text-gray-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={ciSearch}
                        onChange={(e) => setCiSearch(e.target.value)}
                        placeholder="Search fetched CIs by name, group, category..."
                        className="w-full bg-[#090C12] border border-[#222836] focus:border-emerald-500 rounded pl-9 pr-3 py-1.5 text-xs font-mono text-white outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleFetchCIsOnly}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh CIs
                    </button>
                  </div>

                  {filteredCis.length === 0 ? (
                    <div className="h-[300px] flex flex-col items-center justify-center text-gray-500 text-xs text-center p-6">
                      <Box className="h-8 w-8 text-gray-600 mb-2" />
                      <span>{fetchedCis.length === 0 ? "No Configuration Items (CIs) fetched yet." : "No CIs match your search filter."}</span>
                      <p className="text-[10px] text-gray-600 mt-1 max-w-md">Click "FETCH CIs" above to query the ServiceNow Configuration Items table (cmdb_ci).</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-[#222836] rounded-lg">
                      <table className="w-full text-left text-xs font-sans">
                        <thead>
                          <tr className="bg-[#171C28] text-gray-400 border-b border-[#222836] font-mono text-[9px] uppercase tracking-wider">
                            <th className="p-3">CI Name</th>
                            <th className="p-3">Support / Assignment Group</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">CMDB Class</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1D2433]">
                          {filteredCis.map((ci, i) => (
                            <tr key={i} className="hover:bg-[#161B27] transition-all">
                              <td className="p-3 font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                {ci.name}
                              </td>
                              <td className="p-3 text-indigo-300 font-mono text-[10.5px]">{ci.supportGroup || <span className="text-gray-600 italic">Unassigned</span>}</td>
                              <td className="p-3 text-gray-300 font-mono text-[10px]">{ci.category || 'Infrastructure'}</td>
                              <td className="p-3 text-gray-400 font-mono text-[10px]">{ci.className || 'cmdb_ci'}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-900/40">
                                  {ci.status || 'Operational'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 6. KNOWLEDGE BASE ARTICLES TAB */}
              {activeSubTab === 'articles' && (
                <div className="space-y-3 min-h-[400px]">
                  {fetchedArticles.length === 0 ? (
                    <div className="h-[320px] flex flex-col items-center justify-center text-gray-500 text-xs text-center p-6">
                      <FileText className="h-8 w-8 text-gray-600 mb-2" />
                      <span>No Knowledge Articles fetched in this transaction.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fetchedArticles.map((kb, i) => (
                        <div key={i} className="bg-[#090C12] border border-[#222836] p-4 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-indigo-400">{kb.id}</span>
                            <span className="text-[10px] font-mono text-gray-500 bg-[#121620] px-2 py-0.5 rounded border border-[#222836]">{kb.category}</span>
                          </div>
                          <h4 className="font-bold text-white text-xs">{kb.title}</h4>
                          <p className="text-[11px] text-gray-400">{kb.summary}</p>
                          {kb.approvedSteps && kb.approvedSteps.length > 0 && (
                            <div className="pt-2 border-t border-[#1D2433]">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1">Approved Diagnostic Steps:</span>
                              <ul className="list-disc pl-4 space-y-0.5 text-[10.5px] text-gray-300">
                                {kb.approvedSteps.map((step: string, sIdx: number) => (
                                  <li key={sIdx}>{step}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 7. RAW PAYLOAD TAB */}
              {activeSubTab === 'raw' && (
                <div className="space-y-1.5 font-mono text-[11px] text-[#A2E396] bg-[#090C12] p-4 rounded-lg border border-[#222836] overflow-x-auto min-h-[400px]">
                  {rawPayload || overallOverview ? (
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap">{JSON.stringify(rawPayload || overallOverview, null, 2)}</pre>
                  ) : (
                    <div className="h-[320px] flex flex-col items-center justify-center text-gray-500 text-xs">
                      <Code className="h-8 w-8 text-gray-600 mb-2" />
                      <span>Payload is empty. Trigger a sync query first to inspect full REST response headers.</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* Record Schema Details Modal */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-[#2A2D35] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#171C28] px-5 py-3 border-b border-[#222836] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-400" />
                <h3 className="font-mono font-bold text-xs text-white">
                  Table Record Details: {selectedRecordForDetail.incNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3 bg-[#090C12] p-3 rounded-lg border border-[#1E2533] text-xs font-mono">
                <div><span className="text-gray-500">Record Number:</span> <span className="text-blue-400 font-bold">{selectedRecordForDetail.incNumber}</span></div>
                <div><span className="text-gray-500">State:</span> <span className="text-emerald-400">{selectedRecordForDetail.incidentState}</span></div>
                <div><span className="text-gray-500">Assignee:</span> <span className="text-gray-200">{selectedRecordForDetail.assignee}</span></div>
                <div><span className="text-gray-500">Group:</span> <span className="text-gray-200">{selectedRecordForDetail.assignmentGroup}</span></div>
                <div><span className="text-gray-500">Affected CI:</span> <span className="text-indigo-400">{selectedRecordForDetail.affectedCi}</span></div>
                <div><span className="text-gray-500">Created:</span> <span className="text-gray-400">{selectedRecordForDetail.createdDate}</span></div>
              </div>

              {selectedRecordForDetail.rawFields && Object.keys(selectedRecordForDetail.rawFields).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] uppercase font-mono font-bold text-gray-400">All Attributes & Schema Fields ({Object.keys(selectedRecordForDetail.rawFields).length})</h4>
                  <div className="bg-[#090C12] border border-[#1E2533] rounded-lg max-h-[300px] overflow-y-auto divide-y divide-gray-900">
                    {Object.entries(selectedRecordForDetail.rawFields).map(([k, v]: [string, any]) => (
                      <div key={k} className="p-2 flex flex-wrap items-start justify-between text-xs font-mono gap-2 hover:bg-[#121620]">
                        <span className="text-indigo-400 font-semibold">{k}:</span>
                        <span className="text-gray-300 max-w-sm text-right break-words">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#171C28] px-5 py-3 border-t border-[#222836] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-mono font-bold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
