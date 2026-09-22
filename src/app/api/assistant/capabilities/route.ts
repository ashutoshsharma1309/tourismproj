import { NextResponse } from "next/server";

import { GUIDE_LANGUAGES, NOT_YET_OFFERED } from "@/lib/assistant/languages";
import { languageModel } from "@/lib/assistant/llm";
import { routingConfigured } from "@/lib/assistant/routing";
import { serverSpeechConfigured } from "@/lib/assistant/speech-server";
import { weatherConfigured } from "@/lib/assistant/weather";

/**
 * What the Guide can do on this deployment, and in which languages — so the
 * interface offers only what works, and says plainly what does not.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const model = languageModel();
  const speech = serverSpeechConfigured();
  return NextResponse.json(
    {
      model: model ? { configured: true, provider: model.provider } : { configured: false },
      voiceInput: Boolean(process.env.GROQ_API_KEY),
      routing: routingConfigured(),
      weather: weatherConfigured(),
      serverSpeech: speech ? { configured: true, languages: speech.languages } : { configured: false },
      languages: GUIDE_LANGUAGES,
      notYetOffered: NOT_YET_OFFERED,
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
