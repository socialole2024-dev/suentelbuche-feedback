# Feedback-Collector — Deploy-Anleitung (GitHub + Render)

> Selbst-gehosteter Wizard: Render serviert die Seite, jede Rückmeldung wird als
> Markdown-Datei in dein GitHub-Repo geschrieben → alles zentral bei dir.
> Ich (Claude) kann deine Accounts nicht bedienen — du machst die Klicks, ich habe alles
> vorbereitet. Reihenfolge genau so abarbeiten. Dauer: ~15 Minuten beim ersten Mal.

## Überblick (2 Repos + 1 Render-Service)
- **App-Repo** (Code) → davon deployt Render.
- **Inbox-Repo** (Rückmeldungen) → dorthin schreibt der Service die Markdown-Dateien.
- Getrennt, damit neue Rückmeldungen kein Re-Deploy auslösen.

---

## A) Inbox-Repo anlegen (für die Rückmeldungen)
1. GitHub → **New repository**.
2. Name z. B. `suentelbuche-rueckmeldungen`, Sichtbarkeit **Private**, Haken bei **„Add a README"** (damit der `main`-Branch existiert) → **Create repository**.

## B) Zugangs-Token erzeugen
3. GitHub → oben rechts Profil → **Settings** → ganz unten **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
4. Einstellen:
   - **Token name:** beliebig (z. B. „feedback-collector").
   - **Expiration:** z. B. 90 Tage.
   - **Repository access:** „Only select repositories" → **`suentelbuche-rueckmeldungen`** wählen.
   - **Permissions → Repository permissions → Contents:** auf **Read and write** stellen.
5. **Generate token** → den Wert (beginnt mit `github_pat_…`) **sofort kopieren** (wird nur einmal angezeigt).

## C) App-Repo anlegen und Code hochladen
6. GitHub → **New repository**, Name z. B. `suentelbuche-feedback` → **Create**.
7. Im neuen Repo: **Add file → Upload files**.
8. Aus dem Ordner `…\JayWiz\wizards\feedback-collector\` **diese Elemente** hochladen
   (markieren und ins Browserfenster ziehen):
   `server.js`, `package.json`, `render.yaml`, `.gitignore`, `.env.example` **und den Ordner `public`** (enthält `index.html`).
   - **Nicht** hochladen: `.env` (gibt es nicht) und `node_modules` (gibt es nicht).
9. **Commit changes**.

## D) Render-Service erstellen
10. **render.com** → mit GitHub anmelden → **New + → Web Service** →
    „Build and deploy from a Git repository" → Repo **`suentelbuche-feedback`** auswählen.
11. Falls nicht automatisch aus `render.yaml` übernommen, manuell setzen:
    - **Runtime:** Node · **Build Command:** `npm install` · **Start Command:** `node server.js`
    - **Instance Type:** **Free**.
12. **Environment Variables** anlegen (Abschnitt „Environment"):
    | Key | Value |
    |---|---|
    | `GITHUB_TOKEN` | das `github_pat_…` aus Schritt 5 |
    | `GITHUB_REPO` | `DEIN-GITHUB-NAME/suentelbuche-rueckmeldungen` |
    | `GITHUB_BRANCH` | `main` |
    | `RESP_DIR` | `rueckmeldungen` |
    | `ADMIN_TOKEN` | ein langes geheimes Wort (frei wählen) |
13. **Create Web Service** → warten, bis Status **„Live"**. Du bekommst eine Adresse wie
    `https://suentelbuche-feedback.onrender.com`.

## E) Testen & verwenden
14. Adresse öffnen (am **PC und am Handy**) → der Wizard erscheint. Design wählen, eine Stelle
    kommentieren, **„Rückmeldung absenden"** → „Vielen Dank".
15. Prüfen, ob die Antwort ankam:
    - im Inbox-Repo unter `rueckmeldungen/suentelbuche-flyer/…md`, **oder**
    - Übersicht: `https://DEINE-ADRESSE.onrender.com/admin?token=DEIN_ADMIN_TOKEN`.
16. Diese `onrender.com`-Adresse als **[LINK]** in die Genossen-Mail (`Genossen-Mail_FERTIG.txt`).

---

## Wichtig / gut zu wissen
- **Render Free schläft** nach ~15 Min Inaktivität → der **erste** Aufruf danach dauert
  30–60 Sek. (Seite „lädt"). Danach flott. Tipp: in der Genossen-Mail kurz erwähnen.
- **Token = Passwort.** Nie ins Repo committen. Nach Ablauf neu erzeugen und in Render aktualisieren.
- **Neue Flyer-Version veröffentlichen:** einfach die neue `public/index.html` ins App-Repo
  hochladen (ersetzen) → Render deployt automatisch neu.
- **Wiederverwendung für andere Projekte:** `public/index.html` austauschen (anderer Wizard,
  anderer `projectSlug` im Skript) → Rückmeldungen landen automatisch in einem eigenen Unterordner.
- **Fallback bleibt:** Wenn der Server mal nicht antwortet, bietet der Wizard automatisch das
  Senden per E-Mail an (mailto) + „Kopieren".
