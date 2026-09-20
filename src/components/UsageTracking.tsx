import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Server,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Download,
  Database,
  Search,
  Layers,
  BarChart3,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { UsageStats } from '../types';

interface UsageTrackingProps {
  triggerPopup: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const UsageTracking: React.FC<UsageTrackingProps> = ({ triggerPopup }) => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'llm' | 'servicenow'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const fetchStats = async () => {
    try {
      const resp = await fetch('/api/usage/stats');
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      }
    } catch {
      // ignore transient fetch error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all LLM and ServiceNow API usage counters?')) return;
    try {
      const resp = await fetch('/api/usage/reset', { method: 'POST' });
      if (resp.ok) {
        triggerPopup('Usage metrics and request logs successfully reset to zero.', 'success');
        fetchStats();
      }
    } catch {
      triggerPopup('Failed to reset usage statistics.', 'error');
    }
  };

  const handleExportJson = () => {
    if (!stats) return;
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api_usage_metrics_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerPopup('Usage metrics exported to JSON.', 'info');
  };

  const llm = stats?.llm || {
    totalCalls: 0,
    promptTokens: 0,
    responseTokens: 0,
    estimatedCostUsd: 0,
    averageLatencyMs: 0,
    successRate: 100,
    modelBreakdown: { 'gemini-3.8-flash': 0 },
    recentCalls: []
  };

  const snow = stats?.servicenow || {
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    averageResponseTimeMs: 0,
    lastSyncTimestamp: 'Never',
    endpointBreakdown: { 'incident': 0, 'kb_knowledge': 0, 'cmdb_ci': 0 },
    recentRequests: []
  };

