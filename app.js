const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const humanizeBtn = document.getElementById("humanizeBtn");
const copyBtn = document.getElementById("copyBtn");

const inputCount = document.getElementById("inputCount");
const outputCount = document.getElementById("outputCount");
const status = document.getElementById("status");

function updateCount(element, counter) {
    counter.textContent = `${element.value.length.toLocaleString()} characters`;
}

function rewriteText(text) {
    let result = text;

    // Common formal/overused transitions
    const replacements = [
        [/\bFurthermore\b/gi, "Also"],
        [/\bMoreover\b/gi, "Also"],
        [/\bIn addition\b/gi, "Also"],
        [/\bIn conclusion\b/gi, "Overall"],
        [/\bTo summarize\b/gi, "In short"],
        [/\bIt is important to note that\b/gi, "Keep in mind that"],
        [/\bIt should be noted that\b/gi, "It's worth noting that"],
        [/\bDue to the fact that\b/gi, "Because"],
        [/\bIn order to\b/gi, "To"],
        [/\bAt this point in time\b/gi, "Right now"],
        [/\ba significant number of\b/gi, "many"],
        [/\ba large number of\b/gi, "many"],
        [/\butilize\b/gi, "use"],
        [/\butilizes\b/gi, "uses"],
        [/\butilized\b/gi, "used"],
        [/\bapproximately\b/gi, "about"],
        [/\bdemonstrate\b/gi, "show"],
        [/\bdemonstrates\b/gi, "shows"],
        [/\bdemonstrated\b/gi, "showed"],
        [/\bcommence\b/gi, "start"],
        [/\bcommenced\b/gi, "started"],
        [/\bendeavor\b/gi, "try"],
        [/\bendeavors\b/gi, "tries"],
        [/\bdelve into\b/gi, "look into"],
        [/\bdelve\b/gi, "explore"],
        [/\btestament to\b/gi, "sign of"],
        [/\bmyriad of\b/gi, "many"],
        [/\bseamless\b/gi, "smooth"],
        [/\bmultifaceted\b/gi, "complex"],
        [/\bparadigm\b/gi, "approach"]
    ];

    replacements.forEach(([pattern, replacement]) => {
        result = result.replace(pattern, replacement);
    });

    // Reduce excessive spaces
    result = result.replace(/[ \t]+/g, " ");

    // Clean spaces before punctuation
    result = result.replace(/\s+([,.!?;:])/g, "$1");

    // Normalize excessive blank lines
    result = result.replace(/\n{3,}/g, "\n\n");

    return result.trim();
}

humanizeBtn.addEventListener("click", () => {
    const text = inputText.value.trim();

    if (!text) {
        status.textContent = "Please enter some text first.";
        status.className = "text-center text-sm text-red-400 mt-6 min-h-[20px]";
        inputText.focus();
        return;
    }

    const rewritten = rewriteText(text);

    outputText.value = rewritten;

    updateCount(outputText, outputCount);

    status.textContent = "Text rewritten successfully.";
    status.className = "text-center text-sm text-emerald-400 mt-6 min-h-[20px]";
});

copyBtn.addEventListener("click", async () => {
    const text = outputText.value.trim();

    if (!text) {
        status.textContent = "There is no output to copy.";
        status.className = "text-center text-sm text-yellow-400 mt-6 min-h-[20px]";
        return;
    }

    try {
        await navigator.clipboard.writeText(text);

        status.textContent = "Copied to clipboard!";
        status.className = "text-center text-sm text-emerald-400 mt-6 min-h-[20px]";
    } catch (error) {
        // Fallback for older browsers
        outputText.select();
        document.execCommand("copy");

        status.textContent = "Copied to clipboard!";
        status.className = "text-center text-sm text-emerald-400 mt-6 min-h-[20px]";
    }
});

inputText.addEventListener("input", () => {
    updateCount(inputText, inputCount);
});

outputText.addEventListener("input", () => {
    updateCount(outputText, outputCount);
});

// Initial counters
updateCount(inputText, inputCount);
updateCount(outputText, outputCount);
