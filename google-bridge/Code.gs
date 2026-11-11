/**
 * Heimdall ↔ Google bridge (Google Apps Script).
 *
 * Runs as you, inside your own Google account, so there is no Cloud project,
 * consent screen or refresh token to manage. Heimdall's edge functions call
 * this web app with a shared secret; anything without the secret is refused.
 *
 * Calendar: read and write events. Gmail: READ ONLY. This script never sends,
 * deletes, labels or modifies mail (Google's permission screen says "full
 * Gmail" because Apps Script has no read-only Gmail service).
 *
 * Setup: script.google.com → New project → paste this file → set SECRET →
 * Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
 * → Deploy → Authorize → copy the Web app URL.
 */
const SECRET = 'PASTE_SECRET_HERE';

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return out({ error: 'bad json' });
  }
  if (!req || req.secret !== SECRET || SECRET === 'PASTE_SECRET_HERE') return out({ error: 'forbidden' });
  try {
    switch (req.op) {
      case 'ping': return out({ ok: true, calendar: CalendarApp.getDefaultCalendar().getName() });
      case 'list': return out({ items: list(req) });
      case 'insert': return out({ item: insert(req) });
      case 'patch': return out({ item: patch(req) });
      case 'delete': return out({ ok: del(req) });
      case 'mail': return out({ items: mail(req) });
      default: return out({ error: 'unknown op' });
    }
  } catch (err) {
    return out({ error: String(err && err.message || err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function cal(id) {
  return id && id !== 'primary' ? CalendarApp.getCalendarById(id) : CalendarApp.getDefaultCalendar();
}

function toJson(ev) {
  const allDay = ev.isAllDayEvent();
  const fmt = (d) => Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return {
    id: ev.getId(),
    summary: ev.getTitle(),
    description: ev.getDescription(),
    location: ev.getLocation(),
    colorId: ev.getColor(),
    eventType: 'default',
    start: allDay ? { date: fmt(ev.getAllDayStartDate()) } : { dateTime: ev.getStartTime().toISOString() },
    end: allDay ? { date: fmt(ev.getAllDayEndDate()) } : { dateTime: ev.getEndTime().toISOString() },
  };
}

function list(req) {
  const opts = req.q ? { search: req.q } : {};
  return cal(req.calendarId).getEvents(new Date(req.timeMin), new Date(req.timeMax), opts).map(toJson);
}

function apply(ev, req) {
  if (req.description != null) ev.setDescription(req.description);
  if (req.location != null) ev.setLocation(req.location);
  if (req.colorId) ev.setColor(String(req.colorId));
  return ev;
}

function insert(req) {
  const c = cal(req.calendarId);
  const ev = req.allDayStart
    ? c.createAllDayEvent(req.title, new Date(req.allDayStart + 'T12:00:00Z'), new Date(req.allDayEnd + 'T12:00:00Z'))
    : c.createEvent(req.title, new Date(req.start), new Date(req.end));
  return toJson(apply(ev, req));
}

function patch(req) {
  const ev = cal(req.calendarId).getEventById(req.id);
  if (!ev) throw new Error('event not found');
  if (req.title) ev.setTitle(req.title);
  if (req.start && req.end) ev.setTime(new Date(req.start), new Date(req.end));
  return toJson(apply(ev, req));
}

function del(req) {
  const ev = cal(req.calendarId).getEventById(req.id);
  if (ev) ev.deleteEvent();
  return true;
}

function mail(req) {
  const threads = GmailApp.search(String(req.query || 'is:unread newer_than:1d'), 0, Math.min(Number(req.max) || 10, 15));
  return threads.map((t) => {
    const m = t.getMessages()[t.getMessageCount() - 1];
    return {
      from: m.getFrom(),
      subject: m.getSubject(),
      date: m.getDate().toISOString(),
      snippet: m.getPlainBody().replace(/\s+/g, ' ').slice(0, 200),
    };
  });
}
