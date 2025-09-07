#!/usr/bin/env bash

# Setup script for git hooks

echo "Setting up git hooks..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/usr/bin/env bash

# Git pre-commit hook
# Supports behavior-driven TDD methodology

set -e

echo "🔍 Running pre-commit checks..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)

# Check if this is a documentation-only commit
IS_DOCS_ONLY=true
for file in $STAGED_FILES; do
    # Check if file is NOT documentation
    if ! echo "$file" | grep -qE '\.(md|txt)$|^(docs/|README|LICENSE|CHANGELOG|AUTHORS|CONTRIBUTING|\.github/)'; then
        IS_DOCS_ONLY=false
        break
    fi
done

# Check what types of files are being committed
HAS_TEST_FILES=false
HAS_IMPL_FILES=false
HAS_CONFIG_FILES=false

for file in $STAGED_FILES; do
    if echo "$file" | grep -q '\.test\.\(ts\|js\)$'; then
        HAS_TEST_FILES=true
    elif echo "$file" | grep -qE '\.(ts|js)$' && ! echo "$file" | grep -q '\.test\.'; then
        HAS_IMPL_FILES=true
    elif echo "$file" | grep -qE '\.(json|yaml|yml|sh)$|^scripts/'; then
        HAS_CONFIG_FILES=true
    fi
done

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

# Determine if we should run tests
if [ "$IS_DOCS_ONLY" = true ]; then
    echo "📚 Documentation-only commit detected - skipping tests."
    echo "✅ Pre-commit checks complete!"
    exit 0
fi

# Run tests based on TDD workflow
echo "🧪 Running tests..."
if ! bun test; then
    echo "⚠️  Tests are failing."
    
    # Analyze the commit pattern for TDD workflow
    if [ "$HAS_TEST_FILES" = true ] && [ "$HAS_IMPL_FILES" = false ]; then
        # RED PHASE: Only test files being committed
        echo "🔴 TDD Red Phase detected - committing new/modified tests only."
        echo "✅ Allowing commit with failing tests (writing test first)."
    elif [ "$HAS_TEST_FILES" = true ] && [ "$HAS_IMPL_FILES" = true ]; then
        # Potentially GREEN PHASE: Both tests and implementation
        echo "🟡 Tests and implementation detected together."
        echo "   This might be a refactoring or a complete feature."
        echo "❌ Tests must pass when committing implementation code."
        echo "   For TDD workflow: commit test first (red), then implementation (green)."
        exit 1
    elif [ "$HAS_CONFIG_FILES" = true ] && [ "$HAS_IMPL_FILES" = false ]; then
        # Configuration/tooling changes
        echo "⚙️  Configuration/tooling changes detected."
        echo "⚠️  Tests are failing but allowing commit for tooling changes."
        echo "   Please fix tests in a follow-up commit."
    else
        # GREEN/REFACTOR PHASE: Implementation without test changes
        echo "🟢 Implementation changes detected."
        echo "❌ Tests must pass when committing implementation code."
        echo "   If you're starting TDD, commit the failing test first."
        exit 1
    fi
else
    echo "✅ All tests passing!"
    
    # Provide guidance based on what's being committed
    if [ "$HAS_TEST_FILES" = true ] && [ "$HAS_IMPL_FILES" = true ]; then
        echo "📦 Complete feature detected (tests + implementation)."
        echo "   Consider splitting into red-green commits for clearer history."
    elif [ "$HAS_IMPL_FILES" = true ] && [ "$HAS_TEST_FILES" = false ]; then
        echo "♻️  Possible refactoring detected (implementation changes only)."
        echo "   Good! Behavior tests remain stable during refactoring."
    fi
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