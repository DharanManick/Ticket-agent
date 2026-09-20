import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Users,
  Save,
  RotateCcw,
  Copy,
  Info,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Layers,
  Database,
  SlidersHorizontal,
  Check
} from 'lucide-react';

interface MetricDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  weight: number;
}

interface MandatoryMetricsConfigProps {
  triggerPopup: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  availableAssignmentGroups?: string[];
  initialSelectedGroup?: string;
  onConfigSaved?: () => void;
}

export const MandatoryMetricsConfig: React.FC<MandatoryMetricsConfigProps> = ({
  triggerPopup,
  availableAssignmentGroups = [],
  initialSelectedGroup,
  onConfigSaved
}) => {
  const [metricDefinitions, setMetricDefinitions] = useState<MetricDefinition[]>([]);
  const [groupConfigs, setGroupConfigs] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedGroup, setSelectedGroup] = useState<string>(initialSelectedGroup || 'DEFAULT');
  const [allGroups, setAllGroups] = useState<string[]>(['DEFAULT']);
  const [groupSearchFilter, setGroupSearchFilter] = useState('');
  const [metricSearchFilter, setMetricSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [newGroupInput, setNewGroupInput] = useState('');
  const [liveServiceNowGroups, setLiveServiceNowGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingSnow, setIsRefreshingSnow] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync initialSelectedGroup if passed from parent
  useEffect(() => {
    if (initialSelectedGroup) {
      setSelectedGroup(initialSelectedGroup);
      setAllGroups(prev => {
        if (!prev.includes(initialSelectedGroup)) {
          return [...prev, initialSelectedGroup];
        }
        return prev;
      });
    }
  }, [initialSelectedGroup]);

  // Sync availableAssignmentGroups
  useEffect(() => {
    if (availableAssignmentGroups && availableAssignmentGroups.length > 0) {
      setAllGroups(prev => {
        const merged = new Set(['DEFAULT', ...prev, ...availableAssignmentGroups]);
        return Array.from(merged);
      });
    }
  }, [availableAssignmentGroups]);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/mandatory-metrics');
      if (res.ok) {
        const data = await res.json();
        const metrics = data.metrics || data.definitions || [];
        if (metrics.length > 0) {
          setMetricDefinitions(metrics);
        }

        const configs = data.config || data.configs || {};
        setGroupConfigs(configs);

        // Extract unique groups from configs + availableAssignmentGroups + live ServiceNow
        const discovered = new Set<string>(['DEFAULT', ...Object.keys(configs)]);
        if (availableAssignmentGroups && availableAssignmentGroups.length > 0) {
          availableAssignmentGroups.forEach(g => discovered.add(g));
        }
        if (initialSelectedGroup) {
          discovered.add(initialSelectedGroup);
        }

        // Fetch live ServiceNow assignment groups directly from sys_user_group
        try {
          const liveRes = await fetch('/api/servicenow/assignment-groups');
          if (liveRes.ok) {
            const liveData = await liveRes.json();
            if (Array.isArray(liveData.groups)) {
              const liveList = liveData.groups.filter((g: string) => Boolean(g && g.trim()));
              liveList.forEach((g: string) => discovered.add(g.trim()));
              setLiveServiceNowGroups(liveList);
            }
          }
        } catch (e) {
          console.warn('Failed to fetch live ServiceNow assignment groups', e);
        }

        // Also check cached tracked groups
        try {
          const cachedTracked = localStorage.getItem('gov_snow_assignment_group_filter') || localStorage.getItem('gov_added_assignment_groups');
          if (cachedTracked) {
            const parsed = JSON.parse(cachedTracked);
            if (Array.isArray(parsed)) {
              parsed.forEach(g => discovered.add(g));
            }
          }
        } catch (e) {}

        setAllGroups(Array.from(discovered));
      }
    } catch (err) {
      console.error('Failed to load mandatory metrics config:', err);
      triggerPopup('Could not load mandatory metrics configuration.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshSnowGroups = async () => {
    setIsRefreshingSnow(true);
    try {
      const liveRes = await fetch('/api/servicenow/assignment-groups');
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        if (Array.isArray(liveData.groups)) {
          const liveList = liveData.groups.filter((g: string) => Boolean(g && g.trim()));
          setLiveServiceNowGroups(liveList);
          setAllGroups(prev => {
            const merged = new Set(['DEFAULT', ...prev, ...liveList]);
            return Array.from(merged);
          });
          triggerPopup(`Synchronized ${liveList.length} live Assignment Groups from ServiceNow sys_user_group.`, 'success');
        }
      }
    } catch (err) {
      triggerPopup('Could not connect to ServiceNow REST API to refresh groups.', 'error');
    } finally {
      setIsRefreshingSnow(false);
    }
  };

  const handleToggleMetric = (metricId: string) => {
    const currentGroupMap = groupConfigs[selectedGroup] || groupConfigs['DEFAULT'] || {};
    // If not explicitly defined, default is true
    const currentVal = currentGroupMap[metricId] !== undefined ? currentGroupMap[metricId] : true;
    const nextVal = !currentVal;

    setGroupConfigs(prev => ({
      ...prev,
      [selectedGroup]: {
        ...(prev[selectedGroup] || prev['DEFAULT'] || {}),
        [metricId]: nextVal
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSetAllForGroup = (enable: boolean) => {
    const updatedMap: Record<string, boolean> = {};
    metricDefinitions.forEach(m => {
      updatedMap[m.id] = enable;
    });

    setGroupConfigs(prev => ({
      ...prev,
      [selectedGroup]: updatedMap
    }));
    setHasUnsavedChanges(true);
    triggerPopup(`All 12 checks set to ${enable ? 'MANDATORY' : 'OPTIONAL (Bypassed)'} for "${selectedGroup}".`, 'info');
  };

  const handleResetGroupToDefault = () => {
    if (selectedGroup === 'DEFAULT') {
      const defaultMap: Record<string, boolean> = {};
      metricDefinitions.forEach(m => {
        defaultMap[m.id] = true;
      });
      setGroupConfigs(prev => ({
        ...prev,
        DEFAULT: defaultMap
      }));
      triggerPopup('Reset DEFAULT baseline to all metrics mandatory.', 'info');
    } else {
      // Inherit from DEFAULT
      const defaultMap = groupConfigs['DEFAULT'] || {};
      setGroupConfigs(prev => ({
        ...prev,
        [selectedGroup]: { ...defaultMap }
      }));
      triggerPopup(`Copied DEFAULT baseline rules into "${selectedGroup}".`, 'info');
    }
    setHasUnsavedChanges(true);
  };

  const handleDeleteGroupOverride = () => {
    if (selectedGroup === 'DEFAULT') return;
    setGroupConfigs(prev => {
      const copy = { ...prev };
      delete copy[selectedGroup];
      return copy;
    });
    setHasUnsavedChanges(true);
    triggerPopup(`Removed custom override for "${selectedGroup}". It now automatically inherits the DEFAULT baseline.`, 'info');
  };

  const handleAddNewGroup = () => {
    const trimmed = newGroupInput.trim();
    if (!trimmed) return;
    if (allGroups.includes(trimmed)) {
      setSelectedGroup(trimmed);
      setNewGroupInput('');
      triggerPopup(`Switched to existing group "${trimmed}".`, 'info');
      return;
    }

    const nextGroups = [...allGroups, trimmed];
    setAllGroups(nextGroups);
    setSelectedGroup(trimmed);
    const defaultMap = groupConfigs['DEFAULT'] || {};
    setGroupConfigs(prev => ({
      ...prev,
      [trimmed]: { ...defaultMap }
    }));
    setNewGroupInput('');
    setHasUnsavedChanges(true);
    triggerPopup(`Linked new group "${trimmed}" to Mandatory Metrics engine!`, 'success');
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/mandatory-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: groupConfigs, configs: groupConfigs })
      });

      if (res.ok) {
        setHasUnsavedChanges(false);
        triggerPopup('Mandatory Metrics configuration saved! Background and live audits will immediately enforce these rules.', 'success');
        if (onConfigSaved) onConfigSaved();
        window.dispatchEvent(new CustomEvent('governance_mandatory_metrics_updated'));
      } else {
        triggerPopup('Failed to save mandatory metrics settings.', 'error');
      }
    } catch (err) {
      console.error('Save mandatory metrics error:', err);
      triggerPopup('Network error while saving mandatory metrics.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter groups in sidebar
  const filteredGroupsList = useMemo(() => {
    const term = groupSearchFilter.toLowerCase().trim();
    return allGroups.filter(g => {
      if (!term) return true;
      return g.toLowerCase().includes(term);
    });
  }, [allGroups, groupSearchFilter]);

  // Group metrics & categories
  const categories = useMemo(() => {
    return Array.from(new Set(metricDefinitions.map(m => m.category)));
  }, [metricDefinitions]);

  const filteredMetrics = useMemo(() => {
    return metricDefinitions.filter(m => {
      if (selectedCategory !== 'ALL' && m.category !== selectedCategory) return false;
      if (metricSearchFilter) {
        const term = metricSearchFilter.toLowerCase();
        return (
          m.name.toLowerCase().includes(term) ||
          m.description.toLowerCase().includes(term) ||
          m.category.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [metricDefinitions, selectedCategory, metricSearchFilter]);

  // Current group stats
  const currentMap = groupConfigs[selectedGroup] || groupConfigs['DEFAULT'] || {};
  const isCustomConfigured = Boolean(selectedGroup !== 'DEFAULT' && groupConfigs[selectedGroup]);
  const mandatoryCount = metricDefinitions.filter(m => currentMap[m.id] !== false).length;
  const optionalCount = metricDefinitions.length - mandatoryCount;

  return (
    <div className="space-y-6 text-foreground animate-fadeIn" id="mandatory-metrics-config-container">
      {/* Top Banner & Overview */}
      <div className="bg-[#101319] border border-[#232836] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400">
                ServiceNow Automated Governance Controls
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Assignment Group Rules & Mandatory Metrics
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Rules are dynamically linked to ServiceNow tickets by their <span className="text-blue-300 font-mono">assignment_group</span> field.
              Groups are fetched directly from your live ServiceNow <span className="text-emerald-300 font-mono">sys_user_group</span> table.
              When a check is toggled <span className="text-amber-300 font-mono font-bold">OPTIONAL</span> for a group, incidents in that group bypass the check with full 2/2 score, avoiding unfair penalties.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                hasUnsavedChanges
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 ring-2 ring-blue-400/50 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving Changes...' : hasUnsavedChanges ? 'Save Rules *' : 'Save Rules'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Visual Linking Pipeline */}
        <div className="mt-5 p-4 rounded-xl bg-[#090C12] border border-[#1F2433] flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Database className="h-4 w-4 text-blue-400" />
            <span>1. ServiceNow REST Ingestion</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 hidden md:block" />
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="h-4 w-4 text-indigo-400" />
            <span>2. Match <strong className="text-white">assignment_group</strong></span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 hidden md:block" />
          <div className="flex items-center gap-2 text-slate-300">
            <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
            <span>3. Apply Target Rules ({mandatoryCount} Enforced)</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 hidden md:block" />
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>4. Auto-pass {optionalCount} Exempt Checks</span>
          </div>
        </div>
      </div>

      {/* Main 2-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Assignment Groups Directory (4 cols) */}
        <div className="lg:col-span-4 bg-[#12151D] border border-[#232836] rounded-2xl p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Assignment Groups ({allGroups.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={handleRefreshSnowGroups}
              disabled={isRefreshingSnow}
              title="Refresh live groups from ServiceNow REST API"
              className="p-1.5 rounded-lg bg-[#181D28] hover:bg-[#202736] text-slate-300 hover:text-white transition-colors cursor-pointer border border-[#2B3245]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingSnow ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Select a group below to customize its quality enforcement rules. All groups are synced from ServiceNow <span className="font-mono text-slate-300">sys_user_group</span>.
          </p>

          {/* Group Search Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={groupSearchFilter}
              onChange={(e) => setGroupSearchFilter(e.target.value)}
              placeholder="Search assignment group..."
              className="w-full bg-[#0A0C11] border border-[#272C3B] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono"
            />
          </div>

          {/* Quick Add Custom Group */}
          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newGroupInput}
              onChange={(e) => setNewGroupInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNewGroup()}
              placeholder="Add manual group name..."
              className="flex-1 bg-[#0A0C11] border border-[#272C3B] focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
            />
            <button
              type="button"
              onClick={handleAddNewGroup}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
              title="Add manual group name"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Group Items Scrollable List */}
          <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
            {/* Global Baseline Card (Always Top) */}
            <button
              type="button"
              onClick={() => setSelectedGroup('DEFAULT')}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                selectedGroup === 'DEFAULT'
                  ? 'bg-blue-600/15 border-blue-500/50 shadow-md ring-1 ring-blue-500/30'
                  : 'bg-[#0E1118] border-[#1F2433] hover:border-slate-600'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-white font-mono truncate">
                    DEFAULT (Global Baseline)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Fallback rules for any group without custom overrides
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                Baseline
              </span>
            </button>

            {/* Other Groups */}
            {filteredGroupsList
              .filter(g => g !== 'DEFAULT')
              .map((group) => {
                const isSelected = selectedGroup === group;
                const hasCustom = Boolean(groupConfigs[group]);
                const groupSpecificConfig = groupConfigs[group];
                const activeCount = groupSpecificConfig
                  ? metricDefinitions.filter(m => groupSpecificConfig[m.id] !== false).length
                  : null;

                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedGroup(group)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/50 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-[#0E1118] border-[#1F2433] hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className={`text-xs font-mono font-medium block truncate ${isSelected ? 'text-white font-bold' : 'text-slate-300'}`}>
                        {group}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {hasCustom ? `Custom: ${activeCount}/12 checks` : 'Inherits DEFAULT baseline'}
                      </span>
                    </div>

                    {hasCustom ? (
                      <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                        Custom
                      </span>
                    ) : (
                      <span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                        Baseline
                      </span>
                    )}
                  </button>
                );
              })}

            {filteredGroupsList.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500 font-mono">
                No matching assignment groups found.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Rules Editor for Selected Group (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Group Header & Actions Toolbar */}
          <div className="bg-[#12151D] border border-[#232836] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Configuring Rules For:
                  </span>
                  {isCustomConfigured ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Custom Rules Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Inheriting Global Baseline
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2 mt-0.5">
                  <span>{selectedGroup}</span>
                </h3>
              </div>

              {/* Bulk Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAllForGroup(true)}
                  className="px-3 py-1.5 bg-[#161C28] hover:bg-[#1E2638] text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer"
                  title="Enforce all checks for this group"
                >
                  Enable All (12/12)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllForGroup(false)}
                  className="px-3 py-1.5 bg-[#161C28] hover:bg-[#1E2638] text-amber-400 border border-amber-500/30 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer"
                  title="Mark all checks optional for this group"
                >
                  Disable All (0/12)
                </button>
                {selectedGroup !== 'DEFAULT' && (
                  <button
                    type="button"
                    onClick={handleResetGroupToDefault}
                    className="px-3 py-1.5 bg-[#161C28] hover:bg-[#1E2638] text-blue-400 border border-blue-500/30 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1"
                    title="Copy DEFAULT baseline configuration"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy Baseline</span>
                  </button>
                )}
                {selectedGroup !== 'DEFAULT' && isCustomConfigured && (
                  <button
                    type="button"
                    onClick={handleDeleteGroupOverride}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1"
                    title="Delete custom override and revert to baseline"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Revert to Baseline</span>
                  </button>
                )}
              </div>
            </div>

            {/* Informational Guidance */}
            <div className="bg-[#0A0D13] border border-white/5 rounded-xl p-3 flex items-start gap-2.5 text-xs font-mono">
              <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-slate-400 leading-relaxed font-sans">
                {selectedGroup === 'DEFAULT' ? (
                  <span>
                    <strong className="text-white">Global Baseline Rules:</strong> Any ServiceNow assignment group without custom rules will automatically follow these settings.
                  </span>
                ) : isCustomConfigured ? (
                  <span>
                    <strong className="text-emerald-400">Custom Group Rules Active:</strong> Whenever a ServiceNow ticket with <strong className="text-white">assignment_group = "{selectedGroup}"</strong> is audited, only the <strong className="text-white">MANDATORY</strong> checks below are penalized. Any check marked <strong className="text-amber-400">OPTIONAL</strong> is bypassed with 2/2 full points.
                  </span>
                ) : (
                  <span>
                    <strong className="text-slate-300">Inheriting Baseline:</strong> <strong className="text-white">{selectedGroup}</strong> currently inherits from DEFAULT. Toggling any switch below creates a dedicated custom ruleset for this group.
                  </span>
                )}
              </div>
            </div>

            {/* Filter & Metric Search Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="text-[10px] text-slate-500 uppercase mr-1">Filter:</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#0E1118] text-slate-400 hover:text-white border border-[#232735]'
                  }`}
                >
                  All ({metricDefinitions.length})
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-[#0E1118] text-slate-400 hover:text-white border border-[#232735]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={metricSearchFilter}
                  onChange={(e) => setMetricSearchFilter(e.target.value)}
                  placeholder="Filter checks..."
                  className="w-full bg-[#0A0C11] border border-[#272C3B] focus:border-blue-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Metric Checks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredMetrics.map((metric) => {
              const isMandatory = currentMap[metric.id] !== false;

              return (
                <div
                  key={metric.id}
                  className={`rounded-2xl p-4 border transition-all space-y-3 relative overflow-hidden ${
                    isMandatory
                      ? 'bg-[#11141C] border-[#252B3A] hover:border-blue-500/40 shadow-sm'
                      : 'bg-[#0D0F15] border-[#1C202B] opacity-85 hover:opacity-100 hover:border-amber-500/30'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {metric.category}
                        </span>
                        <span className="text-[9.5px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                          {metric.weight} pts
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        {metric.name}
                      </h4>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleMetric(metric.id)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        isMandatory
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-sm'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                      }`}
                    >
                      {isMandatory ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>MANDATORY</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-amber-400" />
                          <span>OPTIONAL</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {metric.description}
                  </p>

                  {/* Operational Impact Note */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10.5px] font-mono">
                    {isMandatory ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Enforced (infractions penalize ticket score)
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Info className="h-3 w-3" /> Bypassed (auto awarded 2/2 pts without penalty)
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleMetric(metric.id)}
                      className="text-blue-400 hover:underline cursor-pointer ml-2 shrink-0"
                    >
                      Toggle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Save Reminder */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161B26] border border-blue-500/50 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-bounce">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="text-xs font-sans">
            <strong className="text-white block font-bold">Unsaved Group Rule Changes</strong>
            <span className="text-slate-300">Click save to apply mandatory metrics across all active ticket audits.</span>
          </div>
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-lg"
          >
            {isSaving ? 'Saving...' : 'Save Now'}
          </button>
        </div>
      )}
    </div>
  );
};
