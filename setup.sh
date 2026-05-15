#!/usr/bin/env bash
set -e

echo "========================================"
echo "  KrishiVigyan - Automated Setup"
echo "========================================"
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Check Python ──
echo "[1/6] Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo "ERROR: Python not found. Install Python 3.10+ and try again."
    exit 1
fi
echo "  Found: $($PYTHON --version)"

# ── Check Node.js ──
echo "[2/6] Checking Node.js..."
if command -v node &> /dev/null; then
    echo "  Found: $(node --version)"
else
    echo "ERROR: Node.js not found. Install Node.js 18+ and try again."
    exit 1
fi

# ── Backend Setup ──
echo "[3/6] Setting up Python virtual environment..."
cd "$PROJECT_DIR/backend"
if [ ! -d "venv" ]; then
    $PYTHON -m venv venv
    echo "  Virtual environment created"
fi
source venv/bin/activate
echo "  Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "  Dependencies installed"

# ── Frontend Setup ──
echo "[4/6] Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm install --legacy-peer-deps 2>&1 | tail -1
fi
echo "  Frontend dependencies ready"

# ── Environment ──
echo "[5/6] Setting up environment..."
cd "$PROJECT_DIR"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "  Created .env from .env.example"
        echo "  IMPORTANT: Edit .env and add your Groq API key"
    else
        echo "  WARNING: No .env.example found"
    fi
fi

# Create required directories
mkdir -p "$PROJECT_DIR/backend/uploads"
mkdir -p "$PROJECT_DIR/backend/settings"
mkdir -p "$PROJECT_DIR/backend/data/chromadb"
mkdir -p "$PROJECT_DIR/images"
echo "  Directories created"

# ── Summary ──
echo "[6/6] Setup complete!"
echo ""
echo "========================================"
echo "  HOW TO RUN"
echo "========================================"
echo ""
echo "  Terminal 1 - Backend:"
echo "    cd $PROJECT_DIR/backend"
echo "    source venv/bin/activate"
echo "    python app.py"
echo ""
echo "  Terminal 2 - Frontend:"
echo "    cd $PROJECT_DIR/frontend"
echo "    npm run dev"
echo ""
echo "  Then open http://localhost:5173 in your browser."
echo ""
echo "  NOTE: You need a Groq API key (free at console.groq.com)"
echo "  Add it in Settings > API Key after launching the app."
echo "========================================"
