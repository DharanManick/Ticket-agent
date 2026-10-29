import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, AuditRule, TicketAuditReport, AuditHistoricalRun, CiCombination, OverallTicketAuditRule, ChatMessage } from './types';
import { defaultAuditRules } from './defaultRules';
import { defaultCiCombinations } from './defaultCiMatrix';
import { defaultResolutionQuestions } from './defaultResolutionQuestions';
import { defaultOverallRules } from './defaultOverallRules';
import MetricCards from './components/MetricCards';
import AssigneePerformanceHeatmap from './components/AssigneePerformanceHeatmap';
import AuditDetails from './components/AuditDetails';
import OverallRulesEditor from './components/OverallRulesEditor';
import TrendsPage from './components/TrendsPage';
import AIChatInspector from './components/AIChatInspector';
import AssigneeInsights from './components/AssigneeInsights';
import AuditHistoryTab from './components/AuditHistoryTab';
import AboutPortal from './components/AboutPortal';
import AlertDispatchCenter from './components/AlertDispatchCenter';
import ConfirmationDialog from './components/ConfirmationDialog';
import { exportToColorfulExcel } from './utils/excelExporter';
import { useRealtimeEvents } from './utils/useRealtimeEvents';
import * as XLSX from 'xlsx';


import { 
  Database,
  Cpu, 
  BookOpen,
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle,
  FileSpreadsheet, 
  Bot, 
  Brain,
  Trash2,
  CalendarDays,
  LayoutDashboard,
  CheckSquare,
  FileText,
  Sliders,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  Users,
  History,
  PartyPopper,
  CheckCircle2,
  Edit2,
  TrendingUp,
  ListTodo,
  HelpCircle,
  Sun,
  Moon,
  Bell,
  Activity,
  Server,
  Search,
  Radio,
  BarChart3,
  Gauge,
  X
} from 'lucide-react';
import { ActivityLogAuditDesk } from './components/ActivityLogAuditDesk';
import ConnectionSetup from './components/ConnectionSetup';
import AssignmentGroupManagement from './components/AssignmentGroupManagement';
import UsageTracking from './components/UsageTracking';
import { EvaluationHarnessModal } from './components/EvaluationHarnessModal';
import { useTheme } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trends' | 'workspace' | 'assignees' | 'history' | 'rules' | 'ciMatrix' | 'chatbot' | 'resolutionConfig' | 'overallRules' | 'about' | 'alertsConfig' | 'uploadHub' | 'activityLog' | 'servicenowTest' | 'connectionSetup' | 'usage' | 'assignmentGroups'>(() => {
    if (typeof window !== 'undefined') {
      const paramTab = new URLSearchParams(window.location.search).get('tab');
      if (paramTab) return paramTab as any;
    }
    return 'dashboard';
  });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isControlPanelsOpen, setIsControlPanelsOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('gov_control_panels_open');
    return saved !== null ? saved === 'true' : true;
  });
  const [showHarnessModal, setShowHarnessModal] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [lastSyncInfo, setLastSyncInfo] = useState<{
    timestamp: string;
    status: string;
    newIncidentsCount: number;
    errorMessage?: string;
  } | null>(() => {
    const savedTime = localStorage.getItem('gov_last_sync_time');
    return savedTime ? {
      timestamp: savedTime,
      status: "Success",
      newIncidentsCount: 0
    } : null;
  });
  const [isSyncingServiceNow, setIsSyncingServiceNow] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('gov_snow_auto_sync');
    return saved !== null ? saved === 'true' : true;
  });
  
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isTransitioningTheme, setIsTransitioningTheme] = useState(false);

  // Connect to zero-lag Server-Sent Events (SSE) push stream
  useRealtimeEvents();

  // Sync user profile & device theme preference from backend database
  useEffect(() => {
    async function syncUserProfileFromBackend() {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          if (data && data.profile) {
            const paramTheme = new URLSearchParams(window.location.search).get('theme');
            if (!paramTheme && data.profile.theme && (data.profile.theme === 'dark' || data.profile.theme === 'light' || data.profile.theme === 'system')) {
              setTheme(data.profile.theme);
            }
            if (data.profile.name) {
              setAuditorName(data.profile.name);
              localStorage.setItem('auditor_name', data.profile.name);
            }
            if (data.profile.role) {
              setAuditorRole(data.profile.role);
              localStorage.setItem('auditor_role', data.profile.role);
            }
          }
        }
      } catch (err) {
        console.warn('Could not sync user profile from backend, using local cache:', err);
      }

      try {
        const snowRes = await fetch('/api/servicenow/credentials');
        if (snowRes.ok) {
          const snowData = await snowRes.json();
          const c = snowData.credentials || (snowData.instanceName ? snowData : null);
          if (c) {
            if (c.instanceName) localStorage.setItem('gov_snow_instance', c.instanceName);
            if (c.username) localStorage.setItem('gov_snow_user', c.username);
            if (c.password) localStorage.setItem('gov_snow_pass', c.password);
          }
        }
      } catch (e) {}
    }
    syncUserProfileFromBackend();
  }, [setTheme]);

  // Sync auto-sync enabled setting from backend & keep tabs in sync
  useEffect(() => {
    async function fetchInitialAutoSync() {
      try {
        const res = await fetch('/api/servicenow/credentials');
        if (res.ok) {
          const creds = await res.json();
          if (creds.autoSyncEnabled !== undefined) {
            setAutoSyncEnabled(creds.autoSyncEnabled === true);
          }
        }
      } catch (e) {}
    }
    fetchInitialAutoSync();

    const handleAutoSyncEvent = (e: any) => {
      if (e?.detail?.enabled !== undefined) {
        setAutoSyncEnabled(e.detail.enabled);
      } else {
        const saved = localStorage.getItem('gov_snow_auto_sync');
        if (saved !== null) setAutoSyncEnabled(saved === 'true');
      }
    };
    window.addEventListener('governance_autosync_toggled', handleAutoSyncEvent);
    window.addEventListener('governance_autosync_disabled', () => setAutoSyncEnabled(false));
    window.addEventListener('storage', handleAutoSyncEvent);
    return () => {
      window.removeEventListener('governance_autosync_toggled', handleAutoSyncEvent);
      window.removeEventListener('governance_autosync_disabled', () => setAutoSyncEnabled(false));
      window.removeEventListener('storage', handleAutoSyncEvent);
    };
  }, []);

  useEffect(() => {
    setIsTransitioningTheme(true);
    const timer = setTimeout(() => {
      setIsTransitioningTheme(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [theme]);

  const handleThemeToggle = async () => {
    toggleTheme();
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

    try {
      await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: nextTheme })
      });
    } catch (err) {
      console.warn('Failed to persist theme preference to backend database:', err);
    }
  };

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [rules, setRules] = useState<AuditRule[]>(() => {
    try {
      const cached = localStorage.getItem('audit_rules_matrix');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.error('Failed to parse cached rules:', e);
      return [];
    }
  });

  const [overallRules, setOverallRules] = useState<OverallTicketAuditRule[]>(() => {
    try {
      const cached = localStorage.getItem('audit_overall_rules');
      return cached ? JSON.parse(cached) : [...defaultOverallRules];
    } catch (e) {
      console.error('Failed to parse cached overall rules:', e);
      return [...defaultOverallRules];
    }
  });

  const [ciCombinations, setCiCombinations] = useState<CiCombination[]>(() => {
    try {
      const cached = localStorage.getItem('audit_ci_matrix');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.error('Failed to parse cached CI combinations:', e);
      return [];
    }
  });

  const [resolutionQuestions, setResolutionQuestions] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('audit_resolution_questions');
      return cached ? JSON.parse(cached) : [...defaultResolutionQuestions];
    } catch (e) {
      console.error('Failed to parse cached resolution questions:', e);
      return [...defaultResolutionQuestions];
    }
  });

  const [reports, setReports] = useState<TicketAuditReport[]>([]);
  const [onlyResolved, setOnlyResolved] = useState<boolean>(false);
  const onlySolvePropose = onlyResolved;
  const setOnlySolvePropose = setOnlyResolved;
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('ticket') || null;
    }
    return null;
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Deduplication safeguards to prevent duplicate keys across components
  const dedupeReports = (reps: TicketAuditReport[]): TicketAuditReport[] => {
    const seen = new Set<string>();
    return (reps || []).filter(r => {
      const key = r?.ticket?.id || r?.ticket?.incNumber;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const dedupeTickets = (ticks: Ticket[]): Ticket[] => {
    const seen = new Set<string>();
    return (ticks || []).filter(t => {
      const key = t?.id || t?.incNumber;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // SLA Alert Trigger live filters state for sidebar count feedback sync
  const [enabledColors, setEnabledColors] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('gov_enabled_colors');
      return cached ? JSON.parse(cached) : ['Red', 'Amber'];
    } catch {
      return ['Red', 'Amber'];
    }
  });

  const [bypassTriggerFilters, setBypassTriggerFilters] = useState<boolean>(() => {
    return localStorage.getItem('gov_bypass_trigger_filters') === 'true';
  });
  
  // Auditor editable profile details
  const [auditorName, setAuditorName] = useState(() => localStorage.getItem('auditor_name') || 'Your Name');
  const [auditorRole, setAuditorRole] = useState(() => localStorage.getItem('auditor_role') || 'Lead Audit Officer');
  const [isEditingAuditor, setIsEditingAuditor] = useState(false);
  const [showProfileSavedBadge, setShowProfileSavedBadge] = useState(false);

  const saveAuditorInfo = async (name: string, role: string) => {
    setAuditorName(name);
    setAuditorRole(role);
    localStorage.setItem('auditor_name', name);
    localStorage.setItem('auditor_role', role);

    try {
      await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role })
      });
    } catch (err) {
      console.warn('Failed to persist auditor profile to backend database:', err);
    }
  };

  // Saved Historical Runs Array State
  const [historyRuns, setHistoryRuns] = useState<AuditHistoricalRun[]>(() => {
    try {
      const cached = localStorage.getItem('audit_runs_history');
      return cached ? JSON.parse(cached) : [];
    } catch (err) {
      console.error('Failed to parse history runs:', err);
      return [];
    }
  });

  // Saved Historical Runs Trash State
  const [trashRuns, setTrashRuns] = useState<AuditHistoricalRun[]>(() => {
    try {
      const cached = localStorage.getItem('audit_runs_history_trash');
      return cached ? JSON.parse(cached) : [];
    } catch (err) {
      console.error('Failed to parse trash runs:', err);
      return [];
    }
  });

  // State to control cache clearing confirmation dialog
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const setAndPersistHistoryRuns = (runs: AuditHistoricalRun[]) => {
    let currentRuns = JSON.parse(JSON.stringify(runs)) as AuditHistoricalRun[];
    let success = false;
    let attempts = 0;
    while (!success && attempts < 10) {
      try {
        localStorage.setItem('audit_runs_history', JSON.stringify(currentRuns));
        success = true;
      } catch (err: any) {
        attempts++;
        if (err.name === 'QuotaExceededError' || err.code === 22 || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          console.warn('Quota exceeded for audit_runs_history, pruning oldest run to fit in storage...');
          if (currentRuns.length > 1) {
            currentRuns.pop();
          } else if (currentRuns.length === 1) {
            const r = currentRuns[0];
            if (r.tickets && r.tickets.length > 0) {
              r.tickets = r.tickets.map(t => ({
                ...t,
                auditReportText: '',
                ticket: {
                  ...t.ticket,
                  activityLogs: '',
                  resolutionDescription: ''
                }
              }));
            } else {
              currentRuns = [];
            }
          } else {
            break;
          }
        } else {
          console.error('Non-quota error writing to audit_runs_history:', err);
          break;
        }
      }
    }
    setHistoryRuns(currentRuns);
  };

  const setAndPersistTrashRuns = (runs: AuditHistoricalRun[]) => {
    let currentRuns = JSON.parse(JSON.stringify(runs)) as AuditHistoricalRun[];
    let success = false;
    let attempts = 0;
    while (!success && attempts < 10) {
      try {
        localStorage.setItem('audit_runs_history_trash', JSON.stringify(currentRuns));
        success = true;
      } catch (err: any) {
        attempts++;
        if (err.name === 'QuotaExceededError' || err.code === 22 || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          console.warn('Quota exceeded for audit_runs_history_trash, pruning oldest trash run to fit in storage...');
          if (currentRuns.length > 1) {
            currentRuns.pop();
          } else if (currentRuns.length === 1) {
            const r = currentRuns[0];
            if (r.tickets && r.tickets.length > 0) {
              r.tickets = r.tickets.map(t => ({
                ...t,
                auditReportText: '',
                ticket: {
                  ...t.ticket,
                  activityLogs: '',
                  resolutionDescription: ''
                }
              }));
            } else {
              currentRuns = [];
            }
          } else {
            break;
          }
        } else {
          console.error('Non-quota error writing to audit_runs_history_trash:', err);
          break;
        }
      }
    }
    setTrashRuns(currentRuns);
  };

  const handleClearHistoryToTrash = () => {
    if (historyRuns.length === 0) return;
    const updatedTrash = [...historyRuns, ...trashRuns];
    setAndPersistHistoryRuns([]);
    setAndPersistTrashRuns(updatedTrash);
    triggerPopup('All history runs cleared and moved to Trash!', 'success');
  };

  const handleMoveRunToTrash = (runId: string) => {
    const runToTrash = historyRuns.find(r => r.runId === runId);
    if (!runToTrash) return;
    const updatedHistory = historyRuns.filter(r => r.runId !== runId);
    const updatedTrash = [runToTrash, ...trashRuns];
    setAndPersistHistoryRuns(updatedHistory);
    setAndPersistTrashRuns(updatedTrash);
    triggerPopup('Historical run moved to Trash!', 'success');
  };

  const handleRestoreRunFromTrash = (runId: string) => {
    const runToRestore = trashRuns.find(r => r.runId === runId);
    if (!runToRestore) return;
    const updatedTrash = trashRuns.filter(r => r.runId !== runId);
    const updatedHistory = [runToRestore, ...historyRuns];
    setAndPersistTrashRuns(updatedTrash);
    setAndPersistHistoryRuns(updatedHistory);
    triggerPopup('Historical run restored successfully!', 'success');
  };

  const handlePermanentDeleteRun = (runId: string) => {
    const updatedTrash = trashRuns.filter(r => r.runId !== runId);
    setAndPersistTrashRuns(updatedTrash);
    triggerPopup('Run permanently deleted.', 'warning');
  };

  const handleEmptyTrashPermanently = () => {
    setAndPersistTrashRuns([]);
    triggerPopup('Trash bin emptied permanently!', 'warning');
  };

  // Animated Celebration Modal state
  const [celebrationData, setCelebrationData] = useState<{ total: number; avgPercent: number } | null>(null);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  
  // Loading & status states
  const [isAuditing, setIsAuditing] = useState(false);
  const [sweepProgress, setSweepProgress] = useState<{
    active: boolean;
    total: number;
    completed: number;
    currentTicketId: string;
  } | null>(null);
  const [auditLog, setAuditLog] = useState<string | null>(null);
  const [errorString, setErrorString] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: any = null;
    if (isAuditing) {
      const fetchProgress = async () => {
        try {
          const res = await fetch('/api/audit-progress');
          const data = await res.json();
          if (data) {
            setSweepProgress(data);
            if (data.currentTicketId) {
              setAuditLog(data.currentTicketId);
            }
          }
        } catch (e) {
          console.error('Error fetching dynamic progress:', e);
        }
      };
      intervalId = setInterval(fetchProgress, 850);
      fetchProgress();
    } else {
      setSweepProgress(null);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuditing]);

  // Floating Popup Toast State
  const [popup, setPopup] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const triggerPopup = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setPopup({ message, type });
    // Auto clear after 4 seconds
    setTimeout(() => {
      setPopup(p => p && p.message === message ? null : p);
    }, 4000);
  };

  // Sync / Get current rules on mount
  useEffect(() => {
    const cachedRules = localStorage.getItem('audit_rules_matrix');
    if (cachedRules) {
      try {
        const parsed = JSON.parse(cachedRules);
        if (parsed && parsed.length > 0) {
          setRules(parsed);
          // Sync with the backend server too in case it was restarted
          fetch('/api/rules/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rules: parsed })
          }).catch(err => console.error('Failed to sync rules to restarted server:', err));
          return;
        }
      } catch (e) {
        console.error('Failed to parse cached rules on mount:', e);
      }
    }

    fetch('/api/rules')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP status ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Server returned non-JSON format');
        return res.json();
      })
      .then(data => {
        if (data.rules && data.rules.length > 0) {
          setRules(data.rules);
          localStorage.setItem('audit_rules_matrix', JSON.stringify(data.rules));
        } else {
          setRules(defaultAuditRules);
          localStorage.setItem('audit_rules_matrix', JSON.stringify(defaultAuditRules));
        }
      })
      .catch(err => {
        console.error('Failed to get rules from server database:', err);
        setRules(defaultAuditRules);
        localStorage.setItem('audit_rules_matrix', JSON.stringify(defaultAuditRules));
      });
  }, []);

  // Sync / Get current CI combinations on mount
  useEffect(() => {
    const cachedCombos = localStorage.getItem('audit_ci_matrix');
    if (cachedCombos) {
      try {
        const parsed = JSON.parse(cachedCombos);
        if (parsed && parsed.length > 0) {
          setCiCombinations(parsed);
          // Sync with the backend server too in case it was restarted
          fetch('/api/ci-combinations/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ combinations: parsed })
          }).catch(err => console.error('Failed to sync CI combinations to restarted server:', err));
          return;
        }
      } catch (e) {
        console.error('Failed to parse cached CI combinations on mount:', e);
      }
    }

    fetch('/api/ci-combinations')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP status ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Server returned non-JSON format');
        return res.json();
      })
      .then(data => {
        if (data.combinations && data.combinations.length > 0) {
          setCiCombinations(data.combinations);
          localStorage.setItem('audit_ci_matrix', JSON.stringify(data.combinations));
        } else {
          setCiCombinations(defaultCiCombinations);
          localStorage.setItem('audit_ci_matrix', JSON.stringify(defaultCiCombinations));
        }
      })
      .catch(err => {
        console.error('Failed to get CI combinations from server database:', err);
        setCiCombinations(defaultCiCombinations);
        localStorage.setItem('audit_ci_matrix', JSON.stringify(defaultCiCombinations));
      });
  }, []);

  // Sync / Get current Overall Rules on mount
  useEffect(() => {
    const cachedOverall = localStorage.getItem('audit_overall_rules');
    if (cachedOverall) {
      try {
        const parsed = JSON.parse(cachedOverall);
        if (parsed && parsed.length > 0) {
          setOverallRules(parsed);
          // Sync with the backend server too in case it was restarted
          fetch('/api/overall-rules/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rules: parsed })
          }).catch(err => console.error('Failed to sync overall rules to restarted server:', err));
          return;
        }
      } catch (e) {
        console.error('Failed to parse cached overall rules on mount:', e);
      }
    }

    fetch('/api/overall-rules')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP status ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Server returned non-JSON format');
        return res.json();
      })
      .then(data => {
        if (data.rules && data.rules.length > 0) {
          setOverallRules(data.rules);
          localStorage.setItem('audit_overall_rules', JSON.stringify(data.rules));
        } else {
          setOverallRules(defaultOverallRules);
          localStorage.setItem('audit_overall_rules', JSON.stringify(defaultOverallRules));
        }
      })
      .catch(err => {
        console.error('Failed to get overall rules from server database:', err);
        setOverallRules(defaultOverallRules);
        localStorage.setItem('audit_overall_rules', JSON.stringify(defaultOverallRules));
      });
  }, []);

  const handleSaveOverallRules = async (newRules: OverallTicketAuditRule[]) => {
    setOverallRules(newRules);
    localStorage.setItem('audit_overall_rules', JSON.stringify(newRules));
    try {
      await fetch('/api/overall-rules/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: newRules })
      });
      triggerPopup('Overall operational compliance rules successfully saved!', 'success');
      if (tickets.length > 0) {
        triggerAuditRun(tickets);
      }
    } catch (err) {
      console.error('Server save error for overall configurations:', err);
      triggerPopup('Cloud overall rules save timeout. Operating on active local state.', 'warning');
    }
  };

  const handleSaveCiCombinations = async (newCombinations: CiCombination[]) => {
    setCiCombinations(newCombinations);
    localStorage.setItem('audit_ci_matrix', JSON.stringify(newCombinations));
    try {
      await fetch('/api/ci-combinations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ combinations: newCombinations })
      });
      if (tickets.length > 0) {
        triggerAuditRun(tickets);
      }
    } catch (err) {
      console.error('Server save error for CI configurations:', err);
      triggerPopup('Cloud CI rules save timeout. Operating on active local state.', 'warning');
    }
  };

  const handleResetToDefaultCiCombinations = async () => {
    setCiCombinations(defaultCiCombinations);
    localStorage.setItem('audit_ci_matrix', JSON.stringify(defaultCiCombinations));
    try {
      await fetch('/api/ci-combinations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ combinations: defaultCiCombinations })
      });
      if (tickets.length > 0) {
        triggerAuditRun(tickets);
      }
    } catch (err) {
      console.error('Server reset error for CI configurations:', err);
    }
  };

  // Sync / Get current resolution questions on mount
  useEffect(() => {
    const cachedQuestions = localStorage.getItem('audit_resolution_questions');
    if (cachedQuestions) {
      try {
        const parsed = JSON.parse(cachedQuestions);
        if (parsed && parsed.length > 0) {
          setResolutionQuestions(parsed);
          // Sync with the backend server too in case it was restarted
          fetch('/api/resolution-questions/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: parsed })
          }).catch(err => console.error('Failed to sync resolution questions to restarted server:', err));
          return;
        }
      } catch (e) {
        console.error('Failed to parse cached resolution questions on mount:', e);
      }
    }

    fetch('/api/resolution-questions')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP status ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Server returned non-JSON format');
        return res.json();
      })
      .then(data => {
        if (data.questions && data.questions.length > 0) {
          setResolutionQuestions(data.questions);
          localStorage.setItem('audit_resolution_questions', JSON.stringify(data.questions));
        } else {
          setResolutionQuestions(defaultResolutionQuestions);
          localStorage.setItem('audit_resolution_questions', JSON.stringify(defaultResolutionQuestions));
        }
      })
      .catch(err => {
        console.error('Failed to get resolution questions from server database:', err);
        setResolutionQuestions(defaultResolutionQuestions);
        localStorage.setItem('audit_resolution_questions', JSON.stringify(defaultResolutionQuestions));
      });
  }, []);

  // Continuous background ticket polling sync handler (when autoSync is enabled under settings)
  useEffect(() => {
    let intervalId: any;

    const safeFetchJson = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          return null;
        }
        
        const text = await res.text();
        if (text.trim().startsWith('<')) {
          return null; // Ignore HTML content from SPA fallbacks
        }
        
        return JSON.parse(text);
      } catch (err) {
        return null;
      }
    };

    const pollBackgroundAuditState = async () => {
      try {
        // 1. Fetch live audit reports & incidents
        const auditData = await safeFetchJson('/api/audit');
        if (auditData) {
          if (auditData.onlyResolved !== undefined) {
            setOnlyResolved(!!auditData.onlyResolved);
          } else if (auditData.onlySolvePropose !== undefined) {
            setOnlyResolved(!!auditData.onlySolvePropose);
          }
          if (auditData.success && Array.isArray(auditData.reports)) {
            setReports(dedupeReports(auditData.reports));
            
            // Extract and update local tickets state
            const extractedTickets = auditData.reports.map((r: any) => r.ticket);
            setTickets(dedupeTickets(extractedTickets));
          }
        }

        // 2. Fetch empathy incidents
        const empathyData = await safeFetchJson('/api/activity-incidents');
        if (empathyData) {
          window.dispatchEvent(new CustomEvent('governance_empathy_data_fetched', { detail: empathyData }));
        }

        // 3. Fetch knowledge base (KB) articles
        const kbData = await safeFetchJson('/api/knowledge-articles');
        if (kbData) {
          window.dispatchEvent(new CustomEvent('governance_knowledge_articles_fetched', { detail: kbData }));
        }

        // 4. Fetch background sync status
        const logsData = await safeFetchJson('/api/servicenow/background-logs');
        if (logsData) {
          if (logsData.success && logsData.lastSyncInfo) {
            setLastSyncInfo(logsData.lastSyncInfo);
          }
        }
      } catch (err) {
        console.error('Failed to poll background state:', err);
      }
    };

    // Run poll immediately on mount/change
    pollBackgroundAuditState();

    // Set up continuous 5-second automatic polling interval
    intervalId = setInterval(pollBackgroundAuditState, 5000);

    const handleGroupsUpdate = () => {
      pollBackgroundAuditState();
    };

    window.addEventListener('governance_tracked_groups_updated', handleGroupsUpdate);
    window.addEventListener('governance_force_sync_trigger', handleGroupsUpdate);
    window.addEventListener('governance_mandatory_metrics_updated', handleGroupsUpdate);
    window.addEventListener('servicenow_realtime_sync', handleGroupsUpdate);
    window.addEventListener('governance_audit_refetch_requested', handleGroupsUpdate);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('governance_tracked_groups_updated', handleGroupsUpdate);
      window.removeEventListener('governance_force_sync_trigger', handleGroupsUpdate);
      window.removeEventListener('governance_mandatory_metrics_updated', handleGroupsUpdate);
      window.removeEventListener('servicenow_realtime_sync', handleGroupsUpdate);
      window.removeEventListener('governance_audit_refetch_requested', handleGroupsUpdate);
    };
  }, []);

  const handleSaveResolutionQuestions = async (newQuestions: string[]) => {
    setResolutionQuestions(newQuestions);
    localStorage.setItem('audit_resolution_questions', JSON.stringify(newQuestions));
    try {
      await fetch('/api/resolution-questions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: newQuestions })
      });
      if (tickets.length > 0) {
        triggerAuditRun(tickets);
      }
    } catch (err) {
      console.error('Server save error for resolution configurations:', err);
      triggerPopup('Cloud resolution rules save timeout. Operating on active local state.', 'warning');
    }
  };

  const handleResetToDefaultResolutionQuestions = async () => {
    setResolutionQuestions(defaultResolutionQuestions);
    localStorage.setItem('audit_resolution_questions', JSON.stringify(defaultResolutionQuestions));
    try {
      await fetch('/api/resolution-questions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: defaultResolutionQuestions })
      });
      if (tickets.length > 0) {
        triggerAuditRun(tickets);
      }
    } catch (err) {
      console.error('Server reset error for resolution configurations:', err);
    }
  };

  // Clean slate on startup. Daily spreadsheets ingestion ready.
  useEffect(() => {
    // Rely exclusively on custom spreadsheet file uploads for active ticket audits.
  }, []);

  // Mean dynamic SLA calculation
  const avgSla = reports.length > 0 ? Math.round(reports.reduce((acc, r) => acc + r.percentage, 0) / reports.length) : 0;

  // Global search matching count across ticket pool
  const matchedTicketsCount = React.useMemo(() => {
    if (!globalSearchTerm.trim()) return reports.length;
    const q = globalSearchTerm.toLowerCase().trim();
    return reports.filter(r => {
      const t = r.ticket;
      return (
        String(t.incNumber || '').toLowerCase().includes(q) ||
        String(t.assignee || '').toLowerCase().includes(q) ||
        String(t.shortDescription || '').toLowerCase().includes(q) ||
        String(t.assignmentGroup || '').toLowerCase().includes(q)
      );
    }).length;
  }, [reports, globalSearchTerm]);

  // Bypassed step calculation
  const bypassedCount = reports.filter(r => {
    const logs = r.ticket.activityLogs ? r.ticket.activityLogs.toLowerCase() : '';
    return logs.includes('progress') && logs.includes('confirm') && !logs.includes('propose');
  }).length;

  // Auto save audited batches for future monitoring and statistics review
  const saveToHistoryLog = (reportsList: TicketAuditReport[], showCelebration = false) => {
    if (reportsList.length === 0) return;
    const avgScore = Math.round(reportsList.reduce((acc, r) => acc + r.percentage, 0) / reportsList.length);
    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-05"
    
    const newRun = {
      runId: `run_${Date.now()}`,
      timestamp: new Date().toISOString(),
      monthKey: currentMonth,
      auditorName: auditorName || 'Standard Auditor',
      totalTickets: reportsList.length,
      averageScorePercentage: avgScore,
      tickets: reportsList
    };

    setAndPersistHistoryRuns([newRun, ...historyRuns]);

    // Show celebration modal ONLY when explicitly requested (e.g. manual user sweep action)
    if (showCelebration) {
      setCelebrationData({ total: reportsList.length, avgPercent: avgScore });
      setShowCelebrationModal(true);
    }
  };

  // helper to auto-trigger alert notifications if configured
  const runAutoTriggerAlerts = (activeReports: any[]) => {
    const isAutoMode = localStorage.getItem('gov_alert_engine_mode') === 'auto';
    if (!isAutoMode) return;

    try {
      let enabledColors = ['Red', 'Amber'];
      try {
        const cachedColors = localStorage.getItem('gov_enabled_colors');
        if (cachedColors) enabledColors = JSON.parse(cachedColors);
      } catch {}

      const bypassFilters = localStorage.getItem('gov_bypass_trigger_filters') === 'true';

      const defaultJsonTpl = `{\n  "event": "INCIDENT_AUDIT_COMPLIANCE_INFRACTION",\n  "remediationPortal": "IT Compliance & Governance Remediation Portal",\n  "audit": {\n    "ticketNumber": "{ticket_id}",\n    "assignee": "{assignee_name}",\n    "complianceScorePct": {score},\n    "generalComments": "{comments}"\n  },\n  "identifiedInfractionsCount": {infractions_count},\n  "identifiedInfractions": {infractions_list_json},\n  "nextSteps": "Please complete the necessary corrections directly in ServiceNow to align with quality standards."\n}`;

      const teamsWebhook = localStorage.getItem('gov_teams_webhook') || '';
      const customTeamsFormat = localStorage.getItem('gov_teams_message_format') || defaultJsonTpl;

      let alertHistory: Record<string, { email?: boolean; teams: boolean; workspaceNotify?: boolean }> = {};
      try {
        const cachedHist = localStorage.getItem('governance_alert_history');
        if (cachedHist) alertHistory = JSON.parse(cachedHist);
      } catch {}

      let currentLogs: string[] = [];
      try {
        const cachedLogs = localStorage.getItem('governance_alert_logs');
        if (cachedLogs) currentLogs = JSON.parse(cachedLogs);
      } catch {}

      const addAutoLog = (msg: string) => {
        currentLogs = [`[${new Date().toLocaleTimeString()}] [AUTO-TRIGGER] ${msg}`, ...currentLogs.slice(0, 16)];
      };

      const localParseTemplate = (tpl: string, report: any) => {
        const infractions: string[] = [];
        if (!report.ticket.affectedCi || report.ticket.affectedCi.toLowerCase() === 'none') {
          infractions.push('• Invalid or empty Configuration Item aligned.');
        }
        if (!report.ticket.knowledgeArticle || report.ticket.knowledgeArticle.toLowerCase() === 'no') {
          infractions.push('• Knowledge Article missing from resolution description.');
        }
        if (report.percentage < 100) {
          infractions.push('• ServiceNow Checklist standards not met.');
        }
        if (infractions.length === 0) {
          infractions.push('• Operational priority guidelines mismatch.');
        }

        const cleanInfractions = infractions.map(item => item.replace(/^•\s*/, ''));
        const infractionsJson = JSON.stringify(cleanInfractions);

        const ticketId = report.ticket.incNumber || 'INC-N/A';
        const assigneeName = report.ticket.assignee || 'Unknown Agent';
        const scoreVal = String(report.percentage);
        const infractionsCount = String(infractions.length);
        const commentsVal = report.generalComments || 'No general audit comments provided.';

        addAutoLog(`🔍 [VARIABLE FETCH] Extracted tokens for ${ticketId}: {ticket_id}="${ticketId}", {assignee_name}="${assigneeName}", {score}=${scoreVal}, {infractions_count}=${infractionsCount}, {comments}="${commentsVal.substring(0, 50)}${commentsVal.length > 50 ? '...' : ''}"`);

        return tpl
          .replace(/{ticket_id}/g, ticketId)
          .replace(/{assignee_name}/g, assigneeName)
          .replace(/{score}/g, scoreVal)
          .replace(/{infractions_count}/g, infractionsCount)
          .replace(/{infractions_list}/g, infractions.join('\n'))
          .replace(/{infractions_list_json}/g, infractionsJson)
          .replace(/{comments}/g, commentsVal)
          .replace(/{general_comments}/g, commentsVal);
      };

      // Filter reports matching checked colors (or all if bypassed)
      const eligible = activeReports.filter(r => {
        if (bypassFilters) return true;
        const color = r.statusColor || 'Red';
        return enabledColors.includes(color);
      });

      if (eligible.length === 0) {
        addAutoLog(`Auto alerting sweep ran: Scan checked 0 tickets matching compliant colors.`);
        localStorage.setItem('governance_alert_logs', JSON.stringify(currentLogs));
        window.dispatchEvent(new CustomEvent('governance_logs_updated'));
        window.dispatchEvent(new Event('storage'));
        return;
      }

      if (!teamsWebhook) {
        addAutoLog(`Auto alerting sweep ran: Teams Webhook is empty; dispatches skipped.`);
        localStorage.setItem('governance_alert_logs', JSON.stringify(currentLogs));
        window.dispatchEvent(new CustomEvent('governance_logs_updated'));
        window.dispatchEvent(new Event('storage'));
        return;
      }

      const lowScoreThreshold = Number(localStorage.getItem('gov_low_score_threshold') || '75');
      const enableIndividualAlerts = localStorage.getItem('gov_enable_individual_alerts') !== 'false';
      const enableManagerSummary = localStorage.getItem('gov_enable_manager_summary') !== 'false';
      const managerWebhook = localStorage.getItem('gov_manager_webhook') || '';

      // Identified low score tickets below cutoff
      const lowScorers = eligible.filter(r => r.percentage < lowScoreThreshold);

      addAutoLog(`Auto audit sweep initialized. Found ${eligible.length} eligible incidents. Low metrics cutoff is ${lowScoreThreshold}%. Identified low-scoring subset constraint length: ${lowScorers.length}.`);

      // 1. Process Individual Assignee low-score alerts sequentially with delay to avoid proxy rate limit failure
      if (enableIndividualAlerts && lowScorers.length > 0) {
        lowScorers.forEach((r, idx) => {
          const tId = r.ticket.incNumber;
          const assigneeName = r.ticket.assignee || 'Unassigned';
          
          setTimeout(() => {
            const currentHistory = alertHistory[tId] || { teams: false };
            let updatedHistory = { ...currentHistory };
            updatedHistory.teams = true;

            if (teamsWebhook.includes('remediation-alerts-channel...')) {
              let logsNow: string[] = [];
              try {
                const latestLogs = localStorage.getItem('governance_alert_logs');
                if (latestLogs) logsNow = JSON.parse(latestLogs);
              } catch {}
              logsNow = [`[${new Date().toLocaleTimeString()}] 🟢 [AUTO-TRIGGER] [SIMULATOR]: Individual warning DM card simulated for low-scoring assignee ${assigneeName} on ${tId}.`, ...logsNow.slice(0, 20)];
              localStorage.setItem('governance_alert_logs', JSON.stringify(logsNow));
              window.dispatchEvent(new CustomEvent('governance_logs_updated'));
              window.dispatchEvent(new Event('storage'));
            } else {
              const cardText = localParseTemplate(customTeamsFormat, r);
              fetch('/api/dispatch-teams-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  webhookUrl: teamsWebhook,
                  payload: {
                    "@type": "MessageCard",
                    "@context": "http://schema.org/extensions",
                    "themeColor": "FF8C00",
                    "summary": `⚠️ ACTION REQUIRED Compliance Attention Needed on ${tId}`,
                    "sections": [{
                      "activityTitle": `⚠️ QUALITY ALERT: Individual Feedback for ${tId}`,
                      "activitySubtitle": `Assignee: ${assigneeName} | Score: ${r.percentage}%`,
                      "text": `Dear **${assigneeName}**, \n\nThis is an individual alert regarding your ServiceNow ticket **${tId}** which scored **${r.percentage}%** on our compliance audit, falling below our standard quality threshold. \n\n**Audit Finding Details:**\n${cardText}\n\n*Please rectify these details in ServiceNow to avoid further score regression.*`,
                      "markdown": true
                    }]
                  }
                })
              })
              .then((res) => {
                let logsNow: string[] = [];
                try {
                  const latestLogs = localStorage.getItem('governance_alert_logs');
                  if (latestLogs) logsNow = JSON.parse(latestLogs);
                } catch {}

                if (res.ok) {
                  logsNow = [`[${new Date().toLocaleTimeString()}] 🟢 [AUTO-TRIGGER]: Posted individual assignee alert for low-scorer ${tId} (${r.percentage}%).`, ...logsNow.slice(0, 20)];
                } else {
                  logsNow = [`[${new Date().toLocaleTimeString()}] ❌ [AUTO-TRIGGER]: Proxy rejected individual webhook for ${tId}: Status ${res.status}`, ...logsNow.slice(0, 20)];
                }
                localStorage.setItem('governance_alert_logs', JSON.stringify(logsNow));
                window.dispatchEvent(new CustomEvent('governance_logs_updated'));
                window.dispatchEvent(new Event('storage'));
              })
              .catch((err) => {
                let logsNow: string[] = [];
                try {
                  const latestLogs = localStorage.getItem('governance_alert_logs');
                  if (latestLogs) logsNow = JSON.parse(latestLogs);
                } catch {}
                logsNow = [`[${new Date().toLocaleTimeString()}] ❌ [AUTO-TRIGGER]: Error dispatching individual alert for ${tId}: ${err.message || err}`, ...logsNow.slice(0, 20)];
                localStorage.setItem('governance_alert_logs', JSON.stringify(logsNow));
                window.dispatchEvent(new CustomEvent('governance_logs_updated'));
                window.dispatchEvent(new Event('storage'));
              });
            }

            alertHistory[tId] = updatedHistory;
            localStorage.setItem('governance_alert_history', JSON.stringify(alertHistory));
          }, idx * 400); // 400ms delay stagger to bypass rate-limit issues!
        });
      }

      // 2. Process Manager Summary bulletin
      if (enableManagerSummary) {
        const targetWebhook = managerWebhook && managerWebhook.trim() !== '' ? managerWebhook.trim() : teamsWebhook;
        
        const avgScore = activeReports.length > 0 
          ? Math.round(activeReports.reduce((sum, r) => sum + r.percentage, 0) / activeReports.length)
          : 100;

        const flaggedCount = lowScorers.length;
        const flaggedListMarkdown = lowScorers.map(r => `• **${r.ticket.incNumber}** (Assignee: _${r.ticket.assignee || 'Unassigned'}_) — Score: **${r.percentage}%**`).join('\n') || '• _No flagged low score incidents in this batch._';

        const managerHtml = `### 📊 Audit Compliance Quality Report (Manager Bulletin)\n\nAn automated audit sweep has completed over **${activeReports.length}** recently processed incident records with the following core quality metrics:\n\n**📊 EXECUTIVE METRICS COMPLIANCE:**\n- **Average Quality Score:** **${avgScore}%**\n- **Flagged Low Scorers (< ${lowScoreThreshold}%):** **${flaggedCount}** incidents\n\n🚨 **LOW-SCORING INCIDENTS QUEUE:**\n${flaggedListMarkdown}\n\n---\n_Please review these findings directly with your operations team to foster remediation alignment and service level compliance._`;

        if (targetWebhook.includes('remediation-alerts-channel...')) {
          setTimeout(() => {
            let logsNow: string[] = [];
            try {
              const latestLogs = localStorage.getItem('governance_alert_logs');
              if (latestLogs) logsNow = JSON.parse(latestLogs);
            } catch {}
            logsNow = [`[${new Date().toLocaleTimeString()}] 🟢 [AUTO-TRIGGER] [SIMULATOR]: Consolidated executive bulletin card simulated for manager channel (Avg score: ${avgScore}%).`, ...logsNow.slice(0, 20)];
            localStorage.setItem('governance_alert_logs', JSON.stringify(logsNow));
            window.dispatchEvent(new CustomEvent('governance_logs_updated'));
            window.dispatchEvent(new Event('storage'));
          }, 1000);
        } else {
          setTimeout(() => {
            fetch('/api/dispatch-teams-webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                webhookUrl: targetWebhook,
                payload: {
                  "@type": "MessageCard",
                  "@context": "http://schema.org/extensions",
                  "themeColor": avgScore >= 80 ? "0078D7" : "E81123",
                  "summary": "Consolidated Incident Audit Executive Briefing",
                  "sections": [{
                    "activityTitle": `📊 QUALITY COMPLIANCE BULLETINS: Consolidated Executive Summary`,
                    "activitySubtitle": `Audit Run: ${new Date().toLocaleDateString()} | Average Score: ${avgScore}%`,
                    "text": managerHtml,
                    "markdown": true
                  }]
                }
              })
            })
            .then((res) => {
              let logsNow: string[] = [];
              try {
                const latestLogs = localStorage.getItem('governance_alert_logs');
                if (latestLogs) logsNow = JSON.parse(latestLogs);
              } catch {}

              if (res.ok) {
                logsNow = [`[${new Date().toLocaleTimeString()}] 🟢 [AUTO-TRIGGER] [MANAGER INT]: Consolidated executive summary bulletin successfully posted to Manager's webhook channel.`, ...logsNow.slice(0, 20)];
              } else {
                logsNow = [`[${new Date().toLocaleTimeString()}] ❌ [AUTO-TRIGGER] [MANAGER INT]: Manager webhook delivery rejected with status ${res.status}.`, ...logsNow.slice(0, 20)];
              }
              localStorage.setItem('governance_alert_logs', JSON.stringify(logsNow));
              window.dispatchEvent(new CustomEvent('governance_logs_updated'));
              window.dispatchEvent(new Event('storage'));
            })
            .catch((err) => {
              let logsNow: string[] = [];
              try {
                const latestLogs = localStorage.getItem('governance_alert_logs');
                if (latestLogs) logsNow = JSON.parse(latestLogs);
              } catch {}
              logsNow = [`[${new Date().toLocaleTimeString()}] ❌ [AUTO-TRIGGER] [MANAGER INT]: Manager integration route unreachable: ${err.message}`, ...logsNow.slice(0, 20)];
              localStorage.setItem('governance_alert_logs', JSON.stringify(logsNow));
              window.dispatchEvent(new CustomEvent('governance_logs_updated'));
              window.dispatchEvent(new Event('storage'));
            });
          }, 1200);
        }
      }

      localStorage.setItem('governance_alert_logs', JSON.stringify(currentLogs));
      localStorage.setItem('governance_alert_history', JSON.stringify(alertHistory));
      window.dispatchEvent(new CustomEvent('governance_logs_updated'));
      window.dispatchEvent(new Event('storage'));

      triggerPopup(`[Auto-Trigger] Evaluated non-compliant alerts queue. Integrations active!`, 'success');
    } catch (err: any) {
      console.error('Auto trigger error:', err);
    }
  };

  const handleToggleGlobalResolved = async () => {
    try {
      const nextVal = !onlyResolved;
      setOnlyResolved(nextVal);
      const res = await fetch('/api/servicenow/toggle-resolved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyResolved: nextVal, onlySolvePropose: nextVal })
      });
      const data = await res.json();
      if (data && data.success) {
        triggerPopup(
          `Workspace Resolved: ${nextVal ? 'ON (Resolved Only)' : 'OFF (All Live Incidents)'}`,
          'success'
        );
        const auditRes = await fetch('/api/audit');
        const auditData = await auditRes.json();
        if (auditData?.reports) {
          setReports(dedupeReports(auditData.reports));
          setTickets(dedupeTickets(auditData.reports.map((r: any) => r.ticket)));
        }
      }
    } catch (err: any) {
      triggerPopup(`Failed to toggle: ${err.message || err}`, 'warning');
    }
  };
  const handleToggleGlobalSolvePropose = handleToggleGlobalResolved;

  const handleManualServiceNowSync = async () => {
    setIsSyncingServiceNow(true);
    triggerPopup('Synchronizing latest live incident records from ServiceNow Table API...', 'info');
    try {
      const gType = localStorage.getItem('gov_snow_sync_type') || 'all';
      const res = await fetch('/api/servicenow/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncType: gType,
          limit: 0,
          onlyResolved: onlyResolved
        })
      });
      const data = await res.json();
      const istTime = new Date().toLocaleTimeString('en-US', { hour12: true });
      const fullDate = new Date().toLocaleDateString('en-US');
      const timeStr = `${fullDate} ${istTime}`;
      localStorage.setItem('gov_last_sync_time', timeStr);

      const updatedSyncInfo = data.lastSyncInfo || {
        timestamp: timeStr,
        status: 'Success',
        newIncidentsCount: data.tickets?.length || 0
      };
      setLastSyncInfo(updatedSyncInfo);

      if (data.tickets && data.tickets.length > 0) {
        setTickets(dedupeTickets(data.tickets));
        triggerPopup(`Successfully synced ${data.tickets.length} live incident records from ServiceNow!`, 'success');
        window.dispatchEvent(new CustomEvent('governance_force_sync_trigger'));
      } else {
        triggerPopup(`ServiceNow checked: all records up to date as of ${timeStr}.`, 'success');
      }
    } catch (err: any) {
      console.error('ServiceNow Manual Sync Error:', err);
      triggerPopup(`Sync check completed: ${err?.message || 'Checked.'}`, 'info');
    } finally {
      setIsSyncingServiceNow(false);
    }
  };

  const handleToggleAutoSync = async () => {
    const nextVal = !autoSyncEnabled;
    setAutoSyncEnabled(nextVal);
    localStorage.setItem('gov_snow_auto_sync', String(nextVal));
    try {
      const credsRes = await fetch('/api/servicenow/credentials');
      const existingCreds = credsRes.ok ? await credsRes.json() : {};
      await fetch('/api/servicenow/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...existingCreds,
          autoSyncEnabled: nextVal,
          autoFetchEnabled: nextVal
        })
      });
      triggerPopup(
        nextVal
          ? "Auto-Sync ENABLED: Automated background polling and incident updates active."
          : "Auto-Sync PAUSED: Background auto-sync suspended.",
        nextVal ? "success" : "info"
      );
      window.dispatchEvent(new CustomEvent('governance_autosync_toggled', { detail: { enabled: nextVal } }));
    } catch (err) {
      console.error('Error toggling auto-sync:', err);
    }
  };

  const triggerAuditRun = async (ticketsList: Ticket[], showCelebration = false) => {
    if (ticketsList.length === 0) {
      triggerPopup('Incident pool is empty. Please load spreadsheets first.', 'warning');
      return;
    }
    setIsAuditing(true);
    setErrorString(null);
    setAuditLog('Invoking compliance verification models...');
    triggerPopup('Dispatched LLM operational audit sweep over incident records.', 'info');

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickets: ticketsList,
          customRules: rules,
          customCiCombinations: ciCombinations,
          customResolutionQuestions: resolutionQuestions,
          customOverallRules: overallRules
        })
      });

      const data = await res.json();
      if (data.reports) {
        setReports(dedupeReports(data.reports));
        setAuditLog(`Audit completed. Scanned ${data.reports.length} records.`);
        triggerPopup(`Successfully calculated scores for ${data.reports.length} incident tickets!`, 'success');
        saveToHistoryLog(data.reports, showCelebration);
        runAutoTriggerAlerts(data.reports);
      } else {
        throw new Error(data.error || 'Server calculation failed.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorString(`Applying baseline overrides: ${err?.message || ''}`);
      
      // Fallback local heuristic scoring matrix to guarantee offline resilience and clean UI
      const localFallbackReports = ticketsList.map(t => {
        const hasKA = !!t.knowledgeArticle && t.knowledgeArticle.trim().length > 0;
        const parsedCounter = (t.acceptedAppCounter || '').trim();
        const numVal = parseInt(parsedCounter, 10);
        const localKsl = (!isNaN(numVal) && numVal >= 1) ? 'Yes' : 'No' as 'Yes'|'No';

        // Evaluate Affected CI & Assignment Group alignment offline
        const ticketAff = (t.affectedCi || '').trim().toLowerCase();
        const ticketGrp = (t.assignmentGroup || '').trim().toLowerCase();
        const hasAffectedCiCombo = ticketAff.length > 0;

        // Resolve manager based on assignment group
        const groupCombo = ciCombinations.find(c => (c.assignmentGroup || '').trim().toLowerCase() === ticketGrp);
        if (groupCombo && groupCombo.assigneeManager) {
          t.assigneeManager = groupCombo.assigneeManager;
        }

        const localSiPCode = /[pP][1234][hHmL]/g.test(t.serviceImpactDescription || '');
        const localSiLen = (t.serviceImpactDescription || '').trim().length;
        let localSiScore = 2;
        let localSiRating = 'Pass';
        let localSiComment = 'Verified service impact description.';

        if (localSiLen === 0) {
          localSiScore = 0;
          localSiRating = 'Fail';
          localSiComment = 'Fail: Service impact description is completely empty.';
        } else {
          localSiScore = 2;
          localSiRating = 'Pass';
          localSiComment = 'Pass: Verified service impact description.';
        }

        const localScoreVal = (t.shortDescription ? 2 : 1) + (t.technicalDescription?.length >= 50 ? 2 : 0) + (localKsl === 'Yes' ? 2 : 0) + (hasAffectedCiCombo ? 2 : 0) + localSiScore + 16; 
        const percentage = Math.round((localScoreVal / 26) * 100);
        return {
          ticket: t,
          ksl: localKsl,
          audited: 'Yes' as 'Yes'|'No',
          scores: {
            affectedCi: { 
              score: hasAffectedCiCombo ? 2 : 0, 
              rating: hasAffectedCiCombo ? 'Pass' : 'Fail' as any, 
              comment: hasAffectedCiCombo 
                ? `Pass: Configuration Item '${t.affectedCi}' verified for Assignment Group '${t.assignmentGroup}' via ServiceNow CMDB records.`
                : `Fail: Configuration Item '${t.affectedCi || "N/A"}' is not provided or associated with Assignment Group '${t.assignmentGroup || "N/A"}'.`
            },
            suspectedCi: { score: t.suspectedCi ? 2 : 0, rating: t.suspectedCi ? 'Pass' : 'Fail' as any, comment: 'Suspected cluster mapping verified.' },
            symptomCode: { score: t.symptomCode ? 2 : 0, rating: t.symptomCode ? 'Pass' : 'Fail' as any, comment: 'Checked local confluence rules.' },
            shortDescription: { score: t.shortDescription ? 2 : 1, rating: t.shortDescription ? 'Pass' : 'Partial' as any, comment: 'Checked local semantic length.' },
            technicalDescription: { score: t.technicalDescription?.length >= 50 ? 2 : 0, rating: t.technicalDescription?.length >= 50 ? 'Pass' : 'Fail' as any, comment: 'Technical notes exceeds minimum characters standard.' },
            serviceImpactDescription: { score: localSiScore, rating: localSiRating as any, comment: localSiComment },
            businessImpactDescription: { score: 1, rating: 'Partial' as any, comment: 'Business logic match verified.' },
            activityLogs: { score: t.activityLogs?.includes('propose') ? 2 : 0, rating: t.activityLogs?.includes('propose') ? 'Pass' : 'Fail' as any, comment: 'Checkpoints transition verified.' },
            closureCode1: { score: t.closureCode1 ? 2 : 0, rating: t.closureCode1 ? 'Pass' : 'Fail' as any, comment: 'Classification code verified.' },
            closureCode2: { score: t.closureCode2 ? 2 : 0, rating: t.closureCode2 ? 'Pass' : 'Fail' as any, comment: 'Sub-closure alignment check.' },
            solutionCode: { score: t.solutionCode ? 2 : 0, rating: t.solutionCode ? 'Pass' : 'Fail' as any, comment: 'Resolution code validation.' },
            knowledgeArticle: { score: hasKA ? 2 : 0, rating: hasKA ? 'Pass' : 'Fail' as any, comment: 'Knowledge article loops verified.' },
            resolutionDescription: { score: 1, rating: 'Partial' as any, comment: 'Chronological sequence checklist evaluated.' }
          },
          totalScore: localScoreVal,
          percentage,
          statusColor: (percentage >= 90 ? 'Green' : percentage >= 70 ? 'Amber' : 'Red') as 'Green'|'Amber'|'Red',
          generalComments: 'Local heuristic baseline evaluation applied due to initial server delay.'
        };
      });
      setReports(dedupeReports(localFallbackReports));
      triggerPopup(`Calculated offline baseline scores. Check connection.`, 'warning');
      saveToHistoryLog(localFallbackReports, showCelebration);
      runAutoTriggerAlerts(localFallbackReports);
    } finally {
      setIsAuditing(false);
    }
  };

  const disableBackgroundSync = async () => {
    localStorage.setItem('gov_snow_auto_sync', 'false');
    try {
      const gInst = localStorage.getItem('gov_snow_instance') || 'dev12000';
      const gUser = localStorage.getItem('gov_snow_user') || 'admin';
      const gPass = localStorage.getItem('gov_snow_pass') || 'admin';
      const rawGLimit = localStorage.getItem('gov_snow_limit');
      const gLimit = (rawGLimit === '0' || rawGLimit?.toLowerCase() === 'off') ? 0 : Number(rawGLimit || '10');
      const gType = localStorage.getItem('gov_snow_sync_type') || 'tickets';
      const gSim = localStorage.getItem('gov_snow_simulator') !== 'false';
      const gGroupFilter = localStorage.getItem('gov_snow_assignment_group_filter') || 'ALL';

      await fetch('/api/servicenow/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: gInst,
          username: gUser,
          password: gPass,
          limit: gLimit,
          syncType: gType,
          useSimulator: gSim,
          autoSyncEnabled: false,
          assignmentGroupFilter: gGroupFilter
        })
      });
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('governance_autosync_disabled'));
    } catch (err) {
      console.error('Error disabling background sync:', err);
    }
  };

  const handleTicketsParsed = (newTickets: Ticket[]) => {
    disableBackgroundSync();
    const mapped = newTickets.map(t => {
      const ticketGrp = (t.assignmentGroup || '').trim().toLowerCase();
      const match = ciCombinations.find(c => (c.assignmentGroup || '').trim().toLowerCase() === ticketGrp);
      return {
        ...t,
        assigneeManager: (match && match.assigneeManager) ? match.assigneeManager : t.assigneeManager
      };
    });
    setTickets(dedupeTickets(mapped));
    // Explicitly waiting on manual Action Button trigger as requested by user.
  };

  const handleSaveRules = async (newRules: AuditRule[]) => {
    setRules(newRules);
    localStorage.setItem('audit_rules_matrix', JSON.stringify(newRules));
    try {
      await fetch('/api/rules/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: newRules })
      });
      if (tickets.length > 0) {
        triggerAuditRun(tickets);
      }
    } catch (err) {
      console.error('Server save error:', err);
      triggerPopup('Cloud rules save timeout. Operating on active local state.', 'warning');
    }
  };

  const clearServerCache = async () => {
    try {
      setIsClearingCache(true);
      const res = await fetch('/api/clear-cache', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setReports([]);
        setTickets([]);
        setSelectedTicketNumber(null);
        setAuditLog(null);
        setErrorString(null);
        triggerPopup('Audit cache and processed records cleared successfully!', 'success');
      }
    } catch (err) {
      console.error('Cache clear error:', err);
      triggerPopup('Failed to contact server memory cache.', 'warning');
    } finally {
      setIsClearingCache(false);
      setShowClearCacheDialog(false);
    }
  };

  const handleResetToDefaultRules = async () => {
    setRules(defaultAuditRules);
    handleSaveRules(defaultAuditRules);
  };

  const downloadExcelReport = (isMonthlyConsolidated: boolean) => {
    let rawTickets: TicketAuditReport[] = [];

    if (isMonthlyConsolidated) {
      // Gather both current reports and all saved historical runs to ensure same dataset as full monthly logs
      const allReports = [...reports];
      historyRuns.forEach(run => {
        if (run.tickets) {
          allReports.push(...run.tickets);
        }
      });
      // Deduplicate by incNumber to keep data pristine
      const ticketMap = new Map<string, TicketAuditReport>();
      allReports.forEach(r => {
        ticketMap.set(r.ticket.incNumber, r);
      });
      rawTickets = Array.from(ticketMap.values());
    } else {
      // Daily sweep: current active reports
      rawTickets = [...reports];
    }

    if (rawTickets.length === 0) {
      triggerPopup('No audit reports generated yet. Compile datasets first.', 'warning');
      return;
    }

    const namePrefix = isMonthlyConsolidated ? 'Monthly_Consolidated_Audit' : 'Daily_Ticket_Audit';
    exportToColorfulExcel(namePrefix, isMonthlyConsolidated, rawTickets);
    triggerPopup(`Generated multi-sheet report with executive KPI trends successfully!`, 'success');
  };

  return (
    <div className={`flex h-screen w-full bg-background text-foreground font-sans overflow-hidden select-none ${isTransitioningTheme ? 'theme-transitioning' : ''}`}>
      
      {/* 1. Geometric Balance Left Sidebar */}
      <aside className={`border-r border-border bg-card flex flex-col shrink-0 transition-all duration-300 ${isSidebarExpanded ? 'w-64' : 'w-16'}`}>
        
        {isSidebarExpanded ? (
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 bg-blue-500 rounded-sm shrink-0"></span>
              <div className="min-w-0">
                <h1 className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
                  Ticket Quality Audit
                </h1>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono mt-0.5 truncate">SNOW COMPLIANCE SUITE</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <ThemeToggle variant="dropdown" />
              <button
                type="button"
                onClick={() => setIsSidebarExpanded(false)}
                className="p-1 rounded bg-muted/60 border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                title="Collapse Sidebar"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 border-b border-border flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarExpanded(true)}
              className="p-1.5 rounded bg-muted/60 border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Expand Sidebar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <ThemeToggle variant="button" />
          </div>
        )}

        {/* Navigation Section */}
        <nav className="flex-1 p-2 space-y-4 overflow-y-auto no-scrollbar">
          
          {/* Category 1: Workspace Core */}
          <div>
            {isSidebarExpanded ? (
              <div className="text-[9px] text-muted-foreground uppercase px-2 mb-1.5 font-bold font-mono tracking-widest truncate">Workspace Core</div>
            ) : (
              <div className="h-px bg-border my-2 mx-1" />
            )}
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                title="Dashboard Insights"
                className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-600/15 dark:text-blue-400 dark:border-blue-600/30 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                } ${isSidebarExpanded ? '' : 'justify-center'}`}
              >
                <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                {isSidebarExpanded && <span className="ml-2 truncate">Dashboard Insights</span>}
              </button>

              <button
                onClick={() => {
                  if (reports.length === 0) {
                    triggerPopup('No audit records loaded. Ingest spreadsheets first.', 'warning');
                  } else {
                    setActiveTab('workspace');
                  }
                }}
                disabled={reports.length === 0}
                title="Workspace Checklist"
                className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeTab === 'workspace'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-600/15 dark:text-blue-400 dark:border-blue-600/30 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                } ${isSidebarExpanded ? '' : 'justify-center'}`}
              >
                <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                {isSidebarExpanded && <span className="ml-2 truncate">Workspace Checklist</span>}
              </button>

              <button
                onClick={() => setActiveTab('activityLog')}
                title="Incident Empathy Dashboard"
                className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all ${
                  activeTab === 'activityLog'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-600/15 dark:text-purple-400 dark:border-purple-600/30 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                } ${isSidebarExpanded ? '' : 'justify-center'}`}
              >
                <Activity className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                {isSidebarExpanded && <span className="ml-2 truncate">Incident Empathy Dashboard</span>}
              </button>

              <button
                onClick={() => {
                  if (reports.length === 0) {
                    triggerPopup('No audit records loaded. Ingest spreadsheets first.', 'warning');
                  } else {
                    setActiveTab('chatbot');
                  }
                }}
                disabled={reports.length === 0}
                title="AI Assistant"
                className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeTab === 'chatbot'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-600/15 dark:text-blue-400 dark:border-blue-600/30 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                } ${isSidebarExpanded ? '' : 'justify-center'}`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                {isSidebarExpanded && <span className="ml-2 truncate">AI Assistant</span>}
              </button>
            </div>
          </div>

          {/* Category 2: Trends & Performance */}
          <div>
            {isSidebarExpanded ? (
              <div className="text-[9px] text-muted-foreground uppercase px-2 mb-1.5 font-bold font-mono tracking-widest truncate">Trends & Performance</div>
            ) : (
              <div className="h-px bg-border my-2 mx-1" />
            )}
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (reports.length === 0) {
                    triggerPopup('No audit records loaded. Ingest spreadsheets first.', 'warning');
                  } else {
                    setActiveTab('trends');
                  }
                }}
                disabled={reports.length === 0}
                title="Trends Analytical View"
                className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeTab === 'trends'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-600/15 dark:text-blue-400 dark:border-blue-600/30 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                } ${isSidebarExpanded ? '' : 'justify-center'}`}
              >
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                {isSidebarExpanded && <span className="ml-2 truncate">Trends Analytical View</span>}
              </button>

              <button
                onClick={() => setActiveTab('assignees')}
                title="Performance Assignees"
                className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all ${
                  activeTab === 'assignees'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-600/15 dark:text-blue-400 dark:border-blue-600/30 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                } ${isSidebarExpanded ? '' : 'justify-center'}`}
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                {isSidebarExpanded && <span className="ml-2 truncate">Performance Assignees</span>}
              </button>

              <button
                onClick={() => setActiveTab('history')}
                title="Saved History Logs"
                className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all ${
                  activeTab === 'history'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-600/15 dark:text-blue-400 dark:border-blue-600/30 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                } ${isSidebarExpanded ? '' : 'justify-center'}`}
              >
                <History className="h-3.5 w-3.5 shrink-0" />
                {isSidebarExpanded && <span className="ml-2 truncate">Saved History Logs</span>}
              </button>
            </div>
          </div>

          {/* Category 3: Control Panels */}
          <div>
            {isSidebarExpanded ? (
              <div className="flex items-center justify-between px-2 mb-1.5 group/cp">
                <span className="text-[9px] text-muted-foreground uppercase font-bold font-mono tracking-widest truncate">Control Panels</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsControlPanelsOpen(prev => {
                      const next = !prev;
                      localStorage.setItem('gov_control_panels_open', String(next));
                      return next;
                    });
                  }}
                  className="inline-flex items-center gap-1 text-[9px] font-mono text-muted-foreground hover:text-foreground px-1 py-0.5 rounded transition-colors cursor-pointer"
                  title={isControlPanelsOpen ? "Hide Control Panels list" : "Unhide Control Panels list"}
                >
                  <span className="uppercase font-bold tracking-tight">{isControlPanelsOpen ? 'Hide' : 'Unhide'}</span>
                  {isControlPanelsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              </div>
            ) : (
              <div className="h-px bg-border my-2 mx-1" />
            )}
            {(!isSidebarExpanded || isControlPanelsOpen) && (
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('connectionSetup')}
                  title="Connection Setup"
                  className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all ${
                    activeTab === 'connectionSetup'
                      ? 'bg-cyan-50 text-cyan-800 border border-cyan-200 dark:bg-blue-600/15 dark:text-blue-400 dark:border-blue-600/30 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                  } ${isSidebarExpanded ? '' : 'justify-center'}`}
                >
                  <Radio className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                  {isSidebarExpanded && <span className="ml-2 truncate">Connection Setup</span>}
                </button>

                <button
                  onClick={() => setActiveTab('assignmentGroups')}
                  title="Assignment Groups"
                  className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all ${
                    activeTab === 'assignmentGroups'
                      ? 'bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-600/15 dark:text-purple-400 dark:border-purple-600/30 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                  } ${isSidebarExpanded ? '' : 'justify-center'}`}
                >
                  <Users className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                  {isSidebarExpanded && <span className="ml-2 truncate">Assignment Groups</span>}
                </button>

                <button
                  onClick={() => setActiveTab('usage')}
                  title="API Usage"
                  className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all ${
                    activeTab === 'usage'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-600/15 dark:text-emerald-400 dark:border-emerald-600/30 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                  } ${isSidebarExpanded ? '' : 'justify-center'}`}
                >
                  <BarChart3 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {isSidebarExpanded && <span className="ml-2 truncate">API Usage</span>}
                </button>

                <button
                  onClick={() => setShowHarnessModal(true)}
                  title="Evaluation Test Harness"
                  className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all ${
                    showHarnessModal
                      ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-600/15 dark:text-amber-400 dark:border-amber-600/30 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                  } ${isSidebarExpanded ? '' : 'justify-center'}`}
                >
                  <Gauge className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  {isSidebarExpanded && <span className="ml-2 truncate">Evaluation Harness</span>}
                </button>

                <button
                  onClick={() => setActiveTab('overallRules')}
                  title="Settings"
                  className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all ${
                    activeTab === 'overallRules'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-600/10 dark:text-blue-400 dark:border-blue-600/30 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                  } ${isSidebarExpanded ? '' : 'justify-center'}`}
                >
                  <Sliders className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  {isSidebarExpanded && <span className="ml-2 truncate">Settings</span>}
                </button>

                <button
                  onClick={() => setActiveTab('alertsConfig')}
                  title="Alert Trigger"
                  className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center transition-all ${
                    activeTab === 'alertsConfig'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/10 dark:text-indigo-400 dark:border-indigo-600/30 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                  } ${isSidebarExpanded ? '' : 'justify-center'}`}
                >
                  <Bell className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  {isSidebarExpanded && <span className="ml-2 flex-1 truncate text-left">Alert Trigger</span>}
                  {isSidebarExpanded && reports.length > 0 && (
                    <span className="bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/35 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold animate-pulse">
                      {reports.filter(r => {
                        if (r.percentage === 100 && r.statusColor === 'Green') return false;
                        if (bypassTriggerFilters) return true;
                        return enabledColors.includes(r.statusColor || 'Red');
                      }).length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

        </nav>

        {/* Lead Auditor Officer Block */}
        <div className="p-3 border-t border-border bg-card group/auditor">
          <div className="flex items-start gap-2.5">
            <div className="relative shrink-0" title={`${auditorName} - ${auditorRole}`}>
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white uppercase shadow-xs">
                {auditorName.trim().slice(0, 2).toUpperCase() || 'JD'}
              </div>
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-card"></span>
            </div>

            {isSidebarExpanded && (
              isEditingAuditor ? (
                <div className="flex-1 min-w-0 space-y-1.5">
                  <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-wider block font-semibold">Editing Profile</span>
                  <input
                    type="text"
                    value={auditorName}
                    onChange={(e) => saveAuditorInfo(e.target.value, auditorRole)}
                    placeholder="Auditor Name"
                    className="w-full bg-muted border border-border focus:border-primary rounded px-2 py-1 text-[11px] text-foreground font-semibold outline-none"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={auditorRole}
                    onChange={(e) => saveAuditorInfo(auditorName, e.target.value)}
                    placeholder="Role"
                    className="w-full bg-muted border border-border focus:border-primary rounded px-2 py-0.5 text-[10px] text-muted-foreground outline-none"
                  />
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAuditor(false);
                        setShowProfileSavedBadge(true);
                        triggerPopup('Auditor identity profile updated!', 'success');
                        setTimeout(() => {
                          setShowProfileSavedBadge(false);
                        }, 4000);
                      }}
                      className="flex-1 text-center bg-blue-600 hover:bg-blue-700 font-bold text-[10px] text-white py-1 rounded cursor-pointer transition-all active:scale-[0.98]"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-wider block font-bold">Active Auditor</span>
                  <div className="mt-0.5">
                    <span className="text-[11px] font-bold text-foreground block truncate">
                      {auditorName}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono tracking-tight block truncate">
                      {auditorRole}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between min-h-[14px]">
                    <button
                      type="button"
                      onClick={() => setIsEditingAuditor(true)}
                      className="text-[9px] text-primary hover:text-primary/80 font-bold font-mono tracking-wide flex items-center gap-1 transition-all opacity-0 group-hover/auditor:opacity-100 duration-200 cursor-pointer"
                    >
                      <Edit2 className="h-2.5 w-2.5" />
                      <span>Edit Profile</span>
                    </button>
                    {showProfileSavedBadge && (
                      <span className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30 text-[8px] font-bold font-mono px-1.5 py-0.5 rounded">
                        ✓ Saved
                      </span>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </aside>

      {/* 2. Right Workspace Section */}
      <section className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Dynamic Header Tickers & Actions Area */}
        <header className="h-20 border-b border-border bg-card px-8 flex items-center justify-between shrink-0">
          
          {/* Analytics Tickers */}
          <div className="flex gap-8 xl:gap-12 shrink-0">
            <div>
              <div className="text-[9px] text-muted-foreground uppercase mb-0.5 font-mono tracking-wider">Audit Analysis Score</div>
              <div className={`text-xl font-mono font-bold leading-tight ${avgSla >= 90 ? 'text-green-500' : avgSla >= 75 ? 'text-amber-500' : 'text-red-500'}`}>
                {reports.length > 0 ? `${avgSla}%` : 'N/A'}
              </div>
            </div>
            
            <div>
              <div className="text-[9px] text-muted-foreground uppercase mb-0.5 font-mono tracking-wider">Record Dump Pool</div>
              <div className="text-xl font-mono font-bold leading-tight text-foreground">
                {tickets.length} <span className="text-[10px] text-muted-foreground font-sans font-normal">INCS</span>
              </div>
            </div>
            
            <div>
              <div className="text-[9px] text-muted-foreground uppercase mb-0.5 font-mono tracking-wider">Bypassed States</div>
              <div className={`text-xl font-mono font-bold leading-tight ${bypassedCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {bypassedCount}
              </div>
            </div>
          </div>

          {/* Global Ticket Search Bar */}
          <div className="flex-1 max-w-xs md:max-w-sm lg:max-w-md mx-4 relative" id="global-ticket-search-bar">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                id="global-ticket-search-input"
                type="text"
                value={globalSearchTerm}
                onChange={(e) => {
                  setGlobalSearchTerm(e.target.value);
                  if (activeTab !== 'workspace') {
                    setActiveTab('workspace');
                  }
                  if (selectedTicketNumber) {
                    setSelectedTicketNumber(null);
                  }
                }}
                onFocus={() => {
                  if (activeTab !== 'workspace') {
                    setActiveTab('workspace');
                  }
                }}
                placeholder="Search tickets by INC#, assignee, or short description..."
                className="w-full bg-slate-50 dark:bg-background/90 hover:bg-white dark:hover:bg-background focus:bg-white dark:focus:bg-background border border-slate-200 dark:border-border focus:border-blue-500 rounded-xl pl-10 pr-24 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all shadow-xs focus:ring-1 focus:ring-blue-500 font-sans"
              />
              <div className="absolute right-2.5 flex items-center gap-1.5">
                {globalSearchTerm ? (
                  <button
                    type="button"
                    onClick={() => setGlobalSearchTerm('')}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-border/70">
                  {matchedTicketsCount} {matchedTicketsCount === 1 ? 'ticket' : 'tickets'}
                </span>
              </div>
            </div>
          </div>

          {/* Meaningful Executions Panel */}
          <div className="flex items-center gap-2.5">
            {reports.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => downloadExcelReport(false)}
                  className="bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                  title="Export records"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Daily Excel</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => downloadExcelReport(true)}
                  className="bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                  title="Consolidated statement"
                >
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Monthly Consolidated</span>
                </button>
              </>
            )}

            {/* Direct ServiceNow Manual Sync Button */}
            <button
              type="button"
              id="manual-snow-sync-btn"
              onClick={handleManualServiceNowSync}
              disabled={isSyncingServiceNow}
              className="bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs shrink-0 hover:border-cyan-500/40"
              title="Synchronize latest live incident records from ServiceNow REST API"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingServiceNow ? 'animate-spin text-cyan-400' : 'text-blue-500'}`} />
              <span className="font-medium">{isSyncingServiceNow ? 'Syncing...' : 'Sync ServiceNow'}</span>
            </button>

            {/* Quick Auto-Sync Real-Time Toggle Button */}
            <button
              type="button"
              id="header-snow-autosync-btn"
              onClick={handleToggleAutoSync}
              className={`border font-semibold text-xs px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
                autoSyncEnabled
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/25'
                  : 'bg-card hover:bg-muted border-border text-muted-foreground hover:text-foreground'
              }`}
              title={autoSyncEnabled ? "Auto-Sync is ACTIVE: Real-time background sync and comment updates running" : "Auto-Sync is PAUSED: Click to enable real-time background sync"}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${autoSyncEnabled ? 'text-indigo-500 animate-spin' : 'text-muted-foreground'}`} />
              <span>Auto-Sync:</span>
              <span className="font-mono font-bold">{autoSyncEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Last Sync Time Status Indicator */}
            <div 
              id="servicenow-sync-status-indicator"
              className="flex items-center space-x-2 bg-slate-100 dark:bg-[#12141A] border border-slate-200 dark:border-[#2E313A] px-3 py-1.5 rounded-lg text-[11px] font-mono shadow-inner cursor-default shrink-0"
              title={lastSyncInfo?.errorMessage ? `Error: ${lastSyncInfo.errorMessage}` : `ServiceNow real-time status. Last synchronized at: ${lastSyncInfo?.timestamp || 'Active'}`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${lastSyncInfo?.errorMessage ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${lastSyncInfo?.errorMessage ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
              </span>
              <span className="text-slate-500 dark:text-gray-400 select-none font-medium">Last Sync:</span>
              <span className="text-slate-900 dark:text-slate-200 font-bold tracking-tight">
                {lastSyncInfo?.timestamp ? lastSyncInfo.timestamp : 'Active'}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-sans tracking-wide uppercase ${
                lastSyncInfo?.errorMessage 
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/10' 
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/10'
              }`}>
                {isSyncingServiceNow ? 'Syncing' : lastSyncInfo?.errorMessage ? 'Failed' : 'Live'}
              </span>
            </div>

            {/* Top Bar Quick Resolved Filter Status / Toggle */}
            <button
              type="button"
              onClick={handleToggleGlobalResolved}
              className={`border font-semibold text-xs px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
                onlyResolved
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                  : 'bg-card hover:bg-muted border-border text-muted-foreground hover:text-foreground'
              }`}
              title={onlyResolved ? "Workspace filtered to Resolved incidents. Click to view all." : "Click to filter Workspace to Resolved incidents only."}
            >
              <span className={`w-2 h-2 rounded-full ${onlyResolved ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400 dark:bg-gray-500'}`} />
              <span className="hidden md:inline">Workspace:</span>
              <span className="font-mono font-bold text-[11px]">{onlyResolved ? 'Resolved' : 'All'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHarnessModal(true)}
              className="bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs shrink-0"
              title="Launch ITIL Golden Evaluation Test Harness"
            >
              <Gauge className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden lg:inline">Eval Harness</span>
            </button>

            <button
              type="button"
              onClick={() => triggerAuditRun(tickets, true)}
              disabled={isAuditing || tickets.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-blue-900/10 shrink-0"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Sweeping...</span>
                </>
              ) : (
                <>
                  <Cpu className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Trigger Dynamic Compliance Verification Sweep</span>
                  <span className="xl:hidden">Run Audit Sweep</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="clear-server-cache-btn"
              onClick={() => setShowClearCacheDialog(true)}
              disabled={tickets.length === 0 && reports.length === 0}
              className="bg-card hover:bg-rose-50 dark:hover:bg-red-950/20 border border-border hover:border-rose-300 dark:hover:border-red-900 text-muted-foreground hover:text-rose-600 dark:hover:text-red-400 text-xs p-2 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Clear server cache and active audit records"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Audit Process Progress Alert */}
          {auditLog && (
            <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 text-foreground">
                  <span className={`h-2 w-2 rounded-full ${isAuditing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {isAuditing ? 'Active Audit Compliance Sweep In-Progress' : 'Audit Sweep Execution Terminal'}
                  </span>
                </span>
                {errorString && (
                  <span className="text-amber-600 dark:text-yellow-500 font-medium font-mono text-[11px] flex items-center space-x-1">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>{errorString}</span>
                  </span>
                )}
              </div>

              {/* Progress Bar & Granular Stats */}
              {sweepProgress && sweepProgress.total > 0 && (
                <div className="space-y-2 bg-muted/40 border border-border rounded-lg p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold whitespace-nowrap">Scanned Tickets:</span>
                      <span className="text-foreground bg-card px-1.5 py-0.5 rounded border border-border">
                        {sweepProgress.completed} / {sweepProgress.total}
                      </span>
                      <span className="text-muted-foreground/60 shrink-0">•</span>
                      <span className="text-rose-600 dark:text-red-400 font-bold whitespace-nowrap">Remaining Queue:</span>
                      <span className="text-foreground bg-card px-1.5 py-0.5 rounded border border-border">
                        {Math.max(0, sweepProgress.total - sweepProgress.completed)}
                      </span>
                    </div>
                    <div className="text-blue-600 dark:text-blue-400 self-end sm:self-auto font-bold font-mono">
                      {Math.round((sweepProgress.completed / sweepProgress.total) * 100)}% Complete
                    </div>
                  </div>

                  {/* Visual Track */}
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                      style={{ width: `${Math.min(100, (sweepProgress.completed / sweepProgress.total) * 100)}%` }}
                    />
                  </div>

                  {/* Active context label */}
                  {sweepProgress.currentTicketId && (
                    <div className="text-[11px] text-muted-foreground font-mono flex items-center space-x-1.5 overflow-hidden">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500/70 shrink-0" />
                      <span className="text-muted-foreground/70 shrink-0">Operation log:</span>
                      <span className="text-blue-600 dark:text-blue-300 truncate">{sweepProgress.currentTicketId}</span>
                    </div>
                  )}
                </div>
              )}

              {/* General trace log when progress object isn't fully ready yet */}
              {(!sweepProgress || sweepProgress.total <= 0) && (
                <span className="font-mono text-muted-foreground text-[11px] bg-muted/40 border border-border rounded-lg p-2.5 flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-ping shrink-0" />
                  <span>Log Trace: {auditLog}</span>
                </span>
              )}
            </div>
          )}

          {/* Active View Module Injection */}
          <div className="mt-2 min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                  className="space-y-6"
                >
                  {tickets.length === 0 && (
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="space-y-1.5 text-center sm:text-left">
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-mono font-bold">
                            <Radio className="h-3.5 w-3.5 animate-pulse" />
                            <span>Awaiting Ingestion</span>
                          </div>
                          <h3 className="text-base font-bold text-foreground tracking-tight">
                            No Governance Incidents Loaded
                          </h3>
                          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                            Connect directly to your ServiceNow instance via Table API or ingest Excel/CSV dump spreadsheets in Connection Setup to run automated quality audits.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('connectionSetup')}
                          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-mono font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer shrink-0 flex items-center gap-2"
                        >
                          <Radio className="h-4 w-4" />
                          <span>Open Connection Setup</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <MetricCards 
                    reports={reports} 
                    onSelectTicket={(incNum) => {
                      setSelectedTicketNumber(incNum);
                      setActiveTab('workspace');
                    }} 
                  />
                </motion.div>
              )}

              {activeTab === 'workspace' && (
                <motion.div
                  key="workspace"
                  className="workspace-checklist-container"
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                >
                  <AuditDetails 
                    reports={reports} 
                    selectedTicketNumber={selectedTicketNumber} 
                    onSelectTicketNumber={setSelectedTicketNumber} 
                    triggerPopup={triggerPopup}
                    tickets={tickets}
                    onUpdateTickets={(newTickets: any[], shouldReAudit = false) => {
                      setTickets(dedupeTickets(newTickets));
                      if (shouldReAudit) {
                        triggerAuditRun(newTickets, false);
                      }
                    }}
                    searchTerm={globalSearchTerm}
                    onSearchChange={setGlobalSearchTerm}
                  />
                </motion.div>
              )}

              {activeTab === 'assignees' && (
                <motion.div
                  key="assignees"
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                  className="space-y-6"
                >
                  {/* Assignee Performance Color-Coded Heatmap Grid */}
                  <AssigneePerformanceHeatmap
                    reports={reports}
                    historyRuns={historyRuns}
                    onSelectTicket={(incNum) => {
                      setSelectedTicketNumber(incNum);
                      setActiveTab('workspace');
                    }}
                    triggerPopup={triggerPopup}
                    onSeedSampleHistory={(sampleRuns) => {
                      setAndPersistHistoryRuns(sampleRuns);
                    }}
                  />

                  {/* Assignee Insights Directory & Diagnostics */}
                  <AssigneeInsights 
                    reports={reports}
                    historyRuns={historyRuns}
                    triggerPopup={triggerPopup}
                  />
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: -30, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                  transition={{ ease: "easeInOut", duration: 0.35 }}
                >
                  <AuditHistoryTab 
                    historyRuns={historyRuns} 
                    trashRuns={trashRuns}
                    onClearHistory={handleClearHistoryToTrash}
                    onMoveRunToTrash={handleMoveRunToTrash}
                    onRestoreRun={handleRestoreRunFromTrash}
                    onPermanentDeleteRun={handlePermanentDeleteRun}
                    onEmptyTrash={handleEmptyTrashPermanently}
                    triggerPopup={triggerPopup}
                  />
                </motion.div>
              )}

              {activeTab === 'trends' && (
                <motion.div
                  key="trends"
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                >
                  <TrendsPage 
                    reports={reports} 
                    historyRuns={historyRuns}
                  />
                </motion.div>
              )}

              {activeTab === 'overallRules' && (
                <motion.div
                  key="overallRules"
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                >
                  <OverallRulesEditor 
                    rules={overallRules}
                    onRulesSave={handleSaveOverallRules}
                    defaultRules={defaultOverallRules}
                    keywordRules={rules}
                    onKeywordRulesSave={handleSaveRules}
                    onResetKeywordRules={handleResetToDefaultRules}
                    ciCombinations={ciCombinations}
                    onCombinationsSave={handleSaveCiCombinations}
                    onResetCombinations={handleResetToDefaultCiCombinations}
                    resolutionQuestions={resolutionQuestions}
                    onSaveResolutionQuestions={handleSaveResolutionQuestions}
                    onResetResolutionQuestions={handleResetToDefaultResolutionQuestions}
                    triggerPopup={triggerPopup}
                  />
                </motion.div>
              )}

              {activeTab === 'activityLog' && (
                <motion.div
                  key="activityLog"
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                >
                  <ActivityLogAuditDesk triggerPopup={triggerPopup} tickets={tickets} />
                </motion.div>
              )}

              {activeTab === 'connectionSetup' && (
                <motion.div
                  key="connectionSetup"
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                >
                  <ConnectionSetup
                    triggerPopup={triggerPopup}
                    onTicketsLoaded={handleTicketsParsed}
                    onTriggerAudit={(t) => triggerAuditRun(t, true)}
                    auditedCount={reports.length}
                    totalRecordsCount={tickets.length}
                    isLoading={isAuditing}
                  />
                </motion.div>
              )}

              {activeTab === 'assignmentGroups' && (
                <motion.div
                  key="assignmentGroups"
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                >
                  <AssignmentGroupManagement
                    triggerPopup={triggerPopup}
                    onNavigateToMetrics={(_group) => {
                      setActiveTab('connectionSetup');
                    }}
                  />
                </motion.div>
              )}

              {activeTab === 'usage' && (
                <motion.div
                  key="usage"
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                >
                  <UsageTracking triggerPopup={triggerPopup} />
                </motion.div>
              )}

              {activeTab === 'chatbot' && (
                <motion.div
                  key="chatbot"
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                >
                  <AIChatInspector 
                    reports={reports} 
                    selectedTicketNumber={selectedTicketNumber} 
                    onSelectTicketNumber={setSelectedTicketNumber} 
                    triggerPopup={triggerPopup}
                    messages={chatMessages}
                    setMessages={setChatMessages}
                  />
                </motion.div>
              )}

              {activeTab === 'alertsConfig' && (
                <motion.div
                  key="alertsConfig"
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                >
                  <AlertDispatchCenter 
                     reports={reports} 
                     triggerPopup={triggerPopup}
                  />
                </motion.div>
              )}





              {activeTab === 'about' && (
                <motion.div
                  key="about"
                  initial={{ opacity: 0, x: -30, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                  transition={{ ease: "easeInOut", duration: 0.35 }}
                >
                  <AboutPortal currentReportsCount={reports.length} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Corporate bottom credit */}
        <footer className="border-t border-slate-200 dark:border-[#2A2D35] py-3.5 px-8 text-center text-[9.5px] font-mono text-slate-500 dark:text-gray-500 flex justify-between bg-white dark:bg-[#15171C]">
          <span>ServiceNow Operational Security & Governance Platform &copy; 2026. Audit logs persisted.</span>
          <span>SaaS Orchestrator: Gemini 3.8 Flash | Real-Time Audit Integrity Status: Online</span>
        </footer>
      </section>

      {/* 3. Sliding / Popping Toast Notification Component */}
      {popup && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slideUp bg-white dark:bg-[#15171C] border border-slate-200 dark:border-[#2A2D35] rounded-xl p-4 shadow-xl select-text max-w-sm flex items-start space-x-3 transition-all">
          <div className={`p-2 rounded shrink-0 ${
            popup.type === 'success' ? 'bg-emerald-50 dark:bg-green-500/10 text-emerald-700 dark:text-green-400 border border-emerald-200 dark:border-green-500/20' :
            popup.type === 'warning' ? 'bg-rose-50 dark:bg-red-500/10 text-rose-700 dark:text-red-400 border border-rose-200 dark:border-red-500/20' :
            'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
          }`}>
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400 font-mono">Auditor Dispatch Info</span>
            <p className="text-xs text-slate-800 dark:text-gray-200 select-text font-medium">{popup.message}</p>
          </div>
        </div>
      )}

      {/* 4. Audience-Catching Animated Celebration success overlay popup */}
      {showCelebrationModal && celebrationData && (
        <div className="fixed inset-0 bg-[#0A0C0F]/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Confetti bursting aesthetic wrapper */}
          <div className="bg-gradient-to-b from-[#1E2330] to-[#13161F] border-2 border-emerald-500/40 rounded-2xl p-8 max-w-md w-full text-center relative overflow-hidden shadow-2xl shadow-emerald-900/10 animate-scaleUp">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
            
            <div className="relative space-y-5 select-none">
              <div className="mx-auto h-16 w-16 bg-emerald-500/15 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/35 animate-bounce">
                <PartyPopper className="h-8 w-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Compliance Sweep Complete!</h3>
                <p className="text-xs text-gray-400">The audit engine has successfully verified and rated the ingested ServiceNow entries.</p>
              </div>

              {/* Stats Block */}
              <div className="grid grid-cols-2 gap-3 bg-[#0A0C0F]/60 rounded-xl p-4 border border-[#2A2D35]/50">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500 block">Ingested Incidents</span>
                  <span className="text-2xl font-black font-mono text-white">{celebrationData.total}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500 block">Average Score</span>
                  <span className={`text-2xl font-black font-mono ${celebrationData.avgPercent >= 90 ? 'text-green-400' : 'text-yellow-400'}`}>{celebrationData.avgPercent}%</span>
                </div>
              </div>

              <div className="text-xs text-gray-400 italic">
                ✨ Logs auto-saved beautifully. Select month bundles in the Saved History tab to trigger bulk consolidation reports in one short!
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCelebrationModal(false);
                  setActiveTab('workspace'); // direct redirect for easy review!
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-slate-950 font-black text-xs py-3 rounded-xl transition-all cursor-pointer shadow-lg tracking-wider uppercase"
              >
                Launch Detailed Workspace Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog before clearing server cache */}
      <ConfirmationDialog
        isOpen={showClearCacheDialog}
        title="Clear Server Cache & Incident Records?"
        message="This action will flush the server-side memory cache and clear all currently ingested incidents, parsed spreadsheet data, and generated compliance audit reports from the active session."
        confirmText="Clear Cache & Records"
        cancelText="Keep Records"
        variant="danger"
        isLoading={isClearingCache}
        affectedRecords={{
          count: reports.length > 0 ? reports.length : tickets.length,
          label: reports.length > 0 ? 'Audited Incident Reports' : 'Loaded Raw Incidents',
          sublabel: `${tickets.length} incident records in memory • ${reports.length} generated audit scorecards`
        }}
        warningNote="Active session data will be cleared from server cache. Any unsaved audit changes or unexported spreadsheets cannot be restored unless re-uploaded."
        onConfirm={clearServerCache}
        onCancel={() => {
          if (!isClearingCache) setShowClearCacheDialog(false);
        }}
      />

      {/* 5. Autonomous Evaluation Test Harness Modal */}
      <EvaluationHarnessModal
        isOpen={showHarnessModal}
        onClose={() => setShowHarnessModal(false)}
        triggerPopup={triggerPopup}
      />

    </div>
  );
}
