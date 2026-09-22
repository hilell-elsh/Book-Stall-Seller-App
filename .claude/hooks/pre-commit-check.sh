#!/bin/bash
# PreToolUse hook, matcher: Bash — fires before EVERY Bash call, so bail out
# immediately unless this call is actually a git commit.
#
# Auto-mode / informational only: this NEVER blocks or prompts. It always
# allows the command; when something looks off it just surfaces a note as
# additionalContext right before the commit runs.
set -uo pipefail

input="$(cat)"
command="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"

case "$command" in
  *"git commit"*) ;;
  *)
    exit 0
    ;;
esac

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

staged="$(git diff --cached --name-only 2>/dev/null || true)"
notes=()

# Check 1: source/config staged, but neither doc file staged alongside it.
if printf '%s\n' "$staged" | grep -Eq '^(src/|package\.json$|vite\.config.*\.ts$)' \
   && ! printf '%s\n' "$staged" | grep -Eq '^(CLAUDE\.md|\.claude/plans/roadmap\.md)$'; then
  notes+=("Staged changes touch src/ or project config, but neither CLAUDE.md nor .claude/plans/roadmap.md is staged. This repo's convention (CLAUDE.md, 'Plan doc'): after each task, update roadmap.md's Execution status and re-check CLAUDE.md for new modules/commands/architecture worth documenting.")
fi

# Check 2: has the `verify` subagent run since the newest modified source file?
marker=".claude/.verify-ok"
marker_mtime=0
if [ -f "$marker" ]; then
  marker_mtime=$(stat -f %m "$marker" 2>/dev/null || stat -c %Y "$marker" 2>/dev/null || echo 0)
fi

newest_src_mtime=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  m=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)
  if [ "$m" -gt "$newest_src_mtime" ]; then
    newest_src_mtime=$m
  fi
done < <(git ls-files -m -o --exclude-standard -- src package.json 2>/dev/null || true)

if [ "$marker_mtime" -lt "$newest_src_mtime" ]; then
  notes+=("No successful 'verify' run detected since the last source edit — consider dispatching the verify subagent (typecheck+test+lint+build) before committing.")
fi

if [ "${#notes[@]}" -gt 0 ]; then
  reason=""
  for n in "${notes[@]}"; do
    reason="${reason}${n}"$'\n\n'
  done
  jq -n --arg reason "$reason" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "allow", permissionDecisionReason: $reason}}'
fi

exit 0