  const filteredLlmCalls = llm.recentCalls.filter(c =>
    c.task.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.model.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.status.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredSnowRequests = snow.recentRequests.filter(r =>
    r.endpoint.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.method.toLowerCase().includes(searchFilter.toLowerCase()) ||
    String(r.statusCode).includes(searchFilter)
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Bar */}
      <div className="bg-[#12141C] border border-[#2A2D35] rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-600/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                API & Model Usage Tracking
              </h2>
              <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                Real-Time Telemetry
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Live consumption telemetry across Google Gemini LLMs and ServiceNow Table API endpoints.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-300'
                : 'bg-[#1A1D24] border-[#2A2D35] text-gray-400'
            }`}
          >
            <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>Auto-Refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>
          <button
            type="button"
            onClick={fetchStats}
            className="px-3 py-1.5 bg-[#1A1D24] hover:bg-[#252A35] border border-[#2A2D35] text-gray-200 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Poll Now</span>
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="h-3 w-3" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total LLM Calls */}
        <div className="bg-[#12141C] border border-[#2A2D35] rounded-xl p-4 shadow space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span className="uppercase tracking-wider">Gemini LLM Calls</span>
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{llm.totalCalls.toLocaleString()}</span>
            <span className="text-xs font-mono text-emerald-400 font-bold">{llm.successRate}% Success</span>
          </div>
          <div className="text-[11px] text-gray-400 font-mono">
            Avg Latency: <strong className="text-slate-200">{llm.averageLatencyMs}ms</strong>
          </div>
        </div>

        {/* Token Consumption */}
        <div className="bg-[#12141C] border border-[#2A2D35] rounded-xl p-4 shadow space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span className="uppercase tracking-wider">Token Throughput</span>
            <Cpu className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">
              {(llm.promptTokens + llm.responseTokens).toLocaleString()}
            </span>
            <span className="text-xs font-mono text-gray-400">Tokens</span>
          </div>
          <div className="text-[11px] text-gray-400 font-mono flex justify-between">
            <span>In: {llm.promptTokens.toLocaleString()}</span>
            <span>Out: {llm.responseTokens.toLocaleString()}</span>
          </div>
        </div>

        {/* ServiceNow REST Requests */}
        <div className="bg-[#12141C] border border-[#2A2D35] rounded-xl p-4 shadow space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span className="uppercase tracking-wider">ServiceNow API Calls</span>
            <Database className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{snow.totalRequests.toLocaleString()}</span>
            <span className="text-xs font-mono text-emerald-400 font-bold">{snow.successRequests} OK</span>
          </div>
          <div className="text-[11px] text-gray-400 font-mono flex justify-between">
            <span>Errors: {snow.failedRequests}</span>
            <span>Avg: {snow.averageResponseTimeMs}ms</span>
          </div>
        </div>

        {/* Cost & Quota Estimate */}
        <div className="bg-[#12141C] border border-[#2A2D35] rounded-xl p-4 shadow space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span className="uppercase tracking-wider">Est. Cost & Sync</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              ${llm.estimatedCostUsd.toFixed(4)}
            </span>
            <span className="text-xs font-mono text-gray-500">USD</span>
          </div>
          <div className="text-[11px] text-gray-400 font-mono truncate">
            Last Sync: {snow.lastSyncTimestamp ? new Date(snow.lastSyncTimestamp).toLocaleTimeString() : 'Active'}
          </div>
        </div>
      </div>

      {/* Filter and Tab Navigation */}
      <div className="bg-[#12141C] border border-[#2A2D35] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-[#1A1D24] text-gray-400 hover:text-white'
            }`}
          >
            All Activity Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('llm')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'llm'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-[#1A1D24] text-gray-400 hover:text-white'
            }`}
          >
            LLM Inferences ({llm.recentCalls.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('servicenow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'servicenow'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-[#1A1D24] text-gray-400 hover:text-white'
            }`}
          >
            ServiceNow Requests ({snow.recentRequests.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter calls or endpoints..."
            className="w-full bg-[#0A0C0F] border border-[#2A2D35] rounded-lg pl-8 pr-3 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tables Section */}
      <div className="space-y-6">
        {(activeTab === 'all' || activeTab === 'llm') && (
          <div className="bg-[#0E1117] border border-[#2A2D35] rounded-xl overflow-hidden shadow">
            <div className="p-4 border-b border-[#2A2D35] bg-[#12141C] flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>Recent Gemini LLM Generations</span>
              </div>
              <span className="text-[11px] font-mono text-gray-400">
                {filteredLlmCalls.length} calls logged
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-[#141720] border-b border-[#2A2D35] text-gray-400 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">Task / Prompt Context</th>
                    <th className="p-3 text-right">Tokens</th>
                    <th className="p-3 text-right">Latency</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2D35]/50">
                  {filteredLlmCalls.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500">
                        No LLM calls recorded yet. Trigger an AI audit or chat inspection to generate traces.
                      </td>
                    </tr>
                  ) : (
                    filteredLlmCalls.slice(0, 20).map((call) => (
                      <tr key={call.id} className="hover:bg-[#1A1D24]/50 transition-colors">
                        <td className="p-3 text-gray-400 whitespace-nowrap">
                          {new Date(call.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3 font-bold text-purple-400 whitespace-nowrap">
                          {call.model}
                        </td>
                        <td className="p-3 text-gray-200 max-w-md truncate" title={call.task}>
                          {call.task}
                        </td>
                        <td className="p-3 text-right text-gray-300">
                          {call.tokens.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-gray-300 whitespace-nowrap">
                          {call.latencyMs}ms
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            call.status === 'Success'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {call.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'servicenow') && (
          <div className="bg-[#0E1117] border border-[#2A2D35] rounded-xl overflow-hidden shadow">
            <div className="p-4 border-b border-[#2A2D35] bg-[#12141C] flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                <Database className="h-4 w-4" />
                <span>Recent ServiceNow REST API Calls</span>
              </div>
              <span className="text-[11px] font-mono text-gray-400">
                {filteredSnowRequests.length} requests logged
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-[#141720] border-b border-[#2A2D35] text-gray-400 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Endpoint Table</th>
                    <th className="p-3 text-right">Records</th>
                    <th className="p-3 text-right">Latency</th>
                    <th className="p-3 text-center">HTTP Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2D35]/50">
                  {filteredSnowRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500">
                        No ServiceNow API calls logged yet. Run a live sync to record REST endpoints.
                      </td>
                    </tr>
                  ) : (
                    filteredSnowRequests.slice(0, 20).map((req) => (
                      <tr key={req.id} className="hover:bg-[#1A1D24]/50 transition-colors">
                        <td className="p-3 text-gray-400 whitespace-nowrap">
                          {new Date(req.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3 font-bold text-blue-400">
                          {req.method}
                        </td>
                        <td className="p-3 text-gray-200 font-mono">
                          {req.endpoint}
                        </td>
                        <td className="p-3 text-right text-emerald-400 font-bold">
                          {req.recordCount}
                        </td>
                        <td className="p-3 text-right text-gray-300">
                          {req.responseTimeMs}ms
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.statusCode >= 200 && req.statusCode < 300
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {req.statusCode} {req.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageTracking;
