export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.RLS_ALLOWED_ORIGIN || "https://rlsj.ir";

    if (request.method === "OPTIONS") {
      return new Response("", {
        status: 204,
        headers: corsHeaders(origin, allowed)
      });
    }

    if (origin && origin !== allowed) {
      return json({ error: "Origin not allowed." }, 403, origin, allowed);
    }

    if (request.method !== "POST") {
      return json({ error: "POST required." }, 405, origin, allowed);
    }

    if (!env.OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY is not configured." }, 500, origin, allowed);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON request." }, 400, origin, allowed);
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const sourceLanguage = typeof body.sourceLanguage === "string" ? body.sourceLanguage : "";
    if (!text) {
      return json({ error: "text is required." }, 400, origin, allowed);
    }

    const prompt = [
      "You are the metadata and translation assistant for the academic journal Russian Language Studies (RLS).",
      "The input is extracted text from a scholarly article PDF.",
      "Return ONLY valid JSON. Do not use markdown fences and do not add commentary.",
      "",
      "Tasks:",
      "1. Identify the article title and reproduce it in the source language.",
      "2. Produce accurate academic translations of title, abstract, and keywords into Persian (fa), English (en), and Russian (ru).",
      "3. Identify every author that can be supported by the supplied text. Preserve personal names carefully; do not invent or normalize a person's name without evidence.",
      "4. Identify each author's affiliation in Persian, English, and Russian. Translate institutional names academically when a reliable translation is clear; otherwise preserve the source wording rather than inventing an institution.",
      "5. Extract ORCID identifiers exactly. Never alter an ORCID. If absent, return an empty string.",
      "6. If an abstract or keyword list is not actually present or cannot be recovered, return an empty value rather than inventing one.",
      "7. If the PDF already contains a Persian, English, or Russian version of a field, prefer that actual text over machine translation.",
      "8. Do not infer article type, publication dates, page range, DOI, journal issue, or other bibliographic facts not present in the input.",
      "",
      "Return exactly this shape:",
      '{"sourceLanguage":"fa|en|ru","title":{"fa":"","en":"","ru":""},"abstract":{"fa":"","en":"","ru":""},"keywords":{"fa":[],"en":[],"ru":[]},"authors":[{"fa":"","en":"","ru":"","affFa":"","affEn":"","affRu":"","orcid":""}]}',
      "",
      "Detected source language: " + sourceLanguage,
      "",
      "ARTICLE TEXT:",
      text
    ].join("\n");

    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-5.6-luna",
        input: prompt,
        max_output_tokens: 12000
      })
    });

    let apiData = {};
    try { apiData = await apiResponse.json(); } catch {}

    if (!apiResponse.ok) {
      return json({
        error: apiData.error?.message || ("OpenAI HTTP " + apiResponse.status)
      }, 502, origin, allowed);
    }

    const outputText = extractOutputText(apiData);
    if (!outputText) {
      return json({ error: "AI returned no text output." }, 502, origin, allowed);
    }

    let result;
    try {
      result = JSON.parse(cleanJson(outputText));
    } catch {
      return json({ error: "AI returned invalid JSON.", raw: outputText.slice(0, 4000) }, 502, origin, allowed);
    }

    return json({ result }, 200, origin, allowed);
  }
};

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const part of item.content || []) {
      if (typeof part.text === "string") chunks.push(part.text);
    }
  }
  return chunks.join("\n");
}

function cleanJson(text) {
  return String(text)
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^\s*\`\`\`(?:json)?\s*/i, "")
    .replace(/\s*\`\`\`\s*$/i, "")
    .trim();
}

function corsHeaders(origin, allowed) {
  return {
    "Access-Control-Allow-Origin": origin === allowed ? allowed : allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(value, status, origin, allowed) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin, allowed)
    }
  });
}
