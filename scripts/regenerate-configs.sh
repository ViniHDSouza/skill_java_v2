#!/usr/bin/env bash
set -eu

# Regenerate all platform-native config files from skills
# Usage: bash scripts/regenerate-configs.sh [--platform <name>]
#
# Sources: skills/ (base) + .opencode/skills/ (custom) + .claude/skills/ (all merged)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

SKILLS_SOURCE=".agents/skills"
PLATFORM_FILTER="${2:-all}"

if [[ "${1:-}" == "--platform" ]] && [[ -n "${2:-}" ]]; then
  PLATFORM_FILTER="$2"
fi

collect_skills_list() {
  ls -d "$SKILLS_SOURCE"/*/ 2>/dev/null | while read -r dir; do
    basename "$dir"
  done | sort
}

extract_description() {
  local skill_file="$1"
  local desc
  desc=$(sed -n '/^---$/,/^---$/p' "$skill_file" | grep -m1 "^description:" | sed 's/^description: *//' | sed 's/^> *//')
  if [ -z "$desc" ]; then
    desc=$(sed -n '/^---$/,/^---$/p' "$skill_file" | sed -n '/^description:/,/^[a-z_-]*:/{ /^description:/d; /^[a-z_-]*:/d; p; }' | tr '\n' ' ' | sed 's/^ *//' | sed 's/ *$//')
  fi
  echo "$desc"
}

extract_version() {
  local skill_file="$1"
  sed -n '/^---$/,/^---$/p' "$skill_file" | grep "^version:" | head -1 | sed 's/^version: *//' | tr -d '"'
}

extract_sasmp() {
  local skill_file="$1"
  sed -n '/^---$/,/^---$/p' "$skill_file" | grep "^sasmp_version:" | head -1 | sed 's/^sasmp_version: *//' | tr -d '"'
}

extract_body() {
  local skill_file="$1"
  awk 'BEGIN{count=0} /^---$/{count++; if(count==2){found=1; next}} found{print}' "$skill_file"
}

