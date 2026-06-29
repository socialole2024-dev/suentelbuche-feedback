// Feedback-Collector — Render-Web-Service: serviert den Wizard + sammelt Rückmeldungen
// und legt pro Antwort eine Markdown-Datei in ein GitHub-Repo. Reine Node-Standardlib + express.
// Env: GITHUB_TOKEN, GITHUB_REPO (owner/repo), GITHUB_BRANCH (default main),
//      RESP_DIR (default rueckmeldungen), ADMIN_TOKEN (optional, für /admin), PORT (Render setzt).
const express = require("express");
const path = require("path");
const app = express();

app.use(express.json({ limit: "2mb" }));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

const {
  GITHUB_TOKEN,
  GITHUB_REPO,
  GITHUB_BRANCH = "main",
  RESP_DIR = "rueckmeldungen",
  ADMIN_TOKEN,
} = process.env;

const ghHeaders = () => ({
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "jaywiz-feedback-collector",
  "X-GitHub-Api-Version": "2022-11-28",
});

function safe(s) {
  return (
    (s || "anonym")
      .toString()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "anonym"
  );
}

app.get("/api/health", (req, res) =>
  res.json({ ok: true, configured: !!(GITHUB_TOKEN && GITHUB_REPO) })
);

// Rückmeldung entgegennehmen → als Markdown-Datei ins GitHub-Repo committen
app.post("/api/feedback", async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.markdown) return res.status(400).json({ ok: false, error: "markdown fehlt" });
    if (!GITHUB_TOKEN || !GITHUB_REPO)
      return res.status(500).json({ ok: false, error: "Server nicht konfiguriert" });

    const slug = safe(b.projectSlug || "projekt");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = `${RESP_DIR}/${slug}/${ts}_${safe(b.name)}.md`;
    const content = Buffer.from(b.markdown, "utf8").toString("base64");
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

    const r = await fetch(url, {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Rückmeldung: ${b.name || "anonym"} – ${b.designLabel || ""} (${slug})`,
        content,
        branch: GITHUB_BRANCH,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ ok: false, error: "GitHub " + r.status, detail: t.slice(0, 300) });
    }
    const j = await r.json();
    res.json({ ok: true, path: filePath, html_url: j.content && j.content.html_url });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Einfaches Admin-Listing: /admin?token=...  → zeigt gesammelte Rückmeldungen + Links
app.get("/admin", async (req, res) => {
  if (!ADMIN_TOKEN || req.query.token !== ADMIN_TOKEN)
    return res.status(401).send("Nicht autorisiert. Bitte ?token=DEIN_ADMIN_TOKEN anhängen.");
  if (!GITHUB_TOKEN || !GITHUB_REPO) return res.status(500).send("Server nicht konfiguriert.");
  try {
    const repoUrl = `https://github.com/${GITHUB_REPO}/tree/${GITHUB_BRANCH}/${RESP_DIR}`;
    let rows = "";
    // Top-Ebene (Projekte) listen
    const top = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${RESP_DIR}?ref=${GITHUB_BRANCH}`,
      { headers: ghHeaders() }
    );
    if (top.ok) {
      const dirs = (await top.json()).filter((x) => x.type === "dir");
      for (const d of dirs) {
        const sub = await fetch(d.url, { headers: ghHeaders() });
        const files = sub.ok ? (await sub.json()).filter((f) => f.name.endsWith(".md")) : [];
        rows += `<h3>${d.name} <small>(${files.length})</small></h3><ul>`;
        rows += files
          .sort((a, b) => (a.name < b.name ? 1 : -1))
          .map((f) => `<li><a href="${f.html_url}" target="_blank">${f.name}</a></li>`)
          .join("");
        rows += "</ul>";
      }
    } else {
      rows = "<p>Noch keine Rückmeldungen.</p>";
    }
    res.send(
      `<!doctype html><meta charset="utf-8"><title>Rückmeldungen</title>` +
        `<body style="font-family:system-ui;max-width:760px;margin:30px auto;padding:0 16px">` +
        `<h1>Rückmeldungen</h1><p>Alle Dateien auch direkt im Repo: <a href="${repoUrl}" target="_blank">${RESP_DIR}/</a></p>${rows}</body>`
    );
  } catch (e) {
    res.status(500).send("Fehler: " + e.message);
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Feedback-Collector läuft."));
