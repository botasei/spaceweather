function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);

  // GET /api/archive  -> список дат
  if (request.method === "GET" && !url.searchParams.get("date")) {
    const raw = await env.SW_KV.get("forecast:manifest");
    const dates = raw ? JSON.parse(raw) : [];
    return jsonResponse({ ok: true, dates });
  }

  // GET /api/archive?date=YYYY-MM-DD -> данные за дату
  if (request.method === "GET" && url.searchParams.get("date")) {
    const date = url.searchParams.get("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return jsonResponse({ ok: false, error: "Bad date format" }, 400);
    }
    const raw = await env.SW_KV.get(`forecast:${date}`);
    if (!raw) return jsonResponse({ ok: false, error: "Not found" }, 404);
    return jsonResponse({ ok: true, data: JSON.parse(raw) });
  }

  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}
