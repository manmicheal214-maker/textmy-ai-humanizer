const URL_RE = /https?:\/\/[^\s"'<>)\]]+/gi;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const NUMBER_RE = /\b\d[\d,.\s]*\d\b|\b\d+\b/g;
const CITATION_RE = /\(([^)]+?\d{4}[^)]*?)\)/g;

const META_PREFIXES = [
  /^here\s+is\s+the\s+rewritten\s+text/i,
  /^here\s+is\s+the\s+rewritten\s+version/i,
  /^here'?s\s+the\s+rewritten/i,
  /^i\s+have\s+rewritten/i,
  /^as\s+an\s+ai/i,
  /^sure,?\s*here\s+is/i,
  /^certainly,?\s*here\s+is/i,
  /^of\s+course,?\s*here\s+is/i,
  /^below\s+is\s+the\s+rewritten/i,
  /^the\s+rewritten\s+text\s+is/i,
  /^rewritten\s+text:/i,
  /^rewritten\s+version:/i,
  /^output:/i,
  /^result:/i,
];

function extractMatches(text, regex) {
  const set = new Set();
  let m;
  const re = new RegExp(regex.source, regex.flags);
  while ((m = re.exec(text)) !== null) {
    set.add(m[0].trim().toLowerCase());
  }
  return set;
}

function stripMetaPrefix(text) {
  for (const re of META_PREFIXES) {
    if (re.test(text)) {
      return text.replace(re, "").replace(/^[\s:—-]+/, "").trim();
    }
  }
  return text;
}

export function validateOutput(result, original) {
  if (typeof result !== "string") return { ok: false, reason: "not_string" };
  if (result.trim().length === 0) return { ok: false, reason: "empty" };

  let cleaned = result.trim();
  cleaned = stripMetaPrefix(cleaned);
  if (cleaned.length === 0) return { ok: false, reason: "only_meta" };

  const lower = cleaned.toLowerCase();
  const ERROR_INDICATORS = ["i cannot", "i can't", "i'm unable to", "i am unable to", "error:", "sorry,", "as a language model", "i apologize"];
  for (const indicator of ERROR_INDICATORS) {
    if (lower.startsWith(indicator)) return { ok: false, reason: "error_message" };
  }

  const checks = [
    { name: "url", regex: URL_RE },
    { name: "email", regex: EMAIL_RE },
    { name: "citation", regex: CITATION_RE },
  ];

  for (const { name, regex } of checks) {
    const originalItems = extractMatches(original, regex);
    if (originalItems.size > 0) {
      const rewrittenItems = extractMatches(cleaned, regex);
      let missing = 0;
      for (const item of originalItems) {
        if (!rewrittenItems.has(item)) missing++;
      }
      if (missing / originalItems.size > 0.3) return { ok: false, reason: name + "_missing" };
    }
  }

  const originalNumbers = extractMatches(original, NUMBER_RE);
  if (originalNumbers.size > 0) {
    const rewrittenNumbers = extractMatches(cleaned, NUMBER_RE);
    let missing = 0;
    for (const num of originalNumbers) {
      if (!rewrittenNumbers.has(num)) missing++;
    }
    if (missing / originalNumbers.size > 0.3) return { ok: false, reason: "number_missing" };
  }

  return { ok: true, text: cleaned };
}
