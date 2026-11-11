export type CouncilMemberId = 'strategist' | 'athletic' | 'wellness' | 'architect' | 'philosopher';

export interface CouncilMember {
  id: CouncilMemberId;
  name: string;
  title: string;
  expertise: string;
  avatar: string;
  accentColor: string;
  bgGradient: string;
  personality: string;
  systemPromptAddition: string;
}

export type IntegrationSource = 'strava' | 'garmin' | 'calendar' | 'whoop' | 'notion';

export interface IntegrationState {
  id: IntegrationSource;
  name: string;
  iconName: string;
  category: 'fitness' | 'recovery' | 'productivity' | 'schedule';
  connected: boolean;
  lastSync: string;
  statusBadge: string;
  metricsSummary: {
    label: string;
    value: string;
    sublabel?: string;
    trend?: 'up' | 'down' | 'neutral';
    isWarning?: boolean;
  }[];
}

export interface FitnessMetric {
  date: string;
  activityName: string;
  source: 'strava' | 'garmin';
  type: 'Run' | 'Ride' | 'Strength' | 'Swim' | 'Rest';
  distanceKm?: number;
  durationMinutes: number;
  avgHeartRate?: number;
  calories: number;
  recoveryStressIndex: number; // 1-100
  vo2maxEstimate?: number;
}

export interface BiometricRecovery {
  sleepScore: number; // 0-100
  remHours: number;
  deepHours: number;
  totalSleepHours: number;
  restingHR: number; // bpm
  hrvStatus: number; // ms
  bodyBattery: number; // 0-100
  stressLevel: number; // 0-100
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:30"
  date: string;      // YYYY-MM-DD
  category: 'work' | 'workout' | 'deep_work' | 'personal' | 'wellness';
  color: string;
  isHighCognitiveLoad?: boolean;
  isAdjusted?: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  priority: 'p1' | 'p2' | 'p3';
  category: 'Career' | 'Health' | 'Personal' | 'Admin';
  completed: boolean;
  estimatedMinutes: number;
  alignedGoal?: string;
  councilRecommendation?: string;
}

export interface CouncilOpinion {
  counselorId: CouncilMemberId;
  perspective: string;
  concreteActions: string[];
  riskOrBlindspot: string;
}

export interface CouncilSession {
  id: string;
  query: string;
  timestamp: string;
  contextSummary: string;
  opinions: CouncilOpinion[];
  synthesis: {
    verdict: string;
    primaryActionPlan: string[];
    scheduleAdjustmentProposal?: string;
  };
}

export interface ImprovementInsight {
  id: string;
  area: 'Energy & Sleep' | 'Cardio Strain' | 'Time Fragmentation' | 'Deep Work vs Meetings' | 'Habit Alignment';
  severity: 'high' | 'medium' | 'info';
  title: string;
  description: string;
  recommendation: string;
  actionText?: string;
  actionPayload?: string;
}

export interface ScheduleAdjustmentOption {
  id: string;
  title: string;
  type: 'insert_buffer' | 'downscale_workout' | 'shift_meeting' | 'protect_focus';
  description: string;
  benefit: string;
  recommendedBy: CouncilMemberId;
  impactScore: '+15% Energy' | '+25% Focus' | 'Prevents Burnout' | '+35m Rest';
  eventPayload?: Partial<CalendarEvent>;
  modifiedEventId?: string;
  newTimeRange?: { startTime: string; endTime: string };
  applied: boolean;
}

export interface MorningBriefingData {
  greeting: string;
  readinessState: 'High Capacity' | 'Moderated Power' | 'Deliberate Recovery';
  overallScore: number;
  readinessTagline: string;
  biometricSummary: {
    bodyBattery: number;
    sleepScore: number;
    remDeepTotal: string;
    hrvBaselineStatus: string;
  };
  stravaPrescription: {
    plannedWorkout: string;
    scheduledTime: string;
    targetZone: string;
    coachNote: string;
  };
  calendarLoadSummary: {
    meetingCount: number;
    totalMeetingHours: number;
    focusBlocksCount: number;
    criticalHazard: string;
  };
  councilDirectives: {
    counselorId: CouncilMemberId;
    quote: string;
    keyRule: string;
  }[];
  proposedAdjustments: ScheduleAdjustmentOption[];
}
