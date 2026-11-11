// One-time Google sign-in to get a refresh token for Calendar + Gmail (read-only).
// Run on your own computer:
//
//   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... deno run --allow-net --allow-env scripts/google-auth.ts
//
// It prints a URL; open it, approve, and the refresh token is printed here.
// Store it with:  supabase secrets set GOOGLE_REFRESH_TOKEN=...
// The OAuth client must be of type "Desktop app" (any loopback port works).

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events', // read + write events
  'https://www.googleapis.com/auth/gmail.readonly', // inbox highlights, never sends
];
const PORT = 8765;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;

const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.');
  Deno.exit(1);
}

const state = crypto.randomUUID();
const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: clientId,
  redirect_uri: REDIRECT,
  response_type: 'code',
  scope: SCOPES.join(' '),
  access_type: 'offline',
  prompt: 'consent',
  state,
});
console.log(`\nOpen this URL in your browser and approve access:\n\n${url}\n`);

const ac = new AbortController();
const server = Deno.serve({ hostname: '127.0.0.1', port: PORT, signal: ac.signal, onListen: () => {} }, async (req) => {
  const u = new URL(req.url);
  if (u.pathname !== '/callback') return new Response('Not found', { status: 404 });
  if (u.searchParams.get('state') !== state) return new Response('State mismatch', { status: 400 });
  const code = u.searchParams.get('code');
  if (!code) return new Response(`Denied: ${u.searchParams.get('error')}`, { status: 400 });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT,
      grant_type: 'authorization_code',
    }),
  });
  const j = await res.json();
  if (!j.refresh_token) {
    console.error('No refresh token returned:', j.error ?? j);
  } else {
    console.log('\nRefresh token (keep it secret):\n');
    console.log(j.refresh_token);
    console.log('\nNext: supabase secrets set GOOGLE_REFRESH_TOKEN=<the token above> --project-ref <ref>\n');
  }
  setTimeout(() => ac.abort(), 100);
  return new Response('All set. You can close this tab and return to the terminal.');
});
await server.finished;
