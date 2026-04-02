/**
 * Cloudflare Pages Function: /api/inbox
 *
 * GET  /api/inbox?blogId=X  → returns messages from D1 for the portal frontend
 * POST /api/inbox           → accepts sync payload from n8n, upserts into D1
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method === 'GET') {
    return handleGet(request, env);
  }

  if (request.method === 'POST') {
    return handlePost(request, env);
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}

// ─── GET: Return messages for a blogId ───────────────────────────────────────
async function handleGet(request, env) {
  const url = new URL(request.url);
  const blogId = url.searchParams.get('blogId');

  if (!blogId) {
    return json({ error: 'blogId is required' }, 400);
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM unified_messages
       WHERE blogId = ?
       ORDER BY timestamp DESC
       LIMIT 200`
    ).bind(blogId).all();

    return json({ messages: results ?? [] });
  } catch (err) {
    return json({ error: 'Database error', detail: err.message }, 500);
  }
}

// ─── POST: Upsert messages from n8n sync ─────────────────────────────────────
async function handlePost(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  // Accept either a single message or an array
  const messages = Array.isArray(body) ? body : [body];

  if (messages.length === 0) {
    return json({ ok: true, upserted: 0 });
  }

  let upserted = 0;
  const stmt = env.DB.prepare(
    `INSERT INTO unified_messages
       (blogId, conversationId, network, type, userName, text, rating, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(blogId, conversationId) DO UPDATE SET
       userName  = excluded.userName,
       text      = excluded.text,
       rating    = excluded.rating,
       timestamp = excluded.timestamp,
       synced_at = unixepoch()`
  );

  // Batch in groups of 50
  const BATCH = 50;
  for (let i = 0; i < messages.length; i += BATCH) {
    const chunk = messages.slice(i, i + BATCH);
    const batch = chunk.map(m =>
      stmt.bind(
        m.blogId        ?? '',
        m.conversationId ?? String(m.id ?? Math.random()),
        m.network       ?? 'unknown',
        m.type          ?? 'message',
        m.userName      ?? null,
        m.text          ?? null,
        m.rating        ?? null,
        m.timestamp     ?? Math.floor(Date.now() / 1000)
      )
    );
    await env.DB.batch(batch);
    upserted += chunk.length;
  }

  return json({ ok: true, upserted });
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
