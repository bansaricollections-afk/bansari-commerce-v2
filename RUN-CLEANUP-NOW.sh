#!/usr/bin/env bash
#
# One-click deployment cleanup — no arguments to remember.
#
# The dry-run guard lives in cleanup-old-deployments.sh and is only bypassed by
# the --apply flag. That flag kept getting dropped when the command was copied
# or run from a button, so this wrapper exists purely to pass it reliably.
#
# It removes every deployment except the 15 most recent and the live production
# deployment (excluded by hostname, with an abort guard). THIS IS IRREVERSIBLE.
#
#   bash RUN-CLEANUP-NOW.sh
#
cd "$(dirname "$0")" || exit 1
exec bash cleanup-old-deployments.sh --apply
