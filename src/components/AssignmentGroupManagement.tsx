import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Sliders,
  Filter,
  Plus,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  ExternalLink,
  Layers,
  ArrowRight,
  Save,
  HardDrive
} from 'lucide-react';

interface AssignmentGroupManagementProps {
  triggerPopup: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateToMetrics?: (group: string) => void;
}

export default function AssignmentGroupManagement({
  triggerPopup,
  onNavigateToMetrics
}: AssignmentGroupManagementProps) {
  // All assignment groups auto-fetched from ServiceNow
  const [allGroups, setAllGroups] = useState<string[]>([]);
  // Set of enabled group names (case-insensitive keys, canonical values)
  const [enabledGroups, setEnabledGroups] = useState<string[]>([]);
  const [assignmentGroupFetchEnabled, setAssignmentGroupFetchEnabled] = useState<boolean>(false);

  // Permanent configuration state stored on disk
  const [savedPermanentGroups, setSavedPermanentGroups] = useState<string[]>([]);
  const [lastPermanentSavedAt, setLastPermanentSavedAt] = useState<string | null>(null);
  const [isSavingPermanent, setIsSavingPermanent] = useState<boolean>(false);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [customGroupName, setCustomGroupName] = useState<string>('');
  const [pendingActionGroup, setPendingActionGroup] = useState<string | null>(null);

  // Auto-fetch assignment groups from ServiceNow on mount
  const fetchLiveAssignmentGroups = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/servicenow/assignment-groups');
      if (!res.ok) {
        throw new Error(`Failed to fetch assignment groups: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        const uniqueGroups: string[] = Array.from(
          new Set<string>(data.groups.filter((g: any) => typeof g === 'string' && g.trim().length > 0))
        ).sort((a, b) => a.localeCompare(b));

        setAllGroups(uniqueGroups);

        // Default is ENABLED:
        let serverEnabled: string[];
        if (Array.isArray(data.enabledGroups) && data.enabledGroups.length > 0) {
          serverEnabled = data.enabledGroups;
        } else if (!data.permanentSavedAt) {
          serverEnabled = uniqueGroups;
        } else {
          serverEnabled = [];
        }
        setEnabledGroups(serverEnabled);
        setSavedPermanentGroups(serverEnabled);
        setAssignmentGroupFetchEnabled(data.assignmentGroupFetchEnabled === true);
        if (data.permanentSavedAt) {
          setLastPermanentSavedAt(data.permanentSavedAt);
        }

        if (isManualRefresh) {
          triggerPopup(
            `Auto-fetched ${uniqueGroups.length} assignment groups from ServiceNow. ${serverEnabled.length} active/enabled.`,
            'success'
          );
        }
      }
    } catch (err: any) {
      console.error('[Assignment Groups Auto-Fetch Error]', err);
      triggerPopup(err.message || 'Failed to auto-fetch assignment groups from ServiceNow.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveAssignmentGroups();
  }, []);

  // Quick lookup set for enabled groups
  const enabledSet = useMemo(() => {
    return new Set(enabledGroups.map(g => g.trim().toLowerCase()));
  }, [enabledGroups]);

  // Check if active groups diverge from permanently saved configuration
  const hasUnsavedChanges = useMemo(() => {
    if (enabledGroups.length !== savedPermanentGroups.length) return true;
    const curSet = new Set(enabledGroups.map(g => g.trim().toLowerCase()));
    return savedPermanentGroups.some(g => !curSet.has(g.trim().toLowerCase()));
  }, [enabledGroups, savedPermanentGroups]);

  // Toggle single assignment group: enable or disable
  const handleToggleGroup = async (groupName: string, shouldEnable: boolean) => {
    setPendingActionGroup(groupName);

    const clean = groupName.trim();
    let nextEnabled: string[];
    if (shouldEnable) {
      if (!enabledGroups.some(g => g.toLowerCase() === clean.toLowerCase())) {
        nextEnabled = [...enabledGroups, clean];
      } else {
        nextEnabled = [...enabledGroups];
      }
    } else {
      nextEnabled = enabledGroups.filter(g => g.toLowerCase() !== clean.toLowerCase());
    }

    // Immediately update local UI state so it NEVER flickers or automatically disables other groups
    setEnabledGroups(nextEnabled);

    try {
      const res = await fetch('/api/servicenow/assignment-groups/toggle-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: clean,
          enabled: shouldEnable,
          currentEnabledGroups: nextEnabled
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to update group ${clean}`);
      }

      const data = await res.json();
      if (data.success) {
        const confirmed = Array.isArray(data.enabledGroups) ? data.enabledGroups : nextEnabled;
        setEnabledGroups(confirmed);
        setAssignmentGroupFetchEnabled(data.assignmentGroupFetchEnabled === true);

        // Sync change across all application views immediately
        window.dispatchEvent(new CustomEvent('governance_tracked_groups_updated', {
          detail: { enabledGroups: confirmed }
        }));
        window.dispatchEvent(new CustomEvent('governance_audit_refetch_requested'));
        window.dispatchEvent(new CustomEvent('servicenow_realtime_sync', {
          detail: { enabledGroups: confirmed }
        }));

        triggerPopup(
          shouldEnable
            ? `Enabled '${clean}' for audit ticket fetch.`
            : `Disabled '${clean}'. Group bypassed from audit fetch.`,
          shouldEnable ? 'success' : 'info'
        );
      }
    } catch (err: any) {
      console.error('[Toggle Group Error]', err);
      // Revert on failure
      setEnabledGroups(enabledGroups);
      triggerPopup(err.message || `Failed to update ${groupName}.`, 'error');
    } finally {
      setPendingActionGroup(null);
    }
  };

  // Bulk action: Disable All
  const handleDisableAll = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/servicenow/assignment-groups/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledGroups: [], assignmentGroupFetchEnabled: true })
      });

      if (!res.ok) throw new Error('Failed to disable assignment groups');
      const data = await res.json();
      if (data.success) {
        setEnabledGroups([]);
        setAssignmentGroupFetchEnabled(true);

        // Sync change across all application views immediately
        window.dispatchEvent(new CustomEvent('governance_tracked_groups_updated', {
          detail: { enabledGroups: [] }
        }));
        window.dispatchEvent(new CustomEvent('governance_audit_refetch_requested'));
        window.dispatchEvent(new CustomEvent('servicenow_realtime_sync', {
          detail: { enabledGroups: [] }
        }));

        triggerPopup('All assignment groups disabled. Ticket ingestion paused until queues are re-enabled.', 'info');
      }
    } catch (err: any) {
      triggerPopup(err.message || 'Failed to disable all groups.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Bulk action: Enable All (Reset to default active onboarding state)
  const handleEnableAll = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/servicenow/assignment-groups/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledGroups: allGroups, assignmentGroupFetchEnabled: true })
      });

      if (!res.ok) throw new Error('Failed to enable all groups');
      const data = await res.json();
      if (data.success) {
        setEnabledGroups(allGroups);
        setAssignmentGroupFetchEnabled(true);

        // Sync change across all application views immediately
        window.dispatchEvent(new CustomEvent('governance_tracked_groups_updated', {
          detail: { enabledGroups: allGroups }
        }));
        window.dispatchEvent(new CustomEvent('governance_audit_refetch_requested'));
        window.dispatchEvent(new CustomEvent('servicenow_realtime_sync', {
          detail: { enabledGroups: allGroups }
        }));

        triggerPopup(`Enabled all ${allGroups.length} assignment groups for audit ticket fetch (default active policy).`, 'success');
      }
    } catch (err: any) {
      triggerPopup(err.message || 'Failed to enable all groups.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Add custom group
  const handleAddCustomGroup = async () => {
    const trimmed = customGroupName.trim();
    if (!trimmed) return;

    if (!allGroups.some(g => g.toLowerCase() === trimmed.toLowerCase())) {
      setAllGroups(prev => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
    }

    await handleToggleGroup(trimmed, true);
    setCustomGroupName('');
  };

  // Commit current enabled/disabled assignment groups configuration permanently to disk
  const handleSavePermanent = async () => {
    setIsSavingPermanent(true);
    try {
      const res = await fetch('/api/servicenow/assignment-groups/save-permanent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledGroups })
      });

      if (!res.ok) {
        throw new Error(`Failed to save permanent configuration: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.success) {
        const nextEnabled = Array.isArray(data.enabledGroups) ? data.enabledGroups : enabledGroups;
        setEnabledGroups(nextEnabled);
        setSavedPermanentGroups(nextEnabled);
        setAssignmentGroupFetchEnabled(true);
        if (data.permanentSavedAt) {
          setLastPermanentSavedAt(data.permanentSavedAt);
        }

        // Sync change across all application views immediately
        window.dispatchEvent(new CustomEvent('governance_tracked_groups_updated', {
          detail: { enabledGroups: nextEnabled }
        }));
        window.dispatchEvent(new CustomEvent('governance_audit_refetch_requested'));
        window.dispatchEvent(new CustomEvent('servicenow_realtime_sync', {
          detail: { enabledGroups: nextEnabled, permanentSavedAt: data.permanentSavedAt }
        }));

        triggerPopup(
          `Assignment group configuration permanently saved to server disk (${nextEnabled.length} active queues).`,
          'success'
        );
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 3000);
      } else {
        throw new Error(data.error || 'Failed to save configuration permanently');
      }
    } catch (err: any) {
      console.error('[Save Permanent Error]', err);
      triggerPopup(err.message || 'Failed to permanently save assignment groups configuration.', 'error');
    } finally {
      setIsSavingPermanent(false);
    }
  };

  // Revert active changes back to the last permanently saved snapshot
  const handleRevertToSaved = async () => {
    setIsSavingPermanent(true);
    try {
      const res = await fetch('/api/servicenow/assignment-groups/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledGroups: savedPermanentGroups, assignmentGroupFetchEnabled: true })
      });

      if (!res.ok) throw new Error('Failed to revert assignment groups');
      const data = await res.json();
      if (data.success) {
        setEnabledGroups(savedPermanentGroups);
        setAssignmentGroupFetchEnabled(true);

        window.dispatchEvent(new CustomEvent('governance_tracked_groups_updated', {
          detail: { enabledGroups: savedPermanentGroups }
        }));
        window.dispatchEvent(new CustomEvent('governance_audit_refetch_requested'));
        window.dispatchEvent(new CustomEvent('servicenow_realtime_sync', {
          detail: { enabledGroups: savedPermanentGroups }
        }));

        triggerPopup(`Reverted assignment groups to permanently saved configuration (${savedPermanentGroups.length} queues).`, 'info');
      }
    } catch (err: any) {
      triggerPopup(err.message || 'Failed to revert assignment groups.', 'error');
    } finally {
      setIsSavingPermanent(false);
    }
  };

  // Filtered groups
  const filteredGroups = useMemo(() => {
    let result = allGroups;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(g => g.toLowerCase().includes(q));
    }

    if (statusFilter === 'ENABLED') {
      result = result.filter(g => enabledSet.has(g.toLowerCase()));
    } else if (statusFilter === 'DISABLED') {
      result = result.filter(g => !enabledSet.has(g.toLowerCase()));
    }

    return result;
  }, [allGroups, searchQuery, statusFilter, enabledSet]);

  const enabledCount = enabledGroups.length;
  const disabledCount = Math.max(0, allGroups.length - enabledCount);

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Page Header Banner */}
      <div className="bg-card dark:bg-[#12141C] border border-border dark:border-[#2A2D35] rounded-xl p-5 shadow-sm dark:shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-purple-500/10 dark:bg-purple-600/15 border border-purple-500/30 rounded-xl text-purple-600 dark:text-purple-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base md:text-lg font-bold text-foreground dark:text-white tracking-tight">
                  Assignment Group Governance & Onboarding
                </h2>
                <span className="bg-purple-500/10 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse"></span>
                  ServiceNow Auto-Fetch Connected
                </span>
              </div>
              <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                Auto-fetched directly from ServiceNow Table API (<code className="text-purple-600 dark:text-purple-300 font-mono">sys_user_group</code>). All groups default to <strong>Enabled</strong> for audit ticket fetching.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLiveAssignmentGroups(true)}
              disabled={refreshing || isSavingPermanent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted dark:bg-[#1C2029] hover:bg-accent dark:hover:bg-[#252B37] text-foreground dark:text-gray-200 border border-border dark:border-[#2F3545] rounded-lg text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
              title="Re-query ServiceNow Table API for all assignment groups"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-purple-600 dark:text-purple-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Auto-Fetching...' : 'Refresh from ServiceNow'}</span>
            </button>

            <button
              type="button"
              onClick={handleEnableAll}
              disabled={refreshing || isSavingPermanent || enabledCount === allGroups.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-600/15 hover:bg-emerald-500/20 dark:hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Reset all assignment groups to Enabled (default onboarding policy)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Enable All (Reset to Default)</span>
            </button>

            <button
              type="button"
              onClick={handleDisableAll}
              disabled={refreshing || isSavingPermanent || enabledCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Disable all assignment groups"
            >
              <X className="h-3.5 w-3.5" />
              <span>Disable All</span>
            </button>

            {/* Revert to Saved button if staged changes exist */}
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleRevertToSaved}
                disabled={isSavingPermanent}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                title="Discard uncommitted changes and revert back to permanently saved configuration"
              >
                <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
                <span>Revert to Saved</span>
              </button>
            )}

            {/* Save Permanent Option Button */}
            <button
              type="button"
              onClick={handleSavePermanent}
              disabled={isSavingPermanent}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-sm ${
                justSaved
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/50'
                  : hasUnsavedChanges
                  ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-500/40 ring-offset-1 dark:ring-offset-[#12141C] animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white border border-indigo-500/40'
              } disabled:opacity-50`}
              title="Permanently save assignment group configuration to server disk"
            >
              {justSaved ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              ) : (
                <Save className={`h-3.5 w-3.5 ${isSavingPermanent ? 'animate-spin' : ''}`} />
              )}
              <span>
                {isSavingPermanent
                  ? 'Saving to Disk...'
                  : justSaved
                  ? 'Saved to Disk! ✓'
                  : hasUnsavedChanges
                  ? 'Save Permanent *'
                  : 'Save Permanent'}
              </span>
            </button>
          </div>
        </div>

        {/* Permanent Snapshot Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-border/50 dark:border-[#2A2D35]/50 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-muted-foreground dark:text-gray-400 flex items-center gap-1.5 font-bold">
              <HardDrive className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              <span>Permanent Storage:</span>
            </span>
            {lastPermanentSavedAt ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-blue-500/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Committed: {new Date(lastPermanentSavedAt).toLocaleString()} ({savedPermanentGroups.length} queues)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-muted dark:bg-white/5 text-muted-foreground dark:text-gray-400 border border-border dark:border-white/10">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Initial Snapshot Pending (click "Save Permanent" to lock)</span>
              </span>
            )}
            {hasUnsavedChanges ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
                <span>Unsaved changes staged — click "Save Permanent" to lock on disk</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Disk State Synced & Locked Across Restarts</span>
              </span>
            )}
          </div>

          <div className="text-[11px] font-mono text-muted-foreground dark:text-gray-500">
            <span>Survives cold reboot, re-deployments & background worker polling</span>
          </div>
        </div>
      </div>

      {/* Telemetry / Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Groups */}
        <div className="bg-card dark:bg-[#141720] border border-border dark:border-[#2A2D35] p-3.5 rounded-xl space-y-1 shadow-xs">
          <span className="text-[10px] text-muted-foreground dark:text-gray-400 font-mono uppercase tracking-wider block font-bold">
            Total Auto-Fetched Groups
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground dark:text-white font-mono">{allGroups.length}</span>
            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              Live sys_user_group
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground/80 dark:text-gray-500 block truncate">Direct from ServiceNow REST API</span>
        </div>

        {/* Enabled Groups */}
        <div className="bg-card dark:bg-[#141720] border border-border dark:border-[#2A2D35] p-3.5 rounded-xl space-y-1 shadow-xs">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono uppercase tracking-wider block font-bold">
            Enabled for Audit Fetch
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{enabledCount}</span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Default State ({allGroups.length > 0 ? Math.round((enabledCount / allGroups.length) * 100) : 100}%)
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground/80 dark:text-gray-500 block truncate">Audited & monitored in real-time</span>
        </div>

        {/* Disabled Groups */}
        <div className="bg-card dark:bg-[#141720] border border-border dark:border-[#2A2D35] p-3.5 rounded-xl space-y-1 shadow-xs">
          <span className="text-[10px] text-muted-foreground dark:text-slate-400 font-mono uppercase tracking-wider block font-bold">
            Disabled (Custom Excluded)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-muted-foreground dark:text-slate-300 font-mono">{disabledCount}</span>
            <span className="text-[10px] font-mono text-muted-foreground dark:text-slate-400 bg-muted dark:bg-white/5 px-2 py-0.5 rounded border border-border dark:border-white/10">
              {disabledCount > 0 ? `${disabledCount} Excluded` : 'None Excluded'}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground/80 dark:text-gray-500 block truncate">Bypassed from audit ingestion</span>
        </div>

        {/* Audit Filter Policy */}
        <div className="bg-card dark:bg-[#141720] border border-border dark:border-[#2A2D35] p-3.5 rounded-xl space-y-1 shadow-xs">
          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono uppercase tracking-wider block font-bold">
            Audit Ticket Ingestion Policy
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-foreground dark:text-white font-mono truncate">
              {enabledCount > 0 ? `Strict Filter (${enabledCount} Queues)` : 'All Groups Disabled'}
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              hasUnsavedChanges
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
            }`}>
              {hasUnsavedChanges ? 'Staged' : 'Permanent'}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground dark:text-gray-400 block truncate">
            {enabledCount > 0 ? 'Exclusively audits enabled queues' : 'Requires at least 1 enabled group'}
          </span>
        </div>
      </div>

      {/* Control Bar: Search, Status Filters & Add Custom Group */}
      <div className="bg-card dark:bg-[#12141C] border border-border dark:border-[#2A2D35] p-4 rounded-xl space-y-3 shadow-sm dark:shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignment groups by name..."
              className="w-full bg-surface-secondary dark:bg-[#0A0C0F] border border-border dark:border-[#2A2D35] rounded-lg pl-9 pr-3 py-2 text-xs text-foreground dark:text-white font-mono placeholder:text-muted-foreground dark:placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 bg-surface-secondary dark:bg-[#0A0C0F] border border-border dark:border-[#2A2D35] p-1 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              All ({allGroups.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ENABLED')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                statusFilter === 'ENABLED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Enabled ({enabledCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DISABLED')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                statusFilter === 'DISABLED'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Disabled ({disabledCount})
            </button>
          </div>
        </div>

        {/* Add Custom Assignment Group Input */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/60 dark:border-[#2A2D35]/50">
          <input
            type="text"
            value={customGroupName}
            onChange={(e) => setCustomGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomGroup()}
            placeholder="Onboard custom / unlisted assignment group name..."
            className="flex-1 bg-surface-secondary dark:bg-[#0A0C0F] border border-border dark:border-[#2A2D35] rounded-lg px-3 py-1.5 text-xs text-foreground dark:text-white font-mono placeholder:text-muted-foreground dark:placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={handleAddCustomGroup}
            disabled={!customGroupName.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 dark:bg-purple-600/20 hover:bg-purple-500/20 dark:hover:bg-purple-600/30 text-purple-700 dark:text-purple-300 disabled:opacity-40 disabled:cursor-not-allowed border border-purple-500/30 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add & Enable Group</span>
          </button>
        </div>
      </div>

      {/* Assignment Groups Table / List */}
      <div className="bg-card dark:bg-[#12141C] border border-border dark:border-[#2A2D35] rounded-xl overflow-hidden shadow-sm dark:shadow-lg">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-purple-500 dark:text-purple-400 animate-spin mx-auto" />
            <p className="text-xs font-mono text-foreground dark:text-gray-300">Auto-fetching assignment groups from ServiceNow Table API...</p>
            <p className="text-[11px] font-mono text-muted-foreground dark:text-gray-500">Querying live sys_user_group records</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="h-8 w-8 text-muted-foreground dark:text-gray-600 mx-auto" />
            <p className="text-sm font-semibold text-foreground dark:text-gray-300">No assignment groups match your filter.</p>
            <p className="text-xs text-muted-foreground dark:text-gray-500">
              {searchQuery ? `No results for "${searchQuery}".` : 'No groups currently under this status filter.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-mono"
              >
                Clear search query
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border dark:border-[#2A2D35] bg-muted/40 dark:bg-[#0A0C0F] text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-gray-400">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Assignment Group Name</th>
                  <th className="py-3 px-4 w-44 text-center">Source</th>
                  <th className="py-3 px-4 w-48 text-center">Audit Status</th>
                  <th className="py-3 px-4 w-52 text-right">Action (Enable / Disable)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 dark:divide-[#2A2D35]/50 text-xs font-mono">
                {filteredGroups.map((group, idx) => {
                  const isEnabled = enabledSet.has(group.toLowerCase());
                  const isPending = pendingActionGroup === group;

                  return (
                    <tr
                      key={group}
                      className={`transition-colors ${
                        isEnabled
                          ? 'bg-purple-500/5 dark:bg-purple-950/10 hover:bg-purple-500/10 dark:hover:bg-purple-950/20'
                          : 'hover:bg-muted/30 dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3 px-4 text-center text-muted-foreground dark:text-gray-500 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Group Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isEnabled ? 'text-foreground dark:text-white' : 'text-muted-foreground dark:text-gray-300'}`}>
                            {group}
                          </span>
                          {isEnabled && onNavigateToMetrics && (
                            <button
                              type="button"
                              onClick={() => onNavigateToMetrics(group)}
                              className="text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                              title={`Configure mandatory metrics for "${group}"`}
                            >
                              <Sliders className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4 text-center text-[10.5px] text-muted-foreground dark:text-gray-400">
                        <span className="px-2 py-0.5 rounded bg-muted dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-gray-300">
                          ServiceNow Live API
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isEnabled ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                              <span>ENABLED (DEFAULT)</span>
                            </span>
                            {!savedPermanentGroups.some(g => g.toLowerCase() === group.toLowerCase()) && (
                              <span className="text-[9.5px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                                Staged (Pending Save)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-muted dark:bg-slate-500/15 text-muted-foreground dark:text-slate-400 border border-border dark:border-slate-500/25">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 dark:bg-slate-500"></span>
                              <span>DISABLED</span>
                            </span>
                            {savedPermanentGroups.some(g => g.toLowerCase() === group.toLowerCase()) && (
                              <span className="text-[9.5px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                                Staged (Pending Save)
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Enable / Disable Button for Each */}
                      <td className="py-3 px-4 text-right">
                        {isEnabled ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleGroup(group, false)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:border-rose-500/50 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                            title={`Disable audit ticket fetch for "${group}"`}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>{isPending ? 'Updating...' : 'Disable'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleGroup(group, true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-600/20 hover:bg-emerald-500/20 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 hover:border-emerald-500/60 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                            title={`Enable audit ticket fetch for "${group}"`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{isPending ? 'Updating...' : 'Enable for Audit'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="bg-muted/30 dark:bg-[#0A0C0F] border-t border-border dark:border-[#2A2D35] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground dark:text-gray-500">
          <div>
            Showing <strong>{filteredGroups.length}</strong> of <strong>{allGroups.length}</strong> ServiceNow assignment groups ({enabledCount} enabled for audit).
          </div>
          <div className="flex items-center gap-2 text-muted-foreground dark:text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>ServiceNow Table API: <code className="text-foreground dark:text-gray-300">assignment_group.nameIN...</code> active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
