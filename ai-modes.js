(() => {
  let aiEngine = localStorage.getItem("nexusAIEngine") || "verified";

  function appContext() {
    return {
      location: state?.place || "Unknown",
      weather: state?.weather ? {
        temperature: state.weather.temperature_2m,
        precipitation: state.weather.precipitation,
        weather: typeof weatherCodeLabel === "function" ? weatherCodeLabel(state.weather.weather_code) : state.weather.weather_code,
        wind: state.weather.wind_speed_10m,
        rainProbability: state?.hourly?.precipitation_probability?.[0] ?? null
      } : null,
      familyCheckins: typeof loadFamily === "function" ? loadFamily().map(x => ({ name: x.name, checked: !!x.checked })) : [],
      selectedLanguage: state?.language || "English"
    };
  }

  async function callEngine(endpoint, text) {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        language: state?.language || "English",
        context: appContext()
      })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "AI service unavailable");
    return d;
  }

  window.askAI = async function(text) {
    const endpoint = aiEngine === "openai" ? "/api/ai" : aiEngine === "perplexity" ? "/api/perplexity" : "/api/verified";
    const d = await callEngine(endpoint, text);
    window.__nexusLastAI = d;
    return d.text;
  };

  function renderModeBar() {
    const askView = document.querySelector("#view-ask");
    if (!askView || document.querySelector("#aiModeBar")) return;
    const anchor = document.querySelector("#aiStatus")?.parentElement || askView.firstElementChild;
    const bar = document.createElement("div");
    bar.id = "aiModeBar";
    bar.className = "aiModeBar";
    bar.innerHTML = `
      <div class="aiModeTitle"><b>Ω-CORE Intelligence Engine</b><span>Choose how NEXUS answers</span></div>
      <div class="aiModeButtons">
        <button data-engine="openai">🧠 OpenAI</button>
        <button data-engine="perplexity">🌐 Perplexity</button>
        <button data-engine="verified">✓ Verified Dual-AI</button>
      </div>
      <p id="aiModeExplain"></p>`;
    anchor?.parentElement?.insertBefore(bar, anchor.nextSibling);

    const explain = {
      openai: "OpenAI mode: personalized reasoning and explanations using your NEXUS context.",
      perplexity: "Perplexity mode: fresh web-grounded research with source citations returned by Sonar.",
      verified: "Verified mode: Perplexity researches current public information, then OpenAI synthesizes it with your local NEXUS context."
    };
    const sync = () => {
      bar.querySelectorAll("[data-engine]").forEach(b => b.classList.toggle("active", b.dataset.engine === aiEngine));
      bar.querySelector("#aiModeExplain").textContent = explain[aiEngine];
      if (document.querySelector("#aiStatus")) document.querySelector("#aiStatus").textContent = aiEngine === "verified" ? "Verified Dual-AI ready" : `${aiEngine === "openai" ? "OpenAI" : "Perplexity"} mode ready`;
    };
    bar.querySelectorAll("[data-engine]").forEach(b => b.onclick = () => {
      aiEngine = b.dataset.engine;
      localStorage.setItem("nexusAIEngine", aiEngine);
      sync();
      if (typeof toast === "function") toast(`AI mode: ${b.textContent.trim()}`);
    });
    sync();
  }

  function addCitationRenderer() {
    const chat = document.querySelector("#chat");
    if (!chat || window.__nexusCitationObserver) return;
    window.__nexusCitationObserver = new MutationObserver(() => {
      const d = window.__nexusLastAI;
      if (!d?.citations?.length) return;
      const bubbles = chat.querySelectorAll(".bubble.ai");
      const last = bubbles[bubbles.length - 1];
      if (!last || last.querySelector(".sourceLinks")) return;
      const box = document.createElement("div");
      box.className = "sourceLinks";
      box.innerHTML = `<b>Sources</b>${d.citations.slice(0,5).map((u,i)=>`<a href="${String(u).replace(/"/g,"&quot;")}" target="_blank" rel="noopener">${i+1}. ${new URL(u).hostname}</a>`).join("")}`;
      last.appendChild(box);
      window.__nexusLastAI = null;
    });
    window.__nexusCitationObserver.observe(chat, { childList: true, subtree: true, characterData: true });
  }

  const style = document.createElement("style");
  style.textContent = `.aiModeBar{margin:16px 0;padding:16px;border:1px solid var(--line,#dce5ef);border-radius:20px;background:linear-gradient(145deg,#fff,#f5f9ff)}.aiModeTitle{display:flex;justify-content:space-between;gap:10px;align-items:center}.aiModeTitle span{font-size:12px;color:#627188}.aiModeButtons{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.aiModeButtons button{border:1px solid #d8e3ef;background:white;border-radius:999px;padding:10px 13px;font-weight:800;cursor:pointer}.aiModeButtons button.active{background:#0b3b77;color:white;border-color:#0b3b77;box-shadow:0 8px 18px rgba(11,59,119,.18)}#aiModeExplain{margin:0;color:#627188;font-size:13px;line-height:1.5}.sourceLinks{margin-top:12px;padding-top:10px;border-top:1px solid #dce5ef;display:grid;gap:5px}.sourceLinks b{font-size:12px}.sourceLinks a{font-size:12px;color:#145ed7;text-decoration:none;overflow-wrap:anywhere}`;
  document.head.appendChild(style);

  const boot = () => { renderModeBar(); addCitationRenderer(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();