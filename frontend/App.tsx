import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Layers, 
  CalendarClock, 
  TrendingUp, 
  Cpu, 
  Sparkles, 
  Activity, 
  Moon, 
  BellRing,
  Sun,
  Flame,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { 
  INITIAL_INTEGRATIONS, 
  INITIAL_CALENDAR_EVENTS, 
  INITIAL_TASKS, 
  INITIAL_BIOMETRICS, 
  INITIAL_FITNESS_DATA, 
  INITIAL_INSIGHTS 
} from './constants';
import { 
  IntegrationState, 
  CalendarEvent, 
  TaskItem, 
  BiometricRecovery, 
  FitnessMetric, 
  ImprovementInsight,
  MorningBriefingData,
  ScheduleAdjustmentOption
} from './types';
import { IntegrationsHub } from './components/IntegrationsHub';
import { AdvisoryCouncilView } from './components/AdvisoryCouncilView';
import { TimeScheduleManager } from './components/TimeScheduleManager';
import { ImprovementAuditView } from './components/ImprovementAuditView';
import { MorningBriefingModal } from './components/MorningBriefingModal';
import { generateMorningBriefing } from './services/geminiService';

export default function App() {
  const [activeView, setActiveView] = useState<'council' | 'schedule' | 'integrations' | 'improvements'>('council');

  // Application Telemetry State
  const [integrations, setIntegrations] = useState<IntegrationState[]>(INITIAL_INTEGRATIONS);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(INITIAL_CALENDAR_EVENTS);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [biometrics, setBiometrics] = useState<BiometricRecovery>(INITIAL_BIOMETRICS);
  const [fitnessData, setFitnessData] = useState<FitnessMetric[]>(INITIAL_FITNESS_DATA);
  const [insights, setInsights] = useState<ImprovementInsight[]>(INITIAL_INSIGHTS);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Morning Briefing State
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [briefingData, setBriefingData] = useState<MorningBriefingData | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Initial Morning Briefing automatically on mount
  useEffect(() => {
    loadBriefing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBriefing = async () => {
    setIsLoadingBriefing(true);
    try {
      const data = await generateMorningBriefing({
        calendarEvents,
        tasks,
        biometrics,
        fitnessData
      });
      setBriefingData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  // Integration Handlers
  const handleToggleConnect = (id: string) => {
    setIntegrations(prev => prev.map(item => {
      if (item.id === id) {
        const nextState = !item.connected;
        showToast(nextState ? `Connected to ${item.name}` : `Disconnected ${item.name}`);
        return { ...item, connected: nextState };
      }
      return item;
    }));
  };

  const handleManualSync = (id: string) => {
    showToast(`Refreshed telemetry payload from ${id.toUpperCase()}`);
    setIntegrations(prev => prev.map(item => item.id === id ? { ...item, lastSync: 'Just now' } : item));
  };

  const handleSyncAll = () => {
    setIsSyncingAll(true);
    setTimeout(() => {
      setIsSyncingAll(false);
      setIntegrations(prev => prev.map(i => ({ ...i, lastSync: 'Just now' })));
      showToast('All 5 telemetry sources synced successfully!');
    }, 1200);
  };

  // Schedule & Tasks Handlers
  const handleAddTask = (newTask: Omit<TaskItem, 'id'>) => {
    const task: TaskItem = {
      ...newTask,
      id: 'task-' + Date.now()
    };
    setTasks(prev => [task, ...prev]);
    showToast(`Directive added: "${task.title.slice(0, 24)}..."`);
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddEvent = (newEvent: Omit<CalendarEvent, 'id'>) => {
    const ev: CalendarEvent = {
      ...newEvent,
      id: 'ev-' + Date.now()
    };
    setCalendarEvents(prev => [...prev, ev].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    showToast(`Time block reserved: ${ev.startTime} - ${ev.endTime}`);
  };

  const handleApplyScheduleAdjustment = (proposal: string) => {
    const bufferEvent: CalendarEvent = {
      id: 'buffer-' + Date.now(),
      title: 'Council Shield: Cognitive Transition & Box Breathing',
      startTime: '13:45',
      endTime: '14:00',
      date: '2026-11-11',
      category: 'wellness',
      color: 'emerald',
      isHighCognitiveLoad: false,
      isAdjusted: true
    };
    setCalendarEvents(prev => [...prev, bufferEvent].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    showToast('Applied Council buffer block (13:45-14:00) to calendar!');
  };

  const handleApplyAdjustmentOption = (adj: ScheduleAdjustmentOption) => {
    if (adj.type === 'insert_buffer') {
      const bufferEvent: CalendarEvent = {
        id: 'adj-buffer-' + Date.now(),
        title: 'Council Shield: Cognitive Decompression & Breathing Buffer',
        startTime: '13:45',
        endTime: '14:00',
        date: '2026-11-11',
        category: 'wellness',
        color: 'emerald',
        isHighCognitiveLoad: false,
        isAdjusted: true
      };
      setCalendarEvents(prev => [...prev, bufferEvent].sort((a, b) => a.startTime.localeCompare(b.startTime)));
      showToast('Inserted 13:45-14:00 Decompression Buffer into Google Calendar');
    } else if (adj.type === 'downscale_workout') {
      setCalendarEvents(prev => prev.map(ev => {
        if (ev.category === 'workout') {
          return {
            ...ev,
            title: 'Strava: Zone 2 Active Recovery Run (<135 bpm)',
            endTime: '13:05',
            isAdjusted: true
          };
        }
        return ev;
      }));
      showToast('Updated 12:30 workout: Capped to Zone 2 Recovery (<135 bpm)');
    } else if (adj.type === 'protect_focus') {
      setCalendarEvents(prev => prev.map(ev => {
        if (ev.category === 'deep_work') {
          return {
            ...ev,
            title: '🛡️ Council Shield: Core Architecture Spec (DND Active)',
            isHighCognitiveLoad: true,
            isAdjusted: true
          };
        }
        return ev;
      }));
      showToast('Council Focus Shield activated on 08:30 morning block');
    }
  };

  const handleApplyAllAdjustments = (adjustments: ScheduleAdjustmentOption[]) => {
    adjustments.forEach(adj => handleApplyAdjustmentOption(adj));
    showToast(`Enacted ${adjustments.length} schedule optimizations across calendar & workouts!`);
  };

  const handleOptimizeSchedule = () => {
    handleApplyScheduleAdjustment('Auto-buffered transition slots.');
  };

  const handleApplyInsightAction = (insightId: string) => {
    showToast('Prescription enacted. Updated active protocols.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          {toastMessage}
        </div>
      )}

      {/* Main Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base tracking-tight">CouncilOS</span>
                <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-1.5 py-0.2 rounded border border-indigo-500/30">
                  LIFE ASSISTANT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Advisory Counsel • Multi-App Telemetry (Strava, Garmin, GCal)
              </p>
            </div>
          </div>

          {/* Center/Right Actions: Morning Briefing Trigger Button & Navigation Tabs */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Morning Briefing Launch Button */}
            <button
              onClick={() => setIsBriefingOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition"
            >
              <Sun className="w-4 h-4 animate-spin-slow" />
              <span className="hidden sm:inline">Morning Briefing</span>
              <span className="sm:hidden">Briefing</span>
            </button>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveView('council')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition ${
                  activeView === 'council'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Advisory Council</span>
                <span className="sm:hidden">Council</span>
              </button>

              <button
                onClick={() => setActiveView('schedule')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition ${
                  activeView === 'schedule'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarClock className="w-4 h-4" />
                <span className="hidden sm:inline">Time & Schedule</span>
                <span className="sm:hidden">Schedule</span>
              </button>

              <button
                onClick={() => setActiveView('integrations')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition ${
                  activeView === 'integrations'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">App Integrations</span>
                <span className="sm:hidden">Apps</span>
              </button>

              <button
                onClick={() => setActiveView('improvements')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition ${
                  activeView === 'improvements'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Audit & Improvements</span>
                <span className="sm:hidden">Audits</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Morning Quick Glance Banner */}
      <div className="bg-slate-900/60 border-b border-slate-800/60 px-4 sm:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4 overflow-x-auto py-0.5">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Wednesday 07:58 AM
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <Activity className="w-3.5 h-3.5" />
              Garmin Body Battery: 68/100
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="flex items-center gap-1 text-orange-400">
              <Flame className="w-3.5 h-3.5" />
              Strava: 12:30 Zone 2 Run
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="flex items-center gap-1 text-blue-400">
              <Calendar className="w-3.5 h-3.5" />
              {calendarEvents.length} Calendar Blocks
            </span>
          </div>

          <button
            onClick={() => setIsBriefingOpen(true)}
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 whitespace-nowrap"
          >
            Open Council Daily Briefing →
          </button>
        </div>
      </div>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6">
        {activeView === 'council' && (
          <AdvisoryCouncilView
            calendarEvents={calendarEvents}
            tasks={tasks}
            biometrics={biometrics}
            fitnessData={fitnessData}
            onApplyScheduleAdjustment={handleApplyScheduleAdjustment}
          />
        )}

        {activeView === 'schedule' && (
          <TimeScheduleManager
            events={calendarEvents}
            tasks={tasks}
            biometrics={biometrics}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onAddEvent={handleAddEvent}
            onOptimizeSchedule={handleOptimizeSchedule}
          />
        )}

        {activeView === 'integrations' && (
          <IntegrationsHub
            integrations={integrations}
            onToggleConnect={handleToggleConnect}
            onManualSync={handleManualSync}
            isSyncingAll={isSyncingAll}
            onSyncAll={handleSyncAll}
          />
        )}

        {activeView === 'improvements' && (
          <ImprovementAuditView
            insights={insights}
            biometrics={biometrics}
            fitnessData={fitnessData}
            onApplyInsightAction={handleApplyInsightAction}
          />
        )}
      </main>

      {/* Interactive Morning Briefing Modal */}
      <MorningBriefingModal
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        briefing={briefingData}
        isLoading={isLoadingBriefing}
        onRegenerate={loadBriefing}
        onApplyAdjustment={handleApplyAdjustmentOption}
        onApplyAllAdjustments={handleApplyAllAdjustments}
        calendarEvents={calendarEvents}
      />

      {/* Footer Info */}
      <footer className="border-t border-slate-900 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CouncilOS • Powered by Gemini 2.5 Flash Deliberative Reasoning Engine</span>
          <span className="text-slate-600">
            Realtime Telemetry: Strava API • Garmin Connect • Google Calendar • Sleep Metrics
          </span>
        </div>
      </footer>
    </div>
  );
}
