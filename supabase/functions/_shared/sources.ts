// Read-only data sources the Chief of Staff briefs from: weather (Open-Meteo,
// no key), Garmin health (cos_health_daily, filled by workers/garmin) and
// Project Viking (viking_docs, same Supabase project).
import type { Settings } from './config.ts';
import { db } from './db.ts';
import { addDays, localParts } from './time.ts';

// ── Weather ─────────────────────────────────────────────────────────────────

const WMO: Record<number, string> = {
  0: 'clear',
  1: 'mostly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'fog',
  51: 'light drizzle',
  53: 'drizzle',
  55: 'heavy drizzle',
  61: 'light rain',
  63: 'rain',
  65: 'heavy rain',
  80: 'rain showers',
  81: 'rain showers',
  82: 'violent showers',
  95: 'thunderstorm',
  96: 'thunderstorm',
  99: 'thunderstorm',
};

export async function weather(s: Settings) {
  if (s.weather_lat == null || s.weather_lon == null) return null;
  const p = new URLSearchParams({
    latitude: String(s.weather_lat),
    longitude: String(s.weather_lon),
    timezone: s.timezone,
    forecast_days: '2',
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,weather_code',
  });
  try {
    const j = await (await fetch(`https://api.open-meteo.com/v1/forecast?${p}`)).json();
    const day = (i: number) => ({
      date: j.daily.time[i],
      summary: WMO[j.daily.weather_code[i]] ?? `code ${j.daily.weather_code[i]}`,
      max_c: j.daily.temperature_2m_max[i],
      min_c: j.daily.temperature_2m_min[i],
      rain_chance_pct: j.daily.precipitation_probability_max[i],
      wind_max_kmh: j.daily.wind_speed_10m_max[i],
      uv_max: j.daily.uv_index_max[i],
    });
    return {
      now: { temp_c: j.current.temperature_2m, summary: WMO[j.current.weather_code] ?? '', wind_kmh: j.current.wind_speed_10m },
      today: day(0),
      tomorrow: day(1),
    };
  } catch {
    return null;
  }
}

// ── Garmin health (cos_health_daily) ───────────────────────────────────────

export async function health(s: Settings, days = 7) {
  const since = addDays(localParts(Date.now(), s.timezone).date, -(days - 1));
  const { data } = await db().from('cos_health_daily')
    .select(
      'date, sleep_seconds, sleep_score, hrv_last_night, hrv_status, body_battery_high, body_battery_low, body_battery_now, training_readiness, readiness_level, resting_hr, steps, stress_avg, updated_at',
    )
    .gte('date', since).order('date', { ascending: false });
  if (!data?.length) return null;
  return data.map((r) => ({
    ...r,
    sleep_hours: r.sleep_seconds ? Math.round((r.sleep_seconds / 3600) * 10) / 10 : null,
    sleep_seconds: undefined,
  }));
}

// ── Project Viking (viking_docs) ───────────────────────────────────────────

type Doc = { coll: string; doc_id: string; data: Record<string, unknown> };

export async function viking(s: Settings) {
  if (!s.viking_user_id) return null;
  const today = localParts(Date.now(), s.timezone).date;
  const since = addDays(today, -14);
  const { data, error } = await db().from('viking_docs')
    .select('coll, doc_id, data')
    .eq('user_id', s.viking_user_id)
    .in('coll', ['settings', 'weights', 'workouts', 'rides', 'nutrition'])
    .order('doc_id', { ascending: false })
    .limit(400);
  if (error || !data) return null;
  const docs = data as Doc[];
  const recent = (coll: string) => docs.filter((d) => d.coll === coll && d.doc_id.slice(0, 10) >= since);

  const weights = recent('weights')
    .map((d) => ({ date: d.doc_id.slice(0, 10), kg: Number(d.data.kg) }))
    .filter((w) => Number.isFinite(w.kg))
    .sort((a, b) => b.date.localeCompare(a.date));
  const last7 = weights.filter((w) => w.date > addDays(today, -7));
  const avg7 = last7.length ? Math.round((last7.reduce((a, w) => a + w.kg, 0) / last7.length) * 10) / 10 : null;

  const workouts = recent('workouts').slice(0, 4).map((d) => ({
    date: d.doc_id.slice(0, 10),
    session: d.data.session,
    week: d.data.week,
    phase: d.data.phase,
    deload: d.data.deload,
  }));
  const rides = recent('rides').slice(0, 4).map((d) => ({
    date: d.doc_id.slice(0, 10),
    type: d.data.type,
    code: d.data.code ?? null,
    minutes: d.data.minutes,
    z2_minutes: d.data.z2 ?? null,
  }));
  const nutrition = recent('nutrition').slice(0, 2).map((d) => ({
    date: d.doc_id,
    ...pick(d.data, ['extraKcal', 'extraProtein', 'water']),
  }));
  const settings = docs.find((d) => d.coll === 'settings')?.data;

  return {
    start_date: settings?.startDate ?? null,
    latest_weight: weights[0] ?? null,
    weight_avg_7d: avg7,
    weigh_ins_last_7d: last7.length,
    recent_workouts: workouts,
    recent_rides: rides,
    recent_nutrition: nutrition,
  };
}

function pick(o: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));
}
