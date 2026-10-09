const ALLOWED_ORIGINS = new Set([
  "https://rlsj.ir",
  "https://www.rlsj.ir"
]);

const ALLOWED_ARTICLES = new Set([
  "ai-supported-multimodal-russian-language-learning",
  "role-of-context-russian-verbal-aspect",
  "challenges-russian-technical-military-terminology",
  "fate-family-human-values-don-stories"
]);

function corsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://rlsj.ir";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function validSlug(slug) {
  return typeof slug === "string" && ALLOWED_ARTICLES.has(slug);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "origin_not_allowed" }, 403, origin);
    }

    if (!env.RLS_COUNTER_DB) {
      return json({ error: "database_binding_missing" }, 500, origin);
    }

    if (url.pathname === "/api/view" && request.method === "GET") {
      const slug = url.searchParams.get("article");
      if (!validSlug(slug)) return json({ error: "invalid_article" }, 400, origin);

      await env.RLS_COUNTER_DB.prepare(
        "INSERT INTO article_views (slug, views) VALUES (?1, 1) " +
        "ON CONFLICT(slug) DO UPDATE SET views = views + 1"
      ).bind(slug).run();

      const row = await env.RLS_COUNTER_DB
        .prepare("SELECT views FROM article_views WHERE slug = ?1")
        .bind(slug)
        .first();

      return json({ article: slug, views: Number(row?.views || 0) }, 200, origin);
    }

    if (url.pathname === "/api/count" && request.method === "GET") {
      const slug = url.searchParams.get("article");
      if (!validSlug(slug)) return json({ error: "invalid_article" }, 400, origin);

      const row = await env.RLS_COUNTER_DB
        .prepare("SELECT views FROM article_views WHERE slug = ?1")
        .bind(slug)
        .first();

      return json({ article: slug, views: Number(row?.views || 0) }, 200, origin);
    }

    if (url.pathname === "/api/view" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid_json" }, 400, origin);
      }

      const slug = body?.article;
      if (!validSlug(slug)) return json({ error: "invalid_article" }, 400, origin);

      await env.RLS_COUNTER_DB.prepare(
        "INSERT INTO article_views (slug, views) VALUES (?1, 1) " +
        "ON CONFLICT(slug) DO UPDATE SET views = views + 1"
      ).bind(slug).run();

      const row = await env.RLS_COUNTER_DB
        .prepare("SELECT views FROM article_views WHERE slug = ?1")
        .bind(slug)
        .first();

      return json({ article: slug, views: Number(row?.views || 0) }, 200, origin);
    }

    return json({ error: "not_found" }, 404, origin);
  }
};
