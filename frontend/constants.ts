import { CouncilMember, IntegrationState, CalendarEvent, TaskItem, BiometricRecovery, FitnessMetric, ImprovementInsight } from './types';

export const COUNCIL_MEMBERS: CouncilMember[] = [
  {
    id: 'strategist',
    name: 'Marcus Vance',
    title: 'Executive Strategist',
    expertise: 'High-leverage focus, ruthless prioritization, business & career impact',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    accentColor: '#6366f1',
    bgGradient: 'from-indigo-900/40 to-slate-900',
    personality: 'Pragmatic, sharp, focused on compounding leverage and eliminating non-essential noise.',
    systemPromptAddition: 'Act as Marcus Vance, a high-stakes executive strategist. Provide direct, ROI-driven, analytical counsel. Avoid fluff.'
  },
  {
    id: 'athletic',
    name: 'Coach Maya Chen',
    title: 'High-Performance & Endurance Lead',
    expertise: 'Garmin/Strava training load, periodization, cardiac strain, athletic endurance',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    accentColor: '#f97316',
    bgGradient: 'from-orange-900/40 to-slate-900',
    personality: 'Scientific, encouraging yet strict on overtraining, deeply attuned to heart rate zones and muscular adaptation.',
    systemPromptAddition: 'Act as Coach Maya Chen, elite athletic trainer and sports physiologist. Speak using sports science, VO2, HRV balance, and periodization.'
  },
  {
    id: 'wellness',
    name: 'Dr. Aris Thorne',
    title: 'Circadian & Neuro-Wellness Physician',
    expertise: 'Sleep architecture, nervous system downregulation, cortisol balance, longevity',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    accentColor: '#10b981',
    bgGradient: 'from-emerald-900/40 to-slate-900',
    personality: 'Calm, grounded, fiercely protective of deep sleep, parasympathetic recovery, and metabolic peace.',
    systemPromptAddition: 'Act as Dr. Aris Thorne, MD & neurobiologist. Evaluate mental and physical strain, sleep stages, and neuro-chemical pacing.'
  },
  {
    id: 'architect',
    name: 'Elena Rostova',
    title: 'Time Architect & Habit Systems',
    expertise: 'Calendar optimization, calendar defense, time-blocking, flow states',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    accentColor: '#0ea5e9',
    bgGradient: 'from-cyan-900/40 to-slate-900',
    personality: 'Architectural, rhythmic, passionate about protecting 90-minute ultradian flow cycles and context switching costs.',
    systemPromptAddition: 'Act as Elena Rostova, a master calendar and workflow architect. Focus on blocking, energy mapping throughout the day, and batching.'
  },
  {
    id: 'philosopher',
    name: 'Seneca Vance',
    title: 'Existential & Stoic Mentor',
    expertise: 'Long-term fulfillment, stoic perspective, burnout prevention, clarity of purpose',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    accentColor: '#8b5cf6',
    bgGradient: 'from-purple-900/40 to-slate-900',
    personality: 'Reflective, grounded in classic stoicism and modern intentional living. Challenges trivial anxiety with timeless perspective.',
    systemPromptAddition: 'Act as Seneca Vance, a stoic philosopher and wisdom counselor. Ask the vital question: Does this move your soul or merely keep you busy?'
  }
];

