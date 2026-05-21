# //JRNL — Trader Journal

A focused trading journal for two desks. Daily prep, trade log with a strict pre-flight gate, headspace tracking, a PnL calendar, and weekly review.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwebsitesbymartijn%2Fcc-journal&env=GITHUB_TOKEN,GITHUB_REPO,GITHUB_BRANCH&envDescription=GitHub-backed%20persistence%20for%20data%2Fjournal.json&project-name=cc-journal&repository-name=cc-journal)

## What it does

**Daily Prep** — `dOpen` chips, `bias`, `context`, `longs`, `shorts`, `discipline`, `catalysts`. One prep per desk per day, freely editable. Matches the daily-plan format below:

```
dOpen:
- inside pdVA
- upper quartile

Context:
• tested lower value as support
• claimed pwPOC

Longs:
• pdClose + dVWAP (scalp)
• pdEQ + pdVAH + OVL (daytrade)

Shorts:
• pwVAH only.. (daytrade)
• none; close to ATH, market is strong

Discipline:
• trades: Sequence 9 + COT
• be late rather than too early
```

**Pre-flight gate (New Trade)** — top-down structure required (HTF/weekly/daily/30m/15m), ≥3 confluences (`pdVAH`, `pdVAL`, `pdPOC`, `naked level`, `single prints`, `anchored VWAP`, `OVL`, `dVWAP`, `pwPOC`, etc.), `entry`/`stop`/`risk` set. Fail any check and the trade is logged as **not-a-trade**.

**Post-trade discipline** — de-risked at 2.5R, stop to BE, runner closed where, lesson learned, screenshot link.

**Headspace** — sleep/food/mind 1–5, once per day. Your state is your edge.

**Calendar** — month grid, each day color-graded by PnL intensity. Click any day to filter trades. Dots indicate prep/headspace/no-trade markers.

**Weekly Review** — three questions every Friday: process? A+ actually A+? next week's highest-probability play?

## Desks (no logins)

Two desks: `martijn` and `jente`. Pick yours in the top-right. Choice is stored in `localStorage` and all reads/writes are scoped to that desk.

## Database

A single `data/journal.json` with five collections: `trades`, `prep`, `headspace`, `noTradeDays`, `reviews`.

### Local development
Writes go directly to disk.

### Production (Vercel)
Serverless filesystems are ephemeral, so writes use the **GitHub Contents API** to commit `data/journal.json` back to the repo. Set these env vars in Vercel:

| Variable        | Value                                               |
|-----------------|-----------------------------------------------------|
| `GITHUB_TOKEN`  | A PAT with `contents: write` on this repo           |
| `GITHUB_REPO`   | `websitesbymartijn/cc-journal`                      |
| `GITHUB_BRANCH` | `main`                                              |

Every save creates a tiny commit (`journal: new ES long by martijn`, etc.). Your journal is version-controlled by default.

## Run locally

```bash
npm install
npm run dev
# http://localhost:3000
```

## Deploy

Click the Vercel button, sign in, paste the env vars. Subsequent `git push`s auto-deploy.

---

*Plan the trade. Trade the plan.*
