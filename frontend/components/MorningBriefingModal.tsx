import React, { useState } from 'react';
import { 
  Sun, 
  Activity, 
  Flame, 
  CalendarClock, 
  ShieldCheck, 
  Sparkles, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Quote, 
  Clock, 
  ChevronRight, 
  HeartPulse, 
  Moon,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { 
  MorningBriefingData, 
  ScheduleAdjustmentOption, 
  CalendarEvent, 
  BiometricRecovery, 
  FitnessMetric 
} from '../types';
import { COUNCIL_MEMBERS } from '../constants';

interface MorningBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  briefing: MorningBriefingData | null;
  isLoading: boolean;
  onRegenerate: () => void;
  onApplyAdjustment: (adjustment: ScheduleAdjustmentOption) => void;
  onApplyAllAdjustments: (adjustments: ScheduleAdjustmentOption[]) => void;
  calendarEvents: CalendarEvent[];
}

export const MorningBriefingModal: React.FC<MorningBriefingModalProps> = ({
  isOpen,
  onClose,
  briefing,
  isLoading,
  onRegenerate,
  onApplyAdjustment,
  onApplyAllAdjustments,
  calendarEvents
}) => {
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'adjustments' | 'directives'>('overview');

  if (!isOpen) return null;

  const handleApply = (adj: ScheduleAdjustmentOption) => {
    onApplyAdjustment(adj);
    setAppliedIds(prev => [...prev, adj.id]);
  };

  const handleApplyAll = () => {
    if (!briefing) return;
    const unapplied = briefing.proposedAdjustments.filter(a => !appliedIds.includes(a.id));
    onApplyAllAdjustments(unapplied);
    setAppliedIds(briefing.proposedAdjustments.map(a => a.id));
  };

  const getCounselor = (id: string) => {
    return COUNCIL_MEMBERS.find(c => c.id === id) || COUNCIL_MEMBERS[0];
  };

  const allApplied = briefing && briefing.proposedAdjustments.length > 0 && 
    briefing.proposedAdjustments.every(a => appliedIds.includes(a.id));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 -ml-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
              <Sun className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Morning Tactical Alignment
                </span>
                <span className="text-slate-400 text-xs hidden sm:inline">07:58 AM • Live Telemetry</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Daily Board Briefing & Schedule Architecture
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              title="Refresh Briefing Telemetry"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 bg-slate-950/30 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition ${
                activeTab === 'overview'
                  ? 'border-amber-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Executive Game Plan
            </button>
            <button
              onClick={() => setActiveTab('adjustments')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'adjustments'
                  ? 'border-indigo-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Proposed Schedule Fixes
              {briefing && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-[10px] text-white flex items-center justify-center font-bold">
                  {briefing.proposedAdjustments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('directives')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition ${
                activeTab === 'directives'
                  ? 'border-purple-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Council Directives
            </button>
          </div>

          {briefing && !allApplied && (
            <button
              onClick={handleApplyAll}
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 pb-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Apply All Schedule Adjustments
            </button>
          )}
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="inline-block p-4 rounded-3xl bg-indigo-950/40 border border-indigo-500/20 animate-bounce">
                <Sun className="w-10 h-10 text-amber-400 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-white">Synthesizing Overnight Telemetry...</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Interpreting Garmin sleep phases (REM/Deep), Strava cumulative strain, and calendar congestion to formulate your morning directives.
              </p>
            </div>
          ) : briefing ? (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Readiness Banner */}
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
                          <Zap className="w-4 h-4 text-emerald-400" />
                          <span>Status: {briefing.readinessState}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-300">Composite Readiness: {briefing.overallScore}/100</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                          {briefing.readinessTagline}
                        </h3>
                      </div>

                      <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-4 text-center flex-shrink-0">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-mono block">Body Battery</span>
                          <span className="text-sm font-black text-emerald-400">{briefing.biometricSummary.bodyBattery}/100</span>
                        </div>
                        <div className="h-6 w-px bg-slate-800" />
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-mono block">Restorative</span>
                          <span className="text-sm font-black text-cyan-400">{briefing.biometricSummary.remDeepTotal}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3 Telemetry Pillars: Garmin, Strava, Calendar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Pillar 1: Garmin Connect Recovery */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                            <Moon className="w-4 h-4" />
                            Garmin Overnight
                          </span>
                          <span className="text-[10px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 px-1.5 py-0.5 rounded font-mono">
                            {briefing.biometricSummary.sleepScore}% Sleep
                          </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Deep + REM Sleep:</span>
                            <span className="font-semibold text-slate-200">{briefing.biometricSummary.remDeepTotal}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>HRV Status:</span>
                            <span className="font-semibold text-emerald-300">{briefing.biometricSummary.hrvBaselineStatus}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                        Dr. Aris: Parasympathetic baseline intact; avoid intense stimulants post-13:30.
                      </div>
                    </div>

                    {/* Pillar 2: Strava Athletic Plan */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
                            <Flame className="w-4 h-4" />
                            Strava Workout
                          </span>
                          <span className="text-[10px] bg-orange-950/60 text-orange-300 border border-orange-800/40 px-1.5 py-0.5 rounded font-mono">
                            {briefing.stravaPrescription.scheduledTime}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="font-bold text-white text-xs">
                            {briefing.stravaPrescription.plannedWorkout}
                          </div>
                          <div className="text-[11px] text-orange-300 font-mono">
                            Target: {briefing.stravaPrescription.targetZone}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                        Coach Maya: {briefing.stravaPrescription.coachNote}
                      </div>
                    </div>

                    {/* Pillar 3: Calendar Load & Bottleneck */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                            <CalendarClock className="w-4 h-4" />
                            Google Calendar
                          </span>
                          <span className="text-[10px] bg-blue-950/60 text-blue-300 border border-blue-800/40 px-1.5 py-0.5 rounded font-mono">
                            {briefing.calendarLoadSummary.totalMeetingHours}h in Calls
                          </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Meetings Scheduled:</span>
                            <span className="font-semibold text-slate-200">{briefing.calendarLoadSummary.meetingCount} events</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Focus Reservations:</span>
                            <span className="font-semibold text-indigo-300">{briefing.calendarLoadSummary.focusBlocksCount} blocks</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-amber-300">
                        Hazard: {briefing.calendarLoadSummary.criticalHazard}
                      </div>
                    </div>
                  </div>

                  {/* Immediate Schedule Actions Preview */}
                  <div className="bg-slate-950/60 border border-indigo-500/30 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Council's Recommended Schedule Adjustments ({briefing.proposedAdjustments.length})
                      </div>
                      <button
                        onClick={() => setActiveTab('adjustments')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        View Details <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {briefing.proposedAdjustments.map((adj) => {
                        const isDone = appliedIds.includes(adj.id);
                        const counselor = getCounselor(adj.recommendedBy);
                        return (
                          <div
                            key={adj.id}
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                              isDone
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-400'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <img src={counselor.avatar} className="w-8 h-8 rounded-full border border-slate-700 mt-0.5" alt="" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-white">{adj.title}</h4>
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                                    {adj.impactScore}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">{adj.description}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleApply(adj)}
                              disabled={isDone}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition flex-shrink-0 self-end sm:self-center ${
                                isDone
                                  ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                              }`}
                            >
                              {isDone ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Applied
                                </>
                              ) : (
                                <>
                                  <span>Accept & Apply</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Dedicated Adjustments View */}
              {activeTab === 'adjustments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">One-Click Schedule Optimization</h3>
                      <p className="text-xs text-slate-400">
                        Accepting these directives automatically adjusts your work calendar and training targets.
                      </p>
                    </div>
                    {briefing.proposedAdjustments.length > 0 && (
                      <button
                        onClick={handleApplyAll}
                        disabled={allApplied}
                        className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-amber-600/20 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {allApplied ? 'All Adjustments Enacted' : 'Accept All Proposals'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {briefing.proposedAdjustments.map((adj) => {
                      const isDone = appliedIds.includes(adj.id);
                      const counselor = getCounselor(adj.recommendedBy);
                      return (
                        <div
                          key={adj.id}
                          className={`p-5 rounded-2xl border transition-all ${
                            isDone
                              ? 'bg-emerald-950/10 border-emerald-500/30'
                              : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <img
                                src={counselor.avatar}
                                alt={counselor.name}
                                className="w-10 h-10 rounded-full border-2 border-slate-700"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Recommended by {counselor.name} ({counselor.title})
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                                    {adj.impactScore}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-white mt-0.5">{adj.title}</h4>
                                <p className="text-xs text-slate-300 mt-1">{adj.description}</p>
                                
                                <div className="mt-2.5 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-800/30 max-w-lg">
                                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span>{adj.benefit}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleApply(adj)}
                              disabled={isDone}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 flex items-center gap-1.5 ${
                                isDone
                                  ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                              }`}
                            >
                              {isDone ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Active on Calendar
                                </>
                              ) : (
                                <>
                                  <span>Accept Adjustment</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 3: Council Directives */}
              {activeTab === 'directives' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Advisory Council Daily Rules</h3>
                    <p className="text-xs text-slate-400">
                      High-level guidance tailored to your biological capacity and high-stakes calendar events.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {briefing.councilDirectives.map((directive, idx) => {
                      const member = getCounselor(directive.counselorId);
                      return (
                        <div
                          key={idx}
                          className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              <img src={member.avatar} className="w-9 h-9 rounded-full border border-slate-700" alt="" />
                              <div>
                                <h4 className="text-xs font-bold text-white">{member.name}</h4>
                                <span className="text-[10px] text-slate-400">{member.title}</span>
                              </div>
                            </div>

                            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800/80 mb-3">
                              <Quote className="w-3.5 h-3.5 text-slate-600 mb-1" />
                              <p className="text-xs text-slate-200 italic leading-relaxed">
                                "{directive.quote}"
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">Daily Directive:</span>
                            <span 
                              className="font-bold px-2 py-0.5 rounded text-[11px]"
                              style={{ 
                                backgroundColor: `${member.accentColor}20`,
                                color: member.accentColor 
                              }}
                            >
                              {directive.keyRule}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400 hidden sm:block">
            {appliedIds.length} of {briefing?.proposedAdjustments.length || 0} schedule adjustments active on today's calendar.
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20"
            >
              Enter Day & Close Briefing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
