#!/bin/bash
# PreToolUse hook, matcher: Bash — fires before EVERY Bash call, so bail out
# immediately unless this call is actually a `git push`.
#
# Blocks any push that would land directly on the protected `main`/`dev`
# branches — those only move via a human-approved PR merge, never a direct
# push (from Claude or anyone else using this session). Pushing any other
# branch (e.g. phase2, feature branches) stays fully allowed, as does
# opening a PR (`gh pr create`), which doesn't push to main/dev itself.
set -uo pipefail

input="$(cat)"
command="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"

case "$command" in
  *"git push"*) ;;
  *)
    exit 0
    ;;
esac

deny_reason() {
  jq -n --arg reason "$1" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'
  exit 0
}

deny() {
  local branch="$1"
  deny_reason "Blocked: direct 'git push' targeting '$branch' is not allowed. Push a feature/topic branch instead and open a PR against '$branch' (gh pr create) — merging still needs a human's approval."
}

PROTECTED_RE='^(main|dev)$'

# Isolate the git-push invocation itself, in case it's chained with && / ; / |
# alongside other commands, so those don't confuse the argument parsing below.
push_segment="$(printf '%s\n' "$command" | grep -oE 'git push[^&|;]*' | head -1)"
[ -n "$push_segment" ] || exit 0

read -ra tokens <<< "$push_segment"
n=${#tokens[@]}

is_all=false
remote=""
positional=()

i=2
while [ "$i" -lt "$n" ]; do
  tok="${tokens[$i]}"
  case "$tok" in
    --all|--mirror)
      is_all=true
      ;;
    --*|-*)
      # Other flags (--force, -u/--set-upstream, --delete/-d, --verbose,
      # etc.) don't change *which* branch is the target, so no special
      # handling needed — the branch-name check below still applies.
      ;;
    *)
      if [ -z "$remote" ]; then
        remote="$tok"
      else
        positional+=("$tok")
      fi
      ;;
  esac
  i=$((i + 1))
done

if [ "$is_all" = true ]; then
  deny_reason "Blocked: '--all'/'--mirror' pushes every branch, including protected 'main'/'dev'. Push specific branches instead, and open a PR against 'main'/'dev' (gh pr create) — merging still needs a human's approval."
fi

if [ "${#positional[@]}" -eq 0 ]; then
  # Bare `git push` or `git push <remote>` with no refspec — targets
  # whatever the current branch's configured upstream is.
  current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  if printf '%s' "$current_branch" | grep -qE "$PROTECTED_RE"; then
    deny "$current_branch"
  fi
  exit 0
fi

for refspec in "${positional[@]}"; do
  dst="$refspec"
  if [[ "$refspec" == *:* ]]; then
    dst="${refspec#*:}"
  fi
  # An empty destination (e.g. "origin :main" deleting a remote branch, or
  # the unusual "main:" form) falls back to the part before the colon.
  if [ -z "$dst" ]; then
    dst="${refspec%%:*}"
  fi
  if printf '%s' "$dst" | grep -qE "$PROTECTED_RE"; then
    deny "$dst"
  fi
done

exit 0
