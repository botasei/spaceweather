function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function getAlmatyDateISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const d = parts.find(p => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

export async function onRequest({ request, env }) {

  if (request.method === "GET") {
    const raw = await env.SW_KV.get("forecast:current");
    if (!raw) return jsonResponse({ ok: true, data: null });
    return jsonResponse({ ok: true, data: JSON.parse(raw) });
  }

  if (request.method === "POST") {

    const token = request.headers.get("X-Admin-Token") || "";
    if (token !== env.ADMIN_TOKEN) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const data = await request.json();

    if (!data.dates || !data.kp || data.dates.length !== 6) {
      return jsonResponse({ ok: false, error: "Invalid data" }, 400);
    }

    await env.SW_KV.put("forecast:current", JSON.stringify(data));

    const day = getAlmatyDateISO();
    await env.SW_KV.put(`forecast:${day}`, JSON.stringify(data));

    const manifestKey = "forecast:manifest";
    const rawManifest = await env.SW_KV.get(manifestKey);
    let manifest = rawManifest ? JSON.parse(rawManifest) : [];

    if (!manifest.includes(day)) {
      manifest.unshift(day);
      await env.SW_KV.put(manifestKey, JSON.stringify(manifest));
    }

    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}
