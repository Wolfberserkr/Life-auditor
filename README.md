# Life-auditor

A personal **Chief of Staff** on Telegram. It briefs you around your rotating
shifts, turns a roster photo into calendar events, captures tasks and
reminders across life areas, and draws on Garmin, Gmail, Google Calendar and
Project Viking.

- **Vision and requirements:** [docs/VISION.md](docs/VISION.md)
- **Setup:** [docs/SETUP.md](docs/SETUP.md)

## v1 at a glance

| Piece | Where |
|---|---|
| Telegram webhook (chat, buttons, roster import) | `supabase/functions/cos-telegram` |
| Scheduler, every 5 min (pre-shift brief, post-shift debrief, day-off brief, reminders) | `supabase/functions/cos-scheduler` |
| Chief of Staff agent (Claude + tools) | `supabase/functions/_shared/{claude,chat,tools,persona}.ts` |
| Roster → calendar (Gemini vision, calendar sync) | `supabase/functions/_shared/{schedule,shifts}.ts` |
| Garmin → `cos_health_daily` (hourly GitHub Action) | `workers/garmin` |
| Schema (applied by hand; shares Viking's Supabase project) | `supabase/sql` |

```
Telegram ─► cos-telegram ─► Chief of Staff (Claude, tools) ─► Calendar · Gmail · Viking · tasks/memory
             └─ roster file ─► Gemini ─► preview ✅ ─► Google Calendar
pg_cron ─► cos-scheduler ─► shift-aware briefings and reminders ─► Telegram
GitHub Actions ─► Garmin sync ─► cos_health_daily
```

## Development

```bash
deno task check   # type-check functions and scripts
deno task test    # unit tests (shift matching, calendar sync plan, scheduler windows, HTML)
```
