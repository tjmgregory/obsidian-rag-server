#!/usr/bin/env bash

# Setup script for git hooks

echo "Setting up git hooks..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/usr/bin/env bash

# Git pre-commit hook
# Runs lint and type checks before allowing commits

set -e

echo "🔍 Running pre-commit checks..."

# Run linting
echo "📝 Checking code style with Biome..."
if ! bun run lint; then
    echo "❌ Linting failed. Please fix issues before committing."
    echo "💡 Run 'bun run lint:fix' to auto-fix most issues."
    exit 1
fi

# Run TypeScript type checking
echo "🔧 Checking TypeScript types..."
if ! bun run typecheck; then
    echo "❌ TypeScript type checking failed."
    exit 1
fi

# Run tests - ALWAYS run them to ensure we know the state
echo "🧪 Running tests..."
if ! bun test; then
    echo "⚠️  Tests are failing."
    
    # Check if we're in a TDD red phase (committing a test without implementation)
    # This is indicated by having test files in the staged changes
    if git diff --cached --name-only 2>/dev/null | grep -q "\.test\.ts$"; then
        echo "📝 Test files detected in commit - assuming TDD red phase."
        echo "✅ Allowing commit with failing tests (TDD workflow)."
    else
        echo "❌ Tests must pass when committing implementation code."
        echo "   If you're intentionally committing failing tests (TDD red phase),"
        echo "   make sure to include the test file in your commit."
        exit 1
    fi
else
    echo "✅ All tests passing!"
fi

echo "✅ Pre-commit checks complete!"
EOF

# Make hook executable
chmod +x .git/hooks/pre-commit

echo "✅ Git hooks installed successfully!"
echo ""
echo "The pre-commit hook will:"
echo "  • Check code style with Biome"
echo "  • Run TypeScript type checking"
echo "  • Run tests (TDD-aware: allows failing tests when committing test files)"
echo ""
echo "To skip hooks temporarily, use: git commit --no-verify"