const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;

const intensityInstructions = {
  light: "Make minimal stylistic changes (roughly 10–20%). Fix awkward wording, obvious repetition, and overly formal phrasing without restructuring unnecessarily.",
  balanced: "Make noticeable but conservative changes (roughly 20–40%). Improve sentence structure, paragraph flow, transitions, repetition, vocabulary, readability, and sentence-length variety.",
  strong: "Make substantial stylistic changes while preserving meaning. Restructure sentences and paragraphs, combine or split sentences where natural, and reduce repetitive patterns. Never invent, omit, or reinterpret information."
};

const SYSTEM_PROMPT = `You are a semantic rewriting engine. Rewrite the user's text to make it clearer, more natural, readable, and stylistically varied while preserving the author's intended meaning.

STRICT RULES:
1. Preserve factual claims, names, dates, numbers, measurements, technical terms, citations, references, URLs, and conclusions.
2. Preserve quotations exactly. Never rewrite text inside quotation marks, code fences, inline code, or URLs.
3. Preserve negation, uncertainty, hedging, qualifications, modality, and the author's position.
4. Do not invent facts, examples, sources, citations, or evidence. Do not add information.
5. Do not remove important information or materially shorten the substance.
6. Do not change mathematical values, equations, identifiers, or code.
7. Maintain the original language unless explicitly requested otherwise.
8. Avoid synonym substitution when it makes the writing less natural or changes technical meaning.
9. Return ONLY the rewritten text. Never add a preface, explanation, labels, or meta-commentary.

Improve sentence variety, natural phrasing, readability, transitions, clarity, conciseness, paragraph flow, and unnecessary repetition. Avoid inflated vocabulary, generic filler, repetitive sentence openings, excessive formal language, and formulaic conclusions.`;

async function rewriteText(text, intensity = "balanced") {
  if (!process.env.GEMINI_API_KEY) throw new Error("AI service is not configured.");
  const prompt = `${SYSTEM_PROMPT}\n\nREWRITE INTENSITY:\n${intensityInstructions[intensity] || intensityInstructions.balanced}\n\nUSER TEXT:\n${text}`;

  const response = await fetch(`${API_URL}?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: intensity === "strong" ? 0.8 : 0.65, topP: 0.9, maxOutputTokens: 8192 }
    })
  });

  if (!response.ok) {
    let detail = "";
    try { detail = (await response.json())?.error?.message || ""; } catch {}
    console.error("Gemini request failed:", response.status, detail.slice(0, 160));
    throw new Error("The rewriting service is temporarily unavailable.");
  }

  const data = await response.json();
  const output = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!output) throw new Error("The rewriting service returned no usable text.");
  return output;
}

module.exports = { rewriteText };
