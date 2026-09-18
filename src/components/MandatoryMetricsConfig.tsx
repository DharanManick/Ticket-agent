import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Users,
  Sliders,
  Save,
  RotateCcw,
  Copy,
  Layers,
  Sparkles,
  Info,
  Search,
  Plus,
  Trash2,
  Check,
  AlertTriangle
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
  onConfigSaved?: () => void;
}

export const MandatoryMetricsConfig: React.FC<MandatoryMetricsConfigProps> = ({
  triggerPopup,
  availableAssignmentGroups = [],
  onConfigSaved
}) => {
  const [metricDefinitions, setMetricDefinitions] = useState<MetricDefinition[]>([]);
  const [groupConfigs, setGroupConfigs] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedGroup, setSelectedGroup] = useState<string>('DEFAULT');
  const [allGroups, setAllGroups] = useState<string[]>(['DEFAULT']);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [newGroupInput, setNewGroupInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        if (data.metrics) {
          setMetricDefinitions(data.metrics);
        }
        if (data.config) {
          setGroupConfigs(data.config);

          // Extract unique groups from config + availableAssignmentGroups
          const discovered = new Set<string>(['DEFAULT', ...Object.keys(data.config)]);
          if (availableAssignmentGroups && availableAssignmentGroups.length > 0) {
            availableAssignmentGroups.forEach(g => discovered.add(g));
          }
          // Also check localStorage tracked groups
          try {
            const cachedTracked = localStorage.getItem('gov_added_assignment_groups');
            if (cachedTracked) {
              const parsed = JSON.parse(cachedTracked);
              if (Array.isArray(parsed)) {
                parsed.forEach(g => discovered.add(g));
              }
            }
          } catch (e) {}

          setAllGroups(Array.from(discovered));
        }
      }
    } catch (err) {
      console.error('Failed to load mandatory metrics config:', err);
      triggerPopup('Could not load mandatory metrics configuration.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMetric = (metricId: string) => {
    const currentGroupMap = groupConfigs[selectedGroup] || {};
    // If not set, default is true
    const currentVal = currentGroupMap[metricId] !== undefined ? currentGroupMap[metricId] : true;
    const nextVal = !currentVal;

    setGroupConfigs(prev => ({
      ...prev,
      [selectedGroup]: {
        ...(prev[selectedGroup] || {}),
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
    triggerPopup(`All workspace checks ${enable ? 'enabled as mandatory' : 'marked optional'} for "${selectedGroup}".`, 'info');
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
    } else {
      // Inherit from DEFAULT
      const defaultMap = groupConfigs['DEFAULT'] || {};
      setGroupConfigs(prev => ({
        ...prev,
        [selectedGroup]: { ...defaultMap }
      }));
    }
    setHasUnsavedChanges(true);
    triggerPopup(`Reset rules for "${selectedGroup}" to default baseline!`, 'info');
  };

  const handleAddNewGroup = () => {
    const trimmed = newGroupInput.trim();
    if (!trimmed) return;
    if (allGroups.includes(trimmed)) {
      setSelectedGroup(trimmed);
      setNewGroupInput('');
      triggerPopup(`Group "${trimmed}" selected.`, 'info');
      return;
    }

    const nextGroups = [...allGroups, trimmed];
    setAllGroups(nextGroups);
    setSelectedGroup(trimmed);
    // Initialize with DEFAULT copy
    const defaultMap = groupConfigs['DEFAULT'] || {};
    setGroupConfigs(prev => ({
      ...prev,
      [trimmed]: { ...defaultMap }
    }));
    setNewGroupInput('');
    setHasUnsavedChanges(true);
    triggerPopup(`Added custom group "${trimmed}" to Mandatory Metrics controller!`, 'success');
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/mandatory-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: groupConfigs })
      });

      if (res.ok) {
        setHasUnsavedChanges(false);
        triggerPopup('Mandatory metrics checks saved! Active quality evaluations will re-calculate automatically.', 'success');
        if (onConfigSaved) onConfigSaved();
        // Dispatch event to trigger re-audit if needed
        window.dispatchEvent(new CustomEvent('governance_mandatory_metrics_updated'));
      } else {
        triggerPopup('Failed to save mandatory metrics settings.', 'error');
      }
    } catch (err) {
      console.error('Save mandatory metrics error:', err);
      triggerPopup('Network connection error while saving mandatory metrics.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Grouping & filtering
  const categories = Array.from(new Set(metricDefinitions.map(m => m.category)));
  const filteredMetrics = metricDefinitions.filter(m => {
    if (selectedCategory !== 'ALL' && m.category !== selectedCategory) return false;
    if (searchFilter) {
      const term = searchFilter.toLowerCase();
      return (
        m.name.toLowerCase().includes(term) ||
        m.description.toLowerCase().includes(term) ||
        m.category.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Calculate current group counts
  const currentMap = groupConfigs[selectedGroup] || groupConfigs['DEFAULT'] || {};
  const mandatoryCount = metricDefinitions.filter(m => currentMap[m.id] !== false).length;
  const optionalCount = metricDefinitions.length - mandatoryCount;

  return (
    <div className="space-y-6 text-foreground animate-fadeIn" id="mandatory-metrics-config-container">
      {/* Header Banner */}
      <div className="bg-[#101319] border border-[#232836] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400">
                Governance Quality Controls
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Mandatory Metrics Checks by Assignment Group
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Configure which workspace audit checks are mandatory or optional per Assignment Group.
              When a metric check is disabled for a group, incidents in that group automatically bypass the penalty
              and pass with full points, ensuring quality checks match team SLAs and operational scopes.
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
              <span>{isSaving ? 'Saving Changes...' : hasUnsavedChanges ? 'Save Changes *' : 'Save Rules'}</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Ribbon */}
        <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-[#0A0D13] p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 uppercase block">Selected Group</span>
            <span className="text-sm font-bold text-white truncate block">{selectedGroup}</span>
          </div>
          <div className="bg-[#0A0D13] p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 uppercase block">Total Metrics</span>
            <span className="text-sm font-bold text-slate-300">{metricDefinitions.length} Checks</span>
          </div>
          <div className="bg-[#0A0D13] p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-emerald-500 uppercase block">Mandatory (Active)</span>
            <span className="text-sm font-bold text-emerald-400">{mandatoryCount} Enforced</span>
          </div>
          <div className="bg-[#0A0D13] p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-amber-500 uppercase block">Optional (Bypassed)</span>
            <span className="text-sm font-bold text-amber-400">{optionalCount} Exempt</span>
          </div>
        </div>
      </div>

      {/* Assignment Group Selection & Control Bar */}
      <div className="bg-[#12151D] border border-[#262B3A] rounded-2xl p-4 md:p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              <label className="text-xs font-bold text-slate-300 uppercase font-mono">
                Target Group:
              </label>
            </div>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-[#0A0C11] border border-[#2F364A] text-white text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-blue-500 min-w-[240px] cursor-pointer"
            >
              <option value="DEFAULT">⭐ DEFAULT (Global Baseline for All Groups)</option>
              {allGroups
                .filter(g => g !== 'DEFAULT')
                .map(group => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
            </select>

            {/* Quick Add Custom Group */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newGroupInput}
                onChange={(e) => setNewGroupInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewGroup()}
                placeholder="New group name..."
                className="bg-[#0A0C11] border border-[#2F364A] text-white text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-blue-500 w-44"
              />
              <button
                type="button"
                onClick={handleAddNewGroup}
                className="bg-[#1A2130] hover:bg-blue-600 hover:text-white text-blue-400 border border-blue-500/30 px-2.5 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1"
                title="Add custom assignment group"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Group Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetAllForGroup(true)}
              className="px-3 py-1.5 bg-[#141A26] hover:bg-[#1E2738] text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              Enable All
            </button>
            <button
              type="button"
              onClick={() => handleSetAllForGroup(false)}
              className="px-3 py-1.5 bg-[#141A26] hover:bg-[#1E2738] text-amber-400 border border-amber-500/30 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              Disable All
            </button>
            <button
              type="button"
              onClick={handleResetGroupToDefault}
              className="px-3 py-1.5 bg-[#141A26] hover:bg-[#1E2738] text-slate-300 border border-[#2E3547] rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-[10px] text-slate-500 uppercase mr-1">Category:</span>
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-[#0E1118] text-slate-400 hover:text-white border border-[#232735]'
              }`}
            >
              All
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

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter metrics..."
              className="w-full bg-[#0A0C11] border border-[#272C3B] focus:border-blue-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredMetrics.map((metric) => {
          const isMandatory = currentMap[metric.id] !== false;

          return (
            <div
              key={metric.id}
              className={`rounded-2xl p-4 border transition-all space-y-3 relative overflow-hidden ${
                isMandatory
                  ? 'bg-[#11141C] border-[#252B3A] hover:border-blue-500/40'
                  : 'bg-[#0D0F15] border-[#1C202B] opacity-85 hover:opacity-100 hover:border-amber-500/30'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {metric.category}
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                      Weight: {metric.weight} pts
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {metric.name}
                  </h4>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleMetric(metric.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isMandatory
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
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

              {/* Operational impact note */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10.5px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Info className="h-3 w-3 text-slate-500" />
                  {isMandatory ? (
                    <span className="text-emerald-400/90 font-medium">
                      Infractions will penalize the ticket quality score.
                    </span>
                  ) : (
                    <span className="text-amber-400/90 font-medium">
                      Bypassed for {selectedGroup} (auto-passed with 2/2 pts).
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleMetric(metric.id)}
                  className="text-blue-400 hover:underline cursor-pointer"
                >
                  Toggle
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Save Reminder if changed */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161B26] border border-blue-500/50 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-bounce">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="text-xs font-sans">
            <strong className="text-white block font-bold">Unsaved Metric Changes</strong>
            <span className="text-slate-300">Click save to persist mandatory checks across all audits.</span>
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
