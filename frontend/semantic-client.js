/* Public client only. Never put API keys in this file. */
(function () {
  const configured = window.TEXTMY_API_URL || "";
  const API_BASE_URL = configured.replace(/\/$/, "") || "http://localhost:3000/api";
  const REQUEST_TIMEOUT_MS = 45000;

  async function rewrite(payload) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      let data;
      try { data = await response.json(); } catch { throw new Error("The rewriting service returned an invalid response."); }
      if (!response.ok) throw new Error(data?.error || "The rewriting service is temporarily unavailable.");
      if (!data || typeof data.text !== "string" || !data.text.trim()) throw new Error("The rewriting service returned no usable text.");
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("The request timed out. Please try again.");
      if (error instanceof TypeError) throw new Error("Unable to reach the rewriting service. Check your connection or API URL.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  window.semanticClient = { rewrite, API_BASE_URL };
})();