export const INITIAL_INTEGRATIONS: IntegrationState[] = [
  {
    id: 'strava',
    name: 'Strava',
    iconName: 'Flame',
    category: 'fitness',
    connected: true,
    lastSync: '12 mins ago',
    statusBadge: 'Synced',
    metricsSummary: [
      { label: 'Weekly Distance', value: '42.8 km', sublabel: '+14% vs last week', trend: 'up' },
      { label: 'Relative Effort', value: '184 pts', sublabel: 'Optimal load zone' }
    ]
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    iconName: 'Activity',
    category: 'recovery',
    connected: true,
    lastSync: '4 mins ago',
    statusBadge: 'Live Streaming',
    metricsSummary: [
      { label: 'Body Battery', value: '68 / 100', sublabel: 'Peak today: 82', trend: 'down' },
      { label: 'Resting HR', value: '49 bpm', sublabel: 'Athletic baseline' },
      { label: 'HRV Status', value: '64 ms', sublabel: 'Balanced (baseline 60-70)' }
    ]
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    iconName: 'Calendar',
    category: 'schedule',
    connected: true,
    lastSync: 'Just now',
    statusBadge: '2-way Active',
    metricsSummary: [
      { label: 'Meetings Today', value: '4 events', sublabel: '4.5 hrs total' },
      { label: 'Deep Focus Block', value: '2.5 hrs', sublabel: 'Morning slot guarded' }
    ]
  },
  {
    id: 'whoop',
    name: 'Sleep & Biometrics (Oura/Whoop)',
    iconName: 'Moon',
    category: 'recovery',
    connected: true,
    lastSync: 'Today at 06:45',
    statusBadge: 'Sleep Staged',
    metricsSummary: [
      { label: 'Sleep Score', value: '78 / 100', sublabel: '7h 14m total', trend: 'neutral' },
      { label: 'REM + Deep', value: '2h 55m', sublabel: '39% restorative' }
    ]
  },
  {
    id: 'notion',
    name: 'Notion & Task Hub',
    iconName: 'CheckSquare',
    category: 'productivity',
    connected: true,
    lastSync: '22 mins ago',
    statusBadge: 'Syncing',
    metricsSummary: [
      { label: 'Active Objectives', value: '3 Key Goals', sublabel: 'Q4 Product Sprint' },
      { label: 'Backlog Depth', value: '9 items', sublabel: '3 scheduled today' }
    ]
  }
];

export const INITIAL_BIOMETRICS: BiometricRecovery = {
  sleepScore: 78,
  remHours: 1.4,
  deepHours: 1.5,
  totalSleepHours: 7.23,
  restingHR: 49,
  hrvStatus: 64,
  bodyBattery: 68,
  stressLevel: 34
};

export const INITIAL_FITNESS_DATA: FitnessMetric[] = [
  { date: 'Mon', activityName: 'Tempo Run (Threshold)', source: 'strava', type: 'Run', distanceKm: 8.4, durationMinutes: 44, avgHeartRate: 154, calories: 540, recoveryStressIndex: 72, vo2maxEstimate: 51 },
  { date: 'Tue', activityName: 'Upper Body Hypertrophy', source: 'garmin', type: 'Strength', durationMinutes: 55, avgHeartRate: 122, calories: 360, recoveryStressIndex: 45 },
  { date: 'Wed', activityName: 'Zone 2 Aerobic Base', source: 'strava', type: 'Ride', distanceKm: 28.0, durationMinutes: 62, avgHeartRate: 132, calories: 510, recoveryStressIndex: 52 },
  { date: 'Thu', activityName: 'Rest & Mobility Drills', source: 'garmin', type: 'Rest', durationMinutes: 20, avgHeartRate: 88, calories: 75, recoveryStressIndex: 12 },
  { date: 'Fri', activityName: 'Interval Track Session (4x1km)', source: 'strava', type: 'Run', distanceKm: 9.2, durationMinutes: 50, avgHeartRate: 168, calories: 610, recoveryStressIndex: 88 },
  { date: 'Sat', activityName: 'Long Endurance Trail Run', source: 'strava', type: 'Run', distanceKm: 17.5, durationMinutes: 104, avgHeartRate: 144, calories: 1120, recoveryStressIndex: 82 },
  { date: 'Sun (Today)', activityName: 'Active Recovery Walk & Breathwork', source: 'garmin', type: 'Rest', durationMinutes: 35, avgHeartRate: 98, calories: 160, recoveryStressIndex: 22 }
];

