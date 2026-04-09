/**
 * api.ts — Optional Claude API narration.
 *
 * Reads ANTHROPIC_API_KEY from the environment. If not set, all calls
 * return null and the caller falls back to static templates.
 *
 * All calls are bounded by API_TIMEOUT_MS — if the API is slow the hook
 * still exits quickly with a static fallback.
 */

const API_TIMEOUT_MS = 5_000;
const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001"; // Fast + cheap for flavour text
const MAX_TOKENS = 120;

const SYSTEM_PROMPT = `\
You are the System — the cold, omniscient game master from the Solo Leveling manhwa/anime.
Speak in brief, dramatic announcements: formal, impersonal, slightly ominous.
Refer to the player as "Hunter" only, never by name.
Present tense. No bullet points. Maximum 2 sentences.
Do not include quotation marks around your response.`;

interface AnthropicMessage {
  role: "user";
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system: string;
  messages: AnthropicMessage[];
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
}

async function fetchNarration(apiKey: string, userPrompt: string): Promise<string | null> {
  const body: AnthropicRequest = {
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: userPrompt }],
  };

  const response = await fetch(API_URL, {
    method:  "POST",
    headers: {
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as AnthropicResponse;
  return data.content[0]?.type === "text" ? (data.content[0].text.trim()) : null;
}

/**
 * Call the Claude API with a timeout. Returns null if:
 * - ANTHROPIC_API_KEY is not set
 * - The API call fails or times out
 * - The response is malformed
 */
export async function callNarrationApi(userPrompt: string): Promise<string | null> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return null;

  try {
    const result = await Promise.race<string | null>([
      fetchNarration(apiKey, userPrompt),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), API_TIMEOUT_MS)),
    ]);
    return result;
  } catch {
    return null;
  }
}
