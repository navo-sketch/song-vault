# AI Workflow — Song Vault

Two AI assistants, one repo, zero conflicts.

---

## Overview

| Tool | Role | When to use |
|------|------|-------------|
| **Continue + Ollama / GPT4All** | Local, in-editor coding help | Quick edits, autocomplete, short questions |
| **Claude Code** | Deep, multi-file work | New features, debugging, refactors, deploys |
| **GitHub** | Source of truth | All changes land here before anything else |

---

## 1 — Local AI (Continue extension in VS Code)

### Install

1. Open VS Code in this folder — it will prompt you to install recommended extensions.
   Accept them, or install manually: **Continue** (`continue.continue`).

2. Install a local model runtime — pick one:

   **Ollama** (recommended)
   ```bash
   # macOS / Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull codellama:7b       # main chat model
   ollama pull starcoder2:3b      # tab autocomplete
   ollama pull nomic-embed-text   # codebase search
   ollama serve                   # starts on :11434
   ```

   **GPT4All** (GUI alternative)
   - Download from <https://gpt4all.io>
   - Open GPT4All → Settings → Enable local API server (default port 4891)
   - Download **Mistral 7B Instruct** or any GGUF model

3. The project config at `.continue/config.json` already points to both servers.
   Open the Continue sidebar (⌘M / Ctrl+M) and pick whichever model is running.

### Daily use

- **Ask a question**: highlight code → `⌘L` / `Ctrl+L` → type in chat
- **Edit in place**: highlight code → `⌘I` / `Ctrl+I` → describe the change
- **Tab autocomplete**: just start typing — StarCoder fills in suggestions
- **Codebase search**: type `@codebase` in chat to search across the whole project

### Project rules (already in `.continue/config.json`)

Continue will remind the local model about Song Vault conventions automatically:
- React 19 + Vite, no TypeScript, no router
- Vault state shape and where it lives
- Theme colour rules (`T` object only)
- Hooks-before-returns lint rule
- Run `npm run lint` before calling anything done

---

## 2 — Claude Code (for complex work)

Claude Code runs from the terminal and can read, write, and run commands across the whole project.

```bash
# Start a session in the song-vault directory
claude

# Or pass a task directly
claude "refactor the SongDetail component to split credits into its own file"
```

Use Claude Code when:
- A change touches more than 2–3 files
- You need to fix a lint or build error you can't diagnose
- You're adding a new feature end-to-end
- You want changes committed and pushed automatically

---

## 3 — Git workflow (source of truth)

### Before any AI session

```bash
bash scripts/ai-sync.sh
```

This checks:
- You're not on `main` without realising it
- You're not behind origin (would cause merge conflicts)
- No uncommitted work that could be overwritten
- Whether Ollama / GPT4All servers are up

### Branch strategy

```
main          ← always deployable, Vercel watches this
feat/<name>   ← one branch per feature (AI or human)
fix/<name>    ← bug fixes
```

```bash
# Start new work
git checkout -b feat/my-feature

# When done
git add src/App.jsx          # add specific files, not git add .
git commit -m "feat: describe the change"
git push -u origin feat/my-feature

# Merge via GitHub PR, or fast-forward locally:
git checkout main && git merge --ff-only feat/my-feature
git push origin main
```

### Rules

1. **Never commit directly to `main`** unless it's a trivial typo fix.
2. **Review AI diffs before staging** — `git diff` is your friend.
3. **One concern per commit** — don't bundle unrelated changes.
4. **Run lint before committing**: `npm run lint` — CI will reject lint failures.
5. **Don't `git add .`** — stage files explicitly to avoid committing `.env` or build artifacts.

---

## 4 — Choosing the right tool

| Situation | Use |
|-----------|-----|
| "What does this function do?" | Continue (local) |
| "Fix this one line" | Continue (local) |
| "Add a whole new tab to the app" | Claude Code |
| "The build is broken and I don't know why" | Claude Code |
| "Autocomplete while typing" | Continue (Ollama tab autocomplete) |
| "Deploy to Vercel" | Claude Code or `git push` to main |
| "Review this PR" | GitHub → request review |

---

## 5 — Quick reference

```bash
# Pre-session check
bash scripts/ai-sync.sh

# Lint
npm run lint

# Dev server
npm run dev

# Production build
npm run build

# Start Ollama
ollama serve

# Pull a model
ollama pull codellama:7b

# GPT4All API check
curl http://localhost:4891/v1/models
```

---

## 6 — Config files in this repo

| File | Purpose |
|------|---------|
| `.continue/config.json` | Continue extension: models, rules, context providers |
| `.vscode/settings.json` | VS Code editor + ESLint + git settings |
| `.vscode/extensions.json` | Recommended extensions (Continue, GitLens, Git Graph) |
| `scripts/ai-sync.sh` | Pre-session git + server health check |
| `AI-WORKFLOW.md` | This file |
