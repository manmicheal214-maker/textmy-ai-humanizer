const $ = (id) => document.getElementById(id);
const inputText = $("inputText");
const outputText = $("outputText");
const rewriteBtn = $("humanizeBtn");
const copyBtn = $("copyBtn");
const clearBtn = $("clearBtn");
const status = $("status");
const intensityHelp = $("intensityHelp");

const intensityDescriptions = {
  light: "Minimal changes focused on awkward wording and repetition.",
  balanced: "Noticeable improvements with conservative restructuring.",
  strong: "Substantial stylistic restructuring while preserving meaning."
};

function countWords(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function updateCounts() {
  $("inputCount").textContent = `${inputText.value.length.toLocaleString()} characters`;
  $("inputWords").textContent = `${countWords(inputText.value).toLocaleString()} words`;
  $("outputCount").textContent = `${outputText.value.length.toLocaleString()} characters`;
  $("outputWords").textContent = `${countWords(outputText.value).toLocaleString()} words`;
}

function setStatus(message, type = "default") {
  status.textContent = message;
  status.dataset.type = type;
}

function selectedIntensity() {
  return document.querySelector('input[name="intensity"]:checked')?.value || "balanced";
}

document.querySelectorAll('input[name="intensity"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    intensityHelp.textContent = intensityDescriptions[selectedIntensity()];
  });
});

inputText.addEventListener("input", updateCounts);

clearBtn.addEventListener("click", () => {
  inputText.value = "";
  outputText.value = "";
  setStatus("Cleared.");
  updateCounts();
  inputText.focus();
});

rewriteBtn.addEventListener("click", async () => {
  const text = inputText.value.trim();
  if (!text) {
    setStatus("Please enter some text first.", "error");
    inputText.focus();
    return;
  }
  if (text.length > 20000) {
    setStatus("The text is too long. Please shorten it and try again.", "error");
    return;
  }

  rewriteBtn.disabled = true;
  rewriteBtn.innerHTML = '<span class="spinner"></span> Rewriting…';
  setStatus("Preserving meaning and improving flow…", "loading");

  try {
    const result = await semanticClient.rewrite({ text, intensity: selectedIntensity() });
    outputText.value = result.text;
    updateCounts();
    setStatus("Rewritten successfully. Review the result before publishing.", "success");
  } catch (error) {
    console.error("Rewrite request failed:", error.message);
    setStatus(error.message || "The rewriting service is temporarily unavailable.", "error");
  } finally {
    rewriteBtn.disabled = false;
    rewriteBtn.innerHTML = "<span>✦</span> Rewrite text";
  }
});

copyBtn.addEventListener("click", async () => {
  const text = outputText.value.trim();
  if (!text) {
    setStatus("There is no output to copy.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    outputText.focus();
    outputText.select();
    document.execCommand("copy");
  }
  setStatus("Copied to clipboard.", "success");
});

const themeToggle = $("themeToggle");
const savedTheme = localStorage.getItem("textmy-theme");
if (savedTheme === "light") document.documentElement.dataset.theme = "light";

themeToggle.addEventListener("click", () => {
  const light = document.documentElement.dataset.theme === "light";
  document.documentElement.dataset.theme = light ? "" : "light";
  localStorage.setItem("textmy-theme", light ? "dark" : "light");
  themeToggle.textContent = light ? "☼" : "☾";
});
if (savedTheme === "light") themeToggle.textContent = "☾";

updateCounts();
