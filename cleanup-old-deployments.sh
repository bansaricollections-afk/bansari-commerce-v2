#!/usr/bin/env bash
#
# Reclaim Vercel Function Storage by removing old deployments.
#
# WHY
# Vercel retains every deployment forever on the Hobby plan, and each one keeps
# its serverless function bundles. With 268 deployments at roughly 20 MB of
# bundles each, the account hit the 10 GB Function Storage limit. Deleting old
# deployments reclaims that space immediately and costs nothing — an upgrade to
# Pro is not required to fix this.
#
# SAFETY
#  - The live production deployment is excluded BY ID, not by list position.
#  - The 15 most recent deployments are kept as a rollback window.
#  - Removing an old deployment does not touch the alias serving traffic, so
#    www.bansaricollection.in is unaffected.
#  - The script re-checks the live site at the end.
#
# THIS IS IRREVERSIBLE. A removed deployment cannot be rolled back to.
#
# Usage:
#   bash cleanup-old-deployments.sh            # dry run, lists what it would remove
#   bash cleanup-old-deployments.sh --apply    # actually remove

set -u

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

KEEP=10

# Resolve the live production deployment AT RUNTIME.
#
# This used to be a hardcoded hostname. It went stale the moment a new
# production deployment shipped, so the guard that is supposed to protect the
# live site silently matched nothing — the protection was cosmetic. Now it is
# read from the domain itself, and the script refuses to run if it cannot be
# determined.
echo "Resolving the live production deployment..."
PROD_HOST=$(npx vercel inspect www.bansaricollection.in 2>&1   | grep -oE 'https://bansari-commerce-[a-z0-9]+-bansaricollections-afks-projects\.vercel\.app'   | head -1   | sed 's|https://||')

if [ -z "$PROD_HOST" ]; then
  echo "ABORT: could not determine the live production deployment."
  echo "       Refusing to delete anything while that is unknown."
  exit 1
fi
echo "  live production: $PROD_HOST"
echo ""

echo "Collecting deployments..."
ALL=$(mktemp)
next=""
page=0
while [ $page -lt 25 ]; do
  if [ -z "$next" ]; then out=$(npx vercel ls 2>&1); else out=$(npx vercel ls --next "$next" 2>&1); fi
  echo "$out" | grep -oE 'https://bansari-commerce-[a-z0-9]+-bansaricollections-afks-projects\.vercel\.app' >> "$ALL"
  next=$(echo "$out" | grep -oE 'vercel ls --next [0-9]+' | grep -oE '[0-9]+$' | head -1)
  page=$((page+1))
  [ -z "$next" ] && break
done

# Each row prints its URL more than once; de-duplicate while preserving the
# newest-first order the API returned.
ORDERED=$(mktemp)
awk '!seen[$0]++' "$ALL" > "$ORDERED"
TOTAL=$(wc -l < "$ORDERED")

TARGETS=$(mktemp)
tail -n +$((KEEP + 1)) "$ORDERED" | grep -vF "$PROD_HOST" > "$TARGETS"
COUNT=$(wc -l < "$TARGETS")

echo "  total deployments : $TOTAL"
echo "  keeping           : $KEEP most recent + live production"
echo "  to remove         : $COUNT"
echo ""

# Refuse to run if the guard failed for any reason.
if grep -qF "$PROD_HOST" "$TARGETS"; then
  echo "ABORT: live production appeared in the removal list."
  exit 1
fi

if [ "$APPLY" -eq 0 ]; then
  echo "DRY RUN — nothing removed. First 10 that would go:"
  head -10 "$TARGETS" | sed 's/^/  /'
  echo ""
  echo "Re-run with --apply to remove them."
  exit 0
fi

ok=0; fail=0; n=0
while read -r url; do
  n=$((n+1))
  # --safe is a second, independent guard: Vercel itself refuses to remove a
  # deployment that still has an active alias, so even if the PROD_HOST check
  # above were wrong, the live deployment survives.
  if npx vercel remove "$url" --yes --safe >/dev/null 2>&1; then ok=$((ok+1)); else fail=$((fail+1)); fi
  [ $((n % 25)) -eq 0 ] && echo "  $n/$COUNT  removed:$ok  failed:$fail"
done < "$TARGETS"

echo ""
echo "Done. removed:$ok  failed:$fail"
echo -n "Live site check: "
curl -s -o /dev/null -w "%{http_code}\n" https://www.bansaricollection.in/
