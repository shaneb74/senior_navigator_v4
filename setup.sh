#!/bin/bash
# Senior Navigator v4 - Quick Setup Script
# Run this to initialize the Angular project with all dependencies

set -e  # Exit on error

echo "================================================"
echo "Senior Navigator v4 - Angular Setup"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "SETUP_GUIDE.md" ]; then
    echo "❌ Error: Run this script from senior_navigator_v4 root directory"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ required (you have $(node -v))"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install Angular CLI globally if not present
if ! command -v ng &> /dev/null; then
    echo "📦 Installing Angular CLI globally..."
    npm install -g @angular/cli@latest
fi

echo "✅ Angular CLI: $(ng version --minimal)"

# Create Angular workspace
echo ""
echo "📦 Creating Angular workspace..."
ng new frontend \
    --routing \
    --style=scss \
    --skip-git \
    --package-manager=npm

cd frontend

# Install core dependencies
echo ""
echo "📦 Installing core dependencies..."
npm install \
    @ngx-formly/core@latest \
    @ngx-formly/material@latest \
    @angular/material@latest \
    @angular/cdk@latest \
    @ngrx/store@latest \
    @ngrx/effects@latest \
    @ngrx/store-devtools@latest \
    @ngrx/entity@latest

# Install dev dependencies
echo ""
echo "📦 Installing dev dependencies..."
npm install -D \
    @types/node

# Create directory structure
echo ""
echo "📁 Creating directory structure..."

mkdir -p src/app/core/services
mkdir -p src/app/core/guards
mkdir -p src/app/shared/components
mkdir -p src/app/shared/pipes
mkdir -p src/app/shared/models
mkdir -p src/app/features/gcp/components
mkdir -p src/app/features/gcp/services
mkdir -p src/app/features/gcp/store
mkdir -p src/app/features/cost-planner/components
mkdir -p src/app/features/cost-planner/services
mkdir -p src/app/features/cost-planner/store
mkdir -p src/app/features/pfma/components
mkdir -p src/app/features/pfma/services
mkdir -p src/app/features/pfma/store
mkdir -p src/app/features/hub/components
mkdir -p src/app/features/hub/services
mkdir -p src/assets/configs
mkdir -p src/assets/images
mkdir -p src/assets/styles

echo "✅ Directory structure created"

# Create initial config files
echo ""
echo "📝 Creating initial configuration files..."

# Create empty module configs (to be populated from v3)
touch src/assets/configs/gcp_module.json
touch src/assets/configs/cost_planner_modules.json
touch src/assets/configs/regional_cost_config.json

echo "✅ Configuration files created (empty - copy from v3)"

# Success message
echo ""
echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Copy JSON configs from v3:"
echo "   cp ../cca_senior_navigator_v3/products/gcp_v4/modules/care_recommendation/module.json src/assets/configs/gcp_module.json"
echo ""
echo "2. Start development server:"
echo "   cd frontend && ng serve"
echo ""
echo "3. Open browser:"
echo "   http://localhost:4200"
echo ""
echo "4. See SETUP_GUIDE.md for detailed implementation steps"
echo ""
