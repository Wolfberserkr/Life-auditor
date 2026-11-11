import { GoogleGenAI } from '@google/genai';
import { 
  CouncilMember, 
  CouncilSession, 
  CalendarEvent, 
  TaskItem, 
  BiometricRecovery, 
  FitnessMetric,
  MorningBriefingData,
  ScheduleAdjustmentOption
} from '../types';
import { COUNCIL_MEMBERS } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export interface AdvisoryContext {
  calendarEvents: CalendarEvent[];
  tasks: TaskItem[];
  biometrics: BiometricRecovery;
  fitnessData: FitnessMetric[];
}

export async function consultTheCouncil(
  userQuery: string,
  context: AdvisoryContext,
  selectedCouncilors?: CouncilMember[]
): Promise<CouncilSession> {
  const activeCouncil = selectedCouncilors && selectedCouncilors.length > 0 
    ? selectedCouncilors 
    : COUNCIL_MEMBERS;

  const councilContextBrief = `
CURRENT USER TELEMETRY & CONTEXT (Realtime sync from Strava, Garmin, Google Calendar, Whoop):
- Biometrics Recovery: Sleep Score ${context.biometrics.sleepScore}/100, Total Sleep ${context.biometrics.totalSleepHours}h (REM: ${context.biometrics.remHours}h, Deep: ${context.biometrics.deepHours}h), Body Battery ${context.biometrics.bodyBattery}/100, Resting HR ${context.biometrics.restingHR}bpm, HRV Status ${context.biometrics.hrvStatus}ms, Stress Level ${context.biometrics.stressLevel}%.
- Scheduled Today: ${context.calendarEvents.map(e => `${e.startTime}-${e.endTime} ${e.title} [${e.category}]`).join('; ')}
- Pending High-Priority Tasks: ${context.tasks.filter(t => !t.completed).map(t => `${t.title} (${t.priority}, ${t.estimatedMinutes}m)`).join('; ')}
- Recent Training Load: Past 7 days includes ${context.fitnessData.map(f => `${f.date}: ${f.activityName} (${f.durationMinutes}m, stress index ${f.recoveryStressIndex})`).join('; ')}

USER'S INQUIRY TO THE ADVISORY COUNCIL:
"${userQuery}"

COUNCIL MEMBERS SEATED AT THE TABLE:
${activeCouncil.map(m => `- ${m.name} (${m.title}, Id: ${m.id}): ${m.personality} Focus: ${m.expertise}`).join('\n')}
`;

  const systemInstruction = `You are CouncilOS, the orchestrator of an elite personal Advisory Council.
The user has assembled a multi-disciplinary board of advisors who inspect their real-time calendar, Strava/Garmin physiological data, and workload to give holistic, multi-faceted life advice.

You must respond strictly in JSON matching the schema below.
For each seated counselor (${activeCouncil.map(m => m.id).join(', ')}):
1. Provide their unique, authentic perspective speaking in their specific domain voice.
2. Provide 2-3 concrete bullet actions.
3. Identify 1 blindspot or risk they see.

Then provide an executive 'synthesis' combining their wisdom into an actionable verdict, a primary prioritized action plan (3-4 points), and a concrete schedule adjustment proposal.`;

  try {
    const prompt = `Please deliberate as the Advisory Council on the user's situation and return a JSON object with this exact shape:
{
  "contextSummary": "One concise paragraph summarizing the user's physical and calendar tension",
  "opinions": [
    {
      "counselorId": "strategist",
      "perspective": "counselor detailed perspective...",
      "concreteActions": ["action 1", "action 2"],
      "riskOrBlindspot": "blindspot identified..."
    }
  ],
  "synthesis": {
    "verdict": "Clear bold synthesis recommendation",
    "primaryActionPlan": ["Step 1", "Step 2", "Step 3"],
    "scheduleAdjustmentProposal": "Specific recommendation for how to shift their calendar or tasks today"
  }
}

Councilors required in 'opinions': ${JSON.stringify(activeCouncil.map(m => m.id))}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: councilContextBrief },
            { text: prompt }
          ]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    });

    const rawText = response.text?.trim() || '{}';
    const parsed = JSON.parse(rawText);

    return {
      id: 'session-' + Date.now(),
      query: userQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextSummary: parsed.contextSummary || 'Synthesized across biometric and calendar telemetry.',
      opinions: parsed.opinions || activeCouncil.map(c => ({
        counselorId: c.id,
        perspective: `${c.name} suggests balancing current strain with today's intellectual output.`,
        concreteActions: ['Protect your morning deep work block', 'Keep hydration in check'],
        riskOrBlindspot: 'Risk of afternoon cognitive cliff if transitions are rushed.'
      })),
      synthesis: parsed.synthesis || {
        verdict: 'Maintain disciplined morning output, protect Zone 2 cardio limits, and streamline meetings.',
        primaryActionPlan: [
          'Execute the deep architecture session without distraction',
          'Downshift running intensity to stay under 135 bpm',
          'Buffer 15 minutes before high-stakes reviews'
        ],
        scheduleAdjustmentProposal: 'Shift afternoon vendor call back by 15 minutes to guarantee a mental reset.'
      }
    };
  } catch (err) {
    console.warn('Fallback to local intelligence generator:', err);
    return generateFallbackCouncilSession(userQuery, activeCouncil, context);
  }
}

