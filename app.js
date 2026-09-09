class TextHumanizer {
    constructor() {
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

        /*
         * A conservative dictionary of common passive participles.
         * We only transform constructions we can reasonably understand.
         */
        this.irregulars = {
            written: "write",
            made: "make",
            built: "build",
            taken: "take",
            given: "give",
            seen: "see",
            known: "know",
            found: "find",
            chosen: "choose",
            broken: "break",
            driven: "drive",
            eaten: "eat",
            spoken: "speak",
            stolen: "steal",
            thrown: "throw",
            drawn: "draw",
            sent: "send",
            spent: "spend",
            kept: "keep",
            left: "leave",
            brought: "bring",
            bought: "buy",
            taught: "teach",
            thought: "think",
            caught: "catch",
            sold: "sell"
        };
    }

    humanize(text) {
        let result = text;

        result = this.cleanPhrases(result);
        result = this.passiveToActive(result);
        result = this.fixRhythm(result);
        result = this.cleanup(result);

        return result;
    }

    cleanPhrases(text) {
        this.phraseReplacements.forEach(([pattern, replacement]) => {
            text = text.replace(pattern, replacement);
        });

        return text;
    }

    /*
     * Conservative passive voice detection.
     *
     * Examples:
     * "The report was written by Sarah."
     * "The system was built by the team."
     *
     * We deliberately avoid attempting complicated sentences.
     */
    passiveToActive(text) {
        const pattern =
            /\b((?:the|a|an)\s+[^.!?;]+?)\s+\b(was|were|is|are|been|being)\s+([a-z]+(?:ed|en|t))\s+by\s+([^.!?;,]+)(?=[.!?]|$)/gi;

        return text.replace(
            pattern,
            (match, object, auxiliary, participle, actor) => {
                const verb = participle.toLowerCase();
                const baseVerb = this.toBaseVerb(verb);

                if (!baseVerb) {
                    return match;
                }

                const tense = /was|were/i.test(auxiliary)
                    ? "past"
                    : "present";

                const activeVerb = this.toActiveVerb(
                    baseVerb,
                    tense,
                    actor
                );

                if (!activeVerb) {
                    return match;
                }

                const output =
                    `${actor.trim()} ${activeVerb} ${object.trim()}`;

                return this.matchCapitalization(match, output);
            }
        );
    }

    toBaseVerb(participle) {
        if (this.irregulars[participle]) {
            return this.irregulars[participle];
        }

        /*
         * Basic -ed handling.
         *
         * This intentionally stays conservative rather than trying
         * to conjugate every English verb.
         */
        if (participle.endsWith("ied")) {
            return participle.slice(0, -3) + "y";
        }

        if (participle.endsWith("ed")) {
            return participle.slice(0, -2);
        }

        return null;
    }

    toActiveVerb(baseVerb, tense, actor) {
        if (tense === "past") {
            return this.toPastTense(baseVerb);
        }

        return this.toPresentTense(baseVerb, actor);
    }

    toPastTense(baseVerb) {
        const irregularPast = {
            write: "wrote",
            make: "made",
            build: "built",
            take: "took",
            give: "gave",
            see: "saw",
            know: "knew",
            find: "found",
            choose: "chose",
            break: "broke",
            drive: "drove",
            eat: "ate",
            speak: "spoke",
            steal: "stole",
            throw: "threw",
            draw: "drew",
            send: "sent",
            spend: "spent",
            keep: "kept",
            leave: "left",
            bring: "brought",
            buy: "bought",
            teach: "taught",
            think: "thought",
            catch: "caught",
            sell: "sold"
        };

        if (irregularPast[baseVerb]) {
            return irregularPast[baseVerb];
        }

        if (baseVerb.endsWith("e")) {
            return baseVerb + "d";
        }

        return baseVerb + "ed";
    }

    toPresentTense(baseVerb, actor) {
        const actorText = actor.trim().toLowerCase();

        const plural =
            /\b(they|we|you|i)\b/.test(actorText) ||
            /\band\b/.test(actorText);

        if (plural) {
            return baseVerb;
        }

        if (
            baseVerb.endsWith("s") ||
            baseVerb.endsWith("x") ||
            baseVerb.endsWith("ch") ||
            baseVerb.endsWith("sh")
        ) {
            return baseVerb + "es";
        }

        if (baseVerb.endsWith("y")) {
            return baseVerb.slice(0, -1) + "ies";
        }

        return baseVerb + "s";
    }

    matchCapitalization(original, replacement) {
        if (/^[A-Z]/.test(original)) {
            return replacement.charAt(0).toUpperCase() +
                replacement.slice(1);
        }

        return replacement;
    }

    fixRhythm(text) {
        const paragraphs = text.split(/\n+/);

        return paragraphs
            .map(paragraph => this.processParagraph(paragraph))
            .filter(Boolean)
            .join("\n\n");
    }

    processParagraph(paragraph) {
        if (!paragraph.trim()) {
            return "";
        }

        const matches =
            paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];

        let sentences = matches.map(text => ({
            text: text.trim(),
            length: this.wordCount(text)
        }));

        /*
         * Combine consecutive very short sentences.
         */
        for (let i = 0; i < sentences.length - 1; i++) {
            const current = sentences[i];
            const next = sentences[i + 1];

            if (
                current.length <= 5 &&
                next.length <= 5 &&
                !this.looksLikeHeading(current.text) &&
                !this.looksLikeHeading(next.text)
            ) {
                const first = current.text.replace(/[.!?]+$/, "");
                const second = next.text
                    .replace(/^[A-Z]/, char => char.toLowerCase());

                sentences.splice(i, 2, {
                    text: `${first} — ${second}`,
                    length: current.length + next.length
                });

                i--;
            }
        }

        /*
         * Break exceptionally long sentences only when a natural
         * comma exists around the middle.
         */
        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];

            if (sentence.length < 28) {
                continue;
            }

            const words = sentence.text.split(/\s+/);
            const middle = Math.floor(words.length / 2);

            let splitAt = -1;

            for (
                let offset = -4;
                offset <= 4;
                offset++
            ) {
                const index = middle + offset;

                if (
                    index > 3 &&
                    index < words.length - 3 &&
                    words[index].includes(",")
                ) {
                    splitAt = index + 1;
                    break;
                }
            }

            if (splitAt === -1) {
                continue;
            }

            let first = words.slice(0, splitAt).join(" ");
            let second = words.slice(splitAt).join(" ");

            first = first.replace(/[.!?]+$/, "");

            if (!/[.!?]$/.test(first)) {
                first += ".";
            }

            second =
                second.charAt(0).toUpperCase() +
                second.slice(1);

            sentences.splice(
                i,
                1,
                {
                    text: first,
                    length: this.wordCount(first)
                },
                {
                    text: second,
                    length: this.wordCount(second)
                }
            );

            i++;
        }

        return sentences
            .map(sentence => sentence.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
    }

    looksLikeHeading(text) {
        return (
            text.length < 40 &&
            !/[.!?]$/.test(text)
        );
    }

    wordCount(text) {
        const words = text.trim().match(/\S+/g);
        return words ? words.length : 0;
    }

    cleanup(text) {
        return text
            .replace(/[ \t]+/g, " ")
            .replace(/[ ]+([,.!?;:])/g, "$1")
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

    counter.textContent =
        `${count.toLocaleString()} characters`;
}

function showStatus(message, type = "default") {
    status.textContent = message;

    const colors = {
        default: "text-slate-500",
        success: "text-emerald-400",
        error: "text-red-400",
        warning: "text-yellow-400"
    };

    status.className =
        `text-center text-sm mt-6 min-h-[20px] ${colors[type]}`;
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

        showStatus(
            "Text rewritten successfully.",
            "success"
        );
    } catch (error) {
        console.error(error);

        showStatus(
            "Something went wrong while processing the text.",
            "error"
        );
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