export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'ev-1', title: 'Deep Work: Core Architecture Spec', startTime: '08:30', endTime: '10:30', date: '2026-11-11', category: 'deep_work', color: 'indigo', isHighCognitiveLoad: true },
  { id: 'ev-2', title: 'Product Leadership Sync', startTime: '11:00', endTime: '12:00', date: '2026-11-11', category: 'work', color: 'blue' },
  { id: 'ev-3', title: 'Zone 2 Easy Run (Strava Target)', startTime: '12:30', endTime: '13:15', date: '2026-11-11', category: 'workout', color: 'orange' },
  { id: 'ev-4', title: 'Cross-functional Roadmap Review', startTime: '14:00', endTime: '15:15', date: '2026-11-11', category: 'work', color: 'blue', isHighCognitiveLoad: true },
  { id: 'ev-5', title: 'Vendor & Budget Discussion', startTime: '15:30', endTime: '16:15', date: '2026-11-11', category: 'work', color: 'slate' },
  { id: 'ev-6', title: 'Evening Wind-Down & Reading', startTime: '21:00', endTime: '22:00', date: '2026-11-11', category: 'wellness', color: 'emerald' }
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Finalize Q1 Architecture Technical Brief',
    dueDate: 'Today (17:00)',
    priority: 'p1',
    category: 'Career',
    completed: false,
    estimatedMinutes: 90,
    alignedGoal: 'Ship Core Platform v2',
    councilRecommendation: 'Marcus Vance: Do during the 08:30 slot before your brain is cluttered by stakeholder Slack messages.'
  },
  {
    id: 'task-2',
    title: 'Hydration & Post-Run Electrolytes (600ml + Sodium)',
    dueDate: 'Today (13:30)',
    priority: 'p2',
    category: 'Health',
    completed: true,
    estimatedMinutes: 5,
    alignedGoal: 'Prevent mid-afternoon cognitive fatigue',
    councilRecommendation: 'Coach Maya: Essential today because of yesterday’s 17km trail fatigue.'
  },
  {
    id: 'task-3',
    title: 'Review 3 Engineering Pull Requests',
    dueDate: 'Today (16:30)',
    priority: 'p2',
    category: 'Career',
    completed: false,
    estimatedMinutes: 45,
    alignedGoal: 'Maintain team release cadence'
  },
  {
    id: 'task-4',
    title: 'Declutter Calendar: Decline low-leverage Friday 4pm committee',
    dueDate: 'Tomorrow',
    priority: 'p1',
    category: 'Admin',
    completed: false,
    estimatedMinutes: 10,
    councilRecommendation: 'Elena Rostova: Protect your Friday energy for deep retrospection.'
  },
  {
    id: 'task-5',
    title: 'Evening 20-min digital sunset (Blue-blockers + Kindle)',
    dueDate: 'Today (21:30)',
    priority: 'p3',
    category: 'Health',
    completed: false,
    estimatedMinutes: 20,
    councilRecommendation: 'Dr. Aris: Boost deep sleep phase from 1.5h to >1.8h.'
  }
];

export const INITIAL_INSIGHTS: ImprovementInsight[] = [
  {
    id: 'ins-1',
    area: 'Time Fragmentation',
    severity: 'high',
    title: 'Afternoon Context Switching Hazard',
    description: 'You have back-to-back 30-min meetings from 14:00 to 16:15 immediately after a cardio workout. Research shows a 25% drop in executive focus when transitioning directly from threshold heart-rate to high-stakes decision making without a 20-min buffer.',
    recommendation: 'Buffer 15 minutes between 13:45 and 14:00 for box breathing and cognitive transition. Shorten the Vendor call by 10 minutes.',
    actionText: 'Auto-adjust Calendar Buffers'
  },
  {
    id: 'ins-2',
    area: 'Cardio Strain',
    severity: 'medium',
    title: 'Garmin Training Load Spike',
    description: 'Your 7-day cumulative strain reached 1,420 (Optimal ceiling is 1,280). Your resting heart rate this morning was 49 bpm (slightly elevated compared to your 45 bpm baseline), indicating sympathetic nervous system carryover.',
    recommendation: 'Cap today’s Strava activity to strict Zone 1/2 recovery pace (below 135 bpm). Skip sprint finish.',
    actionText: 'Limit Workout to Zone 2'
  },
  {
    id: 'ins-3',
    area: 'Deep Work vs Meetings',
    severity: 'medium',
    title: 'Morning Golden Hour Guarded',
    description: 'Marcus & Elena observed: You reserved 08:30-10:30 for deep architectural thinking. Protect this block by setting Slack to "Do Not Disturb (Council Shield)".',
    recommendation: 'Enable Council Shield mode on connected apps.',
    actionText: 'Activate Focus Shield'
  }
];

export const SAMPLE_COUNCIL_QUESTIONS = [
  "Should I push through my hard tempo run today or do active recovery given my 78 sleep score and upcoming afternoon presentations?",
  "How should I reorganize my afternoon to avoid mental burnout between back-to-back roadmap meetings?",
  "I have 3 competing high-priority projects. How would the council triage them for maximum leverage?",
  "Looking at my weekly Garmin and calendar data, what is my biggest bottleneck to peak performance?"
];
