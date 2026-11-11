# Life-auditor — Chief of Staff system

A personal "Chief of Staff" AI that lives in Telegram, briefs me around my
rotating shifts, and delegates to four sub-agents. This doc captures the
requirements gathered in the initial 20-question discovery session.

## 1. The Chief of Staff (orchestrator)

| Aspect | Decision |
|---|---|
| Core jobs | Daily briefings · Accountability · Capture & triage · Proactive planning |
| Interface | Telegram — two-way chat + inline buttons / quick replies (private, **me only**) |
| Personality | Witty butler — efficient, dry humour, Jarvis-like |
| Briefing timing | **Shift-aware**: pre-shift briefing + post-shift debrief, keyed off the shift event in Google Calendar |
| Briefing content | Calendar & shift · Body & readiness (Garmin) · Inbox highlights (Gmail) · Life admin & people (+ weather) |
| Autonomy | **Act on low-risk** (calendar blocks, push workouts, update lists); **ask first** for anything that emails/contacts people or spends money |

## 2. Sub-agents

### Training
- Goals: endurance/race, strength/physique, body composition, general health
- **Project Viking** ([Wolfberserkr/SoloLeveling](https://github.com/Wolfberserkr/SoloLeveling))
  is the source of truth for the plan: the 52-week phases, the 4 gym sessions and the
  8-day bike cycle are defined in its code (`vikingData.ts` / `bikePlan.ts`). The agent
  does **not** invent workouts; it:
  - reads the next session from Viking's `cycle` and pushes it to the **Garmin** watch
    (strength or ride workout)
  - writes back into `viking_docs`: Garmin sleep/steps → `recovery`, Garmin/Strava
    rides → `rides`, weigh-ins → `weights`
  - reads `workouts`, `nutrition`, `weights` and the Viking coach rules for briefings and reviews
- Weekly tracking & review (Garmin + Strava): load, trends, PRs
- Nutrition & weight: weigh-ins, food logging, protein/hydration nudges

### Work
- Rotating shifts (surveillance dept.)
- **Schedule import**: I drop my roster in Telegram as a **photo/screenshot**
  or a **PDF/Excel file** → the agent extracts the shifts (Gemini vision /
  file parsing), shows a preview with ✅/✏️ buttons, then creates the
  Google Calendar events. Shift events must match the existing format that
  the `/shift-start` skill and the shift-aware scheduler rely on:

  | Field | Value |
  |---|---|
  | Title | `<emoji> Surveillance Shift (HH:MM–HH:MM)` e.g. `🔵 Surveillance Shift (05:00–14:00)` |
  | Description | `<Colour> shift – Casino Surveillance` |
  | Location | `Aruba Marriott Resort & Stellaris Casino` |
  | Time zone | `America/Puerto_Rico` (UTC−4, same as Aruba) |
  | Known shifts | 🔵 Blue 05:00–14:00 (colorId 9) · 🟢 Green 13:00–22:00 (colorId 10) · others learned on first import |

  Re-importing a period updates/removes changed shifts instead of duplicating.
- Shift logistics: reminders, sleep timing around nights, prep checklists
- Projects & reports: deadlines, recurring reports (traffic / occupancy)

### Home & Family (household: me, my wife, my mother)
- Groceries & chores, house maintenance schedule
- Bills & admin: due dates, subscriptions, insurance, renewals
- Mom's care: appointments, medication reminders, wellbeing check-ins
- Family calendar: coordinating plans around my shifts

### Relationships
- Friends & family: "you haven't spoken to X in N weeks" nudges
- Key dates & gifts: birthdays/anniversaries with early gift ideas
- People notes: personal CRM of details about people

## 3. Life audit cadence
- **Weekly review** — scorecard per life area, wins/misses, next week's plan
- **Monthly audit** — trends (training load, weight, contacts made, bills, goals)
- **Quarterly goals** — 90-day goals per area, CoS holds me accountable

## 4. Technical direction

| Layer | Choice |
|---|---|
| Hosting | **Supabase**: the **same project as Project Viking** (`npqpzzarohlvexqpqurg`). Edge Functions (Deno/TypeScript) + `pg_cron`; all Life-auditor tables are prefixed `cos_` |
| Memory | **Supabase Postgres** (+ `pgvector` for semantic memory) |
| LLMs | **Mix by task** — strong model (Claude) for the Chief of Staff's reasoning/routing; cheaper model (Gemini Flash) for summarisation, extraction and routine sub-agent work |
| Integrations | Telegram Bot API, Google Calendar, Gmail, Garmin Connect, Strava, weather, Project Viking |

### High-level flow
```
Telegram ──webhook──► edge fn: telegram-webhook ──► Chief of Staff (LLM + tools)
                                                         │ routes to
                     ┌───────────────┬──────────────┬────┴─────────┬──────────────┐
                  Training         Work        Home & Family   Relationships
                     │               │               │               │
                Garmin/Strava/   Calendar/      tasks/bills/     people/dates
                Project Viking   shift data     care tables      tables
                     └───────────────┴──────┬────────┴───────────────┘
                                     Supabase Postgres (memory)

pg_cron (every 15 min) ──► edge fn: scheduler ──► "is a shift starting/ending soon?"
                                                   └─► pre-shift brief / post-shift debrief
pg_cron (weekly/monthly/quarterly) ──► review & audit jobs
```

### Known risks / open items
- **Garmin**: no official consumer API; using the unofficial Garmin Connect
  login (approved), probably via a small Python worker next to the edge functions.
- **Project Viking**: integration is direct table access to `viking_docs` with the
  service role, scoped to my `user_id`. Allowed `coll` values are kept in sync with
  Viking's migrations (currently settings, weights, waist, nutrition, recovery,
  workouts, rides, cycle, benchmarks).
- **Google OAuth**: one-time consent to get a refresh token for Calendar + Gmail.
- Secrets needed: Telegram bot token, Anthropic key, Gemini key, Google OAuth
  client, Strava app credentials, Garmin login.

## 5. v1 scope (MVP)
1. Telegram bot + Chief of Staff with two-way chat, buttons and capture/triage into Postgres
2. Shift-aware briefings from Google Calendar + Garmin readiness + Gmail highlights + weather
3. Memory schema (tasks, people, notes, goals, logs)
4. Schedule import (photo/PDF/Excel → Calendar shift events), since briefings depend on shifts being in the calendar

Then add sub-agents one at a time: Training → Home & Family → Relationships → Work,
followed by the weekly review / monthly audit / quarterly goals loop.
