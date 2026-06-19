#!/usr/bin/env bash
set -eu

# Sync skills across all platform directories after installing via npx skills add
# Usage:
#   bash scripts/sync-skills.sh                    # Full sync + regenerate
#   bash scripts/sync-skills.sh --skip-regenerate   # Only copy, skip config regeneration
#   bash scripts/sync-skills.sh --platform claude   # Sync only to specific platform

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

SKIP_REGENERATE=false
PLATFORM_FILTER="all"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-regenerate)
      SKIP_REGENERATE=true
      shift
      ;;
    --platform)
      PLATFORM_FILTER="${2:-all}"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: bash scripts/sync-skills.sh [--skip-regenerate] [--platform <name>]"
      exit 1
      ;;
  esac
done

# .agents/skills/ is the primary source (npx skills installs here with real files)
# .claude/skills/ and .devin/skills/ get symlinks from the CLI
# We need to also populate: .codex/skills/ (our custom directory)
PRIMARY_SOURCE=".agents/skills"

# Target directories to sync TO (excludes .agents since it's the source)
TARGETS=(".claude/skills" ".codex/skills" ".devin/skills")

echo "=== Skills Sync ==="
echo ""
echo "Primary source: $PRIMARY_SOURCE"
echo "Skills in source: $(ls -d "$PRIMARY_SOURCE"/*/ 2>/dev/null | wc -l | tr -d ' ')"
echo ""

sync_to_target() {
  local target_dir="$1"
  echo "Syncing to $target_dir..."
  mkdir -p "$target_dir"

  for skill_dir in $(ls -d "$PRIMARY_SOURCE"/*/); do
    local skill_name
    skill_name=$(basename "$skill_dir")

    # Remove existing: unlink symlinks safely, then remove directory
    if [ -L "$target_dir/$skill_name" ]; then
      unlink "$target_dir/$skill_name"
    elif [ -d "$target_dir/$skill_name" ]; then
      rm -rf "$target_dir/$skill_name"
    fi

    # Copy real files (dereference symlinks from source)
    cp -rL "$skill_dir" "$target_dir/$skill_name"
  done

  local total
  total=$(ls -d "$target_dir"/*/ 2>/dev/null | wc -l | tr -d ' ')
  echo "  -> $total skills synced"
}

# Sync to each target
for target in "${TARGETS[@]}"; do
  if [[ "$PLATFORM_FILTER" == "all" ]] || [[ "$target" == *"$PLATFORM_FILTER"* ]]; then
    sync_to_target "$target"
  fi
done

echo ""

# Regenerate native config files
if [[ "$SKIP_REGENERATE" == false ]]; then
  echo "=== Regenerating platform configs ==="
  echo ""
  bash "$SCRIPT_DIR/regenerate-configs.sh"
else
  echo "Skipping config regeneration (--skip-regenerate)"
fi

echo ""
echo "=== Sync Complete ==="
echo ""
echo "Next steps:"
echo "  - Review changes: git diff --stat"
echo "  - Commit: git add -A && git commit -m 'Sync skills across platforms'"
