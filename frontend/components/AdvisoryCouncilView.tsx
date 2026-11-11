import React, { useState } from 'react';
import { 
  Users, 
  Send, 
  Sparkles, 
  Compass, 
  Lightbulb, 
  ShieldAlert, 
  CheckCircle2, 
  CalendarClock,
  MessageSquare,
  HelpCircle,
  Quote,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CouncilMember, CouncilSession, CalendarEvent, TaskItem, BiometricRecovery, FitnessMetric } from '../types';
import { COUNCIL_MEMBERS, SAMPLE_COUNCIL_QUESTIONS } from '../constants';
import { consultTheCouncil } from '../services/geminiService';

interface AdvisoryCouncilViewProps {
  calendarEvents: CalendarEvent[];
  tasks: TaskItem[];
  biometrics: BiometricRecovery;
  fitnessData: FitnessMetric[];
  onApplyScheduleAdjustment: (suggestion: string) => void;
}

export const AdvisoryCouncilView: React.FC<AdvisoryCouncilViewProps> = ({
  calendarEvents,
  tasks,
  biometrics,
  fitnessData,
  onApplyScheduleAdjustment
}) => {
  const [query, setQuery] = useState('');
  const [selectedCouncilorIds, setSelectedCouncilorIds] = useState<string[]>(
    COUNCIL_MEMBERS.map(c => c.id)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<CouncilSession | null>(null);
  const [history, setHistory] = useState<CouncilSession[]>([]);
  const [activeTabCounselor, setActiveTabCounselor] = useState<string>('all');
  const [scheduleAppliedNotice, setScheduleAppliedNotice] = useState<string | null>(null);

  const toggleCounselorSelection = (id: string) => {
    if (selectedCouncilorIds.includes(id)) {
      if (selectedCouncilorIds.length === 1) return; // Keep at least one
      setSelectedCouncilorIds(selectedCouncilorIds.filter(cid => cid !== id));
    } else {
      setSelectedCouncilorIds([...selectedCouncilorIds, id]);
    }
  };

  const handleAskCouncil = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;
    setIsLoading(true);
    setScheduleAppliedNotice(null);

    const activeMembers = COUNCIL_MEMBERS.filter(c => selectedCouncilorIds.includes(c.id));
    
    try {
      const session = await consultTheCouncil(
        questionText,
        { calendarEvents, tasks, biometrics, fitnessData },
        activeMembers
      );
      setActiveSession(session);
      setHistory(prev => [session, ...prev]);
      setActiveTabCounselor('all');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getCounselor = (id: string) => {
    return COUNCIL_MEMBERS.find(c => c.id === id) || COUNCIL_MEMBERS[0];
  };

  return (
    <div className="space-y-8">
      {/* Council Chamber Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
              <Users className="w-3.5 h-3.5" />
              High Council of Advisors
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Convene Your Personal Advisory Board
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mt-1.5">
              Pose any high-stakes dilemma, schedule bottleneck, or training uncertainty. Your council inspects your biological telemetry and day's commitments to deliberate in unison.
            </p>
          </div>

          {/* Quick Biometrics Bar for Council awareness */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 text-xs">
            <div className="text-center pr-3 border-r border-slate-800">
              <span className="text-slate-500 block">Garmin Battery</span>
              <span className="text-emerald-400 font-bold text-sm">{biometrics.bodyBattery}/100</span>
            </div>
            <div className="text-center pr-3 border-r border-slate-800">
              <span className="text-slate-500 block">Sleep Score</span>
              <span className="text-cyan-400 font-bold text-sm">{biometrics.sleepScore}%</span>
            </div>
            <div className="text-center">
              <span className="text-slate-500 block">Meetings Today</span>
              <span className="text-indigo-400 font-bold text-sm">{calendarEvents.length} items</span>
            </div>
          </div>
        </div>

        {/* Council Members Seat Selector */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
            Seated Counselors ({selectedCouncilorIds.length} of {COUNCIL_MEMBERS.length} Active):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {COUNCIL_MEMBERS.map((member) => {
              const isSelected = selectedCouncilorIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  onClick={() => toggleCounselorSelection(member.id)}
                  className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500/40 shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-500/30'
                      : 'bg-slate-950/40 border-slate-800/40 opacity-50 hover:opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-700 shadow"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">{member.name}</h4>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[110px]">{member.title}</span>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[10px]">
                    <span 
                      className="font-medium px-1.5 py-0.5 rounded"
                      style={{ 
                        backgroundColor: `${member.accentColor}20`,
                        color: member.accentColor 
                      }}
                    >
                      {member.expertise.split(',')[0]}
                    </span>
                    <span className={isSelected ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                      {isSelected ? 'Seated' : 'Muted'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Chamber */}
        <div className="mt-6">
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleAskCouncil(query);
                }
              }}
              rows={3}
              placeholder="E.g., I feel an afternoon energy crash coming. Should I cancel my 15:30 meeting or alter my 12:30 Strava run to preserve mental clarity for tomorrow's demo?"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pr-32 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <button
                onClick={() => handleAskCouncil(query)}
                disabled={isLoading || !query.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 disabled:opacity-40"
              >
                {isLoading ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    Deliberating...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Consult Council
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Prompt Presets */}
          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Suggested queries:
            </span>
            {SAMPLE_COUNCIL_QUESTIONS.slice(0, 2).map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(q);
                  handleAskCouncil(q);
                }}
                className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg truncate max-w-xs transition text-[11px]"
              >
                "{q.slice(0, 48)}..."
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading state visual indicator */}
      {isLoading && (
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center animate-pulse space-y-4">
          <div className="flex justify-center items-center gap-3">
            {COUNCIL_MEMBERS.filter(c => selectedCouncilorIds.includes(c.id)).map(c => (
              <img key={c.id} src={c.avatar} className="w-10 h-10 rounded-full border-2 border-indigo-500" alt="" />
            ))}
          </div>
          <h3 className="text-lg font-bold text-white">The Advisory Board is In Session...</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Cross-analyzing Strava cardiac telemetry, Garmin HRV, scheduled calendar commitments, and strategic priority weights.
          </p>
        </div>
      )}

      {/* Active Session Deliberation Presentation */}
      {activeSession && (
        <div className="space-y-6">
          {/* Executive Synthesis Banner */}
          <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Consensus & Synthesis Verdict • {activeSession.timestamp}
            </div>
            
            <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
              {activeSession.synthesis.verdict}
            </h2>

            <p className="text-sm text-slate-300 mt-2 bg-black/30 p-3 rounded-xl border border-white/5">
              <span className="font-semibold text-slate-200">Context Deliberated: </span>
              {activeSession.contextSummary}
            </p>

            {/* Primary Action Plan */}
            <div className="mt-5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Action Protocol (Unanimous Directive):
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {activeSession.synthesis.primaryActionPlan.map((action, idx) => (
                  <div key={idx} className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-slate-200 leading-relaxed">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule Adjustment Proposition */}
            {activeSession.synthesis.scheduleAdjustmentProposal && (
              <div className="mt-5 p-4 rounded-2xl bg-indigo-900/30 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <CalendarClock className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                      Proposed Time-Architecture Modification:
                    </h5>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {activeSession.synthesis.scheduleAdjustmentProposal}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onApplyScheduleAdjustment(activeSession.synthesis.scheduleAdjustmentProposal || '');
                    setScheduleAppliedNotice('Calendar optimized per Council consensus!');
                    setTimeout(() => setScheduleAppliedNotice(null), 4000);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex-shrink-0 shadow"
                >
                  Apply to Calendar
                </button>
              </div>
            )}

            {scheduleAppliedNotice && (
              <div className="mt-2 text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {scheduleAppliedNotice}
              </div>
            )}
          </div>

          {/* Counselor Perspectives Tab Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
            <button
              onClick={() => setActiveTabCounselor('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTabCounselor === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              All Deliberations ({activeSession.opinions.length})
            </button>
            {activeSession.opinions.map((op) => {
              const counselor = getCounselor(op.counselorId);
              return (
                <button
                  key={op.counselorId}
                  onClick={() => setActiveTabCounselor(op.counselorId)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border ${
                    activeTabCounselor === op.counselorId
                      ? 'bg-slate-800 text-white border-indigo-500/40'
                      : 'bg-slate-900/60 text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  <img src={counselor.avatar} className="w-4 h-4 rounded-full" alt="" />
                  <span>{counselor.name}</span>
                </button>
              );
            })}
          </div>

          {/* Individual Opinions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeSession.opinions
              .filter(op => activeTabCounselor === 'all' || activeTabCounselor === op.counselorId)
              .map((opinion) => {
                const member = getCounselor(opinion.counselorId);
                return (
                  <div
                    key={opinion.counselorId}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden"
                  >
                    <div 
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: member.accentColor }}
                    />
                    
                    <div>
                      {/* Member Header */}
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-slate-700"
                          />
                          <div>
                            <h4 className="font-bold text-white text-sm">{member.name}</h4>
                            <span className="text-[11px] text-slate-400 block">{member.title}</span>
                          </div>
                        </div>
                        <span 
                          className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${member.accentColor}20`,
                            color: member.accentColor
                          }}
                        >
                          {member.id}
                        </span>
                      </div>

                      {/* Perspective Quote */}
                      <div className="relative mb-4 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                        <Quote className="w-4 h-4 text-slate-600 mb-1" />
                        <p className="text-xs text-slate-200 italic leading-relaxed">
                          "{opinion.perspective}"
                        </p>
                      </div>

                      {/* Concrete Actions */}
                      <div className="space-y-2 mb-4">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Directives:
                        </span>
                        {opinion.concreteActions.map((action, aIdx) => (
                          <div key={aIdx} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Blindspot Warning */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-start gap-2 text-xs bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/30 text-rose-200">
                      <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[11px] uppercase tracking-wider block text-rose-300">
                          Blindspot Alert:
                        </span>
                        <span className="text-[11px]">{opinion.riskOrBlindspot}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Prior Council Sessions History */}
      {history.length > 1 && (
        <div className="pt-8 border-t border-slate-800">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            Previous Board Inquiries & Minutes ({history.length})
          </h3>
          <div className="space-y-3">
            {history.slice(1).map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveSession(item)}
                className="bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 p-4 rounded-xl cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-semibold text-white">"{item.query}"</h4>
                  <p className="text-[11px] text-slate-400 truncate max-w-lg mt-0.5">
                    Verdict: {item.synthesis.verdict}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
