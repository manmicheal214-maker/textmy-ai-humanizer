class TextHumanizer {
    constructor() {
        // Conservative substitutions: the goal is clearer, more natural prose,
        // not mechanically changing every occurrence of a word.
        this.phraseReplacements = [
            [/\bFurthermore\b/gi, "Also"],
            [/\bMoreover\b/gi, "Also"],
            [/\bIn addition\b/gi, "Also"],
            [/\bIn conclusion\b/gi, "Overall"],
            [/\bTo summarize\b/gi, "In short"],
            [/\bIt is important to note that\b/gi, "Keep in mind that"],
            [/\bIt should be noted that\b/gi, "It's worth noting that"],
            [/\bDue to the fact that\b/gi, "Because"],
            [/\bIn order to\b/gi, "To"],
            [/\bUtilize\b/gi, "Use"],
            [/\bUtilized\b/gi, "Used"],
            [/\bDemonstrate\b/gi, "Show"],
            [/\bApproximately\b/gi, "About"],
            [/\bA significant number of\b/gi, "Many"],
            [/\bA large number of\b/gi, "Many"],
            [/\bDelve into\b/gi, "Explore"],
            [/\bMyriad of\b/gi, "Many"],
            [/\bSeamless\b/gi, "Smooth"],
            [/\bMultifaceted\b/gi, "Complex"]
        ];

        // Irregular participles used only when a passive construction is safe to rewrite.
        this.participles = {
            written: "write", made: "make", built: "build", taken: "take",
            given: "give", seen: "see", known: "know", found: "find",
            chosen: "choose", broken: "break", driven: "drive", eaten: "eat",
            spoken: "speak", stolen: "steal", thrown: "throw", drawn: "draw",
            sent: "send", spent: "spend", kept: "keep", left: "leave",
            brought: "bring", bought: "buy", taught: "teach", thought: "think",
            caught: "catch", sold: "sell", read: "read',", done: "do",
            gone: "go", known: "know", shown: "show", grown: "grow",
            held: "hold", heard: "hear", lost: "lose", paid: "pay",
            put: "put", run: "run", said: "say", told: "tell", understood: "understand"
        };

        this.irregularPast = {
            write: "wrote", make: "made", build: "built", take: "took",
            give: "gave", see: "saw", know: "knew", find: "found",
            choose: "chose", break: "broke", drive: "drove", eat: "ate",
            speak: "spoke", steal: "stole", throw: "threw", draw: "drew",
            send: "sent", spend: "spent", keep: "kept", leave: "left",
            bring: "brought", buy: "bought", teach: "taught", think: "thought",
            catch: "caught", sell: "sold", do: "did", go: "went",
            show: "showed", grow: "grew", hold: "held", hear: "heard",
            lose: "lost", pay: "paid", put: "put", run: "ran",
            say: "said", tell: "told", understand: "understood"
        };

        this.commonTransitions = new Set([
            "however", "therefore", "also", "overall", "additionally",
            "moreover", "furthermore", "meanwhile", "instead", "still"
        ]);
    }

    humanize(text) {
        if (!text || !text.trim()) return "";

        let result = text.replace(/\r\n?/g, "\n");
        result = this.cleanPhrases(result);
        result = this.passiveToActive(result);
        result = this.fixRhythm(result);
        result = this.varyTransitions(result);
        result = this.cleanup(result);

        return result;
    }

    cleanPhrases(text) {
        return this.applyOutsideProtectedSpans(text, segment => {
            this.phraseReplacements.forEach(([pattern, replacement]) => {
                segment = segment.replace(pattern, match =>
                    this.preserveCase(match, replacement)
                );
            });
            return segment;
        });
    }

    /*
     * Only rewrite a passive construction when all of these are clear:
     * - there is an explicit "by" agent;
     * - the agent is short enough to be unambiguous;
     * - the participle is in our known-verb dictionary;
     * - the construction is simple enough that changing word order won't
     *   damage the meaning.
     */
    passiveToActive(text) {
        const sentencePattern = /[^.!?]+(?:[.!?]+|$)/g;

        return text.replace(sentencePattern, sentence => {
            const match = sentence.match(
                /^(\s*)((?:the|a|an)\s+[^,;:!?]+?)\s+(was|were|is|are)\s+([a-z]+)\s+by\s+([^,;:!?]+?)([.!?]+)?\s*$/i
            );

            if (!match) return sentence;

            const [, leading, object, auxiliary, participle, actor, punctuation = ""] = match;
            const normalizedParticiple = participle.toLowerCase();
            const baseVerb = this.toBaseVerb(normalizedParticiple);

            if (!baseVerb || this.wordCount(actor) > 6) return sentence;

            const tense = /^(was|were)$/i.test(auxiliary) ? "past" : "present";
            const activeVerb = tense === "past"
                ? this.toPastTense(baseVerb)
                : this.toPresentTense(baseVerb, actor);

            if (!activeVerb) return sentence;

            const output = `${actor.trim()} ${activeVerb} ${object.trim()}${punctuation}`;
            return leading + this.matchCapitalization(sentence.trimStart(), output);
        });
    }

    toBaseVerb(participle) {
        if (this.participles[participle]) {
            // Guard against malformed dictionary entries.
            return this.participles[participle].replace(/[^a-z]/gi, "");
        }

        if (!participle.endsWith("ed")) return null;

        // Common doubled-consonant forms: planned -> plan, stopped -> stop.
        if (/([a-z])\1ed$/.test(participle)) {
            return participle.slice(0, -3);
        }

        if (participle.endsWith("ied")) {
            return participle.slice(0, -3) + "y";
        }

        if (participle.endsWith("ed")) {
            const stem = participle.slice(0, -2);
            if (stem.endsWith("v") || stem.endsWith("c") || stem.endsWith("g") || stem.endsWith("t")) {
                return stem;
            }
            // created -> create, liked -> like, used -> use
            if (stem.endsWith("at") || stem.endsWith("it") || stem.endsWith("us")) {
                return stem + "e";
            }
            return stem;
        }

        return null;
    }

    toPastTense(baseVerb) {
        if (this.irregularPast[baseVerb]) return this.irregularPast[baseVerb];
        if (baseVerb.endsWith("e")) return baseVerb + "d";
        if (baseVerb.endsWith("y") && !/[aeiou]y$/.test(baseVerb)) {
            return baseVerb.slice(0, -1) + "ied";
        }
        return baseVerb + "ed";
    }

    toPresentTense(baseVerb, actor) {
        const actorText = actor.trim().toLowerCase();
        const plural = /^(the|these|those|some|many|several)\b/.test(actorText) ||
            /\b(they|we|you|i)\b/.test(actorText) ||
            /\band\b/.test(actorText);

        if (plural) return baseVerb;
        if (baseVerb.endsWith("s") || baseVerb.endsWith("x") || baseVerb.endsWith("ch") || baseVerb.endsWith("sh")) {
            return baseVerb + "es";
        }
        if (baseVerb.endsWith("y") && !/[aeiou]y$/.test(baseVerb)) {
            return baseVerb.slice(0, -1) + "ies";
        }
        return baseVerb + "s";
    }

    fixRhythm(text) {
        const paragraphs = text.split(/\n{2,}/);

        return paragraphs
            .map(paragraph => this.processParagraph(paragraph))
            .filter(Boolean)
            .join("\n\n");
    }

    processParagraph(paragraph) {
        if (!paragraph.trim()) return "";

        const sentences = this.splitSentences(paragraph).map(text => ({
            text: text.trim(),
            length: this.wordCount(text)
        }));

        const merged = [];
        for (let i = 0; i < sentences.length; i++) {
            const current = sentences[i];
            const next = sentences[i + 1];

            if (
                next &&
                current.length <= 4 &&
                next.length <= 6 &&
                !this.looksLikeHeading(current.text) &&
                !this.looksLikeHeading(next.text) &&
                !this.isListItem(current.text) &&
                !this.isListItem(next.text)
            ) {
                const first = current.text.replace(/[.!?]+$/, "");
                const second = next.text.replace(/^\s+/, "");
                merged.push({
                    text: `${first} — ${this.lowercaseFirst(second)}`,
                    length: current.length + next.length
                });
                i++;
            } else {
                merged.push(current);
            }
        }

        const output = [];
        merged.forEach(sentence => {
            const parts = this.splitLongSentence(sentence.text);
            parts.forEach(part => output.push(part));
        });

        return output.join(" ").replace(/[ \t]+/g, " ").trim();
    }

    splitLongSentence(sentence) {
        if (this.wordCount(sentence) < 32) return [sentence];

        const words = sentence.trim().split(/\s+/);
        const middle = Math.floor(words.length / 2);
        const candidates = [];

        for (let i = Math.max(4, middle - 6); i <= Math.min(words.length - 4, middle + 6); i++) {
            if (/[,:;]/.test(words[i])) {
                const punctuation = words[i].match(/[,:;]/)[0];
                const score = punctuation === ";" ? 3 : punctuation === ":" ? 2 : 1;
                candidates.push({ index: i + 1, score: score - Math.abs(i - middle) * 0.05 });
            }
        }

        if (!candidates.length) return [sentence];

        candidates.sort((a, b) => b.score - a.score);
        const splitAt = candidates[0].index;
        let first = words.slice(0, splitAt).join(" ");
        let second = words.slice(splitAt).join(" ");

        if (!first.endsWith(".")) first += ".";
        second = this.capitalizeFirst(second);

        return [first, second];
    }

    varyTransitions(text) {
        // Avoid repeatedly stacking the same formal transition at the start of sentences.
        const seen = new Map();
        return this.applyOutsideProtectedSpans(text, segment => {
            return segment.replace(/(^|[.!?]\s+)([A-Za-z][^.!?]{0,80}?)(?=\s|,)/g, (match, prefix, firstPart) => {
                const key = firstPart.trim().toLowerCase().replace(/,$/, "");
                if (!this.commonTransitions.has(key)) return match;

                const count = seen.get(key) || 0;
                seen.set(key, count + 1);

                if (count === 0) return match;
                if (key === "furthermore" || key === "moreover" || key === "additionally") {
                    return prefix + this.lowercaseFirst(firstPart.replace(/,$/, "")) + ",";
                }
                return match;
            });
        });
    }

    splitSentences(text) {
        // Protect decimal numbers, initials, URLs and common abbreviations before splitting.
        const protectedTokens = [];
        const protectedText = text.replace(
            /(?:https?:\/\/\S+|www\.\S+|\b\d+\.\d+\b|\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|e\.g|i\.e|etc)\.)/gi,
            match => {
                const token = `__PROTECTED_${protectedTokens.length}__`;
                protectedTokens.push(match);
                return token;
            }
        );

        const parts = protectedText.match(/[^.!?]+(?:[.!?]+|$)/g) || [protectedText];
        return parts.map(part => part.replace(/__PROTECTED_(\d+)__/g, (_, index) => protectedTokens[Number(index)]));
    }

    applyOutsideProtectedSpans(text, callback) {
        const protectedSpans = [];
        const masked = text.replace(/```[\s\S]*?```|`[^`]*`|https?:\/\/\S+/g, match => {
            const token = `__SPAN_${protectedSpans.length}__`;
            protectedSpans.push(match);
            return token;
        });

        const processed = callback(masked);
        return processed.replace(/__SPAN_(\d+)__/g, (_, index) => protectedSpans[Number(index)]);
    }

    looksLikeHeading(text) {
        return text.length < 60 && !/[.!?]$/.test(text);
    }

    isListItem(text) {
        return /^(?:[-*•]|\d+[.)])\s+/.test(text.trim());
    }

    wordCount(text) {
        const words = text.trim().match(/\S+/g);
        return words ? words.length : 0;
    }

    preserveCase(original, replacement) {
        if (original === original.toUpperCase()) return replacement.toUpperCase();
        if (/^[A-Z]/.test(original)) return this.capitalizeFirst(replacement);
        return replacement;
    }

    matchCapitalization(original, replacement) {
        if (/^[A-Z]/.test(original)) return this.capitalizeFirst(replacement);
        return replacement;
    }

    capitalizeFirst(text) {
        return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
    }

    lowercaseFirst(text) {
        return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
    }

    cleanup(text) {
        return text
            .replace(/[ \t]+/g, " ")
            .replace(/\s+([,.!?;:])/g, "$1")
            .replace(/([.!?]){2,}/g, "$1")
            .replace(/\n[ \t]+/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }
}

// --------------------------------------------------
// UI
// --------------------------------------------------

const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const humanizeBtn = document.getElementById("humanizeBtn");
const copyBtn = document.getElementById("copyBtn");

const inputCount = document.getElementById("inputCount");
const outputCount = document.getElementById("outputCount");
const status = document.getElementById("status");

const humanizer = new TextHumanizer();

function updateCounter(element, counter) {
    const count = element.value.length;
    counter.textContent = `${count.toLocaleString()} characters`;
}

function showStatus(message, type = "default") {
    status.textContent = message;

    const colors = {
        default: "text-slate-500",
        success: "text-emerald-400",
        error: "text-red-400",
        warning: "text-yellow-400"
    };

    status.className = `text-center text-sm mt-6 min-h-[20px] ${colors[type]}`;
}

humanizeBtn.addEventListener("click", () => {
    const input = inputText.value.trim();

    if (!input) {
        showStatus("Please enter some text first.", "error");
        inputText.focus();
        return;
    }

    try {
        humanizeBtn.disabled = true;
        humanizeBtn.textContent = "Rewriting...";

        const result = humanizer.humanize(input);
        outputText.value = result;

        updateCounter(outputText, outputCount);
        showStatus("Text rewritten successfully.", "success");
    } catch (error) {
        console.error(error);
        showStatus("Something went wrong while processing the text.", "error");
    } finally {
        humanizeBtn.disabled = false;
        humanizeBtn.textContent = "✨ Rewrite Text";
    }
});

copyBtn.addEventListener("click", async () => {
    const text = outputText.value.trim();

    if (!text) {
        showStatus("There is no output to copy.", "warning");
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        showStatus("Copied to clipboard!", "success");
    } catch (error) {
        outputText.select();
        document.execCommand("copy");
        showStatus("Copied to clipboard!", "success");
    }
});

inputText.addEventListener("input", () => {
    updateCounter(inputText, inputCount);
});

updateCounter(inputText, inputCount);
updateCounter(outputText, outputCount);
