#!/bin/sh
#
# Deploy precheck — the second production deployment path.
#
# .githooks/pre-push guards `git push origin main` (the Vercel GitHub
# integration's trigger). It does NOT guard `vercel --prod`, which is run
# from this machine (the Vercel CLI is authenticated here) and ships
# whatever is in the LOCAL WORKING TREE, bypassing Git entirely.
#
# This script is that guard. Wired as npm's "predeploy" — `npm run deploy`
# runs it automatically before `vercel --prod` and aborts the deploy if it
# fails. It only ever reports; it never commits, stashes, resets, or
# discards anything.
#
# Invariant: production may only be deployed from a committed, clean,
# verified Git state that matches origin/main.

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
APP_DIR="bansari-commerce-pro"

fail() {
  echo ""
  echo "  ✖ DEPLOY BLOCKED — $1"
  echo ""
  exit 1
}

echo "── Deploy precheck ─────────────────────────────────────────"

# 1. Working tree must be clean — no uncommitted or untracked app changes.
cd "$REPO_ROOT"
dirty=$(git status --porcelain -- "$APP_DIR")
if [ -n "$dirty" ]; then
  echo ""
  echo "  ✖ DEPLOY BLOCKED — working tree contains uncommitted changes."
  echo ""
  echo "$dirty" | sed 's/^/    /'
  echo ""
  echo "  Production must be deployed from a committed, clean, verified Git"
  echo "  state — not from the local working tree. Commit or stash these"
  echo "  first; this script will not do it for you."
  echo ""
  exit 1
fi
echo "  ✓ working tree clean"

# 2. HEAD must match origin/main — no unpushed or diverged local commits.
git fetch origin main --quiet
local_head=$(git rev-parse HEAD)
remote_head=$(git rev-parse origin/main)
if [ "$local_head" != "$remote_head" ]; then
  fail "HEAD ($local_head) != origin/main ($remote_head).
  Push or pull to reconcile before deploying — do not deploy a commit
  that origin/main does not also have."
fi
echo "  ✓ HEAD == origin/main ($local_head)"

cd "$REPO_ROOT/$APP_DIR"

# 3. Type check.
echo "  … tsc --noEmit"
npx tsc --noEmit || fail "npx tsc --noEmit failed."
echo "  ✓ tsc pass"

# 4. Build.
echo "  … next build"
npm run build || fail "npm run build failed."
echo "  ✓ build pass"

# 5. Diff sanity (whitespace/conflict-marker check on the last commit).
cd "$REPO_ROOT"
git diff --check "$local_head"~1.."$local_head" || fail "git diff --check failed."
echo "  ✓ diff check pass"

echo "── Precheck passed — deploying $local_head ────────────────"
