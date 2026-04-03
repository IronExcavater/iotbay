#!/usr/bin/env sh
set -eu

# Sync the local development environment after git updates such as:
# - merge-based pulls
# - rebases
#
# The script compares two refs, checks which important files changed,
# and only runs the setup commands that are actually needed.

BASE_REF="${1:-}"
HEAD_REF="${2:-HEAD}"

if [ -z "$BASE_REF" ] || ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
    exit 0
fi

if ! git rev-parse --verify "$HEAD_REF" >/dev/null 2>&1; then
    exit 0
fi

CHANGED_FILES="$(git diff --name-only "$BASE_REF" "$HEAD_REF")"

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

has_changed() {
    printf '%s\n' "$CHANGED_FILES" | grep -Eq "$1"
}

# Determine which parts of the local environment need refreshing.
PACKAGES_CHANGED=false
REQUIREMENTS_CHANGED=false
MIGRATIONS_CHANGED=false

if has_changed '^(package\.json|package-lock\.json|api/package\.json|web/package\.json)$'; then
    PACKAGES_CHANGED=true
fi

if has_changed '^api/requirements\.txt$'; then
    REQUIREMENTS_CHANGED=true
fi

if has_changed '^api/migrations/.+\.sql$'; then
    MIGRATIONS_CHANGED=true
fi

if [ "$PACKAGES_CHANGED" = false ] && [ "$REQUIREMENTS_CHANGED" = false ] && [ "$MIGRATIONS_CHANGED" = false ]; then
    exit 0
fi

echo "Syncing local development environment..."

# JavaScript workspace dependencies.
if [ "$PACKAGES_CHANGED" = true ]; then
    echo "• Installing JavaScript dependencies"
    npm install
fi

# Backend Python environment and dependencies.
if [ "$REQUIREMENTS_CHANGED" = true ] || [ "$MIGRATIONS_CHANGED" = true ]; then
    echo "• Ensuring API virtual environment exists"
    npm run -w api venv
fi

if [ "$REQUIREMENTS_CHANGED" = true ]; then
    echo "• Installing Python dependencies"
    npm run -w api deps
fi

# Database schema updates.
if [ "$MIGRATIONS_CHANGED" = true ]; then
    echo "• Applying database migrations"
    npm run -w api db:migrate
fi