export async function generateMorningBriefing(context: AdvisoryContext): Promise<MorningBriefingData> {
  const prompt = `
Context:
- Overnight Garmin: Sleep score ${context.biometrics.sleepScore}/100, Total ${context.biometrics.totalSleepHours}h (Deep: ${context.biometrics.deepHours}h, REM: ${context.biometrics.remHours}h), Body Battery ${context.biometrics.bodyBattery}/100, Resting HR ${context.biometrics.restingHR}bpm, HRV ${context.biometrics.hrvStatus}ms.
- Strava Training Schedule: Today's workout scheduled is Zone 2 Easy Run at 12:30 (45m). Past 7-day strain: 184 pts (heavy).
- Google Calendar Schedule: ${context.calendarEvents.map(e => `${e.startTime}-${e.endTime} ${e.title} (${e.category})`).join(', ')}.

Generate a comprehensive Morning Briefing from the Advisory Board. 
Return STRICT JSON adhering to this structure:
{
  "greeting": "Good morning. Council is seated.",
  "readinessState": "High Capacity" | "Moderated Power" | "Deliberate Recovery",
  "overallScore": 82,
  "readinessTagline": "Strong cognitive reserves, but sympathetic nervous carryover dictates Zone 2 pacing.",
  "biometricSummary": {
    "bodyBattery": 68,
    "sleepScore": 78,
    "remDeepTotal": "2h 55m",
    "hrvBaselineStatus": "64ms (Balanced Baseline)"
  },
  "stravaPrescription": {
    "plannedWorkout": "Zone 2 Easy Run (Strava Target)",
    "scheduledTime": "12:30 - 13:15",
    "targetZone": "Zone 2 (Strictly <135 bpm)",
    "coachNote": "Cap cadence and ignore PR chasing; preserve glycogen for the 14:00 review."
  },
  "calendarLoadSummary": {
    "meetingCount": 4,
    "totalMeetingHours": 4.5,
    "focusBlocksCount": 1,
    "criticalHazard": "Immediate transition from 13:15 workout finish into 14:00 leadership review."
  },
  "councilDirectives": [
    {
      "counselorId": "strategist",
      "quote": "Direct quote from Marcus...",
      "keyRule": "Rule 1"
    },
    {
      "counselorId": "athletic",
      "quote": "Direct quote from Coach Maya...",
      "keyRule": "Rule 2"
    },
    {
      "counselorId": "wellness",
      "quote": "Direct quote from Dr. Aris...",
      "keyRule": "Rule 3"
    },
    {
      "counselorId": "architect",
      "quote": "Direct quote from Elena...",
      "keyRule": "Rule 4"
    }
  ],
  "proposedAdjustments": [
    {
      "id": "adj-buffer",
      "title": "Insert 15-min Physiological Decompression Buffer",
      "type": "insert_buffer",
      "description": "Insert a 13:45-14:00 mindfulness buffer before the Cross-functional Roadmap Review.",
      "benefit": "Prevents sympathetic nervous carryover into high-stakes leadership calls.",
      "recommendedBy": "wellness",
      "impactScore": "+25% Focus"
    },
    {
      "id": "adj-workout",
      "title": "Downshift Strava Workout to Active Recovery Pace",
      "type": "downscale_workout",
      "description": "Lock heart-rate ceiling to 132 bpm and shorten run by 10 minutes (12:30-13:05).",
      "benefit": "Protects glycogen stores and avoids post-lunch cognitive brain fog.",
      "recommendedBy": "athletic",
      "impactScore": "+15% Energy"
    },
    {
      "id": "adj-focus",
      "title": "Activate Council Shield on Morning Deep Work",
      "type": "protect_focus",
      "description": "Mute notifications and lock 08:30-10:30 Architecture Spec from external interruptions.",
      "benefit": "Capitalizes on your 68 Body Battery peak before afternoon meeting decay.",
      "recommendedBy": "strategist",
      "impactScore": "Prevents Burnout"
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are the CouncilOS Morning Briefing synthesizer. Blend Garmin sleep, Strava fatigue, and Google Calendar into a crisp, authoritative morning game plan.',
        responseMimeType: 'application/json',
        temperature: 0.5
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    if (parsed.greeting && parsed.councilDirectives) {
      return {
        ...parsed,
        proposedAdjustments: (parsed.proposedAdjustments || []).map((adj: any) => ({
          ...adj,
          applied: false
        }))
      };
    }
    return getFallbackMorningBriefing(context);
  } catch (err) {
    console.warn('Using fallback morning briefing:', err);
    return getFallbackMorningBriefing(context);
  }
}

function getFallbackMorningBriefing(context: AdvisoryContext): MorningBriefingData {
  return {
    greeting: "Good morning. The Council has convened.",
    readinessState: "Moderated Power",
    overallScore: 78,
    readinessTagline: "Solid 78% restorative sleep; however, high cumulative Strava strain requires defensive afternoon pacing.",
    biometricSummary: {
      bodyBattery: context.biometrics.bodyBattery,
      sleepScore: context.biometrics.sleepScore,
      remDeepTotal: `${(context.biometrics.deepHours + context.biometrics.remHours).toFixed(1)} hrs`,
      hrvBaselineStatus: `${context.biometrics.hrvStatus} ms (Balanced)`
    },
    stravaPrescription: {
      plannedWorkout: "Zone 2 Aerobic Maintenance (Strava Target)",
      scheduledTime: "12:30 - 13:15",
      targetZone: "Zone 2 (<135 bpm)",
      coachNote: "Prioritize oxygenation over pace. Yesterday's trail run left muscular micro-fatigue."
    },
    calendarLoadSummary: {
      meetingCount: context.calendarEvents.filter(e => e.category === 'work').length,
      totalMeetingHours: 4.25,
      focusBlocksCount: 1,
      criticalHazard: "Only 45 minutes between workout cooldown and the high-cognitive roadmap review."
    },
    councilDirectives: [
      {
        counselorId: "strategist",
        quote: "Your highest leverage asset today is the 08:30 architecture block. Treat Slack as radio silence until 10:30.",
        keyRule: "Defend Morning Flow"
      },
      {
        counselorId: "athletic",
        quote: "Keep your heart rate below 135 bpm on today's run. Today is an aerobic foundation deposit, not a withdrawal.",
        keyRule: "Zone 2 Ceiling"
      },
      {
        counselorId: "wellness",
        quote: "Hydrate with sodium electrolytes immediately at 13:15 to blunt the afternoon cortisol spike.",
        keyRule: "Electrolyte Protocol"
      },
      {
        counselorId: "architect",
        quote: "Your schedule is too tight at 13:45. Insert a 15-minute white-space buffer before stakeholder calls.",
        keyRule: "Calendar Defense"
      }
    ],
    proposedAdjustments: [
      {
        id: "adj-buffer",
        title: "Insert 15-min Cognitive Decompression Buffer (13:45 - 14:00)",
        type: "insert_buffer",
        description: "Carve out a dedicated 15-minute buffer between post-run cooldown and the 14:00 roadmap review.",
        benefit: "Lowers heart rate by 20 bpm and resets working memory.",
        recommendedBy: "wellness",
        impactScore: "+25% Focus",
        applied: false
      },
      {
        id: "adj-workout",
        title: "Cap Strava Workout to Strict 35-min Recovery Pace",
        type: "downscale_workout",
        description: "Shorten 12:30 run to 35 mins (12:30-13:05) and enforce sub-135 bpm threshold.",
        benefit: "Prevents acute glycogen depletion before afternoon presentations.",
        recommendedBy: "athletic",
        impactScore: "+15% Energy",
        applied: false
      },
      {
        id: "adj-focus",
        title: "Activate Council Shield on 08:30 Architecture Spec",
        type: "protect_focus",
        description: "Mark morning block as High Cognitive Load and guard against last-minute invites.",
        benefit: "Guarantees 120 minutes of uninterrupted strategic output.",
        recommendedBy: "strategist",
        impactScore: "Prevents Burnout",
        applied: false
      }
    ]
  };
}

export async function generateDailyImprovementAudit(context: AdvisoryContext): Promise<string> {
  try {
    const prompt = `Analyze this telemetry:
Sleep: ${context.biometrics.sleepScore}/100, Body battery: ${context.biometrics.bodyBattery}, Meetings count: ${context.calendarEvents.length}, Pending tasks: ${context.tasks.filter(t => !t.completed).length}.
Give a 3-bullet hyper-practical executive improvement memo on:
1. Physical Energy Conservation
2. Calendar Defense
3. Daily Task Realignment`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are the CouncilOS Chief of Staff. Be concise, sharp, high-agency and encouraging.',
        temperature: 0.4
      }
    });

    return response.text || 'Daily audit processed. Focus on cognitive preservation and zone 2 pacing.';
  } catch (e) {
    return `• Energy: Your 68% body battery gives you ~4 hours of peak cognitive reserves. Save them for architecture work.\n• Calendar: Condense the 14:00-16:15 meeting run with a 10-minute micro-walk.\n• Tasks: Defer non-critical admin tasks to preserve mental bandwidth.`;
  }
}

function generateFallbackCouncilSession(
  query: string,
  council: CouncilMember[],
  context: AdvisoryContext
): CouncilSession {
  const opinions = council.map(m => {
    if (m.id === 'strategist') {
      return {
        counselorId: m.id,
        perspective: `From a strategic perspective, your scarce asset today is not time, but high-quality decision stamina. Your calendar is front-loaded with critical technical work. Defend the first 3 hours at all costs.`,
        concreteActions: [
          'Treat 08:30-10:30 as a zero-interruption bunker',
          'Delegate or async-summarize the vendor budget discussion'
        ],
        riskOrBlindspot: 'Saying yes to ad-hoc syncs after 14:00 will blow up your output.'
      };
    }
    if (m.id === 'athletic') {
      return {
        counselorId: m.id,
        perspective: `Your Strava 7-day cumulative strain is nearing an overreaching peak (184 pts). With a resting heart rate of 49 bpm and Body Battery at 68, today must be an active recovery or Zone 2 aerobic maintenance day.`,
        concreteActions: [
          'Cap running heart rate strictly at 135 bpm',
          'Include 10 minutes of ankle & hip mobility work post-run'
        ],
        riskOrBlindspot: 'Trying to hit personal records when your HRV has dipped below 65ms.'
      };
    }
    if (m.id === 'wellness') {
      return {
        counselorId: m.id,
        perspective: `Your sleep scored 78 with 1.4h REM. That is solid, but your sympathetic nervous system is showing carryover stress from the weekend. You need parasympathetic activation between meetings.`,
        concreteActions: [
          'Perform 3 minutes of physiological sighs (double inhale, slow exhale) before the 14:00 meeting',
          'No caffeine consumption after 13:30 today'
        ],
        riskOrBlindspot: 'Using stimulants to power through the 15:30 energy trough.'
      };
    }
    if (m.id === 'architect') {
      return {
        counselorId: m.id,
        perspective: `Your schedule currently allows no white-space between 14:00 and 16:15. In time-architecture, this is known as cognitive congestion. Each context switch incurs an average 23-minute focus penalty.`,
        concreteActions: [
          'Trim 5 minutes off the 11:00 sync to allow biological reset',
          'Batch all email and PR reviews strictly into 16:30-17:15'
        ],
        riskOrBlindspot: 'Letting meetings spill over into your evening workout window.'
      };
    }
    return {
      counselorId: m.id,
      perspective: `Seneca reminded us that "It is not that we have a short time to live, but that we waste a lot of it." Reflect on whether today's busyness is driving true mastery or just momentary noise.`,
      concreteActions: [
        'Ask yourself: If I only finished one thing today, which would truly matter in 6 months?',
        'Take 5 minutes at twilight without devices to pause'
      ],
      riskOrBlindspot: 'Equating a packed calendar with a meaningful life.'
    };
  });

  return {
    id: 'session-' + Date.now(),
    query,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    contextSummary: `Synthesized analysis based on ${context.biometrics.sleepScore}% sleep, ${context.calendarEvents.length} calendar events, and active Strava training strain.`,
    opinions,
    synthesis: {
      verdict: 'Protect the morning architecture block, downscale today’s Strava session to strict Zone 2 recovery, and insert a 15-minute decompression cushion before afternoon leadership meetings.',
      primaryActionPlan: [
        'Engage full focus shield for 08:30-10:30 deep work',
        'Cap run heart-rate at 135 bpm to protect tomorrow’s energy',
        'Insert 15-minute white-space at 13:45 to avert cognitive cliff',
        'Batch PR reviews and admin at 16:30'
      ],
      scheduleAdjustmentProposal: 'Push 14:00 meeting start to 14:15 or truncate 13:15 workout wrap-up by 15 minutes.'
    }
  };
}
