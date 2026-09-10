const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent";

const BASE_INSTRUCTIONS = `You are a semantic rewriting engine.

Rewrite the supplied text so that it is clearer, more natural,
readable, coherent, and stylistically varied.

The highest priority is preserving the original meaning.

STRICT RULES:

- Preserve factual claims.
- Preserve names.
- Preserve dates.
- Preserve numbers.
- Preserve URLs.
- Preserve citations.
- Preserve quotations.
- Preserve technical terminology when necessary.
- Preserve negation.
- Preserve uncertainty.
- Preserve qualifications.
- Preserve conditions.
- Preserve conclusions.
- Do not invent facts.
- Do not fabricate sources.
- Do not add unsupported information.
- Do not remove important information.
- Do not change mathematical values.
- Do not alter code.
- Do not change the author's position.
- Keep the original language.
- Return ONLY the rewritten text.

Improve:

- sentence flow
- readability
- sentence variety
- paragraph coherence
- natural phrasing
- unnecessary repetition
- awkward wording
- excessive formality
- unnecessary filler
- repetitive transitions

Avoid:

- random synonym replacement
- exaggerated vocabulary
- unnecessary verbosity
- generic filler
- repetitive sentence openings
- repetitive conclusions
- AI meta-commentary
- explaining the rewriting process

Return ONLY the final rewritten text.`;

const INTENSITY_MODIFIERS = {
  light: `INTENSITY: light

Make small changes only:
- Fix awkward wording.
- Fix obvious repetition.
- Improve readability.
- Preserve most of the original structure.`,
  balanced: `INTENSITY: balanced

Make moderate changes:
- Improve sentence structure.
- Improve paragraph flow.
- Improve transitions.
- Reduce repetition.
- Improve vocabulary and readability.
- Preserve meaning.`,
  strong: `INTENSITY: strong

Make larger stylistic changes:
- Restructure sentences when appropriate.
- Combine related sentences.
- Split overly long sentences.
- Improve paragraph flow.
- Create greater stylistic variation.

Never change factual meaning.
Never invent information.`,
};

function buildPrompt(text, intensity) {
  return BASE_INSTRUCTIONS + "\n\n" + (INTENSITY_MODIFIERS[intensity] || INTENSITY_MODIFIERS.balanced) + "\n\nTEXT TO REWRITE:\n\"\"\"\n" + text + '\n\"\"\"\n\nReturn ONLY the rewritten text. No explanations, no preamble, no postscript.';
}

export async function rewriteText(text, intensity, env) {
  const prompt = buildPrompt(text, intensity);

  const requestBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 8192 },
  };

  let response;
  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    throw new Error("Gemini API request failed.");
  }

  if (!response.ok) {
    throw new Error("Gemini API returned status " + response.status + ".");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Gemini API returned invalid JSON.");
  }

  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("Gemini API returned no content.");
  }

  const resultText = parts.map((p) => p.text).join("").trim();
  if (!resultText) {
    throw new Error("Gemini API returned empty content.");
  }

  return resultText;
}
