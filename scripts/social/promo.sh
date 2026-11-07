#!/bin/sh
# Daily promotional post and story about a site feature (scripts/social/promo.ts), on the Facebook
# Page and Instagram. Run from cron on the production server, like scripts/daily-content/run.sh.
# META_* come from scripts/daily-content/.env.local, loaded by `npm run social:promo`.
# Crontab example (17:00 UTC = 18:00 Africa/Tunis):
#   0 17 * * * /path/to/padeltunisia/scripts/social/promo.sh
set -eu
cd "$(dirname "$0")/../.."
# Cron and fresh shells have a minimal PATH; add the usual places for node/npm.
PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:$PATH"

mkdir -p logs
exec >>"logs/social-promo-$(date +%F).log" 2>&1

echo "--- $(date '+%F %T') promo"
npm run social:promo || echo "promo failed"
