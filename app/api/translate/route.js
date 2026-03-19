import { bedrockAnthropic } from "@ai-sdk/amazon-bedrock/anthropic";
import { smoothStream, streamText } from "ai";
import { getLanguageLabel } from "../../../lib/languages";

const MAX_TEXT_LENGTH = 5000;
const DEFAULT_MODEL_ID =
  process.env.BEDROCK_MODEL_ID ||
  "us.anthropic.claude-opus-4-6-v1";

export const runtime = "nodejs";
export const maxDuration = 30;

function buildPrompt({
  prompt,
  sourceLanguage,
  sourceCustom,
  targetLanguage,
  customTarget
}) {
  const sourceLabel = getLanguageLabel(sourceLanguage || "auto");
  const sourceCustomLabel = (sourceCustom || "").trim();
  const targetLabel = getLanguageLabel(targetLanguage || "it");
  const customLabel = (customTarget || "").trim();

  return [
    sourceCustomLabel
      ? `Interpret the source as being written in this language, style, or persona: ${sourceCustomLabel}.`
      : sourceLabel === "Detect language"
      ? "Detect the source language from the user's text."
      : `The source language is ${sourceLabel}.`,
    customLabel
      ? `Rewrite the text so it feels like this target voice, persona, or comedic framing: ${customLabel}.`
      : `Translate the text into ${targetLabel}.`,
    "Rules:",
    "- Preserve the original meaning, tone, formatting, paragraph breaks, and line structure.",
    "- Keep links, code snippets, numbers, and proper nouns intact unless translation is obviously required.",
    customLabel
      ? "- If the target is a character, archetype, celebrity, or joke persona, produce a playful stylized rewrite that evokes that idea rather than explaining it."
      : "- Use natural, fluent wording for the target language.",
    customLabel
      ? "- Lean into distinctive phrasing, rhythm, and verbal tics when helpful, but keep the text readable."
      : "- Keep the output faithful and concise.",
    "- Do not explain your work.",
    "- Return only the translated text.",
    "",
    "<text>",
    prompt,
    "</text>"
  ].join("\n");
}

function errorResponse(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const prompt =
      typeof body.prompt === "string" ? body.prompt.trim() : "";
    const sourceLanguage =
      typeof body.sourceLanguage === "string" ? body.sourceLanguage : "auto";
    const sourceCustom =
      typeof body.sourceCustom === "string" ? body.sourceCustom.trim() : "";
    const targetLanguage =
      typeof body.targetLanguage === "string" ? body.targetLanguage : "it";
    const customTarget =
      typeof body.customTarget === "string" ? body.customTarget.trim() : "";

    if (!prompt) {
      return errorResponse("Text is required.");
    }

    if (prompt.length > MAX_TEXT_LENGTH) {
      return errorResponse("Please keep the text under 5,000 characters.");
    }

    if (
      !sourceCustom &&
      !customTarget &&
      sourceLanguage !== "auto" &&
      sourceLanguage === targetLanguage
    ) {
      return new Response(prompt, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      });
    }

    const result = streamText({
      model: bedrockAnthropic(DEFAULT_MODEL_ID),
      system:
        "You are a precise translation engine. Output only the final translated text with no commentary, no quotes, and no surrounding labels.",
      prompt: buildPrompt({
        prompt,
        sourceLanguage,
        sourceCustom,
        targetLanguage,
        customTarget
      }),
      temperature: customTarget ? 0.4 : 0.2,
      maxOutputTokens: 1400,
      experimental_transform: smoothStream({
        delayInMs: 18,
        chunking: "word"
      }),
      onError({ error }) {
        console.error("Bedrock translation error:", error);
      }
    });

    return result.toTextStreamResponse({
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Model": DEFAULT_MODEL_ID
      }
    });
  } catch (error) {
    console.error("Route failure:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Translation failed.",
      500
    );
  }
}
