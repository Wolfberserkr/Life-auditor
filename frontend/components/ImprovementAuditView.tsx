import React, { useState } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Moon, 
  Zap, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowUpRight, 
  Sparkles,
  CheckCircle,
  Clock,
  HeartPulse,
  Brain
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  CartesianGrid 
} from 'recharts';
import { BiometricRecovery, FitnessMetric, ImprovementInsight } from '../types';
import { generateDailyImprovementAudit } from '../services/geminiService';

interface ImprovementAuditViewProps {
  insights: ImprovementInsight[];
  biometrics: BiometricRecovery;
  fitnessData: FitnessMetric[];
  onApplyInsightAction: (insightId: string) => void;
}

export const ImprovementAuditView: React.FC<ImprovementAuditViewProps> = ({
  insights,
  biometrics,
  fitnessData,
  onApplyInsightAction
}) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'biometrics' | 'ai_audit'>('insights');
  const [aiAuditReport, setAiAuditReport] = useState<string | null>(null);
  const [isGeneratingAudit, setIsGeneratingAudit] = useState(false);
  const [appliedActions, setAppliedActions] = useState<string[]>([]);

  const handleGenerateAudit = async () => {
    setIsGeneratingAudit(true);
    try {
      const report = await generateDailyImprovementAudit({
        biometrics,
        fitnessData,
        calendarEvents: [],
        tasks: []
      });
      setAiAuditReport(report);
      setActiveTab('ai_audit');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAudit(false);
    }
  };

  const handleAction = (id: string) => {
    onApplyInsightAction(id);
    setAppliedActions(prev => [...prev, id]);
  };

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Holistic Life Optimization Engine
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Areas of Continuous Improvement</h2>
          <p className="text-slate-400 text-sm max-w-2xl mt-1.5">
            The Council combines telemetry across cognitive load, cardiac output (Strava), and parasympathetic recovery (Garmin/Whoop) to pinpoint performance bottlenecks before burnout occurs.
          </p>
        </div>

        <button
          onClick={handleGenerateAudit}
          disabled={isGeneratingAudit}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white font-bold text-xs rounded-2xl transition shadow-lg shadow-emerald-900/30 flex-shrink-0"
        >
          <Sparkles className={`w-4 h-4 ${isGeneratingAudit ? 'animate-spin' : ''}`} />
          {isGeneratingAudit ? 'Running Deep Diagnostics...' : 'Generate AI Chief-of-Staff Audit'}
        </button>
      </div>

      {/* Navigation Pill Strip */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'insights'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Active Growth Bottlenecks ({insights.length})
        </button>
        <button
          onClick={() => setActiveTab('biometrics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'biometrics'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          7-Day Cardiac & Recovery Telemetry
        </button>
        {aiAuditReport && (
          <button
            onClick={() => setActiveTab('ai_audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'ai_audit'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Executive AI Audit Memo
          </button>
        )}
      </div>

      {/* Tab 1: Actionable Improvement Insights */}
      {activeTab === 'insights' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {insights.map((insight) => {
            const isApplied = appliedActions.includes(insight.id);
            return (
              <div
                key={insight.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {insight.area}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      insight.severity === 'high' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {insight.severity} priority
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug">{insight.title}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{insight.description}</p>

                  <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                      Council Prescription:
                    </span>
                    <p className="text-xs text-slate-200">{insight.recommendation}</p>
                  </div>
                </div>

                {insight.actionText && (
                  <div className="mt-5 pt-4 border-t border-slate-800">
                    <button
                      onClick={() => handleAction(insight.id)}
                      disabled={isApplied}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isApplied
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Prescription Enacted
                        </>
                      ) : (
                        <>
                          <span>{insight.actionText}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Visual Telemetry Charts */}
      {activeTab === 'biometrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cardiac Load vs Recovery Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-400" />
                    Strava Activity & Cardiac Strain Index
                  </h3>
                  <span className="text-xs text-slate-400">7-Day Training Load (Optimal Range: 40-75)</span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fitnessData}>
                    <defs>
                      <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="recoveryStressIndex" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#stressGrad)" 
                      name="Strain Index"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="font-semibold text-orange-400">Coach Maya’s Observation: </span>
                Friday’s track session (stress 88) created carryover muscular tension into Saturday’s trail run. Active recovery walk today was correctly chosen.
              </div>
            </div>

            {/* Daily Caloric / Output distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-400" />
                    Heart Rate & Caloric Burn Expenditure
                  </h3>
                  <span className="text-xs text-slate-400">Cardiovascular Output Breakdown</span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fitnessData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="calories" fill="#6366f1" radius={[6, 6, 0, 0]} name="Active Calories (kcal)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="font-semibold text-indigo-400">Dr. Aris’s Nutrition Note: </span>
                Replenish glycogen stores tonight with low-glycemic complex carbs to stabilize overnight cortisol.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AI Chief-of-Staff Audit Memo */}
      {activeTab === 'ai_audit' && aiAuditReport && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Brain className="w-4 h-4" />
            Executive Chief of Staff Daily Performance Memo
          </div>
          <h3 className="text-xl font-bold text-white">Systemic Diagnosis & Strategic Recalibration</h3>
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-sm text-slate-200 leading-relaxed whitespace-pre-line font-mono">
            {aiAuditReport}
          </div>
        </div>
      )}
    </div>
  );
};
