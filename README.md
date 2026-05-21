# cc-journal

A trading journal for Martijn & Jente, designed in conversation with Igor and Severin
(ChartChampions panel). Built as a Next.js app with a single `data/journal.json` file
as the database.

## Design (from the enquête)

**Igor's asks:**
- Pre-trade gate filled BEFORE the click (top-down structure: monthly → weekly → daily → 30m → 15m).
- A big yes/no gate — "is this even a trade?"
- Capital preservation field (risk % and $).
- A "no-trade day" button so flat days get credit.

**Severin's asks:**
- Per-trade: instrument, level, **confluence counter** (won't enter under 3), dOpen stat,
  volume-profile context, entry trigger (3C or momentum).
- Discipline columns: de-risked at 2.5R, stop to BE, runner closed where.
- Daily **headspace** widget — sleep / food / mind, 1–5.

**Daniel's addition:**
- Weekly review page — three questions every Friday.

## Profiles

Two users, no logins. Pick your name in the top-right; the choice is stored in
`localStorage`. All API calls send `?user=martijn` or `?user=jente`.

## Database

A single `data/journal.json` file:

```json
{
  "trades": [],
  "headspace": [],
  "noTradeDays": [],
  "reviews": []
}
```

### Local development
Writes go directly to the file on disk.

### Production (Vercel)
Serverless filesystems are ephemeral, so writes use the **GitHub Contents API** to
commit changes back to `data/journal.json` in this repo. Set these env vars in Vercel:

| Variable        | Value                                               |
|-----------------|-----------------------------------------------------|
| `GITHUB_TOKEN`  | A PAT with `contents: write` on this repo           |
| `GITHUB_REPO`   | `websitesbymartijn/cc-journal` (or your fork)       |
| `GITHUB_BRANCH` | `main`                                              |

Each save creates a small commit like `journal: new ES long by martijn`. This means
your journal is also version-controlled.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy

Push to GitHub. Connect the repo to Vercel — the framework is auto-detected.
Add the env vars above. Subsequent pushes auto-deploy.

---

*"Take it easy."* — Igor
