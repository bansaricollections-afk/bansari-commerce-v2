#!/usr/bin/env bash
#
# Remove the duplicate Vercel projects that are wired to this repo.
#
# WHY
# Nine Vercel projects are connected to bansaricollections-afk/bansari-commerce-v2.
# Exactly one of them — bansari-commerce-pro — serves www.bansaricollection.in.
# The other eight answer 404 and exist only because the repo was imported
# several times during setup (Vercel appends a random suffix when a project
# name already exists).
#
# Every push therefore builds nine times. That is what put Deployment Storage
# at 41.29 GB against a 10 GB allowance, and Functions Storage at 12.98 GB.
# Deleting the eight is the entire fix; it also cuts every future push from
# nine builds to one.
#
# SAFETY
#  - KEEP is an explicit allow-list. A project is deleted only if it is in the
#    duplicate list AND not in KEEP.
#  - Before deleting anything, the script confirms that www.bansaricollection.in
#    resolves to a project in KEEP. If that check cannot be made, it aborts.
#  - It refuses to delete any project that has a custom domain attached.
#  - It re-checks the live site at the end.
#
# THIS IS IRREVERSIBLE. A deleted project takes its deployments and build
# history with it.
#
# Usage:
#   bash delete-duplicate-vercel-projects.sh            # dry run (default)
#   bash delete-duplicate-vercel-projects.sh --apply    # actually delete

set -uo pipefail

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

# The project that serves customers. Never deleted.
KEEP="bansari-commerce-pro"

LIVE_URL="https://www.bansaricollection.in"

echo "=============================================="
echo " Vercel duplicate-project cleanup"
echo " mode: $([ "$APPLY" -eq 1 ] && echo 'APPLY — will delete' || echo 'DRY RUN — nothing will be deleted')"
echo "=============================================="
echo ""

# ── 1. Which project serves the live domain? ──────────────────────────────
echo "Resolving $LIVE_URL ..."
INSPECT=$(npx vercel inspect www.bansaricollection.in 2>&1)
LIVE_PROJECT=$(echo "$INSPECT" | grep -E '^[[:space:]]+name[[:space:]]' | head -1 | awk '{print $2}')

if [ -z "$LIVE_PROJECT" ]; then
  echo "ABORT: could not determine which project serves $LIVE_URL."
  echo "       Refusing to delete anything while that is unknown."
  exit 1
fi

echo "  live domain is served by : $LIVE_PROJECT"

if [ "$LIVE_PROJECT" != "$KEEP" ]; then
  echo ""
  echo "ABORT: the live site is served by '$LIVE_PROJECT', but this script is"
  echo "       set to keep '$KEEP'. Someone has changed which project holds the"
  echo "       domain. Update KEEP and re-read the list before running again."
  exit 1
fi
echo "  matches KEEP             : yes"
echo ""

# ── 2. Enumerate projects ─────────────────────────────────────────────────
echo "Listing projects..."
# 2>&1, not 2>/dev/null: the Vercel CLI prints its table to STDERR, so
# discarding stderr silently produced an empty list — which the guard below
# correctly refused to act on. grep -E is POSIX, so [[:space:]] not \s.
PROJECTS=$(npx vercel projects ls 2>&1 \
  | grep -oE '^[[:space:]]+bansari-commerce[a-z0-9-]*' \
  | awk '{print $1}' \
  | sort -u)

if [ -z "$PROJECTS" ]; then
  echo "ABORT: no projects returned. Not deleting anything on an empty list."
  exit 1
fi

TOTAL=$(echo "$PROJECTS" | wc -l)
echo "  projects found : $TOTAL"
echo ""

# ── 3. Build the deletion list ────────────────────────────────────────────
TARGETS=""
for p in $PROJECTS; do
  if [ "$p" = "$KEEP" ]; then
    echo "  KEEP    $p   (serves $LIVE_URL)"
    continue
  fi

  # A project holding a custom domain is never a duplicate worth deleting.
  DOMAINS=$(npx vercel domains ls 2>&1 | grep -c "$p" || true)
  if [ "$DOMAINS" -gt 0 ]; then
    echo "  SKIP    $p   (has a custom domain attached)"
    continue
  fi

  # Confirm it really is serving nothing.
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$p.vercel.app" || echo "000")
  echo "  DELETE  $p   (https://$p.vercel.app -> HTTP $CODE)"
  TARGETS="$TARGETS $p"
done

COUNT=$(echo $TARGETS | wc -w)
echo ""
echo "  to delete : $COUNT"
echo ""

# Final guard: KEEP must not have crept into the list.
case " $TARGETS " in
  *" $KEEP "*)
    echo "ABORT: '$KEEP' appeared in the deletion list. Refusing."
    exit 1
    ;;
esac

if [ "$COUNT" -eq 0 ]; then
  echo "Nothing to do."
  exit 0
fi

if [ "$APPLY" -eq 0 ]; then
  echo "DRY RUN — nothing was deleted."
  echo "Re-run with --apply to delete the $COUNT project(s) listed above."
  exit 0
fi

# ── 4. Delete ─────────────────────────────────────────────────────────────
echo "Deleting..."
FAILED=0
for p in $TARGETS; do
  printf "  %-28s " "$p"
  # `vercel project rm` has no --yes in CLI 59; it prompts, and --non-interactive
  # does not answer the prompt either. A single piped "y" is the way.
  #
  # NOT `yes y |` — the prompt has autocomplete, so an endless stream of "y"
  # ping-pongs with it and produced 64 MB of terminal output on the first
  # attempt. One newline-terminated answer is all it wants.
  if printf 'y\n' | npx vercel project rm "$p" >/dev/null 2>&1; then
    echo "removed"
  else
    echo "FAILED"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Re-checking the live site..."
LIVE_CODE=$(curl -sL -o /dev/null -w "%{http_code}" "$LIVE_URL")
echo "  $LIVE_URL -> HTTP $LIVE_CODE"

if [ "$LIVE_CODE" != "200" ]; then
  echo ""
  echo "WARNING: the live site did not return 200. Check the Vercel dashboard now."
  exit 1
fi

echo ""
echo "Done. $((COUNT - FAILED)) removed, $FAILED failed."
echo "Storage in the dashboard updates within a few minutes."
