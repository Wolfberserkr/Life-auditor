import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Plus, 
  AlertTriangle, 
  Flame, 
  ShieldCheck, 
  Sparkles,
  Zap,
  Tag,
  ArrowRight
} from 'lucide-react';
import { CalendarEvent, TaskItem, BiometricRecovery } from '../types';

interface TimeScheduleManagerProps {
  events: CalendarEvent[];
  tasks: TaskItem[];
  biometrics: BiometricRecovery;
  onAddTask: (task: Omit<TaskItem, 'id'>) => void;
  onToggleTask: (id: string) => void;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onOptimizeSchedule: () => void;
}

export const TimeScheduleManager: React.FC<TimeScheduleManagerProps> = ({
  events,
  tasks,
  biometrics,
  onAddTask,
  onToggleTask,
  onAddEvent,
  onOptimizeSchedule
}) => {
  // New task modal/inline form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<'Career' | 'Health' | 'Personal' | 'Admin'>('Career');
  const [taskPriority, setTaskPriority] = useState<'p1' | 'p2' | 'p3'>('p1');
  const [taskMinutes, setTaskMinutes] = useState(45);

  // New Event form
  const [eventTitle, setEventTitle] = useState('');
  const [eventStart, setEventStart] = useState('16:30');
  const [eventEnd, setEventEnd] = useState('17:15');
  const [eventCategory, setEventCategory] = useState<'work' | 'workout' | 'deep_work' | 'personal' | 'wellness'>('deep_work');
  const [showEventModal, setShowEventModal] = useState(false);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    onAddTask({
      title: taskTitle.trim(),
      dueDate: 'Today',
      priority: taskPriority,
      category: taskCategory,
      completed: false,
      estimatedMinutes: taskMinutes,
      councilRecommendation: 'Elena Rostova: Batched into your afternoon buffer block.'
    });
    setTaskTitle('');
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    onAddEvent({
      title: eventTitle.trim(),
      startTime: eventStart,
      endTime: eventEnd,
      date: '2026-11-11',
      category: eventCategory,
      color: eventCategory === 'workout' ? 'orange' : eventCategory === 'deep_work' ? 'indigo' : 'blue',
      isHighCognitiveLoad: eventCategory === 'deep_work'
    });
    setEventTitle('');
    setShowEventModal(false);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'deep_work':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'workout':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'wellness':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'personal':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-8">
      {/* Schedule Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Daily Task Velocity</span>
            <div className="text-2xl font-extrabold text-white mt-1">
              {completedCount} <span className="text-sm font-normal text-slate-500">/ {totalTasks} finished</span>
            </div>
            <div className="w-36 bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <span className="text-indigo-400 text-lg font-bold font-mono">{progressPct}%</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Cognitive Focus Reserves</span>
            <div className="text-2xl font-extrabold text-white mt-1">
              2.5 hrs <span className="text-xs font-normal text-emerald-400">Guarded Flow</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              Body Battery {biometrics.bodyBattery}/100 supports deep logic
            </span>
          </div>
          <Zap className="w-8 h-8 text-amber-400/80" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 block font-medium">Time Architecture</span>
            <button
              onClick={onOptimizeSchedule}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Auto-Align
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Council advises inserting a 15-min decompression gap before 14:00 roadmap review.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Calendar Timeline Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                Work Schedule & Time Blocks
              </h2>
              <span className="text-xs text-slate-400">Wednesday, November 11 • Synced with Google Calendar</span>
            </div>

            <button
              onClick={() => setShowEventModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Block Time
            </button>
          </div>

          {/* Timeline visualization */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 divide-y divide-slate-800/80 space-y-3">
            {events.map((event) => (
              <div key={event.id} className="pt-3 first:pt-0 flex items-start gap-4 group">
                {/* Time column */}
                <div className="w-24 text-right flex-shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-200 block">{event.startTime}</span>
                  <span className="text-[10px] text-slate-500 font-mono block">{event.endTime}</span>
                </div>

                {/* Event Card */}
                <div className={`flex-1 p-3.5 rounded-xl border transition-all ${getCategoryColor(event.category)}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-white">{event.title}</h4>
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-80">
                      {event.category.replace('_', ' ')}
                    </span>
                  </div>

                  {event.isHighCognitiveLoad && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-indigo-300 font-medium">
                      <ShieldCheck className="w-3 h-3 text-indigo-400" />
                      Council Shield: High-leverage decision block. Slack silenced.
                    </div>
                  )}

                  {event.category === 'workout' && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-orange-300">
                      <Flame className="w-3 h-3 text-orange-400" />
                      Strava Telemetry Target: Zone 2 aerobic pacing (below 135 bpm).
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Schedule Optimization Advice */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between">
            <div className="text-xs text-slate-300">
              <span className="font-bold text-indigo-300">Elena Rostova’s Time Audit: </span>
              Your afternoon block (14:00-16:15) leaves no transition space. A 10-minute micro-walk at 13:50 is inserted.
            </div>
          </div>
        </div>

        {/* Task Management Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Priority Directives
              </h2>
              <span className="text-xs text-slate-400">Aligned with Strategic Objectives</span>
            </div>
          </div>

          {/* Add task bar */}
          <form onSubmit={handleCreateTask} className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Add high-leverage task..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300"
                >
                  <option value="p1">P1 - Urgent/Critical</option>
                  <option value="p2">P2 - Important</option>
                  <option value="p3">P3 - Maintenance</option>
                </select>

                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300"
                >
                  <option value="Career">Career</option>
                  <option value="Health">Health</option>
                  <option value="Personal">Personal</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!taskTitle.trim()}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40"
              >
                Add Task
              </button>
            </div>
          </form>

          {/* Tasks List */}
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  task.completed
                    ? 'bg-slate-900/40 border-slate-800/40 opacity-50'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button className="mt-0.5 text-slate-400 hover:text-emerald-400 transition">
                    {task.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold ${task.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                        {task.title}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        task.priority === 'p1' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {task.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimatedMinutes} mins
                      </span>
                      <span>•</span>
                      <span>{task.category}</span>
                      {task.alignedGoal && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-400 truncate max-w-[130px]">{task.alignedGoal}</span>
                        </>
                      )}
                    </div>

                    {task.councilRecommendation && !task.completed && (
                      <div className="mt-2 text-[10px] bg-slate-950/80 p-2 rounded-lg text-slate-300 border border-slate-800/60 flex items-start gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>{task.councilRecommendation}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Block Time Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Block Time on Schedule</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Focus Block Title</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Deep Work: Refactor API endpoints"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">End Time</label>
                  <input
                    type="time"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Category</label>
                <select
                  value={eventCategory}
                  onChange={(e) => setEventCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="deep_work">Deep Work / Flow State</option>
                  <option value="workout">Workout / Athletic (Strava)</option>
                  <option value="work">Meetings & Collaboration</option>
                  <option value="wellness">Recovery & Downregulation</option>
                  <option value="personal">Personal Life</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                >
                  Save Time Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
