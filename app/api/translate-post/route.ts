import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

type TranslatePayload = {
  title?: string;
  body?: string;
  cta?: string;
  targetLanguage?: string;
};

export async function POST(request: Request) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { ok: false, message: "missing OPENAI_API_KEY for post translation" },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as TranslatePayload | null;
  const title = typeof body?.title === "string" ? body.title : "";
  const caption = typeof body?.body === "string" ? body.body : "";
  const cta = typeof body?.cta === "string" ? body.cta : "";
  const targetLanguage = body?.targetLanguage === "pl" ? "Polish" : "Polish";

  if (!(title.trim() || caption.trim() || cta.trim())) {
    return NextResponse.json({ ok: false, message: "nothing to translate" }, { status: 400 });
  }

  if (title.length > 400 || caption.length > 4000 || cta.length > 200) {
    return NextResponse.json({ ok: false, message: "post copy is too long to translate in one request" }, { status: 400 });
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You translate short social app copy into natural Polish. Preserve @mentions, URLs, emoji, line breaks, slang energy, and brand names. Do not add commentary. Return strict JSON with keys sourceLanguage, title, body, cta.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: `Translate this post into ${targetLanguage}. If any field is already best left unchanged, keep it as-is.`,
            title,
            body: caption,
            cta,
          }),
        },
      ],
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{
          message?: {
            content?: string | null;
          };
        }>;
        error?: {
          message?: string;
        };
      }
    | null;

  if (!response.ok) {
    return NextResponse.json(
      { ok: false, message: payload?.error?.message || "translation request failed" },
      { status: response.status || 500 },
    );
  }

  const rawContent = payload?.choices?.[0]?.message?.content ?? "";
  let parsed: Partial<{
    sourceLanguage: string;
    title: string;
    body: string;
    cta: string;
  }> = {};

  try {
    parsed = JSON.parse(rawContent) as typeof parsed;
  } catch {
    return NextResponse.json({ ok: false, message: "translation response was not valid json" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    sourceLanguage: typeof parsed.sourceLanguage === "string" ? parsed.sourceLanguage : "",
    translation: {
      title: typeof parsed.title === "string" ? parsed.title : "",
      body: typeof parsed.body === "string" ? parsed.body : "",
      cta: typeof parsed.cta === "string" ? parsed.cta : "",
    },
  });
}