count_skills() {
  ls -d "$SKILLS_SOURCE"/*/ 2>/dev/null | wc -l | tr -d ' '
}

# --- AGENTS.md (ChatGPT Codex) ---
generate_agents_md() {
  local output="AGENTS.md"
  local total
  total=$(count_skills)
  echo "  Generating $output..."

  cat > "$output" << HEADER
<!-- AUTO-GENERATED from .codex/skills/ — Do not edit directly -->
# Agent Instructions

This repository contains $total coding skills for Java/Spring Boot backend development.
Each skill provides domain-specific guidance, patterns, and best practices.

## Skills Index

| Skill | Description |
|-------|-------------|
HEADER

  for skill_dir in $(ls -d "$SKILLS_SOURCE"/*/); do
    local name desc
    name=$(basename "$skill_dir")
    desc=$(extract_description "$skill_dir/SKILL.md" | cut -c1-120)
    echo "| [$name](#$name) | $desc |" >> "$output"
  done

  echo "" >> "$output"

  for skill_dir in $(ls -d "$SKILLS_SOURCE"/*/); do
    local name version sasmp skill_file
    name=$(basename "$skill_dir")
    skill_file="$skill_dir/SKILL.md"
    version=$(extract_version "$skill_file")
    sasmp=$(extract_sasmp "$skill_file")

    echo "---" >> "$output"
    echo "" >> "$output"
    echo "## $name" >> "$output"
    echo "" >> "$output"

    if [ -n "$version" ] || [ -n "$sasmp" ]; then
      local meta="> "
      [ -n "$version" ] && meta="${meta}**Version:** $version"
      [ -n "$sasmp" ] && meta="${meta} | **SASMP:** $sasmp"
      echo "$meta" >> "$output"
      echo "" >> "$output"
    fi

    extract_body "$skill_file" >> "$output"
    echo "" >> "$output"
  done

  echo "  -> $(wc -l < "$output") lines"
}

# --- .github/copilot-instructions.md ---
generate_copilot_instructions() {
  local output=".github/copilot-instructions.md"
  local total
  total=$(count_skills)
  mkdir -p .github
  echo "  Generating $output..."

  cat > "$output" << HEADER
<!-- AUTO-GENERATED from skills/ — Do not edit directly -->
# Copilot Instructions

This repository contains $total coding skills for Java/Spring Boot backend development.
Each skill provides domain-specific guidance, patterns, and best practices.

For modular instruction files, see \`.github/instructions/\`.

## Skills Index

| Skill | Description |
|-------|-------------|
HEADER

  for skill_dir in $(ls -d "$SKILLS_SOURCE"/*/); do
    local name desc
    name=$(basename "$skill_dir")
    desc=$(extract_description "$skill_dir/SKILL.md" | cut -c1-120)
    echo "| [$name](#$name) | $desc |" >> "$output"
  done

  echo "" >> "$output"

  for skill_dir in $(ls -d "$SKILLS_SOURCE"/*/); do
    local name version sasmp skill_file
    name=$(basename "$skill_dir")
    skill_file="$skill_dir/SKILL.md"
    version=$(extract_version "$skill_file")
    sasmp=$(extract_sasmp "$skill_file")

    echo "---" >> "$output"
    echo "" >> "$output"
    echo "## $name" >> "$output"
    echo "" >> "$output"

    if [ -n "$version" ] || [ -n "$sasmp" ]; then
      local meta="> "
      [ -n "$version" ] && meta="${meta}**Version:** $version"
      [ -n "$sasmp" ] && meta="${meta} | **SASMP:** $sasmp"
      echo "$meta" >> "$output"
      echo "" >> "$output"
    fi

    extract_body "$skill_file" >> "$output"
    echo "" >> "$output"
  done

  echo "  -> $(wc -l < "$output") lines"
}

# --- .github/instructions/*.md (modular) ---
generate_copilot_modular() {
  local inst_dir=".github/instructions"
  mkdir -p "$inst_dir"
  echo "  Generating $inst_dir/*.md..."

  # Clean old files
  rm -f "$inst_dir"/*.md

  local count=0
  for skill_dir in $(ls -d "$SKILLS_SOURCE"/*/); do
    local name desc skill_file
    name=$(basename "$skill_dir")
    skill_file="$skill_dir/SKILL.md"
    desc=$(extract_description "$skill_file")

    local out_file="$inst_dir/${name}.md"
    echo "---" > "$out_file"
    echo "applyWhen: \"$desc\"" >> "$out_file"
    echo "---" >> "$out_file"
    echo "" >> "$out_file"
    extract_body "$skill_file" >> "$out_file"

    count=$((count + 1))
  done

  echo "  -> $count files"
}

# --- .cursor/rules/*.mdc ---
generate_cursor_rules() {
  local rules_dir=".cursor/rules"
  mkdir -p "$rules_dir"
  echo "  Generating $rules_dir/*.mdc..."

  rm -f "$rules_dir"/*.mdc

  local count=0
  for skill_dir in $(ls -d "$SKILLS_SOURCE"/*/); do
    local name desc skill_file
    name=$(basename "$skill_dir")
    skill_file="$skill_dir/SKILL.md"
    desc=$(extract_description "$skill_file")

    local out_file="$rules_dir/${name}.mdc"
    echo "---" > "$out_file"
    echo "description: \"$desc\"" >> "$out_file"
    echo "globs: " >> "$out_file"
    echo "alwaysApply: false" >> "$out_file"
    echo "---" >> "$out_file"
    echo "" >> "$out_file"
    extract_body "$skill_file" >> "$out_file"

    count=$((count + 1))
  done

  echo "  -> $count files"
}

