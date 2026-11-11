import React from 'react';
import { 
  ShieldCheck, 
  Flame, 
  Activity, 
  Calendar as CalendarIcon, 
  Moon, 
  CheckSquare, 
  RefreshCw, 
  Wifi, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { IntegrationState } from '../types';

interface IntegrationsHubProps {
  integrations: IntegrationState[];
  onToggleConnect: (id: string) => void;
  onManualSync: (id: string) => void;
  isSyncingAll: boolean;
  onSyncAll: () => void;
}

export const IntegrationsHub: React.FC<IntegrationsHubProps> = ({
  integrations,
  onToggleConnect,
  onManualSync,
  isSyncingAll,
  onSyncAll
}) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'strava':
        return <Flame className="w-5 h-5 text-orange-500" />;
      case 'garmin':
        return <Activity className="w-5 h-5 text-cyan-400" />;
      case 'calendar':
        return <CalendarIcon className="w-5 h-5 text-blue-400" />;
      case 'whoop':
        return <Moon className="w-5 h-5 text-purple-400" />;
      case 'notion':
        return <CheckSquare className="w-5 h-5 text-emerald-400" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              Unified Telemetry Feed
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Connected Life Platforms</h2>
            <p className="text-slate-400 text-sm max-w-2xl mt-1">
              CouncilOS aggregates biometrics, training strain from Strava & Garmin, calendar commitments, and tasks to ground all council advice in empirical reality.
            </p>
          </div>
          <button
            onClick={onSyncAll}
            disabled={isSyncingAll}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
            {isSyncingAll ? 'Synchronizing All...' : 'Sync Telemetry Now'}
          </button>
        </div>

        {/* Live sync stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
            <span className="text-xs text-slate-400 block">Garmin Biometrics</span>
            <span className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
              Body Battery: 68
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
            </span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
            <span className="text-xs text-slate-400 block">Strava Weekly Load</span>
            <span className="text-base font-bold text-orange-400 mt-0.5 block">
              42.8 km (184 pts)
            </span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
            <span className="text-xs text-slate-400 block">Calendar Load Today</span>
            <span className="text-base font-bold text-blue-400 mt-0.5 block">
              4.5 hrs in meetings
            </span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
            <span className="text-xs text-slate-400 block">Recovery Readiness</span>
            <span className="text-base font-bold text-emerald-400 mt-0.5 block">
              78% Optimal Sleep
            </span>
          </div>
        </div>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between ${
              item.connected
                ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-md'
                : 'bg-slate-900/30 border-slate-800/40 opacity-75'
            }`}
          >
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/90 flex items-center justify-center border border-slate-700">
                    {getIcon(item.id)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base leading-tight">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 capitalize">{item.category}</span>
                      <span className="text-[10px] text-slate-500">•</span>
                      <span className="text-[11px] text-slate-400">{item.lastSync}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      item.connected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.connected ? item.statusBadge : 'Disconnected'}
                  </span>
                </div>
              </div>

              {/* Metrics preview */}
              {item.connected ? (
                <div className="space-y-2.5 my-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  {item.metricsSummary.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{m.label}</span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-100">{m.value}</span>
                        {m.sublabel && (
                          <span className="block text-[10px] text-slate-400">
                            {m.sublabel}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  Connect account to grant the Advisory Council access to real-time data.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <button
                onClick={() => onToggleConnect(item.id)}
                className={`font-medium transition ${
                  item.connected
                    ? 'text-rose-400 hover:text-rose-300'
                    : 'text-indigo-400 hover:text-indigo-300 font-semibold'
                }`}
              >
                {item.connected ? 'Disconnect' : 'Connect Account'}
              </button>

              {item.connected && (
                <button
                  onClick={() => onManualSync(item.id)}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition"
                  title="Force re-fetch payload"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add custom webhook / integration slot */}
        <div className="rounded-2xl border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/20 p-5 flex flex-col items-center justify-center text-center group cursor-pointer transition">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition">
            +
          </div>
          <h4 className="font-medium text-slate-300 text-sm mt-3">Add Custom Data Source</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
            Connect Apple Health, RescueTime, or custom REST Webhook
          </p>
        </div>
      </div>
    </div>
  );
};
