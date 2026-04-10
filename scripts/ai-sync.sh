#!/usr/bin/env bash
# ai-sync.sh — run this before starting any AI coding session
# Usage: bash scripts/ai-sync.sh

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}Song Vault — AI session pre-check${RESET}"
echo "────────────────────────────────────"

# 1. Confirm we're inside the repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${RED}✗ Not inside a git repo. cd into song-vault first.${RESET}"
  exit 1
fi

# 2. Show current branch
BRANCH=$(git branch --show-current)
echo -e "Branch : ${BOLD}${BRANCH}${RESET}"

# 3. Warn if on main
if [ "$BRANCH" = "main" ]; then
  echo -e "${YELLOW}⚠  You are on main. For AI-assisted changes, consider:${RESET}"
  echo -e "   git checkout -b feat/<short-description>"
fi

# 4. Fetch remote silently and show ahead/behind
git fetch origin "$BRANCH" --quiet 2>/dev/null || true
AHEAD=$(git rev-list --count "origin/${BRANCH}..HEAD" 2>/dev/null || echo "?")
BEHIND=$(git rev-list --count "HEAD..origin/${BRANCH}" 2>/dev/null || echo "?")
echo -e "Remote : ${AHEAD} ahead, ${BEHIND} behind origin/${BRANCH}"

if [ "$BEHIND" != "0" ] && [ "$BEHIND" != "?" ]; then
  echo -e "${YELLOW}⚠  Pull before starting to avoid merge conflicts:${RESET}"
  echo -e "   git pull origin ${BRANCH}"
fi

# 5. Uncommitted changes
DIRTY=$(git status --porcelain)
if [ -n "$DIRTY" ]; then
  echo -e "${YELLOW}⚠  Uncommitted changes:${RESET}"
  git status --short
  echo ""
  echo -e "   Stash them first?  ${BOLD}git stash${RESET}"
else
  echo -e "${GREEN}✓  Working tree clean${RESET}"
fi

# 6. Check Ollama is running (optional)
if command -v ollama &> /dev/null; then
  if ollama list &> /dev/null; then
    echo -e "${GREEN}✓  Ollama running${RESET}"
    echo -e "   Models: $(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}' | tr '\n' '  ')"
  else
    echo -e "${YELLOW}⚠  Ollama installed but not running — start it with: ollama serve${RESET}"
  fi
else
  echo -e "   Ollama not found — skipping local model check"
fi

# 7. Check GPT4All server (optional)
if curl -s --max-time 1 http://localhost:4891/v1/models > /dev/null 2>&1; then
  echo -e "${GREEN}✓  GPT4All server running at :4891${RESET}"
else
  echo -e "   GPT4All server not detected at :4891 — start it from GPT4All → Settings → Enable API server"
fi

echo ""
echo -e "${BOLD}Ready. Happy coding!${RESET}"
echo ""
