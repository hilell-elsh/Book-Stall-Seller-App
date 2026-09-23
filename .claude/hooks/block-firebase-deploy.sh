#!/bin/bash
# PreToolUse hook, matcher: Bash — fires before EVERY Bash call, so bail out
# immediately unless this call would actually touch live Firebase Hosting.
#
# Deploys (and rollbacks — same risk, they change what's live too) are the
# user's call only, run by them directly. Blocks the Firebase CLI's deploy/
# rollback commands regardless of invocation form (direct `firebase`, via
# `npx firebase-tools`, or this repo's deploy:prod/deploy:dev npm scripts,
# which just wrap the same thing) and regardless of --project target.
set -uo pipefail

input="$(cat)"
command="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"

[ -n "$command" ] || exit 0

if printf '%s' "$command" | grep -qE 'firebase(-tools)?[^&|;]*(deploy|hosting:rollback)' \
  || printf '%s' "$command" | grep -qE 'npm run deploy(:|[[:space:]]|$)'; then
  jq -n --arg reason \
    "Blocked: Firebase Hosting deploys/rollbacks are run by the user directly, never by Claude. If a deploy is needed, tell the user the exact command to run themselves." \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'
  exit 0
fi

exit 0
