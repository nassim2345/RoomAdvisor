// Logica della schermata di configurazione (script esterno per la CSP).
(async () => {
  const api = window.roomadvisor;
  const form = document.getElementById("form");
  const gemini = document.getElementById("gemini");
  const serpapi = document.getElementById("serpapi");
  const submit = document.getElementById("submit");
  const error = document.getElementById("error");

  document.querySelectorAll("a[data-href]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      api.openExternal(a.dataset.href);
    });
  });

  const status = await api.configStatus();
  if (status.hasGemini) {
    document.getElementById("gemini-saved").hidden = false;
    gemini.placeholder = "Lascia vuoto per mantenere quella salvata";
  }
  if (status.hasSerpapi) {
    document.getElementById("serpapi-saved").hidden = false;
    serpapi.placeholder = "Lascia vuoto per mantenere quella salvata";
  }
  (status.hasGemini ? serpapi : gemini).focus();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    error.style.display = "none";
    submit.disabled = true;
    submit.textContent = "Avvio…";
    const res = await api.saveConfig({ geminiApiKey: gemini.value, serpapiKey: serpapi.value });
    if (!res.ok) {
      error.textContent = res.message;
      error.style.display = "block";
      submit.disabled = false;
      submit.textContent = "Salva e avvia";
    }
  });
})();