# --- .cursorrules (legacy) ---
generate_cursorrules() {
  local output=".cursorrules"
  local total
  total=$(count_skills)
  echo "  Generating $output..."

  cat > "$output" << HEADER
# Cursor Rules
# AUTO-GENERATED from skills/ — Do not edit directly
# For modular rules, see .cursor/rules/

# This repository contains $total coding skills for Java/Spring Boot backend development.

HEADER

  for skill_dir in $(ls -d "$SKILLS_SOURCE"/*/); do
    local name skill_file
    name=$(basename "$skill_dir")
    skill_file="$skill_dir/SKILL.md"

    echo "---" >> "$output"
    echo "" >> "$output"
    echo "## $name" >> "$output"
    echo "" >> "$output"
    extract_body "$skill_file" >> "$output"
    echo "" >> "$output"
  done

  echo "  -> $(wc -l < "$output") lines"
}

# --- .clinerules ---
generate_clinerules() {
  local output=".clinerules"
  local total
  total=$(count_skills)
  echo "  Generating $output..."

  cat > "$output" << HEADER
<!-- AUTO-GENERATED from skills/ — Do not edit directly -->
# Cline Rules

This repository contains $total coding skills for Java/Spring Boot backend development.
Each skill provides domain-specific guidance, patterns, and best practices.

## Skills Index

| Skill | Description |
|-------|-------------|
HEADER

  for skill_dir in $(ls -d "$SKILLS_SOURCE"/*/); do
    local name desc
    name=$(basename "$skill_dir")
    desc=$(extract_description "$skill_dir/SKILL.md" | cut -c1-120)
    echo "| $name | $desc |" >> "$output"
  done

  echo "" >> "$output"

  for skill_dir in $(ls -d "$SKILLS_SOURCE"/*/); do
    local name skill_file
    name=$(basename "$skill_dir")
    skill_file="$skill_dir/SKILL.md"

    echo "---" >> "$output"
    echo "" >> "$output"
    echo "## $name" >> "$output"
    echo "" >> "$output"
    extract_body "$skill_file" >> "$output"
    echo "" >> "$output"
  done

  echo "  -> $(wc -l < "$output") lines"
}

# --- .continuerules ---
generate_continuerules() {
  local output=".continuerules"
  local total
  total=$(count_skills)
  echo "  Generating $output..."

  cat > "$output" << HEADER
<!-- AUTO-GENERATED from skills/ — Do not edit directly -->
# Continue Rules

This repository contains $total coding skills for Java/Spring Boot backend development.
Each skill provides domain-specific guidance, patterns, and best practices.

## Skills Index

| Skill | Description |
|-------|-------------|
HEADER

  for skill_dir in $(ls -d "$SKILLS_SOURCE"/*/); do
    local name desc
    name=$(basename "$skill_dir")
    desc=$(extract_description "$skill_dir/SKILL.md" | cut -c1-120)
    echo "| $name | $desc |" >> "$output"
  done

  echo "" >> "$output"

  for skill_dir in $(ls -d "$SKILLS_SOURCE"/*/); do
    local name skill_file
    name=$(basename "$skill_dir")
    skill_file="$skill_dir/SKILL.md"

    echo "---" >> "$output"
    echo "" >> "$output"
    echo "## $name" >> "$output"
    echo "" >> "$output"
    extract_body "$skill_file" >> "$output"
    echo "" >> "$output"
  done

  echo "  -> $(wc -l < "$output") lines"
}

# --- Main ---
echo "=== Skills Config Regeneration ==="
echo "Source: $SKILLS_SOURCE"
echo "Skills: $(count_skills)"
echo ""

case "$PLATFORM_FILTER" in
  codex|agents)
    generate_agents_md
    ;;
  copilot)
    generate_copilot_instructions
    generate_copilot_modular
    ;;
  cursor)
    generate_cursor_rules
    generate_cursorrules
    ;;
  cline)
    generate_clinerules
    ;;
  continue)
    generate_continuerules
    ;;
  all)
    generate_agents_md
    generate_copilot_instructions
    generate_copilot_modular
    generate_cursor_rules
    generate_cursorrules
    generate_clinerules
    generate_continuerules
    ;;
  *)
    echo "Unknown platform: $PLATFORM_FILTER"
    echo "Available: codex, agents, copilot, cursor, cline, continue, all"
    exit 1
    ;;
esac

echo ""
echo "=== Done ==="
