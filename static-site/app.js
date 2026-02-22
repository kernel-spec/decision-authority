(function(){
  const $ = (id) => document.getElementById(id);

  const repoUrl = localStorage.getItem("repoUrl") || "https://github.com/kernel-spec/decision-authority";
  const decisionUrl = localStorage.getItem("decisionUrl") || "";
  const adminUrl = localStorage.getItem("adminUrl") || "";

  if ($("repoUrl")) $("repoUrl").value = repoUrl;
  if ($("decisionUrl")) $("decisionUrl").value = decisionUrl;
  if ($("adminUrl")) $("adminUrl").value = adminUrl;

  const setLink = (id, url) => {
    const el = $(id);
    if (!el) return;
    el.href = url || "#";
    el.style.opacity = url ? "1" : "0.6";
    el.title = url ? url : "Set URL above";
  };

  setLink("repoLink", repoUrl);
  setLink("decisionApiLink", decisionUrl ? `${decisionUrl}` : "");
  setLink("adminApiLink", adminUrl ? `${adminUrl}` : "");

  const save = () => {
    const r = $("repoUrl")?.value?.trim();
    const d = $("decisionUrl")?.value?.trim();
    const a = $("adminUrl")?.value?.trim();

    if (r) localStorage.setItem("repoUrl", r);
    if (d) localStorage.setItem("decisionUrl", d);
    if (a) localStorage.setItem("adminUrl", a);

    setLink("repoLink", r);
    setLink("decisionApiLink", d);
    setLink("adminApiLink", a);

    alert("Saved locally.");
  };

  const reset = () => {
    localStorage.removeItem("repoUrl");
    localStorage.removeItem("decisionUrl");
    localStorage.removeItem("adminUrl");
    location.reload();
  };

  $("saveBtn")?.addEventListener("click", save);
  $("resetBtn")?.addEventListener("click", reset);
})();