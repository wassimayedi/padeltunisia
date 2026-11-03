#!/bin/sh
# Daily content job: headless Claude Code adds new events and news, and writes one magazine
# article published the same day (it goes live as soon as it is added). Each task has its
# prompt in prompts/ and runs in its own session, through the MCP server (scripts/mcp), which writes
# to DATABASE_URL from .env. Run from cron on the production server, where the database is
# reachable on 127.0.0.1. Needs Node >= 22.18, `bun install` done in the repo, Claude Code installed
# and CLAUDE_CODE_OAUTH_TOKEN (from `claude setup-token`, so runs use the Claude subscription) in
# scripts/daily-content/.env.local, which is not committed; see env.example.
# Crontab example (07:00 Africa/Tunis):
#   0 7 * * * /path/to/padeltunisia/scripts/daily-content/run.sh
set -eu
cd "$(dirname "$0")/../.."
# Where the Claude Code installer puts `claude`; cron and fresh shells don't have it in PATH.
PATH="$HOME/.local/bin:$PATH"

if [ -f scripts/daily-content/.env.local ]; then
  set -a
  . scripts/daily-content/.env.local
  set +a
fi
# An API key would take precedence over the subscription token and bill the API instead.
unset ANTHROPIC_API_KEY

mkdir -p logs
exec >>"logs/daily-content-$(date +%F).log" 2>&1

today=$(date +%F)

# Runs one task with only the tools it needs; anything else is denied in headless mode.
# A failed task is logged and the next one still runs.
task() {
  name=$1
  tools=$2
  echo "--- $(date '+%F %T') $name"
  claude -p "Today is $today. Publication date for a new article: $today.

$(cat "scripts/daily-content/prompts/$name.md")" \
    --mcp-config .mcp.json --strict-mcp-config \
    --allowedTools "WebSearch,WebFetch,$tools" \
    --max-turns 60 || echo "$name failed"
}

mcp=mcp__padeltunisia
# Events first, so news and the article can link to them.
task events "${mcp}__find_events,${mcp}__find_clubs,${mcp}__save_image,${mcp}__add_event"
task news "${mcp}__recent_news,${mcp}__find_events,${mcp}__find_clubs,${mcp}__save_image,${mcp}__add_news"
task magazine "${mcp}__recent_articles,${mcp}__recent_news,${mcp}__find_events,${mcp}__find_clubs,${mcp}__add_magazine_article"
